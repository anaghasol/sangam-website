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
 */

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
  userMessageText = ''
): {
  headline: string
  menuItems: string[]
  trayBreakdown: string[]
  pricePerPlate: number
  subtotal: number
  finalTotal: number
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
      finalTotal: subtotal
    }
  }

  const biryaniTrays = calculateTrayQuantity('biryani', guestCount)
  const starterTrays = calculateTrayQuantity('starter', guestCount)
  const curryTrays = calculateTrayQuantity('curry', guestCount)
  const breadCount = Math.round(guestCount * 2.5)

  if (serviceType === 'inhouse') {
    const textLower = (userMessageText || '').toLowerCase()
    let platePrice = 800
    let packageName = 'Non-Veg Menu'
    
    if (textLower.includes('1000') || textLower.includes('1,000') || textLower.includes('platinum')) {
      platePrice = 1000
      packageName = 'Platinum Non-Veg Menu'
    } else if (textLower.includes('900') || textLower.includes('grand non-veg') || textLower.includes('grand non veg')) {
      platePrice = 900
      packageName = 'Grand Non-Veg Menu'
    } else if (textLower.includes('700') || textLower.includes('grand veg')) {
      platePrice = 700
      packageName = 'Grand Veg Menu'
    } else if (textLower.includes('600') || (isVegOnly && !textLower.includes('800') && !textLower.includes('900'))) {
      platePrice = 600
      packageName = 'Standard Veg Menu'
    } else {
      platePrice = 800
      packageName = 'Standard Non-Veg Menu'
    }

    const subtotal = platePrice * guestCount

    // Hall recommendation based on pax
    let hallName = 'Maduram AC Banquet Hall'
    let hallCap = '50–100 pax'
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

    let menuItems: string[] = []

    if (platePrice === 600) {
      menuItems = [
        '### 🍹 Welcome Drinks [✏️ Edit]\n• Fresh Mint Mojito / Sweet Lime Juice',
        '### 🥗 Starters & Appetizers [✏️ Edit]\n• Veg Manchurian & Paneer Tikka (2 Live Counters)',
        '### 🍛 Main Course Curries [✏️ Edit]\n• Paneer Butter Masala, Mixed Veg Korma, Dal Tadka',
        '### 🍚 Rice & Biryani [✏️ Edit]\n• Signature Hyderabadi Veg Dum Biryani + Mirchi Ka Salan & Raitha',
        '### 🫓 Live Tandoor Breads [✏️ Edit]\n• Fresh Butter Naan & Soft Pulkas (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts [✏️ Edit]\n• Hot Gulab Jamun & Royal Quarbani Ka Meetha'
      ]
    } else if (platePrice === 700) {
      menuItems = [
        '### 🍹 Welcome Drinks [✏️ Edit]\n• Fresh Mint Mojito / Blue Lagoon Punch',
        '### 🥗 Starters & Appetizers [✏️ Edit]\n• Crispy Corn, Veg Manchurian, Paneer 65, Spring Rolls (4 Starters)',
        '### 🍛 Main Course Curries [✏️ Edit]\n• Kaju Paneer Masala, Methi Chaman, Dal Makhani',
        '### 🍚 Rice & Biryani [✏️ Edit]\n• Special Veg Dum Biryani + Bagara Rice (with Salan & Raitha)',
        '### 🫓 Live Tandoor Breads [✏️ Edit]\n• Butter Naan, Garlic Naan & Soft Pulkas (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts [✏️ Edit]\n• Hot Gulab Jamun, Royal Quarbani Ka Meetha & Vanilla Ice Cream'
      ]
    } else if (platePrice === 900) {
      menuItems = [
        '### 🍹 Welcome Drinks [✏️ Edit]\n• Fresh Mint Mojito / Fruit Punch Mocktail',
        '### 🥗 Starters & Appetizers [✏️ Edit]\n• Hyderabadi Chicken 65, Apollo Fish, Veg Manchurian, Paneer Tikka (4 Live Starters)',
        '### 🍛 Main Course Curries [✏️ Edit]\n• Dum Ka Chicken Curry, Mutton Rogan Josh, Paneer Butter Masala, Dal Tadka',
        '### 🍚 Rice & Biryani [✏️ Edit]\n• Hyderabadi Chicken Dum Biryani + Special Mutton Biryani (with Salan & Raitha)',
        '### 🫓 Live Tandoor Breads [✏️ Edit]\n• Butter Naan, Tandoori Roti & Rumali Roti (Live Tandoor Counter)',
        '### 🍨 Sweets & Desserts [✏️ Edit]\n• Hot Gulab Jamun, Royal Double Ka Meetha & Vanilla Ice Cream'
      ]
    } else if (platePrice === 1000) {
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

    return {
      headline: `🏛️ **Indoor AC Banquet Hall Estimation (${branch || 'Peerzadiguda / Hayathnagar'})**`,
      menuItems,
      trayBreakdown: [
        `• Selected Package: **${packageName} (₹${platePrice}/plate)**`,
        `• Guest Count: **${guestCount} Pax**`,
        `• Recommended Venue: **${hallName}** (Capacity: ${hallCap})`,
        `• Banquet Amenities: **AC Hall, Stage, AV Sound & Microphones, Dedicated Banquet Servers**`,
        `• Hall Fee Status: **Complimentary / Waived** (Included with catering package!)`
      ],
      pricePerPlate: platePrice,
      subtotal,
      finalTotal: subtotal
    }
  }

  // Standard suggested spread for Outdoor Catering
  const platePrice = isVegOnly ? 499 : 649
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
    finalTotal: subtotal
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
