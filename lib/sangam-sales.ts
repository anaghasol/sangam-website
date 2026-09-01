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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
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
    // orders — ranked together they crowd the food out entirely, and the first
    // draft of this recommended "Sangam Water Bottle" as the best thing to
    // order. Dishes and drinks are ranked separately instead of blended.
    const all = data as Row[]
    const rows = all.filter(r => !r.incidental)
    const drinks = all.filter(r => r.incidental)
    const any = () => true
    const text = [
      'REAL SALES DATA (two years of actual billing — these are facts, not guesses):',
      `• Most ordered overall: ${top(rows, any, 10)}`,
      `• Best for breakfast/tiffin: ${top(rows, r => r.daypart === 'breakfast', 8)}`,
      `• Best at lunch: ${top(rows, r => r.daypart === 'lunch', 8)}`,
      `• Best at dinner: ${top(rows, r => r.daypart === 'dinner', 8)}`,
      `• Most ordered dine-in: ${top(rows, r => r.lane === 'dinein', 8)}`,
      `• Most ordered for takeaway/parcel: ${top(rows, r => r.lane === 'takeaway', 8)}`,
      `• Most ordered on Swiggy/Zomato: ${top(rows, r => r.lane === 'aggregator', 8)}`,
      `• Most ordered drinks/extras: ${top(drinks, any, 6)}`,
      '',
      'Use these when someone asks what is good, what to order, what is popular, or',
      'what to get delivered. Recommend from THIS list — it is what guests actually',
      'order.',
      '',
      'TWO SOURCES, DIFFERENT JOBS: the menu above in your instructions is the',
      'PUBLISHED menu and is authoritative for prices. This sales list is',
      'authoritative for POPULARITY — what guests actually order most. Use the menu',
      'for what a dish costs, and this list for what to recommend.',
      '',
      'If a dish appears here but not on the published menu, recommend it by name and',
      'say you would have to check the exact price rather than quoting one — the',
      'approximate figures here are averages across outlets and years, not the',
      'counter price.',
    ].join('\n')

    cache = { text, at: Date.now() }
    return text
  } catch {
    return ''
  }
}
