/**
 * Sangam Booking Intelligence — grounds new quotes in real past bookings.
 *
 * READ-ONLY. Every query here is a SELECT against `eventmgmt.booking` (and
 * related tables). Nothing in this file writes, updates, or deletes rows.
 *
 * Two different jobs, kept deliberately separate because the underlying data
 * supports them differently right now:
 *
 * INDOOR (banquet halls):
 *   - Pulls similar past bookings (same occasion, a pax range, same branch)
 *     so a new estimate can reference what similar real events actually
 *     went for — not just today's price list in isolation.
 *   - Computes a seasonal demand signal from real booking density per
 *     calendar month, so the assistant can be firmer on pricing in a
 *     historically busy month and mention flexibility in a quiet one —
 *     WITHOUT ever inventing a specific extra discount number itself. Any
 *     discount beyond the standard 5% loyalty discount is always routed to
 *     the catering manager, never decided by the model.
 *
 * OUTDOOR (catering/trays):
 *   - `booking.menu_selection` (JSONB) does not currently store a
 *     structured per-dish price breakdown — it's free-text/summary data
 *     today, so past outdoor bookings can't yet ground per-dish pricing.
 *   - This module still surfaces past outdoor bookings for *context*
 *     (pax, date, total spend) but explicitly tells the assistant that
 *     per-dish pricing must always come from the live `dish_pricing` /
 *     `menu` tables (via lib/sangam-catering.ts), never from booking
 *     history — until menu_selection starts storing per-dish prices, at
 *     which point `extractPerDishPricingFromMenuSelection` below is the
 *     single place to teach it that shape, and every caller of this module
 *     switches over automatically without further changes.
 */
import { createClient } from '@supabase/supabase-js'

function sbEvent() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'eventmgmt' } })
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Cache the per-branch monthly booking-density profile — it's derived from
// broad historical data, not from any one query's specific pax/occasion, so
// it doesn't need to be recomputed per request. 6h TTL: cheap to keep fresh
// without hammering the DB on every chat message.
const demandCache = new Map<string, { counts: number[]; at: number }>()
const DEMAND_TTL_MS = 6 * 60 * 60 * 1000

async function getMonthlyBookingDensity(branchId: string | null): Promise<number[]> {
  const cacheKey = branchId || 'all-branches'
  const cached = demandCache.get(cacheKey)
  if (cached && Date.now() - cached.at < DEMAND_TTL_MS) return cached.counts

  const counts = new Array(12).fill(0)
  const client = sbEvent()
  if (!client) return counts

  try {
    let query = client
      .from('booking')
      .select('event_date')
      .eq('service_type', 'inhouse')
      .neq('status', 'cancelled')
      .not('event_date', 'is', null)
      .limit(2000)
    if (branchId) query = query.eq('branch_id', branchId)

    const { data } = await query
    for (const row of data || []) {
      const d = new Date(row.event_date as string)
      if (!isNaN(d.getTime())) counts[d.getMonth()]++
    }
  } catch (e) {
    console.warn('Seasonal demand lookup failed (non-fatal):', e)
  }

  demandCache.set(cacheKey, { counts, at: Date.now() })
  return counts
}

/**
 * Returns a short guidance block on how busy the target event's month
 * historically is for this branch's indoor bookings — for tone and
 * discount-discipline, never for inventing a specific discount number.
 */
async function getSeasonalDemandNote(branchId: string | null, targetMonth: number | null): Promise<string> {
  if (targetMonth === null) return ''
  const counts = await getMonthlyBookingDensity(branchId)
  const total = counts.reduce((a, b) => a + b, 0)
  if (total < 6) return '' // not enough history yet to say anything meaningful

  const avg = total / 12
  const thisMonth = counts[targetMonth]
  const monthName = MONTH_NAMES[targetMonth]

  let tier: 'high' | 'low' | 'typical' = 'typical'
  if (thisMonth > avg * 1.15) tier = 'high'
  else if (thisMonth < avg * 0.85) tier = 'low'

  if (tier === 'high') {
    return `\nSEASONAL DEMAND: ${monthName} is historically one of our busier months for indoor bookings at this branch (${thisMonth} past bookings vs. an average of ${avg.toFixed(1)}/month). Guidance: do NOT offer any discount beyond the standard 5% loyalty discount for a verified returning customer — mention that dates in this month fill up quickly so they should confirm soon.`
  }
  if (tier === 'low') {
    return `\nSEASONAL DEMAND: ${monthName} is historically a quieter month for indoor bookings at this branch (${thisMonth} past bookings vs. an average of ${avg.toFixed(1)}/month). Guidance: you may mention that additional flexibility on pricing can be checked with our catering manager at +91 90638 44021 — but do NOT invent or quote a specific extra discount percentage yourself. Only the standard 5% loyalty discount (for verified returning customers) is yours to apply directly.`
  }
  return ''
}

export type SimilarBookingSummary = {
  count: number
  avgPlateRate: number | null
  avgTotal: number | null
  sampleHalls: string[]
}

/**
 * Real past indoor bookings for a similar occasion + pax range + branch.
 * Used as a reference range in the prompt, not as the quoted price itself —
 * the quoted price still always comes from the live menu/hall pricing.
 */
async function getSimilarIndoorBookings(
  occasionId: string | null,
  pax: number,
  branchId: string | null
): Promise<SimilarBookingSummary> {
  const empty: SimilarBookingSummary = { count: 0, avgPlateRate: null, avgTotal: null, sampleHalls: [] }
  const client = sbEvent()
  if (!client || pax <= 0) return empty

  try {
    let query = client
      .from('booking')
      .select('plate_price, total_amount, pax, hall_id, event_date')
      .eq('service_type', 'inhouse')
      .neq('status', 'cancelled')
      .gte('pax', Math.round(pax * 0.7))
      .lte('pax', Math.round(pax * 1.3))
      .order('event_date', { ascending: false })
      .limit(10)
    if (occasionId) query = query.eq('occasion_id', occasionId)
    if (branchId) query = query.eq('branch_id', branchId)

    const { data } = await query
    if (!data || data.length === 0) return empty

    const plateRates = data.map((b: any) => Number(b.plate_price)).filter((n: number) => n > 0)
    const totals = data.map((b: any) => Number(b.total_amount)).filter((n: number) => n > 0)
    const hallIds = [...new Set(data.map((b: any) => b.hall_id).filter(Boolean))]

    let hallNames: string[] = []
    if (hallIds.length > 0) {
      const { data: halls } = await client.from('hall').select('id, name').in('id', hallIds)
      hallNames = (halls || []).map((h: any) => h.name)
    }

    return {
      count: data.length,
      avgPlateRate: plateRates.length > 0 ? Math.round(plateRates.reduce((a, b) => a + b, 0) / plateRates.length) : null,
      avgTotal: totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
      sampleHalls: hallNames.slice(0, 3),
    }
  } catch (e) {
    console.warn('Similar indoor bookings lookup failed (non-fatal):', e)
    return empty
  }
}

/**
 * Full indoor booking-intelligence text block for the chat system prompt.
 * Call once enough is known: at minimum a pax count; occasion/branch/month
 * sharpen it further but are optional.
 */
export async function getIndoorBookingIntelligence(opts: {
  occasionId: string | null
  pax: number
  branchId: string | null
  targetMonth: number | null // 0-11, JS Date.getMonth()
}): Promise<string> {
  const [similar, seasonalNote] = await Promise.all([
    getSimilarIndoorBookings(opts.occasionId, opts.pax, opts.branchId),
    getSeasonalDemandNote(opts.branchId, opts.targetMonth),
  ])

  const parts: string[] = []
  if (similar.count > 0) {
    const hallsNote = similar.sampleHalls.length > 0 ? ` (commonly booked halls: ${similar.sampleHalls.join(', ')})` : ''
    parts.push(
      `\nSIMILAR PAST INDOOR BOOKINGS (real completed events, ~${opts.pax} guest range, reference only — the quoted plate rate must still come from the live menu pricing above, not from this history):` +
      `\n• ${similar.count} similar real booking(s) on file` +
      (similar.avgPlateRate ? `\n• Average plate rate on those: ₹${similar.avgPlateRate}` : '') +
      (similar.avgTotal ? `\n• Average total spend on those: ₹${similar.avgTotal.toLocaleString('en-IN')}` : '') +
      hallsNote
    )
  }
  if (seasonalNote) parts.push(seasonalNote)
  return parts.join('\n')
}

/**
 * Outdoor booking-intelligence text block. Deliberately limited today: past
 * outdoor bookings are surfaced for pax/spend CONTEXT only. Per-dish pricing
 * always comes from the live dish_pricing/menu data — never from this.
 */
export async function getOutdoorBookingIntelligence(opts: {
  occasionId: string | null
  pax: number
  branchId: string | null
}): Promise<string> {
  const client = sbEvent()
  if (!client || opts.pax <= 0) return ''

  try {
    let query = client
      .from('booking')
      .select('total_amount, pax, event_date, menu_selection')
      .eq('service_type', 'outdoor')
      .neq('status', 'cancelled')
      .gte('pax', Math.round(opts.pax * 0.7))
      .lte('pax', Math.round(opts.pax * 1.3))
      .order('event_date', { ascending: false })
      .limit(10)
    if (opts.occasionId) query = query.eq('occasion_id', opts.occasionId)
    if (opts.branchId) query = query.eq('branch_id', opts.branchId)

    const { data } = await query
    if (!data || data.length === 0) return ''

    // Forward-compatible hook: the moment menu_selection starts carrying a
    // structured per-dish price breakdown, this is where we'd read it and
    // prefer it over dish_pricing. Today it never finds one, by design —
    // see the module doc comment.
    const perDishPricing = data
      .map((b: any) => extractPerDishPricingFromMenuSelection(b.menu_selection))
      .find((x) => x !== null)

    const totals = data.map((b: any) => Number(b.total_amount)).filter((n: number) => n > 0)
    const avgTotal = totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null

    if (perDishPricing) {
      // Not implemented yet — no booking currently stores this shape. Left
      // as a clear extension point for when it does.
      return `\nPAST OUTDOOR ORDERS WITH RECORDED PER-DISH PRICING FOUND — use that pricing in preference to dish_pricing for this quote.\n${JSON.stringify(perDishPricing)}`
    }

    return `\nPAST OUTDOOR BOOKINGS (${data.length} similar, ~${opts.pax} guest range — spend CONTEXT only; these do not carry per-dish pricing yet, so per-dish prices below MUST still come from the live dish/menu pricing, never from this line):` +
      (avgTotal ? `\n• Average total spend on similar past outdoor orders: ₹${avgTotal.toLocaleString('en-IN')}` : '')
  } catch (e) {
    console.warn('Outdoor booking history lookup failed (non-fatal):', e)
    return ''
  }
}

/**
 * Reads a structured per-dish price breakdown out of booking.menu_selection,
 * if one is ever present. Returns null today for every real booking, because
 * menu_selection is currently free-text/summary JSON with no per-dish price
 * field. Update this function — and only this function — once the booking
 * flow starts recording per-dish prices; every caller above picks it up
 * automatically.
 */
function extractPerDishPricingFromMenuSelection(menuSelection: unknown): Record<string, number> | null {
  if (!menuSelection || typeof menuSelection !== 'object') return null
  const items = (menuSelection as any).items || (menuSelection as any).dishes
  if (!Array.isArray(items)) return null
  const priced: Record<string, number> = {}
  for (const item of items) {
    if (item && typeof item.name === 'string' && typeof item.price === 'number') {
      priced[item.name] = item.price
    }
  }
  return Object.keys(priced).length > 0 ? priced : null
}
