#!/usr/bin/env node
/**
 * Load PetPooja item-level CSVs into Supabase for Sangam.
 *
 * Two grains, by age:
 *   - within DETAIL_MONTHS  -> sangam_order_items      (every item line)
 *   - older                 -> sangam_daily_item_sales (per outlet/day/item)
 *
 * August 2026 alone is 77,561 item lines across four outlets, so keeping two
 * full years at line grain is ~1.9M rows to answer questions nobody asks about
 * one bill from 20 months ago. Recent detail is what recommendations read;
 * older history only has to carry trend and seasonality.
 *
 *   node scripts/petpooja-ingest.mjs [--detail-months=12] [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = path.join(import.meta.dirname, '..')
const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
const G = k => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim()
const sb = createClient(G('NEXT_PUBLIC_SUPABASE_URL'), G('SUPABASE_SERVICE_ROLE_KEY'))

const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1]
const DETAIL_MONTHS = Number(arg('detail-months') || 12)
const DRY = process.argv.includes('--dry')
const DIR = path.join(ROOT, 'scripts/petpooja-exports')

// Midnight, not "this instant N months ago". A timestamp cutoff splits the
// boundary DAY between the two tables — lines before the cutoff time became
// aggregates and lines after became detail — so 2025-08-31 ended up in both and
// anything summing across the two double-counted it (489 rows). A whole day now
// belongs to exactly one grain.
const cutoff = new Date()
cutoff.setMonth(cutoff.getMonth() - DETAIL_MONTHS)
cutoff.setHours(0, 0, 0, 0)

/**
 * Split one CSV line on commas that are NOT inside quotes.
 *
 * Customer addresses routinely contain commas, and a naive split shifts every
 * column after them — which would silently file item names under category and
 * prices under quantity rather than failing outright.
 */
function splitCsv(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++ } else { q = !q }
      continue
    }
    if (c === ',' && !q) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur)
  return out
}

/** "Zomato_Sangam Hotel" / "Swiggy_..." -> the ordering channel. */
function channelOf(area, orderType) {
  const a = (area || '').toLowerCase()
  if (a.includes('zomato')) return 'zomato'
  if (a.includes('swiggy')) return 'swiggy'
  if (a.includes('magicpin')) return 'magicpin'
  if (/dine/i.test(orderType || '')) return 'dinein'
  return 'direct'
}

const num = v => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

async function chunkUpsert(table, rows, onConflict) {
  let done = 0
  for (let i = 0; i < rows.length; i += 500) {
    const slice = rows.slice(i, i + 500)
    const { error } = await sb.from(table).upsert(slice, { onConflict, ignoreDuplicates: true })
    if (error) {
      console.error(`   ${table} upsert failed at row ${i}: ${error.message}`)
      return done
    }
    done += slice.length
  }
  return done
}

async function main() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.csv')).sort()
  console.log(`${files.length} CSV file(s) · detail window = last ${DETAIL_MONTHS} months (from ${cutoff.toISOString().slice(0, 10)})`)

  let totalDetail = 0
  // Aggregates accumulate across EVERY file before a single upsert at the end.
  //
  // Aggregating per file and upserting with ignoreDuplicates silently DISCARDED
  // the second contribution to any key seen in two files, instead of adding it:
  // 223,757 rows sent, 221,874 stored. For a sum that is worse than a missing
  // row — the row exists and its revenue is simply too low, which no row count
  // would ever reveal.
  const aggAll = new Map()

  for (const f of files) {
    const raw = fs.readFileSync(path.join(DIR, f), 'utf8')
    const lines = raw.split('\n').filter(l => l.trim())
    if (lines.length < 2) { console.log(`  ${f}: empty`); continue }

    const header = splitCsv(lines[0]).map(h => h.trim())
    const ix = Object.fromEntries(header.map((h, i) => [h, i]))

    const detail = []
    const agg = aggAll
    // Position of the line WITHIN its bill. Identity cannot be the line's
    // contents: a bill legitimately repeats a dish (re-fire, split covers, two
    // guests ordering the same thing), and keying on contents dropped 7,035 of
    // 406,921 lines on the first load — silently, because upsert treats a key
    // collision as a duplicate rather than an error.
    const lineNo = new Map()

    for (let i = 1; i < lines.length; i++) {
      const c = splitCsv(lines[i])
      if (c.length < header.length - 2) continue

      const at = (c[ix.date] || '').trim()
      if (!at) continue
      // PetPooja stamps in IST. Without the offset, new Date() reads the string
      // in the HOST's zone — this Mac is US Central — so 11:33 IST was stored as
      // 16:33Z instead of 06:03Z: every row 10.5 hours out. That is not cosmetic
      // for this data set, which exists to answer "what sells at breakfast" and
      // "how does Sunday differ from Tuesday". It also walked orders across day
      // and month boundaries, which is why per-month counts disagreed with the
      // CSVs in BOTH directions.
      const when = new Date(at.replace(' ', 'T') + '+05:30')
      if (Number.isNaN(when.getTime())) continue

      const outlet = (c[ix.restaurant_name] || '').trim()
      const item = (c[ix.item_name] || '').trim()
      if (!outlet || !item) continue

      const orderType = (c[ix.order_type] || '').trim()
      const area = (c[ix.area] || '').trim()
      const channel = channelOf(area, orderType)

      if (when >= cutoff) {
        const inv = (c[ix.invoice_no] || '').trim()
        const n = (lineNo.get(outlet + '|' + inv) || 0) + 1
        lineNo.set(outlet + '|' + inv, n)
        detail.push({
          outlet,
          invoice_no: inv,
          line_no: n,
          ordered_at: when.toISOString(),
          order_type: orderType,
          payment_type: (c[ix.payment_type] || '').trim(),
          status: (c[ix.status] || '').trim(),
          area,
          channel,
          customer_phone: (c[ix.customer_phone] || '').trim() || null,
          customer_name: (c[ix.customer_name] || '').trim() || null,
          persons: num(c[ix.persons]),
          item_name: item,
          category_name: (c[ix.category_name] || '').trim() || null,
          item_price: num(c[ix.item_price]),
          item_quantity: num(c[ix.item_quantity]),
          item_total: num(c[ix.item_total]),
          bill_total: num(c[ix.total]),
          discount: num(c[ix.discount]),
        })
      } else {
        const day = when.toISOString().slice(0, 10)
        const key = [outlet, day, orderType, channel, item].join('|')
        const cur = agg.get(key) || {
          outlet,
          sale_date: day,
          order_type: orderType,
          channel,
          item_name: item,
          category_name: (c[ix.category_name] || '').trim() || null,
          qty: 0,
          revenue: 0,
          order_count: 0,
        }
        cur.qty += num(c[ix.item_quantity]) || 0
        cur.revenue += num(c[ix.item_total]) || 0
        cur.order_count += 1
        agg.set(key, cur)
      }
    }

    console.log(`  ${f}: ${detail.length} detail (aggregate running total ${aggAll.size})`)
    if (DRY) { totalDetail += detail.length; continue }

    if (detail.length) {
      totalDetail += await chunkUpsert('sangam_order_items', detail, 'outlet,invoice_no,line_no')
    }
  }

  const aggRows = [...aggAll.values()]
  let totalAgg = 0
  if (!DRY && aggRows.length) {
    totalAgg = await chunkUpsert('sangam_daily_item_sales', aggRows, 'outlet,sale_date,order_type,channel,item_name')
  } else {
    totalAgg = aggRows.length
  }

  console.log('')
  console.log(`${DRY ? '[DRY] would load' : 'loaded'}: ${totalDetail} item lines, ${totalAgg} daily aggregates`)
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1) })
