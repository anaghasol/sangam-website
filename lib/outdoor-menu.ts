/**
 * Outdoor menu suggestions (2026-10-25).
 *
 * "Suggest me a menu" for OUTDOOR catering used to be answered from the
 * indoor banquet packages (the AI prompt carried every indoor menu and its
 * dish breakdown, and the scripted fallback priced one dish per section from
 * the dish catalog the indoor packages are built from). An outdoor spread is
 * dish-by-dish and has no package, so it is built here, in this order of
 * preference — each section (starters, curries, ...) is filled from the
 * first tier that has dishes for it, then topped up from the next:
 *
 *   1. KNOWLEDGE BASE   — outdoor menus the team has written into
 *                         sangam.knowledge_chunks ("Starters: A, B, C").
 *   2. PAST BOOKINGS    — dishes most often chosen on past outdoor orders
 *                         (for the same event/occasion when there is one).
 *   3. TRENDING ITEMS   — best sellers from the PetPooja sales data.
 *   4. SOUTH SEED MENU  — the Andhra / Telangana / Hyderabadi starter menu
 *                         below. Edit SOUTH_SEED_MENU to change what is
 *                         offered when nothing else is on file yet.
 *
 * Diet is always applied: a Pure Veg guest never gets a non-veg dish from any
 * tier. Prices are never taken from here — see quoteOutdoorSuggestion.
 */
import type { CateringLiveData, LiveDish } from '@/lib/sangam-catering'
import type { generatePopularCateringQuote } from '@/lib/catering-portions'
import { DEFAULT_PERSONS_PER_UNIT } from '@/lib/catering-portions'

export type OutdoorDiet = 'veg' | 'non-veg'
export type OutdoorSource = 'knowledge' | 'past-bookings' | 'trending' | 'seed'
export type OutdoorSectionKey = 'drinks' | 'starters' | 'curries' | 'rice' | 'breads' | 'desserts'

export type OutdoorSection = { key: OutdoorSectionKey; label: string; icon: string; dishes: string[] }
export type OutdoorSuggestion = {
  diet: OutdoorDiet
  occasion: string | null
  sections: OutdoorSection[]
  /** The highest-priority tier that actually contributed a dish. */
  source: OutdoorSource
  sourcesUsed: OutdoorSource[]
}

export const OUTDOOR_SECTIONS: Array<{ key: OutdoorSectionKey; label: string; icon: string }> = [
  { key: 'drinks', label: 'Welcome Drinks', icon: '🍹' },
  { key: 'starters', label: 'Starters & Appetizers', icon: '🥗' },
  { key: 'curries', label: 'Main Course Curries & Dals', icon: '🍛' },
  { key: 'rice', label: 'Rice & Biryani', icon: '🍚' },
  { key: 'breads', label: 'Live Breads & Counters', icon: '🫓' },
  { key: 'desserts', label: 'Sweets & Desserts', icon: '🍨' },
]

/**
 * The starter menu used when the knowledge base, past outdoor bookings and
 * sales data have nothing for a section. South Indian (Andhra / Telangana /
 * Hyderabadi) and ordered best-first. Add or reorder dishes here later.
 */
export const SOUTH_SEED_MENU: Record<OutdoorDiet, Record<OutdoorSectionKey, string[]>> = {
  veg: {
    drinks: ['Majjiga (Spiced Buttermilk)', 'Sweet Lime Juice', 'Fresh Mint Mojito'],
    starters: ['Gobi 65', 'Paneer 65', 'Mirchi Bajji', 'Masala Vada', 'Veg Cutlet', 'Corn Pakoda'],
    curries: ['Gutti Vankaya Curry', 'Paneer Butter Masala', 'Dal Tadka', 'Bendakaya Fry', 'Mixed Veg Kurma', 'Sambar'],
    rice: ['Veg Dum Biryani', 'Bagara Rice', 'Pulihora', 'Curd Rice'],
    breads: ['Pulka', 'Butter Naan', 'Live Dosa Counter'],
    desserts: ['Double Ka Meetha', 'Gulab Jamun', 'Bobbatlu', 'Payasam', 'Qubani Ka Meetha'],
  },
  'non-veg': {
    drinks: ['Majjiga (Spiced Buttermilk)', 'Sweet Lime Juice', 'Fresh Mint Mojito'],
    starters: ['Chicken 65', 'Apollo Fish', 'Paneer 65', 'Mutton Seekh Kebab', 'Chilli Chicken', 'Gobi 65'],
    curries: ['Andhra Chicken Curry', 'Gongura Mutton', 'Paneer Butter Masala', 'Dal Tadka', 'Gutti Vankaya Curry', 'Sambar'],
    rice: ['Hyderabadi Chicken Dum Biryani', 'Veg Dum Biryani', 'Mutton Dum Biryani', 'Bagara Rice', 'Curd Rice'],
    breads: ['Pulka', 'Butter Naan', 'Live Dosa Counter'],
    desserts: ['Double Ka Meetha', 'Gulab Jamun', 'Bobbatlu', 'Payasam', 'Qubani Ka Meetha'],
  },
}

type Limits = Record<OutdoorSectionKey, number>
const BASE_LIMITS: Limits = { drinks: 1, starters: 3, curries: 4, rice: 2, breads: 2, desserts: 2 }

/** How many dishes each section gets, by event: weddings are grander, office lunches leaner. */
export function sectionLimitsFor(occasion: string | null): Limits {
  const o = (occasion || '').toLowerCase()
  if (/wedding|reception|engagement|sangeet|haldi/.test(o)) return { drinks: 2, starters: 4, curries: 5, rice: 3, breads: 3, desserts: 3 }
  if (/corporate|office|meeting/.test(o)) return { ...BASE_LIMITS, starters: 3, desserts: 1 }
  if (/birthday|party|anniversary|celebration|get.?together|farmhouse/.test(o)) return { ...BASE_LIMITS, starters: 4 }
  if (/housewarming|gruhapravesam|gruhapravesh|pooja|puja/.test(o)) return { ...BASE_LIMITS, desserts: 3 }
  return BASE_LIMITS
}

const NON_VEG_RE = /chicken|mutton|lamb|fish|prawn|shrimp|\begg|keema|kodi|crab|apollo|seekh|tangdi|gosht|liver|boti|bheja|kaleji|pomfret|vanjaram|royyala|chepa|meen|beef/i
export const isNonVegDish = (name: string): boolean => NON_VEG_RE.test(name)

const STARTER_SPECIFIC_RE = /vada|bajji|bonda|pakoda|pakora|garelu|cutlet|\b65\b|manchurian|tikka|kebab|kabab|lollipop|majestic|spring roll|samosa|finger|apollo|seekh|tangdi|crispy|chilli (?:chicken|paneer|gobi|fish|baby corn|mushroom)/i
const CURRY_RE = /curry|masala|korma|kurma|kuruma|\bdal\b|pappu|sambar|rasam|kura\b|pulusu|gravy|salan|kootu|vankaya|bendakaya|dondakaya|gongura|palak|kadai|saag|makhani|raita|pachadi|chutney/i

/** Which outdoor section a dish name belongs to; null when it isn't a catering dish we can place. */
export function sectionForDish(name: string): OutdoorSectionKey | null {
  const n = name.toLowerCase()
  if (/meetha|jamun|halwa|kheer|payasam|payasa|bobbat|ice cream|jalebi|rasmalai|gajar|laddu|mysore pak|pootharekulu|rabdi|falooda|qubani|khubani|kesari|sweets?\b(?! lime)/.test(n)) return 'desserts'
  if (/biryani|pulao|pulihora|\brice\b|bagara|palav|khichdi|pongal/.test(n)) return 'rice'
  if (/naan|roti|pulka|phulka|chapati|paratha|kulcha|poori|\bpuri\b|dosa|live counter/.test(n)) return 'breads'
  if (/majjiga|buttermilk|lassi|mojito|juice|punch|mocktail|soda|sharbat|badam milk/.test(n)) return 'drinks'
  if (STARTER_SPECIFIC_RE.test(n)) return 'starters'
  if (CURRY_RE.test(n)) return 'curries'
  if (/\bfry\b|\bfried\b/.test(n)) return 'starters'
  return null
}

function sectionForLabel(label: string): OutdoorSectionKey | null {
  const l = label.toLowerCase()
  if (/drink|beverage|mocktail/.test(l)) return 'drinks'
  if (/starter|appetizer|snack/.test(l)) return 'starters'
  if (/curr|dal|gravy|main/.test(l)) return 'curries'
  if (/rice|biryani/.test(l)) return 'rice'
  if (/bread|roti|counter|tandoor/.test(l)) return 'breads'
  if (/dessert|sweet/.test(l)) return 'desserts'
  return null
}

const cleanName = (raw: string): string =>
  raw.replace(/\(.*?\)/g, ' ').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim()

/** "Starters: Gobi 65, Mirchi Bajji" lines (the knowledge-base format) → dishes per section. */
export function parseKnowledgeMenu(chunks: string[]): Partial<Record<OutdoorSectionKey, string[]>> {
  const out: Partial<Record<OutdoorSectionKey, string[]>> = {}
  for (const chunk of chunks) {
    for (const line of chunk.split(/\r?\n/)) {
      const m = line.match(/^[\s\-•*#>]*([A-Za-z][A-Za-z &/]{2,40}?)\s*[:—–-]\s*(.+)$/)
      if (!m) continue
      const key = sectionForLabel(m[1])
      if (!key) continue
      const dishes = m[2].split(/[,;|]/).map(cleanName).filter(d => d.length >= 3 && d.length <= 45)
      if (dishes.length > 0) out[key] = [...(out[key] || []), ...dishes]
    }
  }
  return out
}

function groupBySection(names: string[]): Partial<Record<OutdoorSectionKey, string[]>> {
  const out: Partial<Record<OutdoorSectionKey, string[]>> = {}
  for (const raw of names) {
    const name = cleanName(raw)
    if (name.length < 3 || name.length > 45) continue
    const key = sectionForDish(name)
    if (key) out[key] = [...(out[key] || []), name]
  }
  return out
}

export type OutdoorSuggestionInputs = {
  diet: OutdoorDiet
  occasion?: string | null
  /** Raw knowledge-base chunks about outdoor menus. */
  knowledge?: string[]
  /** Dishes from past outdoor bookings, most-chosen first. */
  pastDishes?: string[]
  /** Best-selling dishes from sales data, best first. */
  trendingDishes?: string[]
}

/** Pure: fills every section from the tiers in priority order. */
export function composeOutdoorSuggestion(input: OutdoorSuggestionInputs): OutdoorSuggestion {
  const { diet } = input
  const limits = sectionLimitsFor(input.occasion ?? null)
  const allowed = (d: string) => diet === 'non-veg' || !isNonVegDish(d)
  const tiers: Array<[OutdoorSource, Partial<Record<OutdoorSectionKey, string[]>>]> = [
    ['knowledge', parseKnowledgeMenu(input.knowledge || [])],
    ['past-bookings', groupBySection(input.pastDishes || [])],
    ['trending', groupBySection(input.trendingDishes || [])],
    ['seed', SOUTH_SEED_MENU[diet]],
  ]

  const used = new Set<OutdoorSource>()
  const sections: OutdoorSection[] = OUTDOOR_SECTIONS.map(meta => {
    const picked: string[] = []
    const seen = new Set<string>()
    for (const [source, bySection] of tiers) {
      for (const dish of bySection[meta.key] || []) {
        if (picked.length >= limits[meta.key]) break
        if (!allowed(dish) || seen.has(dish.toLowerCase())) continue
        seen.add(dish.toLowerCase())
        picked.push(dish)
        used.add(source)
      }
    }
    return { ...meta, dishes: picked }
  }).filter(s => s.dishes.length > 0)

  const order: OutdoorSource[] = ['knowledge', 'past-bookings', 'trending', 'seed']
  const sourcesUsed = order.filter(s => used.has(s))
  return { diet, occasion: input.occasion ?? null, sections, source: sourcesUsed[0] ?? 'seed', sourcesUsed }
}

export const suggestionDishNames = (s: OutdoorSuggestion): string[] => s.sections.flatMap(sec => sec.dishes)

const SOURCE_NOTE: Record<OutdoorSource, string> = {
  knowledge: 'curated by our catering team',
  'past-bookings': 'based on the dishes our outdoor guests order most',
  trending: 'built from our best-selling dishes',
  seed: 'a classic South Indian (Andhra / Hyderabadi) spread',
}

/** One line telling the guest where the spread came from. */
export function describeSuggestionSource(s: OutdoorSuggestion): string {
  return SOURCE_NOTE[s.source]
}

type Quote = ReturnType<typeof generatePopularCateringQuote>

const SECTION_UNIT: Record<OutdoorSectionKey, string> = {
  drinks: 'beverage', starters: 'starter', curries: 'curry', rice: 'biryani', breads: 'bread', desserts: 'dessert',
}

export function findLiveDish(name: string, live?: CateringLiveData): LiveDish | null {
  if (!live) return null
  const n = name.toLowerCase().trim()
  let partial: LiveDish | null = null
  for (const dishes of Object.values(live.dishesByCategory)) {
    for (const d of dishes) {
      const dn = (d.name || '').toLowerCase().trim()
      if (dn === n) return d
      if (!partial && dn.length >= 5 && n.length >= 5 && (dn.includes(n) || n.includes(dn))) partial = d
    }
  }
  return partial
}

/**
 * Prices a suggested spread from the live dish catalog only. A dish with no
 * live price is listed as "to be confirmed" — never given a guessed rate — so
 * the plate rate and total cover just the dishes that are actually priced.
 */
export function quoteOutdoorSuggestion(s: OutdoorSuggestion, guestCount: number, live?: CateringLiveData): Quote {
  let subtotal = 0
  let anyPriced = false
  const tray: string[] = [`• Guest Count: **${guestCount} Pax** (Suggested Spread Sizing)`]
  const unpriced: string[] = []

  const menuItems = s.sections.map(sec => {
    const lines = sec.dishes.map(name => {
      const d = findLiveDish(name, live)
      const unitKey = SECTION_UNIT[sec.key]
      const isBread = sec.key === 'breads'
      const perUnit = isBread ? 1 : (d?.personsPerUnit ?? DEFAULT_PERSONS_PER_UNIT[unitKey] ?? DEFAULT_PERSONS_PER_UNIT.others)
      const qty = isBread ? Math.round(guestCount * 2.5) : Math.max(1, Math.ceil(guestCount / perUnit))
      const unit = isBread ? 'pcs' : (d?.unitLabel || 'Tray')
      const plural = qty > 1 && !isBread ? 's' : ''
      if (d && d.price != null) {
        const cost = qty * d.price
        subtotal += cost
        anyPriced = true
        tray.push(`• ${name}: **${qty} ${unit}${plural}** — ₹${cost.toLocaleString('en-IN')}`)
        return `${name} (${qty} ${unit}${plural} × ₹${d.price} = ₹${cost.toLocaleString('en-IN')})`
      }
      unpriced.push(name)
      tray.push(`• ${name}: **${qty} ${unit}${plural}** — pricing to be confirmed`)
      return `${name} (${qty} ${unit}${plural} — pricing to be confirmed by our catering manager)`
    })
    return `### ${sec.icon} ${sec.label}\n${lines.map(l => `• ${l}`).join('\n')}`
  })
  if (unpriced.length > 0) menuItems.push(`• ⚠️ Pricing to be confirmed by our catering manager for: ${unpriced.join(', ')} (not yet on our live price list)`)

  const dietLabel = s.diet === 'veg' ? 'Pure Veg' : 'Non-Veg'
  return {
    headline: `🚚 **Outdoor Catering Suggested Spread — ${dietLabel}${s.occasion ? ` · ${s.occasion.replace(/\b[a-z]/g, c => c.toUpperCase())}` : ''}** *(${describeSuggestionSource(s)})*`,
    menuItems,
    trayBreakdown: tray,
    pricePerPlate: anyPriced && guestCount > 0 ? Math.round(subtotal / guestCount) : 0,
    subtotal,
    finalTotal: subtotal,
    usedLiveData: anyPriced,
    usedBranchMatchedHall: false,
    usedRealMenuBreakdown: false,
    hallFeeStatus: 'unknown',
    hallFreeThreshold: null,
    sections: [],
  }
}

/** Fetches the tier inputs from the database, then composes. Every lookup degrades to "nothing on file". */
export async function getOutdoorSuggestion(opts: {
  diet: OutdoorDiet
  occasion: string | null
  occasionId: string | null
}): Promise<OutdoorSuggestion> {
  // Imported lazily so composeOutdoorSuggestion stays usable (and testable)
  // without the Supabase-backed modules.
  const [{ searchOutdoorMenuKnowledge }, { getPopularOutdoorDishNames }, { getTrendingDishNames }] = await Promise.all([
    import('@/lib/sangam-knowledge'),
    import('@/lib/sangam-booking-intelligence'),
    import('@/lib/sangam-sales'),
  ])
  const [knowledge, past, trending] = await Promise.all([
    searchOutdoorMenuKnowledge(opts.occasion).catch(() => [] as string[]),
    getPopularOutdoorDishNames(opts.occasionId, 24).catch(() => []),
    getTrendingDishNames(opts.diet === 'veg').catch(() => [] as string[]),
  ])
  return composeOutdoorSuggestion({
    diet: opts.diet,
    occasion: opts.occasion,
    knowledge,
    pastDishes: past.map(p => p.name),
    trendingDishes: trending,
  })
}
