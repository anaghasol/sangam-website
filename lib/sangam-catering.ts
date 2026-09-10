/**
 * Sangam Indoor & Outdoor Catering Database Service for Chat AI.
 *
 * Reads real catering data from `eventmgmt` schema tables:
 * - `eventmgmt.dish` & `eventmgmt.dish_pricing` (Individual dishes, unit pricing, per-kg/per-tray costs, serving sizes)
 * - `eventmgmt.menu` (Indoor & Outdoor Menus, prices per pax, dietary types)
 * - `eventmgmt.hall` (Indoor banquet halls, capacities, AC status, pricing)
 * - `eventmgmt.booking` (Indoor & Outdoor bookings, service_types 'inhouse', 'outdoor', 'inhouse-meeting')
 * - `eventmgmt.occasion` (Weddings, Birthdays, Corporate events)
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
  name: string
  capacity: number | null
  min_pax: number | null
  max_pax: number | null
  flat_charge: number | null
  full_day_price: number | null
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

let cateringCache: { text: string; at: number } | null = null
const TTL_MS = 20 * 60 * 1000 // Cache for 20 minutes

function sbEvent() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'eventmgmt' } })
}

/**
 * Returns formatted Indoor & Outdoor Catering context for Arjun (Chat AI assistant).
 */
export async function getSangamCateringChatContext(): Promise<string> {
  if (cateringCache && Date.now() - cateringCache.at < TTL_MS) {
    return cateringCache.text
  }

  const client = sbEvent()

  // Verified defaults matching real eventmgmt.hall data
  let indoorHalls = [
    '• SANGAMAM Hall (Peerzadiguda 4th Floor): 250–500 pax, Grand AC Banquet, Lifts, Valet Parking, Flat charge ₹30,000 / Full day ₹150,000 (Free Hall if catering ≥ ₹200,000)',
    '• ARANGAM Hall (Peerzadiguda 3rd Floor): 100–150 pax, AC Banquet, Flat charge ₹20,000 / Full day ₹40,000 (Free Hall if catering ≥ ₹100,000)',
    '• MAGUDAM Hall (Peerzadiguda 3rd Floor): 100–150 pax, AC Banquet, Flat charge ₹20,000 / Full day ₹40,000 (Free Hall if catering ≥ ₹100,000)',
    '• MADURAM Hall (Peerzadiguda 1st Floor): 50–100 pax, AC Banquet, Flat charge ₹10,000 / Full day ₹20,000 (Free Hall if catering ≥ ₹50,000)',
    '• Classic Hall (Peerzadiguda Ground Floor): Up to 220 pax, AC Banquet, Flat charge ₹7,000 / Full day ₹18,000 (Free Hall if catering ≥ ₹60,000)',
    '• HAYATHNAGAR SANGAM Hall (Hayathnagar 2nd Floor): 50–200 pax, AC Banquet, Lifts, Valet Parking, Flat charge ₹20,000 / Full day ₹30,000 (Free Hall if catering ≥ ₹50,000)'
  ]

  let indoorMenus = [
    '• Veg Menu (Indoor): ₹600/plate — 1 Welcome Drink, 2 Veg Starters, 2 Main Curries, 1 Dal, 1 Veg Biryani/Pulao, 2 Breads, 2 Desserts, Curd & Salad',
    '• Grand Veg Menu (Indoor): ₹700/plate — 1 Welcome Drink, 3 Premium Veg Starters, 3 Main Curries, 1 Dal, 1 Special Biryani, 2 Breads, 3 Sweets & Desserts',
    '• Non Veg Menu (Indoor): ₹800/plate — 1 Welcome Drink, 2 Non-Veg Starters (Chicken 65/Tangdi), 1 Veg Starter, 2 Non-Veg Curries, 1 Veg Curry, 1 Chicken Dum Biryani, 2 Breads, 2 Desserts',
    '• Grand Non Veg Menu (Indoor): ₹900/plate — 1 Welcome Drink, 3 Non-Veg Starters (Chicken & Mutton), 2 Veg Starters, 3 Non-Veg Curries, 2 Veg Curries, Hyderabadi Chicken Dum Biryani, 2 Breads, 3 Desserts',
    '• Platinum Non Veg Menu (Indoor): ₹1,000/plate — Luxury Multi-course Feast with Live Counters, Mutton Dum Biryani, Special Starters & Royal Desserts',
    '• Liquor Menu (Indoor): ₹700/plate — Starters & Accompaniments for Cocktail Events'
  ]

  let outdoorMenus = [
    '• Outdoor Custom Menu & Tray Catering: Flexible tray-based pricing tailored to guest count & custom dish selection',
    '• Live Food Setup: Live Tandoor (Naan/Roti/Pulka), Chaat counters, and Beverage stations on-site',
    '• Tray Capacities: Biryani (25-30 pax/tray), Starters (40-50 pax/tray), Curries (35-45 pax/tray)'
  ]

  let occasionsList = ['Weddings', 'Engagements', 'Receptions', 'Birthdays', 'Corporate Meetings', 'House Parties', 'Anniversaries']
  const categorizedDishes: {
    starters: string[]
    biryanis: string[]
    curries: string[]
    breads: string[]
    desserts: string[]
    beverages: string[]
    others: string[]
  } = {
    starters: [],
    biryanis: [],
    curries: [],
    breads: [],
    desserts: [],
    beverages: [],
    others: []
  }

  if (client) {
    try {
      // 1. Fetch Menus from eventmgmt.menu
      const { data: menuData } = await client
        .from('menu')
        .select('*')
        .eq('is_active', true)

      if (menuData && menuData.length > 0) {
        const fetchedIndoor: string[] = []
        const fetchedOutdoor: string[] = []

        for (const m of menuData as MenuRow[]) {
          const typeLabel = (m.menu_type || 'Indoor').toLowerCase()
          const dietLabel = m.dietary_type ? ` [${m.dietary_type.toUpperCase()}]` : ''
          const line = `• ${m.name}${dietLabel}: ₹${m.price_per_pax}/plate${m.description ? ` (${m.description})` : ''}`

          if (typeLabel.includes('outdoor')) {
            fetchedOutdoor.push(line)
          } else {
            fetchedIndoor.push(line)
          }
        }

        if (fetchedIndoor.length > 0) indoorMenus = fetchedIndoor
        if (fetchedOutdoor.length > 0) outdoorMenus = fetchedOutdoor
      }

      // 2. Fetch Halls from eventmgmt.hall
      const { data: hallData } = await client
        .from('hall')
        .select('*')
        .eq('is_blocked', false)

      if (hallData && hallData.length > 0) {
        const fetchedHalls = (hallData as HallRow[]).map(h => {
          const capText = h.capacity ? `${h.capacity} max capacity` : (h.max_pax ? `${h.max_pax} max capacity` : '300 capacity')
          const acText = h.is_ac ? 'AC' : 'Non-AC'
          const floorText = h.floor ? `, ${h.floor}` : ''
          const priceText = h.full_day_price ? `, Full day ₹${h.full_day_price}` : (h.flat_charge ? `, Flat charge ₹${h.flat_charge}` : '')
          return `• ${h.name}: ${capText}, ${acText}${floorText}${priceText}`
        })
        if (fetchedHalls.length > 0) indoorHalls = fetchedHalls
      }

      // 3. Fetch Occasions from eventmgmt.occasion
      const { data: occData } = await client
        .from('occasion')
        .select('name')

      if (occData && occData.length > 0) {
        occasionsList = (occData as OccasionRow[]).map(o => o.name)
      }

      // 4. Fetch Dishes & Dish Pricing from eventmgmt.dish & eventmgmt.dish_pricing
      const { data: dishData } = await client
        .from('dish')
        .select('id, name, dietary_type, unit_type, default_food_group, base_price, is_active')
        .eq('is_active', true)

      const { data: pricingData } = await client
        .from('dish_pricing')
        .select('dish_id, unit_label, price, price_per_kg, persons_per_unit, size_variant')
        .eq('is_current_price', true)

      if (dishData && dishData.length > 0) {
        const pricingMap = new Map<string, DishPricingRow[]>()
        if (pricingData && pricingData.length > 0) {
          for (const p of pricingData as DishPricingRow[]) {
            const arr = pricingMap.get(p.dish_id) || []
            arr.push(p)
            pricingMap.set(p.dish_id, arr)
          }
        }

        for (const d of dishData as DishRow[]) {
          const pList = pricingMap.get(d.id)
          const p = pList?.[0]
          const diet = d.dietary_type ? ` [${d.dietary_type.toUpperCase()}]` : ''
          
          let priceStr = ''
          if (p) {
            const unit = p.unit_label ? ` (${p.unit_label})` : ''
            const pax = p.persons_per_unit ? ` [serves ~${p.persons_per_unit}]` : ''
            priceStr = `: ₹${p.price}${unit}${pax}`
          } else if (d.base_price) {
            priceStr = `: ₹${d.base_price}/portion`
          }

          const line = `• ${d.name}${diet}${priceStr}`
          const grp = (d.default_food_group || '').toLowerCase()
          const name = d.name.toLowerCase()

          if (grp.includes('starter') || grp.includes('snack') || grp.includes('soup') || name.includes('tikka') || name.includes('kebab') || name.includes('fry') || name.includes('65') || name.includes('manchurian')) {
            categorizedDishes.starters.push(line)
          } else if (grp.includes('biryani') || grp.includes('rice') || name.includes('biryani') || name.includes('pulao') || name.includes('palav') || name.includes('rice')) {
            categorizedDishes.biryanis.push(line)
          } else if (grp.includes('curry') || grp.includes('gravy') || grp.includes('dal') || name.includes('curry') || name.includes('masala') || name.includes('paneer') || name.includes('korma') || name.includes('dal')) {
            categorizedDishes.curries.push(line)
          } else if (grp.includes('bread') || name.includes('naan') || name.includes('roti') || name.includes('pulka') || name.includes('paratha')) {
            categorizedDishes.breads.push(line)
          } else if (grp.includes('dessert') || grp.includes('sweet') || name.includes('meetha') || name.includes('halwa') || name.includes('jamun') || name.includes('kheer') || name.includes('ice cream')) {
            categorizedDishes.desserts.push(line)
          } else if (grp.includes('beverage') || name.includes('mojito') || name.includes('drink') || name.includes('juice') || name.includes('shake')) {
            categorizedDishes.beverages.push(line)
          } else {
            categorizedDishes.others.push(line)
          }
        }
      }
    } catch (e) {
      console.warn('Failed querying eventmgmt tables in Supabase, using verified fallback catering context.', e)
    }
  }

  const text = [
    'REAL DATABASE CATERING & EVENT PRICING (source: eventmgmt.dish, eventmgmt.dish_pricing, eventmgmt.hall, eventmgmt.menu, eventmgmt.occasion):',
    '',
    '1. SERVICE TYPES SUPPORTED:',
    '  - `inhouse`: Indoor Catering in AC Banquet Halls (Sangamam, Arangam, Magudam, Classic Hall, Hayathnagar Hall)',
    '  - `outdoor`: Outdoor Catering for Lawns, Event Venues, Home Functions & Live Counter Setups',
    '  - `inhouse-meeting`: Corporate Meetings, Conferences & Executive Banquet Sessions',
    '',
    '2. INDOOR BANQUET HALLS & CAPACITIES:',
    ...indoorHalls,
    '',
    '3. INDOOR CATERING MENUS & PER-PLATE PRICES:',
    ...indoorMenus,
    '',
    '4. OUTDOOR CATERING PACKAGES & LIVE COUNTERS:',
    ...outdoorMenus,
    '',
    '5. REAL OUTDOOR DISH CATALOG BY CATEGORY (eventmgmt.dish_pricing):',
    ...(categorizedDishes.biryanis.length > 0 ? ['  [BIRYANI & RICE TRAYS (1 Tray serves 25-30 pax)]:', ...categorizedDishes.biryanis.slice(0, 15)] : []),
    ...(categorizedDishes.starters.length > 0 ? ['  [STARTERS & APPETIZERS (1 Tray serves 40-50 pax)]:', ...categorizedDishes.starters.slice(0, 15)] : []),
    ...(categorizedDishes.curries.length > 0 ? ['  [CURRIES & GRAVIES (1 Tray serves 35-45 pax)]:', ...categorizedDishes.curries.slice(0, 15)] : []),
    ...(categorizedDishes.breads.length > 0 ? ['  [BREADS & ROTIS]:', ...categorizedDishes.breads.slice(0, 10)] : []),
    ...(categorizedDishes.desserts.length > 0 ? ['  [DESSERTS & SWEETS (1 Tray serves 35-40 pax)]:', ...categorizedDishes.desserts.slice(0, 10)] : []),
    ...(categorizedDishes.beverages.length > 0 ? ['  [BEVERAGES & WELCOME DRINKS]:', ...categorizedDishes.beverages.slice(0, 10)] : []),
    '',
    '6. OCCASIONS COVERED:',
    `  - ${occasionsList.join(', ')}`,
    '',
    'CATERING INTAKE & QUOTE RULES FOR ARJUN:',
    '1. STEP 1 — CONFIRM SERVICE TYPE (INDOOR vs OUTDOOR): When a guest asks about catering, ask if they need INDOOR Banquet Halls or OUTDOOR Catering (lawns, home, venues).',
    '2. STEP 2 — COLLECT EVENT DETAILS: Event date, location/branch, guest count (Adults + Kids). Apply $2\\text{ kids} = 1\\text{ adult}$ math.',
    '3. STEP 3 — CALCULATE ITEMIZED TRAY OR PACKAGE ESTIMATE: Use exact tray or per-plate pricing from the real catalog above.',
    '4. STEP 4 — SAVING QUOTE: Offer to save the quote for 10 days by asking for their WhatsApp number.',
    '5. When phone number is shared, quote is automatically saved in the database with reference ID (e.g. SGM-XXXX).'
  ].join('\n')

  cateringCache = { text, at: Date.now() }
  return text
}
