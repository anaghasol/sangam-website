/**
 * Catering Portion Intelligence & Pricing Math Engine.
 *
 * Implements industry portion standards for Indian Outdoor & Indoor Catering:
 * - Guest Count Math: 2 Kids = 1 Adult Equivalent Portion.
 * - Biryani / Rice: 1 Full Tray (≈5 kg) feeds 25–30 guests.
 * - Curries / Gravies: 1 Full Tray feeds 35–45 guests (or 80–120 in 10+ dish spreads).
 * - Starters / Appetizers: 1 Full Tray (100–120 pcs) feeds 40–50 guests.
 * - Indian Breads (Naan / Roti / Pulka): 2.5 pieces per adult.
 * - Sweets / Desserts: 1.5 portions per guest.
 *
 * REAL DATA: `generatePopularCateringQuote` takes an optional `live` param
 * (from `getSangamCateringLiveData()` in lib/sangam-catering.ts) and an
 * optional `menuBreakdown` param (from `getIndoorMenuStructured()`, same
 * file). When supplied, the per-plate price and the recommended hall are
 * always taken from the live `eventmgmt.menu` / `eventmgmt.hall` rows, and
 * the itemized "what's included" dish list is built from the real
 * menu -> menu_categories -> menu_sections -> section_dish -> dish join,
 * honoring each section's `selection_limit` ("choose any N"), `is_addon`
 * (extra-charge) and `is_accompaniment` (complimentary) rules exactly as
 * set up in the menu builder — never a hardcoded illustrative list. If no
 * structured breakdown is available for the resolved menu (live data
 * unreachable, or this particular menu has no sections configured yet),
 * it falls back to the old generic price-bracket template so the chat
 * still has *something* to say rather than an empty menu.
 * The returned `usedLiveData` flag tells the caller whether the number
 * quoted actually came from the database or is a generic fallback
 * estimate, and `hallFeeStatus` carries the real "hall is free once
 * catering total reaches ₹X" rule so callers can state it deterministically
 * instead of leaving the AI to guess it from prose.
 */
import type { CateringLiveData, LiveMenu, LiveHall, StructuredMenuSection, DishCategory } from '@/lib/sangam-catering'

export type GuestCountBreakdown = {
  adults: number
  kids: number
  effectiveAdults: number
}

export type TrayRecommendation = {
  dishName: string
  category: 'starter' | 'biryani' | 'curry' | 'bread' | 'dessert' | 'beverage'
  dietaryType: 'veg' | 'non-veg'
  unitType: 'tray' | 'kg' | 'pieces' | 'litre'
  quantity: number
  unitLabel: string
  servesPax: number
  estimatedUnitPrice: number
  totalPrice: number
}

export type CateringQuoteEstimate = {
  serviceType: 'outdoor' | 'inhouse'
  guestCount: GuestCountBreakdown
  items: TrayRecommendation[]
  subtotal: number
  discountPercent: number
  discountAmount: number
  taxPercent: number
  taxAmount: number
  finalTotal: number
}

/**
 * Calculates effective adult guest portions.
 */
export function calculateEffectiveGuests(adults: number, kids = 0): GuestCountBreakdown {
  const safeAdults = Math.max(0, Math.round(adults))
  const safeKids = Math.max(0, Math.round(kids))
  const effectiveAdults = Math.max(1, safeAdults + Math.ceil(safeKids / 2))
  return {
    adults: safeAdults,
    kids: safeKids,
    effectiveAdults
  }
}

/**
 * Calculates required tray count based on dish category and effective guest count.
 */
export function calculateTrayQuantity(category: string, guestCount: number, totalDishesInSpread = 6): number {
  const cat = category.toLowerCase()
  if (cat.includes('biryani') || cat.includes('rice') || cat.includes('pulav')) {
    // 1 tray serves 25-30 pax
    return Math.max(1, Math.ceil(guestCount / 28))
  }
  if (cat.includes('starter') || cat.includes('snack') || cat.includes('kebab') || cat.includes('tikka')) {
    // 1 tray serves 40-50 pax
    return Math.max(1, Math.ceil(guestCount / 45))
  }
  if (cat.includes('curry') || cat.includes('dal') || cat.includes('paneer') || cat.includes('gravy')) {
    const paxPerTray = totalDishesInSpread >= 8 ? 70 : 40
    return Math.max(1, Math.ceil(guestCount / paxPerTray))
  }
  if (cat.includes('dessert') || cat.includes('sweet')) {
    // 1 tray serves 35-40 pax
    return Math.max(1, Math.ceil(guestCount / 35))
  }
  return Math.max(1, Math.ceil(guestCount / 30))
}

/**
 * Generates initial quote with most booked & trendy catering items from real sales data.
 */
// List of known dishes and categories for parsing user custom menus
const COMMON_DISH_CATALOG: Record<string, { category: 'starter' | 'biryani' | 'curry' | 'bread' | 'dessert' | 'side' | 'beverage', isVeg: boolean }> = {
  'aloo mutter paneer': { category: 'curry', isVeg: true },
  'aloo mutter': { category: 'curry', isVeg: true },
  'paneer butter masala': { category: 'curry', isVeg: true },
  'bagara baingan': { category: 'curry', isVeg: true },
  'cabbage pakoda': { category: 'starter', isVeg: true },
  'masala vada': { category: 'starter', isVeg: true },
  'veg manchurian': { category: 'starter', isVeg: true },
  'paneer 65': { category: 'starter', isVeg: true },
  'paneer tikka': { category: 'starter', isVeg: true },
  'crispy corn': { category: 'starter', isVeg: true },
  'chicken 65': { category: 'starter', isVeg: false },
  'tangdi kebab': { category: 'starter', isVeg: false },
  'pepper chicken': { category: 'starter', isVeg: false },
  'gongura mutton curry': { category: 'curry', isVeg: false },
  'gongura chicken curry': { category: 'curry', isVeg: false },
  'dum ka chicken': { category: 'curry', isVeg: false },
  'butter chicken': { category: 'curry', isVeg: false },
  'palak dal': { category: 'curry', isVeg: true },
  'dal tadka': { category: 'curry', isVeg: true },
  'dal makhani': { category: 'curry', isVeg: true },
  'sambar': { category: 'curry', isVeg: true },
  'dosakaya': { category: 'curry', isVeg: true },
  'chamagadda pulusu': { category: 'curry', isVeg: true },
  'double ka meetha': { category: 'dessert', isVeg: true },
  'quarbani ka meetha': { category: 'dessert', isVeg: true },
  'gulab jamun': { category: 'dessert', isVeg: true },
  'rava kesari': { category: 'dessert', isVeg: true },
  'green salad': { category: 'side', isVeg: true },
  'kosambari salad': { category: 'side', isVeg: true },
  'kimchi salad': { category: 'side', isVeg: true },
  'papad': { category: 'side', isVeg: true },
  'plain curd': { category: 'side', isVeg: true },
  'raitha': { category: 'side', isVeg: true },
  'mirchi ka salan': { category: 'side', isVeg: true },
  'pulihora': { category: 'biryani', isVeg: true },
  'veg pulao': { category: 'biryani', isVeg: true },
  'veg biryani': { category: 'biryani', isVeg: true },
  'chicken dum biryani': { category: 'biryani', isVeg: false },
  'mutton dum biryani': { category: 'biryani', isVeg: false },
  'steamed rice': { category: 'biryani', isVeg: true },
  'butter naan': { category: 'bread', isVeg: true },
  'roti': { category: 'bread', isVeg: true },
  'pulka': { category: 'bread', isVeg: true },
  'mojito': { category: 'beverage', isVeg: true },
  'fresh lime mint cooler': { category: 'beverage', isVeg: true }
}

export function extractCustomDishes(text: string): string[] {
  const lower = text.toLowerCase()
  const detected: string[] = []

  for (const dishName of Object.keys(COMMON_DISH_CATALOG)) {
    if (lower.includes(dishName)) {
      detected.push(dishName)
    }
  }
  return detected
}

export type MatchedDish = {
  /** Real `eventmgmt.dish.id` when the name matched the live DB catalog; null when it only matched the static fallback list below (still worth saving the name, just with no real dish_id to attach). */
  dishId: string | null
  name: string
  dietaryType: string | null
  quantity: number
  /**
   * Real per-unit price from `eventmgmt.dish_pricing` (via `live.dishesByCategory`),
   * null when this dish only matched the static fallback catalog (no live
   * row, so no real price exists to use) — never a guessed number.
   */
  price: number | null
  /** How many guests one priced unit (tray/kg/piece) serves, from dish_pricing — null when price is null. */
  personsPerUnit: number | null
  unitLabel: string | null
  /** Live DB category when matched from the real catalog, else the static catalog's own (coarser) category, else 'others'. Used to group dishes and pick a tray-size default when personsPerUnit isn't on file. */
  category: DishCategory | 'starter' | 'biryani' | 'curry' | 'bread' | 'dessert' | 'side' | 'beverage'
}

/**
 * Bug fix (2026-09-30): `extractCustomDishes` only ever matched against the
 * small hardcoded COMMON_DISH_CATALOG list above, so any dish the AI
 * actually recommended straight from the live `eventmgmt.dish` /
 * `eventmgmt.menu` tables (the vast majority of what's shown to a real
 * customer) was invisible to it — this is why a confirmed quote's
 * `menu_selection.sections[].items` and `dish_ids` frequently came back
 * empty even though the customer clearly discussed real dishes. This
 * matches against the LIVE dish catalog first (so we capture the real
 * `dish_id`), and only falls back to the static list for names the live
 * catalog doesn't carry (kept for backwards compatibility / offline data).
 */
export function extractDishesFromText(text: string, live?: CateringLiveData, defaultQuantity = 1): MatchedDish[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const matched = new Map<string, MatchedDish>()

  if (live?.dishesByCategory) {
    for (const dishes of Object.values(live.dishesByCategory)) {
      for (const d of dishes) {
        const dishLower = (d.name || '').toLowerCase().trim()
        if (dishLower.length >= 3 && lower.includes(dishLower) && !matched.has(dishLower)) {
          matched.set(dishLower, {
            dishId: d.id,
            name: d.name,
            dietaryType: d.dietaryType ?? null,
            quantity: defaultQuantity,
            price: d.price,
            personsPerUnit: d.personsPerUnit,
            unitLabel: d.unitLabel,
            category: d.category,
          })
        }
      }
    }
  }

  for (const dishName of Object.keys(COMMON_DISH_CATALOG)) {
    if (lower.includes(dishName) && !matched.has(dishName)) {
      matched.set(dishName, {
        dishId: null,
        name: dishName,
        dietaryType: COMMON_DISH_CATALOG[dishName].isVeg ? 'veg' : 'non-veg',
        quantity: defaultQuantity,
        // No live dish_pricing row for a name that only matched the static
        // fallback list — never guess a price for it (see pickTrayDefault
        // + the "pricing to be confirmed" handling in generatePopularCateringQuote).
        price: null,
        personsPerUnit: null,
        unitLabel: null,
        category: COMMON_DISH_CATALOG[dishName].category,
      })
    }
  }

  return Array.from(matched.values())
}

// Tray-size defaults (guests served per unit) used ONLY when a matched dish
// has no real `persons_per_unit` on file — e.g. it only matched the static
// fallback catalog, not a live `dish_pricing` row. Mirrors the industry
// portion standards documented at the top of this file.
const DEFAULT_PERSONS_PER_UNIT: Record<string, number> = {
  starter: 45, starters: 45,
  biryani: 28, biryanis: 28,
  curry: 38, curries: 38,
  bread: 1, breads: 1, // breads are priced/served per piece, not per tray
  dessert: 35, desserts: 35,
  side: 50, sides: 50,
  beverage: 50,
  others: 40,
}

/**
 * Pulls an explicit, unambiguous event date ("20 Oct 2026") out of free
 * text, as YYYY-MM-DD. Shared by the early hall-availability lookup (so the
 * AI can tell an already-booked hall apart from a free one while it's still
 * recommending one) and the later quote-save step, which previously ran
 * this same regex inline and only ever saw it after the AI's reply already
 * existed — far too late to let availability shape which hall gets offered.
 * Deliberately requires a 4-digit year, same as the original inline regex,
 * rather than guessing one — a wrong guessed year would make a booking
 * look available/unavailable for the wrong date entirely.
 */
export function extractExplicitEventDate(text: string): string | null {
  const dateMatch = text.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})/i)
  if (!dateMatch) return null
  const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }
  const day = dateMatch[1].padStart(2, '0')
  const m = months[dateMatch[2].toLowerCase().slice(0, 3)]
  if (!m) return null
  return `${dateMatch[3]}-${m}-${day}`
}

/**
 * Generates custom or recommended quote based on user input.
 */
/**
 * Picks the real hall a confirmed indoor booking should be attached to —
 * same "fits the guest count, prefer this branch's halls" logic
 * `generatePopularCateringQuote` uses internally to recommend a hall in the
 * quote text, exposed standalone so a later turn (when the customer
 * actually confirms, which may not be the same request that generated the
 * quote) can resolve the same real `eventmgmt.hall.id` to write onto
 * `booking.hall_id` — previously nothing set hall_id on a confirmed
 * booking at all.
 */
// Bug fixes (2026-10-04, event-booking PWA team):
// 1. When a branch_id WAS given but that branch had no halls of its own,
//    this silently fell back to `pool = halls` — every hall across every
//    branch — so it could (and did) hand back a hall belonging to a
//    completely different branch than the one being booked. A known branch
//    with no halls on file now returns null instead of guessing.
// 2. This never checked whether the chosen hall was already booked for the
//    event date — it only matched on capacity. `bookedHallIds` (from
//    `getHallsBookedOnDate` in lib/sangam-catering.ts, for the actual
//    event_date) is now excluded from the pool before picking, so an
//    already-booked hall is skipped in favor of the next best fit rather
//    than being recommended or saved as if it were free.
export function pickHallForGuestCount(
  halls: LiveHall[],
  branchId: string | null,
  guestCount: number,
  bookedHallIds?: Set<string>
): LiveHall | null {
  if (!halls || halls.length === 0) return null
  const pool = (branchId ? halls.filter(h => h.branchId === branchId) : halls)
    .filter(h => !bookedHallIds || !bookedHallIds.has(h.id))
  if (pool.length === 0) return null
  const fits = pool.filter(h => (h.maxPax == null || guestCount <= h.maxPax) && (h.minPax == null || guestCount >= h.minPax))
  return fits.length > 0
    ? fits.reduce((best, h) => (h.maxPax ?? Infinity) < (best.maxPax ?? Infinity) ? h : best)
    : pool.reduce((best, h) => (h.maxPax ?? 0) > (best.maxPax ?? 0) ? h : best)
}

// Common everyday words for a section/category that don't line up with the
// exact DB label (e.g. the real section might be called "Welcome Snacks" or
// "Hot Items" but a customer just says "starters") — used only to WIDEN the
// search for a real section by name; a match still has to land on one of
// this menu's actual sections, never an invented one.
const SECTION_KEYWORD_SYNONYMS: Record<string, string[]> = {
  drinks: ['welcome drinks', 'beverage', 'juice', 'mocktail', 'welcome drink'],
  soup: ['soup'],
  salad: ['salad'],
  starter: ['starter', 'appetizer', 'snack', 'welcome snack'],
  bread: ['bread', 'naan', 'roti', 'kulcha', 'poori', 'flatbread'],
  rice: ['rice', 'biryani', 'pulao'],
  curry: ['curry', 'curries', 'gravy', 'main course', 'main curries'],
  dal: ['dal', 'lentil', 'sambar', 'rasam'],
  accompaniment: ['accompaniment', 'raita', 'curd', 'pickle', 'pachadi', 'papad'],
  dessert: ['dessert', 'sweet', 'sweets', 'ice cream', 'ice-cream'],
  extra: ['extra', 'add-on', 'addon'],
}

/**
 * Finds the real section (from THIS menu's actual structured breakdown —
 * never a guess outside it) that a piece of free customer text is most
 * likely referring to, by checking the section's own name, its category
 * name, and a small set of everyday synonyms against the text. Returns
 * null when nothing in the real breakdown matches — callers must never
 * fabricate a section when this returns null.
 */
export function matchSectionByText(sections: StructuredMenuSection[], text: string): StructuredMenuSection | null {
  if (!sections || sections.length === 0 || !text) return null
  const lower = text.toLowerCase()

  // 1. Exact-ish match against the section's own real name/category first —
  // the strongest possible signal since it's the literal DB label.
  for (const sec of sections) {
    if (sec.sectionName && lower.includes(sec.sectionName.toLowerCase())) return sec
  }
  for (const sec of sections) {
    if (sec.categoryName && lower.includes(sec.categoryName.toLowerCase())) return sec
  }

  // 2. Fall back to everyday synonyms, matched against both the section's
  // and its category's real name — picks the first section under a
  // matching category if the customer didn't name the specific sub-section.
  for (const [, synonyms] of Object.entries(SECTION_KEYWORD_SYNONYMS)) {
    if (!synonyms.some(s => lower.includes(s))) continue
    for (const sec of sections) {
      const hay = `${sec.sectionName} ${sec.categoryName}`.toLowerCase()
      if (synonyms.some(s => hay.includes(s))) return sec
    }
  }
  return null
}

/**
 * Scans free customer text for any dish name that's actually in the given
 * section's real catalog (`sec.dishes` — the FULL list, not just what's
 * shown by default). Only ever returns dishes that are genuinely on file
 * for that exact section, so a swap built from this can never invent or
 * misattribute a dish.
 */
export function findDishesInSectionFromText(section: StructuredMenuSection, text: string): StructuredMenuSection['dishes'] {
  if (!section || !text) return []
  const lower = text.toLowerCase()
  return section.dishes.filter(d => d.name && lower.includes(d.name.toLowerCase()))
}

export function generatePopularCateringQuote(
  serviceType: 'outdoor' | 'inhouse' | 'custom',
  branch: string,
  guestCount = 100,
  isVegOnly = false,
  extraModifications: string[] = [],
  userMessageText = '',
  live?: CateringLiveData,
  /** Real `branches.id` for the branch the guest picked, if resolved — used to restrict hall selection to that branch's halls. */
  branchId?: string | null,
  /** Real per-menu section/dish breakdown, keyed by `eventmgmt.menu.id` — from `getIndoorMenuStructured()`. */
  menuBreakdown?: Map<string, StructuredMenuSection[]>,
  /**
   * Customer-chosen dish swaps, keyed by the real `sectionName` (as it
   * appears in that menu's structured breakdown) to the dish name(s) the
   * customer picked to replace the default/most-booked selection with.
   * Every name here is expected to already be validated against that
   * section's real `dishes` catalog by the caller (see
   * `matchSectionByText`/`findDishesInSectionFromText` below) — this
   * function still re-validates by matching case-insensitively against
   * `sec.dishes`, and silently ignores a name that isn't actually in that
   * section's real catalog rather than inventing a dish.
   */
  sectionOverrides?: Record<string, string[]>
): {
  headline: string
  menuItems: string[]
  trayBreakdown: string[]
  pricePerPlate: number
  subtotal: number
  finalTotal: number
  /** True when pricePerPlate (and, for indoor, the hall) came from a live DB row rather than a generic fallback. */
  usedLiveData: boolean
  /** True when a hall was actually picked from this branch's halls (as opposed to any branch, or a guess). */
  usedBranchMatchedHall: boolean
  /** True when the itemized dish list came from the real menu_sections/section_dish tables rather than a hardcoded template. */
  usedRealMenuBreakdown: boolean
  /** The real "hall is free once catering total reaches ₹X" rule outcome — 'unknown' when the chosen hall has no threshold on file. */
  hallFeeStatus: 'waived' | 'not_waived' | 'unknown'
  /** The threshold itself, when known, so callers can state "₹X more to waive the hall fee" etc. */
  hallFreeThreshold: number | null
  /** The real per-menu sections actually used (real DB breakdown only) — empty when this menu has no structured breakdown or this isn't an indoor real-data quote. Lets a caller detect/build dish-edit flows without re-querying. */
  sections: StructuredMenuSection[]
} {
  const customDishes = userMessageText ? extractCustomDishes(userMessageText) : []
  // Bug fix (2026-10-06): this used to gate the whole custom-menu path on
  // the static COMMON_DISH_CATALOG match count alone, so a guest naming
  // ≥2 real dishes straight from the live catalog (anything not in that
  // small static list) never triggered the custom-dish quote at all and
  // fell through to the generic package-price branch below instead —
  // taking its price from the wrong place entirely. Matching against the
  // live catalog too (via extractDishesFromText) fixes the detection, not
  // just the pricing.
  const liveMatchedDishes = userMessageText ? extractDishesFromText(userMessageText, live, 1) : []
  const hasCustomMenu = Math.max(customDishes.length, liveMatchedDishes.length) >= 2

  // Bug fix (2026-10-06): a custom outdoor spread (the guest naming their
  // own dishes) used to be priced with a flat per-plate GUESS — ₹649/₹499/
  // ₹399 picked purely from dish COUNT and whether any dish was non-veg,
  // completely ignoring each dish's real price in `eventmgmt.dish_pricing`.
  // Per Ravi: there is no fixed outdoor package at all, so pricing MUST
  // come from the real dish prices — fetch each named dish's live price,
  // work out how many trays/units that dish needs for this guest count
  // (using its own real `persons_per_unit` when on file, else the standard
  // portion default), and sum real line costs instead of a guessed rate.
  if (hasCustomMenu) {
    const matchedDishes = liveMatchedDishes
    let hasNonVeg = false
    let pricedSubtotal = 0
    let anyLivePriced = false
    const unpriced: string[] = []

    type Line = { title: string; category: string; qty: number; unitLabel: string; lineCost: number | null }
    const lines: Line[] = []

    for (const d of matchedDishes) {
      const title = d.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      const categoryKey = String(d.category)
      if ((d.dietaryType || '').toLowerCase().includes('non')) hasNonVeg = true

      const isPerPieceBread = categoryKey.startsWith('bread')
      if (isPerPieceBread) {
        // Breads price/serve per piece (≈2.5 pieces/guest), not per tray.
        const qty = Math.round(guestCount * 2.5)
        const lineCost = d.price != null ? qty * d.price : null
        if (lineCost != null) { pricedSubtotal += lineCost; anyLivePriced = true } else unpriced.push(title)
        lines.push({ title, category: categoryKey, qty, unitLabel: 'pcs', lineCost })
        continue
      }

      const perUnit = d.personsPerUnit ?? DEFAULT_PERSONS_PER_UNIT[categoryKey] ?? DEFAULT_PERSONS_PER_UNIT.others
      const qty = Math.max(1, Math.ceil(guestCount / perUnit))
      const lineCost = d.price != null ? qty * d.price : null
      if (lineCost != null) { pricedSubtotal += lineCost; anyLivePriced = true } else unpriced.push(title)
      lines.push({ title, category: categoryKey, qty, unitLabel: d.unitLabel || 'Tray', lineCost })
    }

    const byCategory = (cat: string) => lines.filter(l => l.category === cat || l.category === cat + 's')
    const starters = byCategory('starter')
    const biryanis = byCategory('biryani')
    const curries = byCategory('curry')
    const breads = byCategory('bread')
    const desserts = byCategory('dessert')
    // Catches 'side', 'beverage'/'beverages', and 'others' (anything not
    // already grouped above) so every priced dish still shows up somewhere
    // in the readable menu list, not just in the raw tray breakdown.
    const grouped = new Set([...starters, ...biryanis, ...curries, ...breads, ...desserts])
    const sides = lines.filter(l => !grouped.has(l))

    const fmtLine = (l: Line) => `${l.title}${l.lineCost != null ? ` — ${l.qty} ${l.unitLabel}${l.qty > 1 ? 's' : ''} × ₹${l.lineCost / l.qty} = ₹${l.lineCost.toLocaleString('en-IN')}` : ` (${l.qty} ${l.unitLabel}${l.qty > 1 ? 's' : ''} — pricing to be confirmed by our catering manager)`}`

    const menuItems: string[] = []
    if (starters.length > 0) menuItems.push(`• Starters: ${starters.map(fmtLine).join('; ')}`)
    if (biryanis.length > 0) menuItems.push(`• Rice & Biryani: ${biryanis.map(fmtLine).join('; ')}`)
    if (curries.length > 0) menuItems.push(`• Curries & Dals: ${curries.map(fmtLine).join('; ')}`)
    if (breads.length > 0) menuItems.push(`• Live Breads: ${breads.map(fmtLine).join('; ')}`)
    if (desserts.length > 0) menuItems.push(`• Sweets & Desserts: ${desserts.map(fmtLine).join('; ')}`)
    if (sides.length > 0) menuItems.push(`• Sides & Accompaniments: ${sides.map(fmtLine).join('; ')}`)
    if (unpriced.length > 0) menuItems.push(`• ⚠️ Pricing to be confirmed by our catering manager for: ${unpriced.join(', ')} (not yet on our live price list)`)

    const subtotal = pricedSubtotal
    // Display-only average — the real total (subtotal) is the sum of each
    // dish's own real tray/unit cost, which won't divide evenly across
    // guests when dishes use different unit sizes. Never used to compute
    // subtotal itself (that would reintroduce the flat-rate guess this
    // fixes).
    const platePrice = guestCount > 0 ? Math.round(subtotal / guestCount) : 0

    const trayBreakdown: string[] = [
      `• Guest Count: **${guestCount} Pax** (Custom Menu Sizing)`,
      ...lines.map(l => `• ${l.title}: **${l.qty} ${l.unitLabel}${l.qty > 1 ? 's' : ''}**${l.lineCost != null ? ` — ₹${l.lineCost.toLocaleString('en-IN')}` : ' — pricing to be confirmed'}`)
    ]

    return {
      headline: `🍛 **Custom Outdoor Catering Quote (${branch || 'Nearby Outlet'})**`,
      menuItems,
      trayBreakdown,
      pricePerPlate: platePrice,
      subtotal,
      finalTotal: subtotal,
      // true only once at least one named dish actually priced off a real
      // eventmgmt.dish_pricing row — false when every matched dish came
      // from the static fallback catalog (no live price on file at all).
      usedLiveData: anyLivePriced,
      usedBranchMatchedHall: false,
      usedRealMenuBreakdown: false,
      hallFeeStatus: 'unknown',
      hallFreeThreshold: null,
      sections: []
    }
  }

  const biryaniTrays = calculateTrayQuantity('biryani', guestCount)
  const starterTrays = calculateTrayQuantity('starter', guestCount)
  const curryTrays = calculateTrayQuantity('curry', guestCount)
  const breadCount = Math.round(guestCount * 2.5)

  if (serviceType === 'inhouse') {
    const textLower = (userMessageText || '').toLowerCase()
    // Step 1: what the guest's text implies they want, as a price TARGET —
    // used to pick the nearest real menu below, and as the fallback price
    // if no live menu data exists at all.
    let targetPrice = 800
    let packageName = 'Non-Veg Menu'
    const wantsNonVeg = !isVegOnly || /non[\s-]?veg/.test(textLower)

    if (textLower.includes('1000') || textLower.includes('1,000') || textLower.includes('platinum')) {
      targetPrice = 1000
      packageName = 'Platinum Non-Veg Menu'
    } else if (textLower.includes('900') || textLower.includes('grand non-veg') || textLower.includes('grand non veg')) {
      targetPrice = 900
      packageName = 'Grand Non-Veg Menu'
    } else if (textLower.includes('700') || textLower.includes('grand veg')) {
      targetPrice = 700
      packageName = 'Grand Veg Menu'
    } else if (textLower.includes('600') || (isVegOnly && !textLower.includes('800') && !textLower.includes('900'))) {
      targetPrice = 600
      packageName = 'Standard Veg Menu'
    } else {
      targetPrice = 800
      packageName = 'Standard Non-Veg Menu'
    }

    // Step 2: try to resolve that to a REAL row in eventmgmt.menu, matching
    // dietary type first and then nearest price. Only fall back to the
    // guessed target/name above if no live indoor menus exist at all.
    let liveMenu: LiveMenu | undefined
    if (live?.indoorMenus && live.indoorMenus.length > 0) {
      const isVegMenuRow = (m: LiveMenu) => {
        const dt = (m.dietaryType || '').toLowerCase()
        return dt.includes('veg') && !dt.includes('non')
      }
      // Prefer rows matching the requested diet; if the DB only has the
      // other diet on file, fall back to the full pool rather than showing nothing.
      const dietFiltered = live.indoorMenus.filter(m => wantsNonVeg ? !isVegMenuRow(m) : isVegMenuRow(m))
      const pool = dietFiltered.length > 0 ? dietFiltered : live.indoorMenus
      liveMenu = pool.reduce<LiveMenu | undefined>((best, m) =>
        !best || Math.abs(m.pricePerPax - targetPrice) < Math.abs(best.pricePerPax - targetPrice) ? m : best, undefined)
    }

    const usedLivePrice = !!liveMenu
    const platePrice = liveMenu ? liveMenu.pricePerPax : targetPrice
    if (liveMenu) packageName = liveMenu.name

    const subtotal = platePrice * guestCount

    // Step 3: hall recommendation — prefer a real eventmgmt.hall row that (a)
    // belongs to the selected branch and (b) actually fits this guest count.
    // Only guess a hall name if the table has no rows at all.
    let hallName = 'Maduram AC Banquet Hall'
    let hallCap = '50–100 pax'
    let usedLiveHall = false
    let usedBranchMatchedHall = false
    let hallFeeStatus: 'waived' | 'not_waived' | 'unknown' = 'waived'
    let hallFreeThreshold: number | null = null

    if (live?.halls && live.halls.length > 0) {
      // Restrict to this branch's halls, but only if that actually leaves
      // something to choose from — a hall with no branch_id set, or a branch
      // that has no halls on file yet, shouldn't make the quote come up empty.
      const branchHalls = branchId ? live.halls.filter(h => h.branchId === branchId) : []
      const hallPool = branchHalls.length > 0 ? branchHalls : live.halls
      // "Active" halls: the live fetch already excludes is_blocked = true rows,
      // so every hall in `live.halls` is already active/bookable.
      const fits = hallPool.filter(h => (h.maxPax == null || guestCount <= h.maxPax) && (h.minPax == null || guestCount >= h.minPax))
      const chosen: LiveHall = fits.length > 0
        ? fits.reduce((best, h) => (h.maxPax ?? Infinity) < (best.maxPax ?? Infinity) ? h : best)
        : hallPool.reduce((best, h) => (h.maxPax ?? 0) > (best.maxPax ?? 0) ? h : best)
      hallName = chosen.name
      hallCap = chosen.minPax && chosen.maxPax ? `${chosen.minPax}–${chosen.maxPax} pax` : (chosen.maxPax ? `up to ${chosen.maxPax} pax` : (chosen.capacity ? `${chosen.capacity} pax` : 'capacity on request'))
      usedLiveHall = true
      usedBranchMatchedHall = branchHalls.length > 0
      hallFreeThreshold = chosen.minCateringValueForFree ?? null
      hallFeeStatus = chosen.minCateringValueForFree == null
        ? 'unknown'
        : (subtotal >= chosen.minCateringValueForFree ? 'waived' : 'not_waived')
    } else {
      if (guestCount > 220) {
        hallName = 'Sangamam Grand Banquet Hall (4th Floor)'
        hallCap = '250–500 pax'
      } else if (guestCount > 120) {
        hallName = 'Classic Hall (Ground Floor) / Arangam Hall'
        hallCap = '100–220 pax'
      } else if (guestCount >= 80) {
        hallName = 'Arangam / Magudam AC Banquet Hall (3rd Floor)'
        hallCap = '100–150 pax'
      }
      hallFeeStatus = 'unknown'
    }

    let menuItems: string[] = []
    let usedRealMenuBreakdown = false

    // Real data path: build the itemized list from the actual menu builder
    // tables (menu -> menu_categories -> menu_sections -> section_dish ->
    // dish), honoring each section's real selection_limit ("choose any N"),
    // is_addon (extra-charge) and is_accompaniment (complimentary) flags —
    // and listing default-flagged dishes first within each section as a
    // popularity proxy (see getIndoorMenuStructured's comment for why).
    const realSections = liveMenu ? menuBreakdown?.get(liveMenu.id) : undefined
    if (realSections && realSections.length > 0) {
      usedRealMenuBreakdown = true
      const catIcons: Record<string, string> = {
        'welcome drinks': '🍹', 'starters': '🥗', 'starters & appetizers': '🥗',
        'main course': '🍛', 'curries': '🍛', 'main course curries': '🍛',
        'rice': '🍚', 'biryani': '🍚', 'rice & biryani': '🍚',
        'breads': '🫓', 'live tandoor breads': '🫓',
        'desserts': '🍨', 'sweets': '🍨', 'sweets & desserts': '🍨',
      }
      // Group sections by category, preserving the order they came back in
      // (already sort_order'd by the query that built menuBreakdown).
      const byCategory = new Map<string, StructuredMenuSection[]>()
      for (const sec of realSections) {
        const arr = byCategory.get(sec.categoryName) || []
        arr.push(sec)
        byCategory.set(sec.categoryName, arr)
      }
      for (const [catName, sections] of byCategory.entries()) {
        const icon = catIcons[catName.toLowerCase()] || '🍽️'
        const sectionBlocks = sections.map(sec => {
          const addonNote = sec.isAddon ? ' [add-on, extra charge applies]' : ''
          const complimentaryNote = sec.isAccompaniment ? ' [complimentary]' : ''
          // Show every section, but only its own "choose any N" count
          // worth of dishes — normally the default-first ones (the closest
          // real signal to "mostly booked" until booking.menu_selection
          // stores structured per-dish selections; see the comment on
          // getIndoorMenuStructured). If the customer swapped a dish in
          // this section earlier in the conversation, that swap — already
          // validated against this exact section's real catalog by the
          // caller — takes over instead. No "(Choose any N)" label and no
          // "[Edit]" tag are shown — that layout is retired; the customer
          // just sees the picked dishes for each section.
          const showCount = sec.selectionLimit || 4
          const overrideNames = sectionOverrides?.[sec.sectionName]
          const overrideDishes = overrideNames
            ? overrideNames
                .map(name => sec.dishes.find(d => d.name.toLowerCase() === name.toLowerCase()))
                .filter((d): d is (typeof sec.dishes)[number] => !!d)
            : []
          const shownDishes = overrideDishes.length > 0 ? overrideDishes.slice(0, showCount) : sec.dishes.slice(0, showCount)
          const dishNames = shownDishes.map(d => {
            const extra = d.extraPrice ? ` (+₹${d.extraPrice})` : ''
            return `${d.name}${extra}`
          }).join(', ')
          return `**${sec.sectionName}**${addonNote}${complimentaryNote}\n• ${dishNames}`
        })
        menuItems.push(`### ${icon} ${catName}\n${sectionBlocks.join('\n')}`)
      }
    }

    // Fallback path: no real breakdown for this menu (live data unreachable,
    // or this particular menu has no sections configured in the builder
    // yet) — illustrative dish list templated by price bracket, bucketed on
    // the guessed `targetPrice` rather than the real `platePrice`, so a
    // live price like ₹850 still picks the closest template.
    const templateBucket = targetPrice

    if (usedRealMenuBreakdown) {
      // real menuItems already built above
    } else if (templateBucket === 600) {
      menuItems = [
        '### 🍹 Welcome Drinks\n• Fresh Mint Mojito / Sweet Lime Juice',
        '### 🥗 Starters & Appetizers\n• Veg Manchurian & Paneer Tikka (2 Live Counters)',
        '### 🍛 Main Course Curries\n• Paneer Butter Masala, Mixed Veg Korma, Dal Tadka',
        '### 🍚 Rice & Biryani\n• Signature Hyderabadi Veg Dum Biryani + Mirchi Ka Salan & Raitha',
        '### 🫓 Live Tandoor Breads\n• Fresh Butter Naan & Soft Pulkas (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts\n• Hot Gulab Jamun & Royal Quarbani Ka Meetha'
      ]
    } else if (templateBucket === 700) {
      menuItems = [
        '### 🍹 Welcome Drinks\n• Fresh Mint Mojito / Blue Lagoon Punch',
        '### 🥗 Starters & Appetizers\n• Crispy Corn, Veg Manchurian, Paneer 65, Spring Rolls (4 Starters)',
        '### 🍛 Main Course Curries\n• Kaju Paneer Masala, Methi Chaman, Dal Makhani',
        '### 🍚 Rice & Biryani\n• Special Veg Dum Biryani + Bagara Rice (with Salan & Raitha)',
        '### 🫓 Live Tandoor Breads\n• Butter Naan, Garlic Naan & Soft Pulkas (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts\n• Hot Gulab Jamun, Royal Quarbani Ka Meetha & Vanilla Ice Cream'
      ]
    } else if (templateBucket === 900) {
      menuItems = [
        '### 🍹 Welcome Drinks\n• Fresh Mint Mojito / Fruit Punch Mocktail',
        '### 🥗 Starters & Appetizers\n• Hyderabadi Chicken 65, Apollo Fish, Veg Manchurian, Paneer Tikka (4 Live Starters)',
        '### 🍛 Main Course Curries\n• Dum Ka Chicken Curry, Mutton Rogan Josh, Paneer Butter Masala, Dal Tadka',
        '### 🍚 Rice & Biryani\n• Hyderabadi Chicken Dum Biryani + Special Mutton Biryani (with Salan & Raitha)',
        '### 🫓 Live Tandoor Breads\n• Butter Naan, Tandoori Roti & Rumali Roti (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts\n• Hot Gulab Jamun, Royal Double Ka Meetha & Vanilla Ice Cream'
      ]
    } else if (templateBucket === 1000) {
      menuItems = [
        '### 🍹 Welcome Drinks\n• Royal Assorted Welcome Mocktails & Fruit Punch',
        '### 🥗 Starters & Appetizers\n• Chicken Majestic, Tandoori Prawns, Mutton Seekh Kebab, Paneer Tikka (4 Premium Starters)',
        '### 🍛 Main Course Curries\n• Gongura Mutton Curry, Butter Chicken Masala, Kadai Paneer, Dal Makhani',
        '### 🍚 Rice & Biryani\n• Royal Hyderabadi Mutton Dum Biryani + Special Chicken Biryani + Bagara Rice',
        '### 🫓 Live Tandoor Breads\n• Assorted Butter Naan, Garlic Naan & Tandoori Roti (Live Counter)',
        '### 🍨 Sweets & Desserts\n• Quarbani Ka Meetha with Malai, Angoori Gulab Jamun & Premium Ice Cream'
      ]
    } else {
      // Standard Non-Veg ₹800
      menuItems = [
        '### 🍹 Welcome Drinks\n• Fresh Mint Mojito / Lychee Punch',
        '### 🥗 Starters & Appetizers\n• Hyderabadi Chicken 65, Tangdi Kebab, Veg Manchurian (3 Live Starters)',
        '### 🍛 Main Course Curries\n• Butter Chicken Masala, Paneer Butter Masala, Dal Makhani',
        '### 🍚 Rice & Biryani\n• Hyderabadi Chicken Dum Biryani + Veg Dum Biryani (with Salan & Raitha)',
        '### 🫓 Live Tandoor Breads\n• Butter Naan & Roti (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts\n• Royal Double Ka Meetha & Vanilla Ice Cream'
      ]
    }

    const hallFeeLine = hallFeeStatus === 'waived'
      ? `• Hall Fee Status: **Complimentary / Waived**${hallFreeThreshold ? ` (catering total ≥ ₹${hallFreeThreshold.toLocaleString('en-IN')})` : ''}`
      : hallFeeStatus === 'not_waived'
        ? `• Hall Fee Status: **Hall charge applies**${hallFreeThreshold ? ` (waived once catering total reaches ₹${hallFreeThreshold.toLocaleString('en-IN')} — you're ₹${(hallFreeThreshold - subtotal).toLocaleString('en-IN')} away)` : ''}`
        : '• Hall Fee Status: Confirmed with our catering manager based on your final package'

    const venueNote = !usedLiveHall
      ? ' *(estimated — confirm availability)*'
      : (branchId && !usedBranchMatchedHall ? ' *(no hall on file for this branch yet — confirm with our catering manager)*' : '')

    return {
      // Bug fix (2026-09-28): this used to fall back to the literal string
      // 'Peerzadiguda / Hayathnagar' -- two real branch names joined with a
      // slash -- whenever the caller hadn't actually resolved a branch yet.
      // That's an internal "assume one of our two flagship branches"
      // default, never meant to be shown to a customer, but it printed
      // verbatim in the estimate header as if it were a real venue name.
      // The caller (app/api/chat/route.ts) now hard-gates on a resolved
      // branch before ever calling this function for a real estimate, so
      // `branch` should always be a real name here -- this fallback is a
      // safety net only, and says so plainly instead of naming two branches
      // at once.
      headline: `🏛️ **Indoor AC Banquet Hall Estimation (${branch || 'branch to be confirmed'})**${usedLivePrice ? '' : ' *(estimated pricing — please confirm with our catering manager)*'}`,
      menuItems: liveMenu?.description ? [...menuItems, `### 📝 Package Notes\n• ${liveMenu.description}`] : menuItems,
      trayBreakdown: [
        `• Selected Package: **${packageName} (₹${platePrice}/plate)**`,
        `• Guest Count: **${guestCount} Pax**`,
        `• Recommended Venue: **${hallName}** (Capacity: ${hallCap})${venueNote}`,
        `• Banquet Amenities: **AC Hall, Stage, AV Sound & Microphones, Dedicated Banquet Servers**`,
        hallFeeLine
      ],
      pricePerPlate: platePrice,
      subtotal,
      finalTotal: subtotal,
      usedLiveData: usedLivePrice,
      usedBranchMatchedHall,
      usedRealMenuBreakdown,
      hallFeeStatus,
      hallFreeThreshold,
      sections: realSections || []
    }
  }

  // No dishes named yet (guest wants Arjun to suggest/decide). Prefer a
  // real eventmgmt.menu row (menu_type = Outdoor) if one ever exists.
  let liveOutdoorMenu: LiveMenu | undefined
  if (live?.outdoorMenus && live.outdoorMenus.length > 0) {
    const dietFiltered = live.outdoorMenus.filter(m => {
      const dt = (m.dietaryType || '').toLowerCase()
      const isVegRow = dt.includes('veg') && !dt.includes('non')
      return isVegOnly ? isVegRow : true
    })
    liveOutdoorMenu = (dietFiltered.length > 0 ? dietFiltered : live.outdoorMenus)[0]
  }

  if (liveOutdoorMenu) {
    const platePrice = liveOutdoorMenu.pricePerPax
    let subtotal = platePrice * guestCount
    const menuItems = [liveOutdoorMenu.description ? `### 📝 ${liveOutdoorMenu.name}\n• ${liveOutdoorMenu.description}` : `### 📝 ${liveOutdoorMenu.name}`]
    if (extraModifications.length > 0) {
      extraModifications.forEach(mod => {
        if (mod.toLowerCase().includes('mutton')) {
          menuItems.push(`### 🍖 Special Addition\n• Mutton Chukka (${curryTrays} Full Trays)`)
          subtotal += 120 * guestCount
        }
      })
    }
    return {
      headline: `🚚 **Outdoor Catering & Live Food Setup Estimation**`,
      menuItems,
      trayBreakdown: [
        `• Biryani Trays: **${biryaniTrays} Full Trays** (feeds 25–30 pax per tray)`,
        `• Starter Trays: **${starterTrays} Full Trays** (feeds 40–50 pax per tray)`,
        `• Curry Trays: **${curryTrays} Full Trays** (feeds 35–45 pax per tray)`,
        `• Live Tandoor Breads: **${breadCount} Pieces** (prepared live on site)`
      ],
      pricePerPlate: platePrice,
      subtotal,
      finalTotal: subtotal,
      usedLiveData: true,
      usedBranchMatchedHall: false,
      usedRealMenuBreakdown: false,
      hallFeeStatus: 'unknown',
      hallFreeThreshold: null,
      sections: []
    }
  }

  // Bug fix (2026-10-06): with no live outdoor "package" row (there is
  // none today), this used to charge a flat ₹499 (veg) / ₹649 (non-veg)
  // per plate for a fixed, hardcoded, illustrative dish list — regardless
  // of which real dishes actually exist or what they really cost. Per
  // Ravi: there is no fixed package, so even an AI-suggested spread must
  // be priced from real `eventmgmt.dish_pricing` rows. This now picks one
  // representative dish per section from the live dish catalog (matching
  // the requested diet), prices it for real, and sums actual line costs —
  // any section with nothing live on file is shown as "to be confirmed"
  // instead of silently folding a guessed number into the total.
  const pickLiveDish = (category: DishCategory, wantVeg: boolean) => {
    const pool = (live?.dishesByCategory?.[category] || []).filter(d => d.price != null)
    if (pool.length === 0) return null
    const dietFiltered = pool.filter(d => {
      const dt = (d.dietaryType || '').toLowerCase()
      const isVegRow = dt.includes('veg') && !dt.includes('non')
      return wantVeg ? isVegRow : true
    })
    return (dietFiltered.length > 0 ? dietFiltered : pool)[0]
  }

  const sections: Array<{ label: string; category: DishCategory; fallbackName: string }> = [
    { label: 'Starters & Appetizers', category: 'starters', fallbackName: isVegOnly ? 'Paneer 65 & Crispy Veg Manchurian' : 'Hyderabadi Chicken 65 & Veg Manchurian' },
    { label: 'Main Course Curries', category: 'curries', fallbackName: isVegOnly ? 'Paneer Butter Masala & Dal Tadka' : 'Butter Chicken & Paneer Butter Masala' },
    { label: 'Rice & Biryani', category: 'biryanis', fallbackName: isVegOnly ? 'Signature Hyderabadi Veg Dum Biryani' : 'Signature Hyderabadi Chicken Dum Biryani' },
    { label: 'Sweets & Desserts', category: 'desserts', fallbackName: isVegOnly ? 'Hot Gulab Jamun & Royal Quarbani Ka Meetha' : 'Royal Double Ka Meetha & Hot Gulab Jamun' },
  ]

  let subtotal = 0
  let anyPriced = false
  const menuItems: string[] = [
    '### 🍹 Welcome Drinks\n• Fresh Mint Mojito / Welcome Mocktail (complimentary)'
  ]
  for (const sec of sections) {
    const dish = pickLiveDish(sec.category, isVegOnly)
    const perUnit = dish?.personsPerUnit ?? DEFAULT_PERSONS_PER_UNIT[sec.category] ?? DEFAULT_PERSONS_PER_UNIT.others
    const qty = Math.max(1, Math.ceil(guestCount / perUnit))
    if (dish && dish.price != null) {
      const lineCost = qty * dish.price
      subtotal += lineCost
      anyPriced = true
      menuItems.push(`### 🥗 ${sec.label}\n• ${dish.name} (${qty} ${dish.unitLabel || 'Tray'}${qty > 1 ? 's' : ''} × ₹${dish.price} = ₹${lineCost.toLocaleString('en-IN')})`)
    } else {
      menuItems.push(`### 🥗 ${sec.label}\n• ${sec.fallbackName} — pricing to be confirmed by our catering manager (not yet on our live price list)`)
    }
  }
  menuItems.push(`### 🫓 Live Tandoor Breads\n• Fresh Butter Naan & Hot Pulkas (${breadCount} pcs live on site — pricing to be confirmed by our catering manager)`)

  if (extraModifications.length > 0) {
    extraModifications.forEach(mod => {
      if (mod.toLowerCase().includes('mutton')) {
        menuItems.push(`### 🍖 Special Addition\n• Mutton Chukka (${curryTrays} Full Trays) — pricing to be confirmed by our catering manager`)
      }
    })
  }

  const platePrice = anyPriced && guestCount > 0 ? Math.round(subtotal / guestCount) : 0

  return {
    headline: `🚚 **Outdoor Catering & Live Food Setup Estimation**${anyPriced ? ' *(priced from live dish rates — sections marked "to be confirmed" are not yet on our live price list)*' : ' *(no live dish pricing on file yet — every section needs confirmation from our catering manager)*'}`,
    menuItems,
    trayBreakdown: [
      `• Biryani Trays: **${biryaniTrays} Full Trays** (feeds 25–30 pax per tray)`,
      `• Starter Trays: **${starterTrays} Full Trays** (feeds 40–50 pax per tray)`,
      `• Curry Trays: **${curryTrays} Full Trays** (feeds 35–45 pax per tray)`,
      `• Live Tandoor Breads: **${breadCount} Pieces** (prepared live on site)`
    ],
    pricePerPlate: platePrice,
    subtotal,
    finalTotal: subtotal,
    usedLiveData: anyPriced,
    usedBranchMatchedHall: false,
    usedRealMenuBreakdown: false,
    hallFeeStatus: 'unknown',
    hallFreeThreshold: null,
    sections: []
  }
}

/**
 * Generates prompt context explaining catering portion intelligence to the LLM.
 */
export function getCateringPortionRulesText(): string {
  return `
PORTION & TRAY SIZING STANDARDS (MANDATORY RULES FOR ARJUN):
1. GUEST COUNT FORMULA:
   - 2 Kids count as 1 Adult Portion (e.g. 80 Adults + 20 Kids = 90 Equivalent Adult Portions).
2. TRAY CAPACITIES FOR OUTDOOR CATERING:
   - Biryani / Pulao: 1 Full Tray (≈5 kg) feeds 25–30 guests.
   - Starters / Appetizers: 1 Full Tray (≈100–120 pcs) feeds 40–50 guests.
   - Curries / Gravies: 1 Full Tray feeds 35–45 guests for standard buffets, or 70–90 guests for 10+ item wedding spreads.
   - Breads (Roti / Naan / Pulka): Estimate 2.5 pieces per adult guest.
   - Sweets / Desserts: Estimate 1.5 portions per guest (1 Full Tray feeds ~35–40 guests).
3. BUFFET SPREAD CAPPING RULE:
   - For buffets with 8+ dishes, guests sample smaller portions of each dish. Cap each individual dish to 1 full tray per 70–80 guests.
4. LOYALTY DISCOUNT CAP:
   - Returning customers verified by phone receive maximum 5% loyalty discount on food subtotal.
5. ESTIMATION QUOTES:
   - When presenting catering costs, always display:
     * Effective Guest Count
     * Itemized Dish / Tray Breakdown
     * Subtotal, 5% Loyalty Discount (if returning), and Estimated Total
     * 10-Day Quote Validity & Staff Booking Assistance (+91 90638 44021)
`.trim()
}
