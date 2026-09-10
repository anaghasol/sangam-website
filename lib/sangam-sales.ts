/**
 * What actually sells at Sangam, for the chat to answer from.
 *
 * SANGAM ONLY. This reads `sangam_*` tables and nothing else. Sitara is a
 * separate business on Toast with its own tables and its own knowledge engine —
 * the two must never be joined or answered from together.
 *
 * The source is two years of PetPooja billing across the outlets: ~950k item
 * lines at line grain for the last 12 months, daily aggregates before that.
 * Aggregating that per message would be far too slow and far too large for the
 * model's context, so `sangam_popular_items` is pre-grouped and this file only
 * formats a small slice of it.
 *
 * Grouped on item_norm rather than the raw name: the same dish is billed many
 * ways across outlets and years ("Idly 3pc", "Idly (3 Pcs)", "Idly (3 Pieces)"),
 * and ranking the raw string splits one dish into several and buries it. Idly
 * reads 34k on the raw name and 78k once the spellings are one dish.
 */
import { createClient } from '@supabase/supabase-js'

type Row = {
  display_name: string
  category: string | null
  /** Water, tea, biscuits, cutlery — ride along with orders, never a recommendation. */
  incidental: boolean
  lane: 'aggregator' | 'dinein' | 'takeaway' | 'delivery'
  daypart: 'breakfast' | 'lunch' | 'dinner'
  qty: number
  typical_price: number | null
}

let cache: { text: string; at: number } | null = null
const TTL_MS = 60 * 60 * 1000 // the underlying data moves once a day at most

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || process.env.VITE_SUPABASE_SCHEMA || process.env.SUPABASE_SCHEMA
  if (!url || !key) return null
  return createClient(url, key, schema ? { db: { schema } } : undefined)
}

const money = (n: number | null) => (n && n > 0 ? `₹${Math.round(n)}` : '')

/** Top `n` dishes for a filter, as "Name (₹price)" — compact by design. */
function top(rows: Row[], pick: (r: Row) => boolean, n: number): string {
  const agg = new Map<string, { qty: number; price: number | null }>()
  for (const r of rows) {
    if (!pick(r)) continue
    const cur = agg.get(r.display_name) || { qty: 0, price: r.typical_price }
    cur.qty += Number(r.qty) || 0
    agg.set(r.display_name, cur)
  }
  return [...agg.entries()]
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, n)
    .map(([name, v]) => `${name}${money(v.price) ? ' ' + money(v.price) : ''}`)
    .join(', ')
}

const isVeg = (r: Row): boolean => {
  const cat = (r.category || '').toLowerCase()
  const name = (r.display_name || '').toLowerCase()
  const nonVegKeywords = ['chicken', 'mutton', 'egg', 'fish', 'prawn', 'non veg', 'non-veg', 'keema', 'kabab', 'biryanis']
  if (nonVegKeywords.some(k => cat.includes(k))) return false
  if (nonVegKeywords.some(k => name.includes(k))) return false
  return true
}

/**
 * A short block of real sales facts for the system prompt, or '' if unavailable.
 *
 * Returns '' rather than throwing or inventing: the chat must degrade to its
 * general hospitality answers, never to made-up popularity claims.
 */
export async function getSangamSalesContext(): Promise<string> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.text

  const client = sb()
  if (!client) return ''

  try {
    const { data, error } = await client
      .from('sangam_popular_items')
      .select('display_name,category,incidental,lane,daypart,qty,typical_price')
      .order('qty', { ascending: false })
      .limit(1000)
    if (error || !data?.length) return ''

    // Water, tea and biscuits outsell every dish because they accompany other
    // orders — ranked together they crowd the food out entirely. Dishes and
    // drinks are ranked separately instead of blended.
    const all = data as Row[]
    const rows = all.filter(r => !r.incidental)
    const drinks = all.filter(r => r.incidental)
    const any = () => true
    const text = [
      'REAL SALES & MENU DATA (derived from 2+ years of PetPooja billing data across outlets — these are facts, not guesses):',
      `• Most ordered overall: ${top(rows, any, 10)}`,
      `• Best Vegetarian options overall: ${top(rows, isVeg, 10)}`,
      `• Best Non-Vegetarian options overall: ${top(rows, r => !isVeg(r), 10)}`,
      `• Best for breakfast/tiffin: ${top(rows, r => r.daypart === 'breakfast', 8)}`,
      `• Best Vegetarian options for lunch: ${top(rows, r => r.daypart === 'lunch' && isVeg(r), 8)}`,
      `• Best Non-Vegetarian options for lunch: ${top(rows, r => r.daypart === 'lunch' && !isVeg(r), 8)}`,
      `• Best Vegetarian options for dinner: ${top(rows, r => r.daypart === 'dinner' && isVeg(r), 8)}`,
      `• Best Non-Vegetarian options for dinner: ${top(rows, r => r.daypart === 'dinner' && !isVeg(r), 8)}`,
      `• Most ordered dine-in: ${top(rows, r => r.lane === 'dinein', 8)}`,
      `• Most ordered for takeaway/parcel: ${top(rows, r => r.lane === 'takeaway', 8)}`,
      `• Most ordered on Swiggy/Zomato: ${top(rows, r => r.lane === 'aggregator', 8)}`,
      `• Most ordered beverages/extras: ${top(drinks, any, 6)}`,
      '',
      'STRICT PRICING & RECOMMENDATION RULES:',
      '1. ALWAYS quote exact prices from the real data above when guests ask about prices or menu items listed here.',
      '2. NEVER invent, guess, or hallucinate prices for items NOT present in this real sales data (e.g. Masala Chai, Pani Puri, etc.). If an item is not in this data, inform the guest that prices vary by branch/delivery channel and suggest calling +91 90638 44021.',
      '3. For vegetarian queries (e.g. "vegetarian for lunch"), recommend specifically from the Vegetarian lists above (e.g. Sangam Spl. Thali, Pulka, Butter Naan, Veg Biryani, Roti, Paneer dishes).',
    ].join('\n')

    cache = { text, at: Date.now() }
    return text
  } catch {
    return ''
  }
}
