/**
 * Sangam Indoor & Outdoor Catering Database Service for Chat AI.
 *
 * Reads real catering data from `eventmgmt` schema tables:
 * - `eventmgmt.dish` & `eventmgmt.dish_pricing` (Individual dishes, unit pricing, per-kg/per-tray costs, serving sizes)
 * - `eventmgmt.menu` (Indoor & Outdoor Menus, prices per pax, dietary types)
 * - `eventmgmt.hall` (Indoor banquet halls, capacities, AC status, pricing)
 * - `eventmgmt.booking` (Indoor & Outdoor bookings, service_types 'inhouse', 'outdoor', 'inhouse-meeting')
 * - `eventmgmt.occasion` (Weddings, Birthdays, Corporate events)
 * - `branches` (public schema — the real branch_id every booking/hall/dish_pricing row is keyed to)
 *
 * IMPORTANT: This file only ever SELECTs. Nothing here writes, updates, or
 * deletes rows in any table — quote/booking writes live in the API routes,
 * and this module is read-only by design so it is always safe to call.
 */
import { createClient } from '@supabase/supabase-js'

type MenuRow = {
  id: string
  name: string
  type: string
  price_per_pax: number
  dietary_type: string
  description: string | null
  is_active: boolean
  menu_type: string
}

type HallRow = {
  id: string
  branch_id: string | null
  name: string
  capacity: number | null
  min_pax: number | null
  max_pax: number | null
  flat_charge: number | null
  full_day_price: number | null
  min_catering_value_for_free: number | null
  floor: string | null
  is_ac: boolean
  features: string | null
  valet_parking: boolean
}

type OccasionRow = {
  id: string
  name: string
  description: string | null
}

type DishRow = {
  id: string
  name: string
  description: string | null
  dietary_type: string | null
  unit_type: string | null
  default_food_group: string | null
  base_price: number | null
  is_active: boolean
}

type DishPricingRow = {
  id: string
  dish_id: string
  branch_id: string
  unit_type: string
  unit_label: string
  price: number
  price_per_kg: number | null
  persons_per_unit: number | null
  size_variant: string
  is_current_price: boolean
}

type BranchRow = {
  id: string
  name: string
}

export type DishCategory = 'starters' | 'biryanis' | 'curries' | 'breads' | 'desserts' | 'beverages' | 'others'

export type LiveHall = {
  id: string
  branchId: string | null
  name: string
  minPax: number | null
  maxPax: number | null
  capacity: number | null
  isAc: boolean
  floor: string | null
  flatCharge: number | null
  fullDayPrice: number | null
  minCateringValueForFree: number | null
  valetParking: boolean
  text: string
}

export type LiveMenu = {
  id: string
  name: string
  pricePerPax: number
  dietaryType: string
  description: string | null
  menuType: string
  text: string
}

export type LiveDish = {
  id: string
  name: string
  dietaryType: string | null
  price: number | null
  unitLabel: string | null
  personsPerUnit: number | null
  category: DishCategory
  text: string
}

export type CateringLiveData = {
  halls: LiveHall[]
  indoorMenus: LiveMenu[]
  outdoorMenus: LiveMenu[]
  dishesByCategory: Record<DishCategory, LiveDish[]>
  occasions: string[]
  /** True only when the corresponding table actually returned rows this fetch. */
  hasLiveHalls: boolean
  hasLiveMenus: boolean
  hasLiveDishes: boolean
}

const emptyDishBuckets = (): Record<DishCategory, LiveDish[]> => ({
  starters: [], biryanis: [], curries: [], breads: [], desserts: [], beverages: [], others: [],
})

let liveCache: { data: CateringLiveData; at: number } | null = null
let textCache: { text: string; at: number } | null = null
const TTL_MS = 20 * 60 * 1000 // Cache for 20 minutes

function sbEvent() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'eventmgmt' } })
}

/** Same project, default/public schema — where `branches` lives. */
function sbPublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function categorize(name: string, foodGroup: string | null): DishCategory {
  const grp = (foodGroup || '').toLowerCase()
  const n = name.toLowerCase()
  if (grp.includes('starter') || grp.includes('snack') || grp.includes('soup') || n.includes('tikka') || n.includes('kebab') || n.includes('fry') || n.includes('65') || n.includes('manchurian')) return 'starters'
  if (grp.includes('biryani') || grp.includes('rice') || n.includes('biryani') || n.includes('pulao') || n.includes('palav') || n.includes('rice')) return 'biryanis'
  if (grp.includes('curry') || grp.includes('gravy') || grp.includes('dal') || n.includes('curry') || n.includes('masala') || n.includes('paneer') || n.includes('korma') || n.includes('dal')) return 'curries'
  if (grp.includes('bread') || n.includes('naan') || n.includes('roti') || n.includes('pulka') || n.includes('paratha')) return 'breads'
  if (grp.includes('dessert') || grp.includes('sweet') || n.includes('meetha') || n.includes('halwa') || n.includes('jamun') || n.includes('kheer') || n.includes('ice cream')) return 'desserts'
  if (grp.includes('beverage') || n.includes('mojito') || n.includes('drink') || n.includes('juice') || n.includes('shake')) return 'beverages'
  return 'others'
}

/**
 * Fetches and caches the live `eventmgmt` catering data as typed objects
 * (not just formatted text), so callers like the quote generator can use
 * real prices/hall names/dish lists directly instead of hardcoded copies.
 *
 * Read-only. If a table is unreachable or empty, its `hasLive*` flag comes
 * back false and the corresponding array is empty — callers decide what to
 * do about that (the chat quote builder falls back to a clearly-labelled
 * generic estimate rather than inventing numbers).
 */
export async function getSangamCateringLiveData(): Promise<CateringLiveData> {
  if (liveCache && Date.now() - liveCache.at < TTL_MS) return liveCache.data

  const data: CateringLiveData = {
    halls: [],
    indoorMenus: [],
    outdoorMenus: [],
    dishesByCategory: emptyDishBuckets(),
    occasions: [],
    hasLiveHalls: false,
    hasLiveMenus: false,
    hasLiveDishes: false,
  }

  const client = sbEvent()
  if (!client) {
    liveCache = { data, at: Date.now() }
    return data
  }

  try {
    const [menuRes, hallRes, occRes, dishRes, pricingRes] = await Promise.all([
      client.from('menu').select('*').eq('is_active', true),
      client.from('hall').select('*').eq('is_blocked', false),
      client.from('occasion').select('name'),
      client.from('dish').select('id, name, dietary_type, unit_type, default_food_group, base_price, is_active').eq('is_active', true),
      client.from('dish_pricing').select('dish_id, unit_label, price, price_per_kg, persons_per_unit, size_variant').eq('is_current_price', true),
    ])

    if (menuRes.data && menuRes.data.length > 0) {
      for (const m of menuRes.data as MenuRow[]) {
        const price = Number(m.price_per_pax) || 0
        // A ₹0 (or negative/missing) price means this is a master/template
        // menu row used internally to build real packages from — not
        // something a guest can actually book. Without this filter, the
        // chat was offering a "Custom Menu (₹0/plate)" alongside real
        // priced packages, which is confusing and not a real quote.
        // Real custom-menu quotes are built from the guest's own dish
        // picks (see CUSTOM DISHES INTAKE RULE in the system prompt) or
        // priced per past custom bookings, not from this template row.
        if (price <= 0) continue

        const isOutdoor = (m.menu_type || '').toLowerCase().includes('outdoor')
        const dietLabel = m.dietary_type ? ` [${m.dietary_type.toUpperCase()}]` : ''
        const entry: LiveMenu = {
          id: m.id,
          name: m.name,
          pricePerPax: price,
          dietaryType: m.dietary_type || '',
          description: m.description,
          menuType: m.menu_type || '',
          text: `• ${m.name}${dietLabel}: ₹${m.price_per_pax}/plate${m.description ? ` (${m.description})` : ''}`,
        }
        if (isOutdoor) data.outdoorMenus.push(entry)
        else data.indoorMenus.push(entry)
      }
      data.hasLiveMenus = data.indoorMenus.length > 0 || data.outdoorMenus.length > 0
    }

    if (hallRes.data && hallRes.data.length > 0) {
      data.halls = (hallRes.data as HallRow[]).map(h => {
        const capText = h.capacity ? `${h.capacity} max capacity` : (h.max_pax ? `${h.max_pax} max capacity` : 'capacity on request')
        const acText = h.is_ac ? 'AC' : 'Non-AC'
        const floorText = h.floor ? `, ${h.floor}` : ''
        const priceText = h.full_day_price ? `, Full day ₹${h.full_day_price}` : (h.flat_charge ? `, Flat charge ₹${h.flat_charge}` : '')
        const freeText = h.min_catering_value_for_free ? ` (Free Hall if catering ≥ ₹${h.min_catering_value_for_free})` : ''
        return {
          id: h.id,
          branchId: h.branch_id,
          name: h.name,
          minPax: h.min_pax,
          maxPax: h.max_pax,
          capacity: h.capacity,
          isAc: h.is_ac,
          floor: h.floor,
          flatCharge: h.flat_charge,
          fullDayPrice: h.full_day_price,
          minCateringValueForFree: h.min_catering_value_for_free,
          valetParking: h.valet_parking,
          text: `• ${h.name}: ${capText}, ${acText}${floorText}${priceText}${freeText}`,
        }
      })
      data.hasLiveHalls = true
    }

    if (occRes.data && occRes.data.length > 0) {
      data.occasions = (occRes.data as OccasionRow[]).map(o => o.name)
    }

    if (dishRes.data && dishRes.data.length > 0) {
      const pricingMap = new Map<string, DishPricingRow[]>()
      if (pricingRes.data && pricingRes.data.length > 0) {
        for (const p of pricingRes.data as DishPricingRow[]) {
          const arr = pricingMap.get(p.dish_id) || []
          arr.push(p)
          pricingMap.set(p.dish_id, arr)
        }
      }

      for (const d of dishRes.data as DishRow[]) {
        const p = pricingMap.get(d.id)?.[0]
        const diet = d.dietary_type ? ` [${d.dietary_type.toUpperCase()}]` : ''
        let priceStr = ''
        let price: number | null = null
        if (p) {
          price = Number(p.price) || null
          const unit = p.unit_label ? ` (${p.unit_label})` : ''
          const pax = p.persons_per_unit ? ` [serves ~${p.persons_per_unit}]` : ''
          priceStr = `: ₹${p.price}${unit}${pax}`
        } else if (d.base_price) {
          price = Number(d.base_price) || null
          priceStr = `: ₹${d.base_price}/portion`
        }

        const category = categorize(d.name, d.default_food_group)
        const entry: LiveDish = {
          id: d.id,
          name: d.name,
          dietaryType: d.dietary_type,
          price,
          unitLabel: p?.unit_label || null,
          personsPerUnit: p?.persons_per_unit || null,
          category,
          text: `• ${d.name}${diet}${priceStr}`,
        }
        data.dishesByCategory[category].push(entry)
      }
      data.hasLiveDishes = Object.values(data.dishesByCategory).some(arr => arr.length > 0)
    }
  } catch (e) {
    console.warn('Failed querying eventmgmt tables in Supabase — catering quotes will use the generic fallback estimate.', e)
  }

  liveCache = { data, at: Date.now() }
  return data
}

/**
 * Looks up the real `branches.id` for a branch name (e.g. "Peerzadiguda",
 * "Hayathnagar", "Malkapur"). Returns null if the table can't be reached or
 * no branch matches — callers must handle null rather than guessing a UUID.
 */
export async function getBranchIdByName(branchName: string): Promise<string | null> {
  if (!branchName) return null
  const client = sbPublic()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('branches')
      .select('id, name')
      .ilike('name', `%${branchName}%`)
      .limit(1)
    if (error || !data || data.length === 0) return null
    return (data[0] as BranchRow).id
  } catch (e) {
    console.warn(`Branch lookup failed for "${branchName}":`, e)
    return null
  }
}

/**
 * Looks up the real `eventmgmt.occasion.id` for an occasion name (e.g.
 * "Wedding", "Birthday Party"). Returns null if unreachable or no match —
 * callers must handle null (booking-intelligence lookups simply broaden the
 * search to "any occasion" when this comes back null, rather than guessing).
 */
export async function getOccasionIdByName(occasionName: string): Promise<string | null> {
  if (!occasionName) return null
  const client = sbEvent()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('occasion')
      .select('id, name')
      .ilike('name', `%${occasionName}%`)
      .limit(1)
    if (error || !data || data.length === 0) return null
    return (data[0] as { id: string }).id
  } catch (e) {
    console.warn(`Occasion lookup failed for "${occasionName}":`, e)
    return null
  }
}

/**
 * Real per-package dish composition, read from the actual menu builder
 * tables (never written to by this app — SELECT only):
 *   menu -> menu_categories -> category
 *                          \-> menu_sections -> section_dish -> dish
 *
 * Until now the chat only ever had a package's price + free-text
 * description, so its itemized dish lists were illustrative template text.
 * This gives it the real dishes per package, which sections are
 * customer-choosable ("choose any 2") vs fixed, and which carry an
 * upcharge — grounded in the same menu builder the operations team uses.
 *
 * Cached alongside the other live catering data (20 min TTL).
 */
let menuBreakdownCache: { map: Map<string, string>; at: number } | null = null

export async function getIndoorMenuDishBreakdown(): Promise<Map<string, string>> {
  if (menuBreakdownCache && Date.now() - menuBreakdownCache.at < TTL_MS) return menuBreakdownCache.map

  const map = new Map<string, string>()
  const client = sbEvent()
  if (!client) {
    menuBreakdownCache = { map, at: Date.now() }
    return map
  }

  try {
    const [mcRes, catRes, sectionRes, sdRes, dishRes] = await Promise.all([
      client.from('menu_categories').select('id, menu_id, category_id, display_order').order('display_order'),
      client.from('category').select('id, name').eq('is_active', true),
      client.from('menu_sections').select('id, menu_category_id, name, display_name, selection_limit, is_addon, is_accompaniment, sort_order').order('sort_order'),
      client.from('section_dish').select('id, section_id, dish_id, is_default, extra_price, display_order').order('display_order'),
      client.from('dish').select('id, name, dietary_type').eq('is_active', true),
    ])

    if (!mcRes.data || mcRes.data.length === 0) {
      menuBreakdownCache = { map, at: Date.now() }
      return map
    }

    const catNameById = new Map((catRes.data || []).map((c: any) => [c.id, c.name]))
    const dishById = new Map((dishRes.data || []).map((d: any) => [d.id, d]))
    const sectionsByMenuCatId = new Map<string, any[]>()
    for (const s of sectionRes.data || []) {
      const arr = sectionsByMenuCatId.get(s.menu_category_id) || []
      arr.push(s)
      sectionsByMenuCatId.set(s.menu_category_id, arr)
    }
    const dishesBySectionId = new Map<string, any[]>()
    for (const sd of sdRes.data || []) {
      const arr = dishesBySectionId.get(sd.section_id) || []
      arr.push(sd)
      dishesBySectionId.set(sd.section_id, arr)
    }

    // Group menu_categories rows by menu_id so we can build one block per menu.
    const byMenu = new Map<string, any[]>()
    for (const mc of mcRes.data as any[]) {
      const arr = byMenu.get(mc.menu_id) || []
      arr.push(mc)
      byMenu.set(mc.menu_id, arr)
    }

    for (const [menuId, mcRows] of byMenu.entries()) {
      const lines: string[] = []
      for (const mc of mcRows) {
        const catName = catNameById.get(mc.category_id) || 'Section'
        const sections = sectionsByMenuCatId.get(mc.id) || []
        if (sections.length === 0) continue
        lines.push(`  ### ${catName}`)
        for (const sec of sections) {
          const dishRows = dishesBySectionId.get(sec.id) || []
          if (dishRows.length === 0) continue
          const limitNote = sec.selection_limit ? ` (choose any ${sec.selection_limit})` : ''
          const addonNote = sec.is_addon ? ' [add-on, extra charge applies]' : ''
          const complimentaryNote = sec.is_accompaniment ? ' [complimentary]' : ''
          const label = sec.display_name || sec.name || 'Options'
          lines.push(`    • ${label}${limitNote}${addonNote}${complimentaryNote}:`)
          for (const sd of dishRows) {
            const d = dishById.get(sd.dish_id)
            if (!d) continue
            const diet = d.dietary_type ? ` [${d.dietary_type}]` : ''
            const def = sd.is_default ? ' (default)' : ''
            const extra = sd.extra_price ? ` (+₹${sd.extra_price})` : ''
            lines.push(`      - ${d.name}${diet}${def}${extra}`)
          }
        }
      }
      if (lines.length > 0) map.set(menuId, lines.join('\n'))
    }
  } catch (e) {
    console.warn('Failed querying menu_categories/menu_sections/section_dish for dish breakdown — indoor menus will fall back to price-only text.', e)
  }

  menuBreakdownCache = { map, at: Date.now() }
  return map
}

// Verified defaults — used ONLY as text for the AI's context when the live
// tables above are empty/unreachable, so the assistant still has *something*
// sane to say. These are never used for the actual quote math; see
// lib/catering-portions.ts, which requires live data or falls back to a
// clearly-generic estimate instead of these numbers.
const FALLBACK_HALLS_TEXT = [
  '• (fallback — no live hall data) SANGAMAM Hall (Peerzadiguda 4th Floor): 250–500 pax, Grand AC Banquet',
  '• (fallback — no live hall data) ARANGAM / MAGUDAM Hall (Peerzadiguda 3rd Floor): 100–150 pax, AC Banquet',
  '• (fallback — no live hall data) MADURAM Hall (Peerzadiguda 1st Floor): 50–100 pax, AC Banquet',
  '• (fallback — no live hall data) Classic Hall (Peerzadiguda Ground Floor): Up to 220 pax, AC Banquet',
  '• (fallback — no live hall data) HAYATHNAGAR SANGAM Hall (Hayathnagar 2nd Floor): 50–200 pax, AC Banquet',
]
const FALLBACK_OCCASIONS = ['Weddings', 'Engagements', 'Receptions', 'Birthdays', 'Corporate Meetings', 'House Parties', 'Anniversaries']

/**
 * Returns formatted Indoor & Outdoor Catering context for Arjun (Chat AI assistant).
 */
export async function getSangamCateringChatContext(): Promise<string> {
  if (textCache && Date.now() - textCache.at < TTL_MS) return textCache.text

  const [live, dishBreakdownMap] = await Promise.all([
    getSangamCateringLiveData(),
    getIndoorMenuDishBreakdown(),
  ])

  const hallLines = live.hasLiveHalls ? live.halls.map(h => h.text) : FALLBACK_HALLS_TEXT
  const indoorMenuLines = live.indoorMenus.length > 0 ? live.indoorMenus.flatMap(m => {
    const breakdown = dishBreakdownMap.get(m.id)
    return breakdown ? [m.text, breakdown] : [m.text]
  }) : [
    '• (fallback — no live menu data on file. Do NOT invent prices — tell the guest to confirm current packages by calling +91 90638 44021.)'
  ]
  const outdoorMenuLines = live.outdoorMenus.length > 0 ? live.outdoorMenus.map(m => m.text) : [
    '• (fallback — no live outdoor menu data on file. Do NOT invent prices — tell the guest to confirm current spreads by calling +91 90638 44021.)'
  ]
  const occasionsList = live.occasions.length > 0 ? live.occasions : FALLBACK_OCCASIONS
  const cd = live.dishesByCategory

  const text = [
    live.hasLiveHalls && live.hasLiveMenus
      ? 'REAL DATABASE CATERING & EVENT PRICING (source: eventmgmt.dish, eventmgmt.dish_pricing, eventmgmt.hall, eventmgmt.menu, eventmgmt.occasion — this is the ONLY source of truth for prices; do not use any other number you may recall):'
      : 'CATERING & EVENT PRICING — LIVE DATABASE UNAVAILABLE OR EMPTY RIGHT NOW. Do not state exact prices as fact; tell the guest current pricing will be confirmed by our catering manager at +91 90638 44021.',
    '',
    '1. SERVICE TYPES SUPPORTED:',
    '  - `inhouse`: Indoor Catering in AC Banquet Halls',
    '  - `outdoor`: Outdoor Catering for Lawns, Event Venues, Home Functions & Live Counter Setups',
    '  - `inhouse-meeting`: Corporate Meetings, Conferences & Executive Banquet Sessions',
    '',
    '2. INDOOR BANQUET HALLS & CAPACITIES:',
    ...hallLines,
    '',
    '3. INDOOR CATERING MENUS & PER-PLATE PRICES:',
    ...indoorMenuLines,
    '',
    '4. OUTDOOR CATERING PACKAGES & LIVE COUNTERS:',
    ...outdoorMenuLines,
    '',
    '5. REAL OUTDOOR DISH CATALOG BY CATEGORY (eventmgmt.dish_pricing):',
    ...(cd.biryanis.length > 0 ? ['  [BIRYANI & RICE TRAYS (1 Tray serves 25-30 pax)]:', ...cd.biryanis.slice(0, 15).map(d => d.text)] : []),
    ...(cd.starters.length > 0 ? ['  [STARTERS & APPETIZERS (1 Tray serves 40-50 pax)]:', ...cd.starters.slice(0, 15).map(d => d.text)] : []),
    ...(cd.curries.length > 0 ? ['  [CURRIES & GRAVIES (1 Tray serves 35-45 pax)]:', ...cd.curries.slice(0, 15).map(d => d.text)] : []),
    ...(cd.breads.length > 0 ? ['  [BREADS & ROTIS]:', ...cd.breads.slice(0, 10).map(d => d.text)] : []),
    ...(cd.desserts.length > 0 ? ['  [DESSERTS & SWEETS (1 Tray serves 35-40 pax)]:', ...cd.desserts.slice(0, 10).map(d => d.text)] : []),
    ...(cd.beverages.length > 0 ? ['  [BEVERAGES & WELCOME DRINKS]:', ...cd.beverages.slice(0, 10).map(d => d.text)] : []),
    '',
    '6. OCCASIONS COVERED:',
    `  - ${occasionsList.join(', ')}`,
    '',
    'CATERING INTAKE & QUOTE RULES FOR ARJUN:',
    '1. STEP 1 — CONFIRM SERVICE TYPE (INDOOR vs OUTDOOR): When a guest asks about catering, ask if they need INDOOR Banquet Halls or OUTDOOR Catering (lawns, home, venues).',
    '2. STEP 2 — COLLECT EVENT DETAILS: Event date, location/branch, guest count (Adults + Kids). Apply 2 kids = 1 adult math.',
    '3. STEP 3 — CALCULATE ITEMIZED TRAY OR PACKAGE ESTIMATE: Use exact tray or per-plate pricing from the real catalog above — never a number you are not shown here.',
    '4. STEP 4 — SAVING QUOTE: Offer to save the quote for 10 days by asking for their WhatsApp number.',
    '5. When phone number is shared, quote is automatically saved in the database with reference ID (e.g. SGM-XXXX).'
  ].join('\n')

  textCache = { text, at: Date.now() }
  return text
}
