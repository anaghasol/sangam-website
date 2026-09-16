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
 * (from `getSangamCateringLiveData()` in lib/sangam-catering.ts). When it's
 * supplied, the per-plate price and the recommended hall are always taken
 * from the live `eventmgmt.menu` / `eventmgmt.hall` rows — never guessed.
 * The itemized "what's included" dish list stays illustrative template text,
 * because `eventmgmt.menu` only stores a price + a free-text description per
 * package (no menu→dish join table exists in the schema), so which exact
 * dishes make up "Grand Non-Veg Menu" isn't something the database can
 * answer — only the manager's own written description can. The returned
 * `usedLiveData` flag tells the caller whether the number quoted actually
 * came from the database or is a generic fallback estimate.
 */
import type { CateringLiveData, LiveMenu, LiveHall } from '@/lib/sangam-catering'

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

/**
 * Generates custom or recommended quote based on user input.
 */
export function generatePopularCateringQuote(
  serviceType: 'outdoor' | 'inhouse' | 'custom',
  branch: string,
  guestCount = 100,
  isVegOnly = false,
  extraModifications: string[] = [],
  userMessageText = '',
  live?: CateringLiveData,
  /** Real `branches.id` for the branch the guest picked, if resolved — used to restrict hall selection to that branch's halls. */
  branchId?: string | null
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
} {
  const customDishes = userMessageText ? extractCustomDishes(userMessageText) : []
  const hasCustomMenu = customDishes.length >= 2

  if (hasCustomMenu) {
    const starters: string[] = []
    const biryanis: string[] = []
    const curries: string[] = []
    const breads: string[] = []
    const desserts: string[] = []
    const sides: string[] = []
    let hasNonVeg = false

    customDishes.forEach(d => {
      const info = COMMON_DISH_CATALOG[d]
      if (!info) return
      const title = d.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      if (!info.isVeg) hasNonVeg = true

      if (info.category === 'starter') starters.push(title)
      else if (info.category === 'biryani') biryanis.push(title)
      else if (info.category === 'curry') curries.push(title)
      else if (info.category === 'bread') breads.push(title)
      else if (info.category === 'dessert') desserts.push(title)
      else sides.push(title)
    })

    const totalDishes = customDishes.length
    const bTrays = biryanis.length > 0 ? Math.max(1, Math.ceil(guestCount / (biryanis.length > 1 ? 40 : 28))) : 0
    const sTrays = starters.length > 0 ? Math.max(1, Math.ceil(guestCount / 45)) : 0
    const cTrays = curries.length > 0 ? Math.max(1, Math.ceil(guestCount / (totalDishes >= 8 ? 60 : 35))) : 0
    const dTrays = desserts.length > 0 ? Math.max(1, Math.ceil(guestCount / 35)) : 0
    const breadCount = breads.length > 0 ? Math.round(guestCount * 2.5) : 0

    const menuItems: string[] = []
    if (starters.length > 0) menuItems.push(`• Starters: ${starters.join(', ')} (${sTrays} Tray${sTrays > 1 ? 's' : ''} each)`)
    if (biryanis.length > 0) menuItems.push(`• Rice & Biryani: ${biryanis.join(', ')} (${bTrays} Full Tray${bTrays > 1 ? 's' : ''} ≈5kg each)`)
    if (curries.length > 0) menuItems.push(`• Curries & Dals: ${curries.join(', ')} (${cTrays} Tray${cTrays > 1 ? 's' : ''} each)`)
    if (breads.length > 0) menuItems.push(`• Live Breads: ${breads.join(', ')} (${breadCount} pcs live counter)`)
    if (desserts.length > 0) menuItems.push(`• Sweets & Desserts: ${desserts.join(', ')} (${dTrays} Tray${dTrays > 1 ? 's' : ''})`)
    if (sides.length > 0) menuItems.push(`• Sides & Accompaniments: ${sides.join(', ')}`)

    // Calculate approximate per-plate pricing based on spread size
    let platePrice = hasNonVeg ? 649 : (totalDishes >= 8 ? 499 : 399)
    if (guestCount <= 30) platePrice += 50 // small batch live setup fee adjustment
    const subtotal = platePrice * guestCount

    const trayBreakdown: string[] = [
      `• Guest Count: **${guestCount} Pax** (Custom Menu Sizing)`,
      ...(bTrays > 0 ? [`• Rice/Biryani Trays: **${bTrays} Full Tray(s) per dish** (feeds 25–30 pax/tray)`] : []),
      ...(sTrays > 0 ? [`• Starter Trays: **${sTrays} Tray(s) per dish** (feeds 40–50 pax/tray)`] : []),
      ...(cTrays > 0 ? [`• Curry Trays: **${cTrays} Tray(s) per dish** (feeds 35–45 pax/tray)`] : []),
      ...(breadCount > 0 ? [`• Live Breads: **${breadCount} Pieces**`] : []),
      ...(dTrays > 0 ? [`• Dessert Trays: **${dTrays} Tray(s)**`] : [])
    ]

    return {
      headline: `🍛 **Custom Outdoor Catering Quote (${branch || 'Nearby Outlet'})**`,
      menuItems,
      trayBreakdown,
      pricePerPlate: platePrice,
      subtotal,
      finalTotal: subtotal,
      // Custom, guest-named dishes aren't a DB package lookup — pricing here
      // is the same per-dish tray-math estimate it always was.
      usedLiveData: false,
      usedBranchMatchedHall: false
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
    // Illustrative dish breakdown is templated by price bracket, since
    // eventmgmt.menu has no menu→dish join table to read an exact list from
    // (see file header). Bucketed on the guessed `targetPrice`, not the real
    // `platePrice`, so a live price like ₹850 still picks the closest template.
    const templateBucket = targetPrice

    if (templateBucket === 600) {
      menuItems = [
        '### 🍹 Welcome Drinks [✏️ Edit]\n• Fresh Mint Mojito / Sweet Lime Juice',
        '### 🥗 Starters & Appetizers [✏️ Edit]\n• Veg Manchurian & Paneer Tikka (2 Live Counters)',
        '### 🍛 Main Course Curries [✏️ Edit]\n• Paneer Butter Masala, Mixed Veg Korma, Dal Tadka',
        '### 🍚 Rice & Biryani [✏️ Edit]\n• Signature Hyderabadi Veg Dum Biryani + Mirchi Ka Salan & Raitha',
        '### 🫓 Live Tandoor Breads [✏️ Edit]\n• Fresh Butter Naan & Soft Pulkas (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts [✏️ Edit]\n• Hot Gulab Jamun & Royal Quarbani Ka Meetha'
      ]
    } else if (templateBucket === 700) {
      menuItems = [
        '### 🍹 Welcome Drinks [✏️ Edit]\n• Fresh Mint Mojito / Blue Lagoon Punch',
        '### 🥗 Starters & Appetizers [✏️ Edit]\n• Crispy Corn, Veg Manchurian, Paneer 65, Spring Rolls (4 Starters)',
        '### 🍛 Main Course Curries [✏️ Edit]\n• Kaju Paneer Masala, Methi Chaman, Dal Makhani',
        '### 🍚 Rice & Biryani [✏️ Edit]\n• Special Veg Dum Biryani + Bagara Rice (with Salan & Raitha)',
        '### 🫓 Live Tandoor Breads [✏️ Edit]\n• Butter Naan, Garlic Naan & Soft Pulkas (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts [✏️ Edit]\n• Hot Gulab Jamun, Royal Quarbani Ka Meetha & Vanilla Ice Cream'
      ]
    } else if (templateBucket === 900) {
      menuItems = [
        '### 🍹 Welcome Drinks [✏️ Edit]\n• Fresh Mint Mojito / Fruit Punch Mocktail',
        '### 🥗 Starters & Appetizers [✏️ Edit]\n• Hyderabadi Chicken 65, Apollo Fish, Veg Manchurian, Paneer Tikka (4 Live Starters)',
        '### 🍛 Main Course Curries [✏️ Edit]\n• Dum Ka Chicken Curry, Mutton Rogan Josh, Paneer Butter Masala, Dal Tadka',
        '### 🍚 Rice & Biryani [✏️ Edit]\n• Hyderabadi Chicken Dum Biryani + Special Mutton Biryani (with Salan & Raitha)',
        '### 🫓 Live Tandoor Breads [✏️ Edit]\n• Butter Naan, Tandoori Roti & Rumali Roti (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts [✏️ Edit]\n• Hot Gulab Jamun, Royal Double Ka Meetha & Vanilla Ice Cream'
      ]
    } else if (templateBucket === 1000) {
      menuItems = [
        '### 🍹 Welcome Drinks [✏️ Edit]\n• Royal Assorted Welcome Mocktails & Fruit Punch',
        '### 🥗 Starters & Appetizers [✏️ Edit]\n• Chicken Majestic, Tandoori Prawns, Mutton Seekh Kebab, Paneer Tikka (4 Premium Starters)',
        '### 🍛 Main Course Curries [✏️ Edit]\n• Gongura Mutton Curry, Butter Chicken Masala, Kadai Paneer, Dal Makhani',
        '### 🍚 Rice & Biryani [✏️ Edit]\n• Royal Hyderabadi Mutton Dum Biryani + Special Chicken Biryani + Bagara Rice',
        '### 🫓 Live Tandoor Breads [✏️ Edit]\n• Assorted Butter Naan, Garlic Naan & Tandoori Roti (Live Counter)',
        '### 🍨 Sweets & Desserts [✏️ Edit]\n• Quarbani Ka Meetha with Malai, Angoori Gulab Jamun & Premium Ice Cream'
      ]
    } else {
      // Standard Non-Veg ₹800
      menuItems = [
        '### 🍹 Welcome Drinks [✏️ Edit]\n• Fresh Mint Mojito / Lychee Punch',
        '### 🥗 Starters & Appetizers [✏️ Edit]\n• Hyderabadi Chicken 65, Tangdi Kebab, Veg Manchurian (3 Live Starters)',
        '### 🍛 Main Course Curries [✏️ Edit]\n• Butter Chicken Masala, Paneer Butter Masala, Dal Makhani',
        '### 🍚 Rice & Biryani [✏️ Edit]\n• Hyderabadi Chicken Dum Biryani + Veg Dum Biryani (with Salan & Raitha)',
        '### 🫓 Live Tandoor Breads [✏️ Edit]\n• Butter Naan & Roti (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts [✏️ Edit]\n• Royal Double Ka Meetha & Vanilla Ice Cream'
      ]
    }

    const hallFeeLine = hallFeeStatus === 'waived'
      ? '• Hall Fee Status: **Complimentary / Waived** (catering total meets the free-hall threshold)'
      : hallFeeStatus === 'not_waived'
        ? '• Hall Fee Status: **Hall charge applies** (catering total is below this hall\'s free-hall threshold — our team will confirm the exact charge)'
        : '• Hall Fee Status: To be confirmed by our catering manager'

    const venueNote = !usedLiveHall
      ? ' *(estimated — confirm availability)*'
      : (branchId && !usedBranchMatchedHall ? ' *(no hall on file for this branch yet — confirm with our catering manager)*' : '')

    return {
      headline: `🏛️ **Indoor AC Banquet Hall Estimation (${branch || 'Peerzadiguda / Hayathnagar'})**${usedLivePrice ? '' : ' *(estimated pricing — please confirm with our catering manager)*'}`,
      menuItems: liveMenu?.description ? [...menuItems, `### 📝 Package Notes [✏️ Edit]\n• ${liveMenu.description}`] : menuItems,
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
      usedBranchMatchedHall
    }
  }

  // Standard suggested spread for Outdoor Catering — prefer a real
  // eventmgmt.menu row (menu_type = Outdoor) matching the requested diet;
  // fall back to the ₹499/₹649 generic estimate only if none exists.
  let liveOutdoorMenu: LiveMenu | undefined
  if (live?.outdoorMenus && live.outdoorMenus.length > 0) {
    const dietFiltered = live.outdoorMenus.filter(m => {
      const dt = (m.dietaryType || '').toLowerCase()
      const isVegRow = dt.includes('veg') && !dt.includes('non')
      return isVegOnly ? isVegRow : true
    })
    liveOutdoorMenu = (dietFiltered.length > 0 ? dietFiltered : live.outdoorMenus)[0]
  }
  const usedLiveOutdoorPrice = !!liveOutdoorMenu
  const platePrice = liveOutdoorMenu ? liveOutdoorMenu.pricePerPax : (isVegOnly ? 499 : 649)
  let subtotal = platePrice * guestCount
  const menuItems = isVegOnly ? [
    '### 🍹 Welcome Drinks [✏️ Edit]\n• Fresh Lime Mint Cooler / Sweet Lime Juice',
    `### 🥗 Starters & Appetizers [✏️ Edit]\n• Paneer 65 & Crispy Veg Manchurian (${starterTrays} Full Trays / 100-120 pcs each)`,
    `### 🍛 Main Course Curries [✏️ Edit]\n• Paneer Butter Masala & Dal Tadka (${curryTrays} Full Trays each)`,
    `### 🍚 Rice & Biryani [✏️ Edit]\n• Signature Hyderabadi Veg Dum Biryani (${biryaniTrays} Full Trays ≈5kg each) + Salan & Raitha`,
    `### 🫓 Live Tandoor Breads [✏️ Edit]\n• Fresh Butter Naan & Hot Pulkas (${breadCount} pcs live on site)`,
    `### 🍨 Sweets & Desserts [✏️ Edit]\n• Hot Gulab Jamun & Royal Quarbani Ka Meetha`
  ] : [
    '### 🍹 Welcome Drinks [✏️ Edit]\n• Fresh Mint Mojito / Welcome Mocktail',
    `### 🥗 Starters & Appetizers [✏️ Edit]\n• Hyderabadi Chicken 65 & Veg Manchurian (${starterTrays} Full Trays / 100-120 pcs each)`,
    `### 🍛 Main Course Curries [✏️ Edit]\n• Butter Chicken & Paneer Butter Masala (${curryTrays} Full Trays each)`,
    `### 🍚 Rice & Biryani [✏️ Edit]\n• Signature Hyderabadi Chicken Dum Biryani (${biryaniTrays} Full Trays ≈5kg each) + Salan & Raitha`,
    `### 🫓 Live Tandoor Breads [✏️ Edit]\n• Fresh Butter Naan & Hot Pulkas (${breadCount} pcs live on site)`,
    `### 🍨 Sweets & Desserts [✏️ Edit]\n• Royal Double Ka Meetha & Hot Gulab Jamun`
  ]

  if (extraModifications.length > 0) {
    extraModifications.forEach(mod => {
      if (mod.toLowerCase().includes('mutton')) {
        menuItems.push(`### 🍖 Special Addition [✏️ Edit]\n• Mutton Chukka (${curryTrays} Full Trays)`)
        subtotal += 120 * guestCount
      }
    })
  }

  return {
    headline: `🚚 **Outdoor Catering & Live Food Setup Estimation**${usedLiveOutdoorPrice ? '' : ' *(estimated pricing — please confirm with our catering manager)*'}`,
    menuItems: liveOutdoorMenu?.description ? [...menuItems, `### 📝 Package Notes [✏️ Edit]\n• ${liveOutdoorMenu.description}`] : menuItems,
    trayBreakdown: [
      `• Biryani Trays: **${biryaniTrays} Full Trays** (feeds 25–30 pax per tray)`,
      `• Starter Trays: **${starterTrays} Full Trays** (feeds 40–50 pax per tray)`,
      `• Curry Trays: **${curryTrays} Full Trays** (feeds 35–45 pax per tray)`,
      `• Live Tandoor Breads: **${breadCount} Pieces** (prepared live on site)`
    ],
    pricePerPlate: platePrice,
    subtotal,
    finalTotal: subtotal,
    usedLiveData: usedLiveOutdoorPrice,
    usedBranchMatchedHall: false
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
