import { NextRequest, NextResponse } from 'next/server'
import { getSangamUnifiedKnowledgeContext } from '@/lib/sangam-knowledge'
import { askFreeModels } from '@/lib/free-ai'
import { lookupCustomerByPhone, extractPhoneNumber } from '@/lib/customer-lookup'
import { calculateEffectiveGuests, generatePopularCateringQuote, extractCustomDishes } from '@/lib/catering-portions'
import { getSangamCateringLiveData, getBranchIdByName, getOccasionIdByName } from '@/lib/sangam-catering'
import { getIndoorBookingIntelligence, getOutdoorBookingIntelligence } from '@/lib/sangam-booking-intelligence'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `You are Arjun, the friendly Hospitality and Catering Manager at Sangam Hotels Hyderabad (By Sameeksha Hospitality).
You respond like a warm, knowledgeable catering professional — not a robot. Be concise, hospitable, and speak with pride about the brand.

ABOUT SANGAM HOTELS HYDERABAD:
- Flagship Outlet & Banquets: Peerzadiguda (Parvathapur Rd, 24 Hours)
- Head Office & Outlet: Hayathnagar (NH65, 6 AM - 11 PM)
- Highway Branch: Malkapur (JIO BP Plaza, NH65)
- Bakeries: Sangam Bakes & Cakes (Hayathnagar & Mansoorabad)
- Tiffin Outlets: Mansoorabad & Koyyalagudem
- Contact & Bookings: +91 90638 44021 | info@sangamhotelshyderabad.com | WhatsApp: +91 90638 44021

CATERING SERVICE TYPES:
1. INDOOR AC BANQUET HALLS — halls, hall pricing and menu packages (veg/non-veg/grand/platinum) are supplied below in the "REAL DATABASE CATERING & EVENT PRICING" block, sourced live from eventmgmt.hall and eventmgmt.menu.
2. OUTDOOR CATERING & CUSTOM TRAYS — 100% custom menu & tray-based catering (no rigid package lock-in, delivered to customer's venue/home/office/farmhouse). Spread pricing is supplied below, sourced live from eventmgmt.menu. Tray capacities: Biryani/Rice 25-30 pax per full tray (≈5kg each), Starters 40-50 pax per full tray (100-120 pcs), Curries/Dals 35-45 pax per full tray, Live Breads 2.5 pcs per guest, Sweets & Desserts 35-40 pax per tray.

PRICING RULE — NON-NEGOTIABLE: Every hall name, hall price, menu package name and per-plate price you state MUST come from the "REAL DATABASE CATERING & EVENT PRICING" block appended after this prompt. Never state a specific ₹ price, hall name or package name from memory or from an earlier turn in this conversation if it is not present in that block. If that block says live data is unavailable, say pricing will be confirmed by the catering manager at +91 90638 44021 — do not invent a number.

OUTDOOR CATERING CONVERSATIONAL WORKFLOW (STEP-BY-STEP INTAKE & ESTIMATION):
When a customer inquires about Outdoor Catering, Trays, Delivery, or Custom Menus:
1. NEVER ask for banquet hall slots or assign banquet halls — this is delivery/onsite setup at customer's venue!
2. Gather the necessary event details step-by-step (NEVER re-ask for details already provided by the customer):
   - Step 1: Occasion Name (e.g. Birthday Party, Housewarming / Gruhapravesam, Wedding / Reception, Corporate Event, Farmhouse Get-together)
   - Step 2: Event Date & Time (Event Date and Lunch / Dinner / Morning service time)
   - Step 3: Guest Count (Pax: 30, 50, 100, 150, 200+ guests)
   - Step 4: Menu Items / Spread (veg or non-veg standard spread — use the live prices from the block below — or custom dishes)
3. Estimation Rule: The MAIN things needed for estimation are **Pax** and **Items/Menu**.
   - As soon as Pax and Items are provided (or if the customer already included them in their text), IMMEDIATELY generate and display the full Outdoor Catering Estimation!
   - Acknowledge Occasion, Date, and Time if provided.
   - Display:
     * Headline: 🚚 **Outdoor Catering & Live Food Setup Estimation**
     * Event Details (Occasion, Date & Time if known)
     * Menu spread & dishes organized by section with [✏️ Edit] tags:
       ### 🍹 Welcome Drinks [✏️ Edit]
       ### 🥗 Starters & Appetizers [✏️ Edit]
       ### 🍛 Main Course Curries [✏️ Edit]
       ### 🍚 Rice & Biryani [✏️ Edit]
       ### 🫓 Live Tandoor Breads [✏️ Edit]
       ### 🍨 Sweets & Desserts [✏️ Edit]
     * Portion & Tray Sizing breakdown (Biryani trays, Starter trays, Curry trays, Live Tandoor breads)
     * Estimation: ₹Price/plate × Pax = Total Amount (with 5% loyalty discount if returning customer)
     * What's Included: Buffet chafing dishes, warmers, live counter, dedicated serving staff, premium disposable cutlery
     * Reference ID (e.g. SGM-A8421) and 10-day validity

INDOOR BANQUET CONVERSATIONAL WORKFLOW (STRICT SEQUENTIAL INTAKE):
Always acknowledge earlier details and ask ONLY for the NEXT missing detail in this strict order:
1. Branch: If missing and no date, ask: "Which branch do you prefer — Peerzadiguda (Flagship) or Hayathnagar?"
2. Event Date: If missing, ask for the event date.
3. Time Slot: If event date is known but time slot is missing, ask:
   "Which time slot do you prefer?
   • ☀️ Lunch Slot (11:00 AM – 3:00 PM)
   • 🌙 Dinner Slot (7:00 PM – 11:00 PM)
   • 🌅 Full Day Slot (6:00 AM – 10:00 PM)"
4. Guest Count (Pax): If time slot is known but pax is missing, ask:
   "How many guests (pax) are you expecting for the event? (Adults + Kids)"
5. Dietary Preference: If pax is known but dietary preference is missing, ask:
   "What is your dietary preference for the catering menu?
   • 🌿 Pure Veg
   • 🥗 Veg & Non-Veg
   • 🍗 Non-Veg"
6. Menu Package: Once dietary preference is selected, present only the matching packages (veg-only packages for Pure Veg; non-veg packages for Veg & Non-Veg / Non-Veg) using the exact names and prices from the live pricing block below — never fixed numbers from memory.
7. Full Estimation & Dish Spread Breakdown: ONLY AFTER the customer selects their menu package, generate the full estimation:
   - Matching AC Banquet Hall based on pax and branch, chosen from the live hall list below (not a guess).
   - Pricing: Guest count × Plate rate (from the live block) = Total Catering Amount. Only say the hall fee is waived if the live data confirms the catering total meets that hall's free-hall threshold — otherwise say the hall fee will be confirmed.
   - Itemized Dish Spread organized by SECTION with "[✏️ Edit]" tag on each section header. The chosen package's REAL dish breakdown (real categories, sections, default vs. choosable dishes, add-on upcharges) is supplied under that menu's price line in the "REAL DATABASE CATERING & EVENT PRICING" block below — use those exact dishes and section names, in that grouping. Never invent a dish that isn't listed there. If a package has no breakdown listed (older menus not yet in the menu builder), say the exact dish list will be confirmed by the catering manager rather than inventing one.
     - MANDATORY: if a section says "(choose any N)" in the data block, you MUST print that exact "(Choose any N)" note next to that section's header in your reply — never silently drop it. The guest needs to see the limit, not just the dish options.
     - Overage rule: if the guest asks for MORE dishes in a section than its stated limit N, the extra dish(es) beyond N are chargeable add-ons — use that specific dish's own [add-on]/extra-price figure from the data block if it has one; if the requested extra dish has no extra-price figure on file, say the extra charge for it will be confirmed by the catering manager rather than inventing a number. Never let an over-the-limit selection pass as free.
     - A section marked [add-on, extra charge applies] is NOT included in the base plate rate — only add its price if the guest selects it.
     - A section marked [complimentary] is included at no extra charge.
   - Explain: "You can tap any [✏️ Edit] button next to a section header or the quick action chips below to customize dishes, or share your WhatsApp number to lock in your 10-day draft quote!"

CUSTOM DISHES INTAKE RULE:
- When a customer names specific dishes (e.g. Aloo Mutter Paneer, Bagara Baingan, Cabbage Pakoda, Dosakaya, Double Ka Meetha, Green Salad, Masala Vada, Palak Dal, Plain Curd, Pulihora, Sambar, Veg Pulao):
  1. Include ALL requested dishes in the categorized menu.
  2. For 20 pax, specify 1 Full Tray per dish (sufficient for 20-30 guests).
  3. Base the all-inclusive rate on the closest live spread price from the block below, adjusted for dish count — never invent a rate that isn't grounded in that data.
  4. Never replace user dishes with generic defaults.

STRICT RULES:
- Quote REAL prices from the database context provided.
- 5% returning customer discount is applicable for verified customer phone numbers.
- Never say you are an AI — you are Arjun, the hospitality manager.
`

function sbEvent() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'eventmgmt' } })
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const recentMsgs = (messages as { role: string; content: string }[]).slice(-10)
    const lastUserMsg = recentMsgs.filter(m => m.role === 'user').pop()?.content || ''
    const allUserText = recentMsgs.filter(m => m.role === 'user').map(m => m.content).join(' ')
    const lowerAllText = allUserText.toLowerCase()

    // 1. Extract guest count from entire conversation or fallback
    const numMatch = lastUserMsg.match(/\b(?:pax\s*)?(\d{2,4})\b/i) || allUserText.match(/\b(?:pax\s*)?(\d{2,4})\b/i)
    const rawCount = numMatch ? parseInt(numMatch[1], 10) : 0
    const kidsMatch = allUserText.match(/(\d+)\s*(?:kids|children)/i)
    const adultsMatch = allUserText.match(/(\d+)\s*(?:adults|people|guests|persons|pax)/i)
    const kidsCount = kidsMatch ? parseInt(kidsMatch[1], 10) : 0
    const adultsCount = adultsMatch ? parseInt(adultsMatch[1], 10) : (rawCount || 20)
    const { effectiveAdults } = calculateEffectiveGuests(adultsCount, kidsCount)

    // Detect branch mention across conversation
    let mentionedBranch = ''
    if (lowerAllText.includes('peerzadiguda')) mentionedBranch = 'Peerzadiguda'
    else if (lowerAllText.includes('hayathnagar')) mentionedBranch = 'Hayathnagar'
    else if (lowerAllText.includes('malkapur')) mentionedBranch = 'Malkapur'
    else if (lowerAllText.includes('mansoorabad')) mentionedBranch = 'Mansoorabad'
    else if (lowerAllText.includes('koyyalagudem')) mentionedBranch = 'Koyyalagudem'

    // Detect service type & intake progress
    const isIndoor = lowerAllText.includes('indoor') || lowerAllText.includes('banquet') || lowerAllText.includes('hall')
    const isOutdoor = lowerAllText.includes('outdoor') || lowerAllText.includes('tray') || lowerAllText.includes('custom')
    const isVegOnly = lowerAllText.includes('veg only') || lowerAllText.includes('100% veg') || lowerAllText.includes('pure veg') || (lowerAllText.includes('vegetarian') && !lowerAllText.includes('non-veg'))
    
    const hasBranchDetected = mentionedBranch !== ''
    const hasDateDetected = /\b(\d{1,2}[-/.]\d{1,2}|\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|weekend|tomorrow|next week|next month|october|november|december|january|february|september|2026|2027)\b/i.test(lowerAllText)
    const hasSlotDetected = lowerAllText.includes('lunch') || lowerAllText.includes('dinner') || lowerAllText.includes('full day') || (lowerAllText.includes('slot') && (lowerAllText.includes('slot 1') || lowerAllText.includes('slot 2') || lowerAllText.includes('slot 3') || lowerAllText.includes('slot1') || lowerAllText.includes('slot2') || lowerAllText.includes('lunch slot') || lowerAllText.includes('dinner slot')))
    const hasPaxDetected = /\b(\d+)\s*(?:guests?|pax|people|persons|adults)\b/i.test(lowerAllText) || /\bpax\s*\d+\b/i.test(lowerAllText) || rawCount > 0
    const hasPackageDetected = lowerAllText.includes('veg menu') || lowerAllText.includes('non-veg menu') || lowerAllText.includes('grand veg') || lowerAllText.includes('grand non-veg') || lowerAllText.includes('platinum') || lowerAllText.includes('600') || lowerAllText.includes('700') || lowerAllText.includes('800') || lowerAllText.includes('900') || lowerAllText.includes('1000') || lowerAllText.includes('1,000')

    let lastDietaryDetected: 'veg' | 'non-veg' | null = null
    for (const msg of recentMsgs.filter(m => m.role === 'user')) {
      const txt = msg.content.toLowerCase()
      if (txt.includes('non-veg') || txt.includes('non veg') || txt.includes('veg and non veg') || txt.includes('veg & non veg')) {
        lastDietaryDetected = 'non-veg'
      } else if (txt.includes('pure veg') || txt.includes('vegetarian') || txt.includes('veg only') || txt.includes('pure vegetarian') || (txt.includes('veg') && !txt.includes('package') && !txt.includes('menu'))) {
        lastDietaryDetected = 'veg'
      }
    }

    const hasCustomDishes = extractCustomDishes(allUserText).length >= 2 || extractCustomDishes(lastUserMsg).length >= 2
    const hasOutdoorSpread = lowerAllText.includes('veg spread') || lowerAllText.includes('non-veg spread') || lowerAllText.includes('tray sizing') || lowerAllText.includes('andhra vegetarian') || lowerAllText.includes('dum biryani & non-veg') || lowerAllText.includes('custom dishes')
    const hasOccasionDetected = /\b(birthday|housewarming|gruhapravesam|gruhapravesh|wedding|reception|anniversary|corporate|office|farmhouse|get-together|get together|gathering|party|engagement|sangeet|haldi|pooja|puja|cradle ceremony|naming ceremony|celebration|meeting)\b/i.test(lowerAllText)
    // Capture the occasion word itself (not just whether one was mentioned) so
    // it can be resolved to a real eventmgmt.occasion.id for booking-history
    // lookups below — a plain boolean isn't enough to query by.
    const occasionMatch = lowerAllText.match(/\b(birthday|housewarming|gruhapravesam|gruhapravesh|wedding|reception|anniversary|corporate|farmhouse|engagement|sangeet|haldi|pooja|puja|celebration)\b/i)
    const detectedOccasionText = occasionMatch ? occasionMatch[1] : null
    // Month mentioned anywhere in the conversation, for the seasonal-demand
    // signal — a real month name is what we can act on; relative phrases
    // ("next week") don't carry enough to compare against a calendar month.
    const monthNameMatch = lowerAllText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i)
    const MONTH_ABBR = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
    const detectedTargetMonth = monthNameMatch ? MONTH_ABBR.indexOf(monthNameMatch[1].toLowerCase()) : null
    const hasTimeDetected = /\b(lunch|dinner|breakfast|morning|afternoon|evening|pm|am|\d{1,2}\s*(?:am|pm)|\d{1,2}:\d{2})\b/i.test(lowerAllText)
    const hasOutdoorItemsDetected = lowerAllText.includes('veg spread') || lowerAllText.includes('non-veg spread') || lowerAllText.includes('499') || lowerAllText.includes('649') || lowerAllText.includes('popular veg') || lowerAllText.includes('hyderabadi non-veg') || hasCustomDishes || lowerAllText.includes('custom dishes') || lowerAllText.includes('tray sizing')

    const lastUserLower = lastUserMsg.toLowerCase()
    const isOutdoorExplicit = lastUserLower.includes('outdoor') || lastUserLower.includes('tray') || lastUserLower.includes('outside') || lastUserLower.includes('catering at home') || lastUserLower.includes('delivery') || lastUserLower.includes('farmhouse') || lastUserLower.includes('spread')
    const isIndoorExplicit = lastUserLower.includes('indoor') || lastUserLower.includes('banquet') || lastUserLower.includes('hall')

    let isOutdoorFlow = false
    if (isOutdoorExplicit) {
      isOutdoorFlow = true
    } else if (isIndoorExplicit) {
      isOutdoorFlow = false
    } else {
      isOutdoorFlow = (lowerAllText.includes('outdoor') || lowerAllText.includes('tray') || hasCustomDishes || hasOutdoorSpread) && !lowerAllText.includes('indoor') && !lowerAllText.includes('banquet')
    }

    // 2. Customer Phone & Loyalty Lookup across all user messages
    let customerContext = ''
    let detectedPhone: string | null = null
    for (let i = recentMsgs.length - 1; i >= 0; i--) {
      if (recentMsgs[i].role === 'user') {
        const p = extractPhoneNumber(recentMsgs[i].content)
        if (p) {
          detectedPhone = p
          break
        }
      }
    }

    let loyaltyDiscount = 0
    let customerName: string | null = null

    if (detectedPhone) {
      const profile = await lookupCustomerByPhone(detectedPhone)
      if (profile && profile.isReturning) {
        customerName = profile.name
        loyaltyDiscount = profile.loyaltyDiscountPercent || 5
        const favs = profile.favoriteItems.length > 0 ? ` (Favorite dishes: ${profile.favoriteItems.join(', ')})` : ''
        // Real past catering/banquet bookings (eventmgmt) — distinct from
        // PetPooja retail orders above. A customer can have one, the other,
        // or both; only mention what's actually on file.
        const ce = profile.lastCateringEvent
        const cateringLine = profile.cateringBookingCount > 0 && ce
          ? `\n• Past Catering/Banquet Bookings: ${profile.cateringBookingCount}` +
            `\n• Most Recent Event: ${ce.occasion || 'Event'}${ce.pax ? ` for ${ce.pax} guests` : ''}${ce.branchName ? ` at ${ce.branchName}` : ''}${ce.eventDate ? ` on ${ce.eventDate}` : ''}${ce.serviceType ? ` (${ce.serviceType})` : ''}` +
            `\nInstruction: You may reference this past event naturally (e.g. "Welcome back! Last time you booked ${ce.occasion || 'an event'} for ${ce.pax || ''} guests${ce.branchName ? ` at ${ce.branchName}` : ''} — would you like something similar this time?"). Never state the past total_amount unless the guest asks for it directly.`
          : ''
        const tagsLine = profile.tags.length > 0 ? `\n• Tags on file: ${profile.tags.join(', ')}` : ''
        customerContext = `\nCUSTOMER RECOGNITION (VERIFIED RETURNING CUSTOMER):\n• Name: ${profile.name || 'Valued Guest'}\n• Phone: ${profile.phone}\n• Total Past Retail Orders: ${profile.orderCount}\n• Loyalty Discount: 5% Applicable on food total!${favs}${cateringLine}${tagsLine}\nInstruction: Greet the customer warmly by name and apply their 5% loyalty discount in quotes!`
      }
    }

    // 3. Fetch Unified Knowledge Context (RAG, PetPooja, Eventmgmt DB, Portion Rules),
    // the structured live catering data (real halls/menus/dishes), and the real
    // branch_id for whichever branch has been mentioned so far — all in parallel.
    const [extraContext, liveCateringData, resolvedBranchId, resolvedOccasionId] = await Promise.all([
      getSangamUnifiedKnowledgeContext(lastUserMsg),
      getSangamCateringLiveData(),
      mentionedBranch ? getBranchIdByName(mentionedBranch) : Promise.resolve(null),
      detectedOccasionText ? getOccasionIdByName(detectedOccasionText) : Promise.resolve(null),
    ])

    // Booking-history grounding (real past events) — only worth the query
    // once we actually have a guest count to compare against.
    const bookingIntelligence = hasPaxDetected && effectiveAdults > 0
      ? await (isOutdoorFlow
          ? getOutdoorBookingIntelligence({ occasionId: resolvedOccasionId, pax: effectiveAdults, branchId: resolvedBranchId })
          : getIndoorBookingIntelligence({ occasionId: resolvedOccasionId, pax: effectiveAdults, branchId: resolvedBranchId, targetMonth: detectedTargetMonth }))
      : ''
    const liveOutdoorPriceLine = liveCateringData.outdoorMenus.length > 0
      ? liveCateringData.outdoorMenus.map(m => `₹${m.pricePerPax} ${m.dietaryType || ''}`.trim()).join(' / ')
      : 'live pricing from the database context below'

    // Once a branch is known, tell the AI exactly which active halls belong to
    // it (filtered by branch_id) so it never offers a hall from another branch.
    const branchHallsForPrompt = resolvedBranchId
      ? liveCateringData.halls.filter(h => h.branchId === resolvedBranchId)
      : []
    const branchHallContext = mentionedBranch
      ? (branchHallsForPrompt.length > 0
          ? `\nHALLS AT ${mentionedBranch.toUpperCase()} (only offer halls from this list — this branch's active halls, filtered by branch_id and fitting the guest count where possible):\n${branchHallsForPrompt.map(h => h.text).join('\n')}`
          : `\nNo active hall is on file in the database for ${mentionedBranch} branch specifically yet — do not name a specific hall for this branch; tell the guest availability will be confirmed by our catering manager at +91 90638 44021.`)
      : ''

    const intakeStatusContext = isOutdoorFlow ? (
      `\nCURRENT INTAKE STATUS (OUTDOOR CATERING & LIVE FOOD SETUP):\n` +
      `• Service Type: Outdoor Catering / Live Food Setup at Customer's Venue (NEVER ask for banquet hall slots or branches!).\n` +
      `• Occasion: ${hasOccasionDetected ? 'Already Provided' : 'Pending'}\n` +
      `• Event Date: ${hasDateDetected ? 'Already Provided' : 'Pending'}\n` +
      `• Event Time: ${hasTimeDetected ? 'Already Provided' : 'Pending'}\n` +
      `• Guest Count (Pax): ${hasPaxDetected ? `${effectiveAdults} Guests` : 'Pending'}\n` +
      `• Menu / Items: ${hasOutdoorItemsDetected ? 'Selected' : 'Pending'}\n` +
      `CRITICAL INSTRUCTION: If both Pax and Menu/Items are provided (or if user provided them upfront in text), IMMEDIATELY generate and display the full Outdoor Catering Quote with tray sizing (${liveOutdoorPriceLine}), total amount, included services, and [✏️ Edit] dish sections! Otherwise, ask ONLY for the NEXT 'Pending' detail in this exact order: Occasion -> Date & Time -> Pax -> Menu/Items. Never ask for fields that are already provided!`
    ) : (
      `\nCURRENT INTAKE STATUS (INDOOR AC BANQUET HALLS):\n` +
      `• Branch: ${mentionedBranch || 'Not specified yet'}\n` +
      `• Date: ${hasDateDetected ? 'Already Provided' : 'Pending'}\n` +
      `• Time Slot: ${hasSlotDetected ? 'Already Provided' : 'Pending'}\n` +
      `• Guest Count (Pax): ${hasPaxDetected ? `${effectiveAdults} Guests` : 'Pending'}\n` +
      `• Dietary Preference: ${lastDietaryDetected || 'Pending'}\n` +
      `• Menu Package: ${hasPackageDetected ? 'Selected' : 'Pending'}\n` +
      `CRITICAL INSTRUCTION: Review the CURRENT INTAKE STATUS above. Under NO circumstance should you ask for any field that is 'Already Provided'. Acknowledge the user's latest choice and prompt ONLY for the NEXT 'Pending' step in this exact order: Date -> Time Slot -> Pax -> Dietary -> Menu -> Estimation.`
    )

    const systemPrompt = [
      SYSTEM_PROMPT,
      customerContext,
      extraContext,
      branchHallContext,
      bookingIntelligence,
      intakeStatusContext
    ].filter(Boolean).join('\n\n')

    // 4. Query AI Providers Cascade
    let reply = await askFreeModels(systemPrompt, recentMsgs)

    // 5. Smart Fallback if AI providers rate-limit
    if (!reply) {
      if (isOutdoorFlow) {
        // If both pax and items are present (or if user already gave both upfront), estimate cost!
        if (hasPaxDetected && hasOutdoorItemsDetected) {
          const pax = (hasPaxDetected && effectiveAdults > 0) ? effectiveAdults : 50
          const isVeg = lastDietaryDetected === 'veg' || isVegOnly || lowerAllText.includes('veg spread')

          const quote = generatePopularCateringQuote(
            'outdoor',
            mentionedBranch || 'Hyderabad & Suburbs',
            pax,
            isVeg,
            [],
            lastUserMsg + ' ' + allUserText,
            liveCateringData
          )

          const mult = loyaltyDiscount > 0 ? 0.95 : 1.0
          const totalWithDiscount = Math.round(quote.finalTotal * mult)
          const discountLine = loyaltyDiscount > 0 ? `\n• **5% Loyalty Discount Applied**: -₹${Math.round(quote.finalTotal * 0.05).toLocaleString('en-IN')}` : ''

          reply = `${quote.headline}\n\n` +
            `📋 **Menu Spread & Dishes Included**:\n` +
            `${quote.menuItems.join('\n\n')}\n\n` +
            `🍛 **Portion & Tray Sizing for ${pax} Guests**:\n` +
            `${quote.trayBreakdown.join('\n')}\n\n` +
            `💰 **Estimation**: ₹${quote.pricePerPlate}/plate × ${pax} Guests = **₹${totalWithDiscount.toLocaleString('en-IN')}**${discountLine}\n\n` +
            `✨ **What's Included at Your Venue**:\n` +
            `• Full-service buffet setup (chafing dishes, warmers, aesthetic buffet tables)\n` +
            `• Live Tandoor & Roti preparation counter on site\n` +
            `• Dedicated uniform serving staff\n` +
            `• Premium disposable plates, cutlery & napkins\n\n` +
            `You can tap **[✏️ Edit]** on any section above to customize dishes, or share your WhatsApp number to lock in this 10-day quote!`
        } else if (!hasOccasionDetected && !hasPaxDetected && !hasOutdoorItemsDetected) {
          reply = "Namaste! 🙏 I'm Arjun, hospitality and catering manager at Sangam Hotels Hyderabad. What **Occasion** are you planning outdoor catering for? (e.g. Birthday Party, Housewarming, Wedding, Corporate Event)"
        } else if (!hasDateDetected && !hasPaxDetected && !hasOutdoorItemsDetected) {
          reply = "Wonderful! What is your planned **Event Date** for the outdoor catering setup & delivery?"
        } else if (!hasTimeDetected && !hasPaxDetected && !hasOutdoorItemsDetected) {
          reply = "Great! What **Time** would you like the food to be served at your venue?\n\n• ☀️ **Lunch** (12:00 PM – 3:00 PM)\n• 🌙 **Dinner** (7:30 PM – 10:30 PM)\n• 🌅 **Morning Breakfast** (8:00 AM – 11:00 AM)"
        } else if (!hasPaxDetected) {
          reply = "Got it! How many **Guests (Pax)** are you expecting for the catering? (e.g. 30, 50, 100, 150+ guests)"
        } else {
          // Items missing
          const vegOutdoor = liveCateringData.outdoorMenus.find(m => (m.dietaryType || '').toLowerCase().includes('veg') && !(m.dietaryType || '').toLowerCase().includes('non'))
          const nonVegOutdoor = liveCateringData.outdoorMenus.find(m => !(m.dietaryType || '').toLowerCase().includes('veg') || (m.dietaryType || '').toLowerCase().includes('non'))
          const vegLine = vegOutdoor ? `• 🌿 **${vegOutdoor.name}** (₹${vegOutdoor.pricePerPax}/plate)${vegOutdoor.description ? ` — ${vegOutdoor.description}` : ''}` : `• 🌿 **Popular Veg Spread** (pricing confirmed by our catering manager)`
          const nonVegLine = nonVegOutdoor ? `• 🍗 **${nonVegOutdoor.name}** (₹${nonVegOutdoor.pricePerPax}/plate)${nonVegOutdoor.description ? ` — ${nonVegOutdoor.description}` : ''}` : `• 🍗 **Non-Veg Spread** (pricing confirmed by our catering manager)`
          reply = `Thank you! For ${effectiveAdults} guests, which catering menu spread or items would you prefer?\n\n${vegLine}\n${nonVegLine}\n• 🍛 **Custom Dishes & Live Counters** (Build your custom menu)`
        }
      } else if (hasPackageDetected) {
        // Indoor Banquet Quote
        const quote = generatePopularCateringQuote(
          'inhouse',
          mentionedBranch || 'Peerzadiguda / Hayathnagar',
          effectiveAdults,
          isVegOnly,
          [],
          lastUserMsg + ' ' + allUserText,
          liveCateringData,
          resolvedBranchId
        )

        const mult = loyaltyDiscount > 0 ? 0.95 : 1.0
        const totalWithDiscount = Math.round(quote.finalTotal * mult)
        const discountLine = loyaltyDiscount > 0 ? `\n• **5% Loyalty Discount Applied**: -₹${Math.round(quote.finalTotal * 0.05).toLocaleString('en-IN')}` : ''

        reply = `${quote.headline}\n\n` +
          `📋 **Menu Spread & Dishes Included**:\n` +
          `${quote.menuItems.join('\n\n')}\n\n` +
          `💰 **Estimation**: ₹${quote.pricePerPlate}/plate × ${effectiveAdults} Guests = **₹${totalWithDiscount.toLocaleString('en-IN')}**${discountLine}\n\n` +
          `${quote.trayBreakdown.join('\n')}\n\n` +
          `You can tap **[✏️ Edit]** on any section above or use the quick action chips below to customize dishes, or share your WhatsApp number to save this 10-day quote!`
      } else if (!hasDateDetected && !hasBranchDetected && !hasSlotDetected && !hasPaxDetected) {
        reply = "Namaste! 🙏 I'm Arjun, hospitality and catering manager at Sangam Hotels Hyderabad. Which branch do you prefer for your banquet event — **Peerzadiguda Flagship** or **Hayathnagar**?"
      } else if (!hasDateDetected) {
        reply = "Wonderful! What is your planned **Event Date**?"
      } else if (!hasSlotDetected) {
        reply = "Great! Which **Time Slot** are you planning for?\n\n• ☀️ **Lunch Slot** (11:00 AM – 3:00 PM)\n• 🌙 **Dinner Slot** (7:00 PM – 11:00 PM)\n• 🌅 **Full Day Slot** (6:00 AM – 10:00 PM)"
      } else if (!hasPaxDetected) {
        reply = "Got it! How many **Guests (Pax)** are you expecting for the event? (Adults + Kids)"
      } else if (!lastDietaryDetected) {
        reply = "Thank you! What is your **Dietary Preference** for the event menu?\n\n• 🌿 **Pure Veg**\n• 🥗 **Veg & Non-Veg**\n• 🍗 **Non-Veg**"
      } else {
        const fmtMenu = (m: typeof liveCateringData.indoorMenus[number]) => `• 🍽️ **${m.name}** (₹${m.pricePerPax}/plate)${m.description ? ` — ${m.description}` : ''}`
        if (lastDietaryDetected === 'veg') {
          const vegMenus = liveCateringData.indoorMenus.filter(m => (m.dietaryType || '').toLowerCase().includes('veg') && !(m.dietaryType || '').toLowerCase().includes('non'))
          reply = vegMenus.length > 0
            ? `Here are our available **Pure Veg Banquet Packages**:\n\n${vegMenus.map(fmtMenu).join('\n')}\n\nPlease select which menu package you'd like an estimation for!`
            : "Our Pure Veg Banquet Packages are being confirmed by our catering manager right now — please call +91 90638 44021 for current pricing, or tell me your guest count and I'll follow up with an estimate."
        } else {
          const nonVegMenus = liveCateringData.indoorMenus.filter(m => !(m.dietaryType || '').toLowerCase().includes('veg') || (m.dietaryType || '').toLowerCase().includes('non'))
          reply = nonVegMenus.length > 0
            ? `Here are our available **Non-Veg Banquet Packages**:\n\n${nonVegMenus.map(fmtMenu).join('\n')}\n\nPlease select which menu package you'd like an estimation for!`
            : "Our Non-Veg Banquet Packages are being confirmed by our catering manager right now — please call +91 90638 44021 for current pricing, or tell me your guest count and I'll follow up with an estimate."
        }
      }
    }

    // 6. Action Parser: Save Quote Draft to `eventmgmt.booking`
    const saveTagMatch = reply.match(/\[SAVE_QUOTE:([^\]]+)\]/i)
    let targetPhone = detectedPhone

    if (saveTagMatch) {
      const tagContent = saveTagMatch[1]
      const phoneMatch = tagContent.match(/whatsapp=([^|\]]+)/i)
      if (phoneMatch) targetPhone = phoneMatch[1].trim()
    }

    if (targetPhone && (saveTagMatch || /save|quote|hold|book|confirm|advance|phone|whatsapp|\d{10}/i.test(allUserText) || /reference\s*id|confirmed|tentatively booked/i.test(reply))) {
      try {
        const codeMatch = reply.match(/SGM-?[A-Z0-9]{4,6}/i) || allUserText.match(/SGM-?[A-Z0-9]{4,6}/i)
        let quoteNumber = codeMatch ? codeMatch[0].toUpperCase() : `SGM-${Math.floor(1000 + Math.random() * 9000)}`
        if (!quoteNumber.includes('-') && quoteNumber.startsWith('SGM')) {
          quoteNumber = 'SGM-' + quoteNumber.slice(3)
        }

        const validUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        
        // Extract date if mentioned or default to 7 days ahead
        let targetDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
        const dateMatch = (reply + ' ' + allUserText).match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})/i)
        if (dateMatch) {
          const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }
          const day = dateMatch[1].padStart(2, '0')
          const m = months[dateMatch[2].toLowerCase().slice(0, 3)] || '09'
          const yr = dateMatch[3]
          targetDate = `${yr}-${m}-${day}`
        }

        // Extract total amount if mentioned
        const totalMatch = (reply + ' ' + allUserText).match(/(?:Grand Total|Total|Amount|₹)\s*[:=–-]?\s*₹?\s*([\d,]+)/i)
        const parsedTotal = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : 0
        // Fallback plate rate, only used if no total could be parsed from the
        // conversation: prefer the nearest real live price (matching diet)
        // over a hardcoded guess.
        const liveMenuPool = isIndoor ? liveCateringData.indoorMenus : liveCateringData.outdoorMenus
        const dietMatchedLive = liveMenuPool.filter(m => {
          const dt = (m.dietaryType || '').toLowerCase()
          const isVegRow = dt.includes('veg') && !dt.includes('non')
          return isVegOnly ? isVegRow : true
        })
        const fallbackPlateRate = (dietMatchedLive[0] || liveMenuPool[0])?.pricePerPax
          ?? (isIndoor ? (isVegOnly ? 600 : 800) : 450)
        const calculatedTotal = parsedTotal > 0 ? parsedTotal : Math.round(fallbackPlateRate * (effectiveAdults || 20) * (loyaltyDiscount > 0 ? 0.95 : 1))

        // Real branch_id — already resolved above (step 3) for the hall/menu
        // lookup, reused here so a booking is never silently lost. Falls back
        // to the flagship UUID only if the lookup failed, and that's logged
        // so a wrong fallback is visible, not silent.
        if (mentionedBranch && !resolvedBranchId) {
          console.warn(`[Quote Save] Could not resolve branch_id for "${mentionedBranch}" from the branches table — using fallback UUID. Verify the branches table/column names.`)
        }
        const branchId = resolvedBranchId || '6215d413-e566-44a8-b8fd-f2b2d5a90e98'

        const client = sbEvent()

        if (client) {
          const { data: savedBooking, error: insErr } = await client
            .from('booking')
            .insert({
              branch_id: branchId,
              service_type: isIndoor ? 'inhouse' : 'outdoor',
              event_date: targetDate,
              pax: effectiveAdults || 20,
              status: 'draft',
              booking_code: quoteNumber,
              total_amount: calculatedTotal,
              amount_paid: 0,
              payment_status: 'unpaid',
              catering_contacts: {
                whatsapp_phone: targetPhone,
                customer_name: customerName || 'Valued Guest',
                source: 'ai_chatbot',
                valid_until: validUntil,
                branch: mentionedBranch || 'Hayathnagar / Peerzadiguda'
              },
              menu_selection: {
                service: isIndoor ? 'Indoor Banquet Catering' : 'Outdoor Custom Catering',
                custom_notes: lastUserMsg.slice(0, 300),
                guest_count: effectiveAdults || 20
              }
            })
            .select()
            .single()

          if (!insErr && savedBooking) {
            console.log(`[Quote Saved] Quote #${quoteNumber} successfully persisted into eventmgmt.booking!`)
          }
        }
      } catch (err) {
        console.warn('Failed writing quote to eventmgmt.booking:', err)
      }
    }

    // Clean up any remaining internal tags
    reply = reply.replace(/\[SAVE_QUOTE:[^\]]+\]/gi, '').trim()

    // 7. Generate Contextual Dynamic Suggestion Chips
    const suggestions = generateDynamicSuggestions(recentMsgs, reply)

    return NextResponse.json({ reply, suggestions, customerName, loyaltyDiscount })
  } catch (err) {
    console.error('Error in /api/chat route:', err)
    return NextResponse.json({
      reply: 'Hello! I am here to help you plan your catering and banquet events with Sangam Hotels. Could you please let me know which branch and how many guests you are expecting or call our manager directly at +91 90638 44021?',
      suggestions: [
        { label: '🏛️ Indoor Catering', text: 'I want an Indoor AC Banquet Hall quote with standard packages' },
        { label: '🚚 Outdoor Catering', text: 'I want Outdoor Catering with custom trays and food setup' }
      ]
    })
  }
}

export function generateDynamicSuggestions(
  messages: Array<{ role: string; content: string }>,
  latestReply: string
): Array<{ label: string; text: string }> {
  const userMessages = messages.filter(m => m.role === 'user')
  const allUserText = userMessages.map(m => m.content).join(' ').toLowerCase()
  const lowerReply = (latestReply || '').toLowerCase()

  if (userMessages.length === 0) {
    return [
      { label: '🏛️ Indoor Catering', text: 'I want an Indoor AC Banquet Hall quote with standard packages' },
      { label: '🚚 Outdoor Catering', text: 'I want Outdoor Catering with custom trays and food setup' },
    ]
  }

  const lastUserText = userMessages[userMessages.length - 1]?.content.toLowerCase() || ''
  const isOutdoorExplicit = lastUserText.includes('outdoor') || lastUserText.includes('tray') || lastUserText.includes('outside') || lastUserText.includes('catering at home') || lastUserText.includes('delivery') || lastUserText.includes('farmhouse') || lastUserText.includes('spread')
  const isIndoorExplicit = lastUserText.includes('indoor') || lastUserText.includes('banquet') || lastUserText.includes('hall')

  let isOutdoorFlow = false
  if (isOutdoorExplicit) {
    isOutdoorFlow = true
  } else if (isIndoorExplicit) {
    isOutdoorFlow = false
  } else {
    isOutdoorFlow = (allUserText.includes('outdoor') || allUserText.includes('tray') || allUserText.includes('delivery') || allUserText.includes('spread')) && !allUserText.includes('indoor') && !allUserText.includes('banquet')
  }

  const hasIndoor = allUserText.includes('indoor') || allUserText.includes('banquet') || allUserText.includes('hall')
  const hasBranch = allUserText.includes('peerzadiguda') || allUserText.includes('hayathnagar') || allUserText.includes('malkapur')
  const hasDate = /\b(\d{1,2}[-/.]\d{1,2}|\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|weekend|tomorrow|next week|next month|october|november|december|january|february|september|2026|2027)\b/i.test(allUserText)
  const hasSlot = allUserText.includes('lunch') || allUserText.includes('dinner') || allUserText.includes('full day') || (allUserText.includes('slot') && (allUserText.includes('slot 1') || allUserText.includes('slot 2') || allUserText.includes('slot 3') || allUserText.includes('slot1') || allUserText.includes('slot2') || allUserText.includes('lunch slot') || allUserText.includes('dinner slot')))
  const hasPax = /\b(\d+)\s*(?:guests?|pax|people|persons|adults)\b/i.test(allUserText) || /\bpax\s*\d+\b/i.test(allUserText)
  const hasPackage = allUserText.includes('veg menu') || allUserText.includes('non-veg menu') || allUserText.includes('grand veg') || allUserText.includes('grand non-veg') || allUserText.includes('platinum') || allUserText.includes('₹600') || allUserText.includes('₹700') || allUserText.includes('₹800') || allUserText.includes('₹900') || allUserText.includes('₹1000') || allUserText.includes('₹1,000') || (allUserText.includes('plate') && (allUserText.includes('600') || allUserText.includes('800') || allUserText.includes('900') || allUserText.includes('1000')))

  // Find latest dietary choice from user messages
  let lastDietary: 'veg' | 'non-veg' | null = null
  for (const msg of userMessages) {
    const txt = msg.content.toLowerCase()
    if (txt.includes('non-veg') || txt.includes('non veg') || txt.includes('veg and non veg') || txt.includes('veg & non veg')) {
      lastDietary = 'non-veg'
    } else if (txt.includes('pure veg') || txt.includes('vegetarian') || txt.includes('veg only') || txt.includes('pure vegetarian') || (txt.includes('veg') && !txt.includes('package') && !txt.includes('menu'))) {
      lastDietary = 'veg'
    }
  }

  // Handle dish editing (applicable for both outdoor and indoor estimations)
  if (lastUserText.includes('starter') || lastUserText.includes('appetizer')) {
    return [
      { label: '🥢 Add Paneer Tikka', text: 'Please swap one starter for Paneer Tikka' },
      { label: '🥢 Add Chilli Chicken', text: 'Please swap one starter for Chilli Chicken' },
      { label: '🥢 Add Veg Spring Rolls', text: 'Please swap one starter for Veg Spring Rolls' },
      { label: '🥢 Add Chicken Majestic', text: 'Please swap one starter for Chicken Majestic' },
      { label: '✅ Done Editing Starters', text: 'These starters look perfect. Please confirm the estimation' },
    ]
  }

  if (lastUserText.includes('curry') || lastUserText.includes('curries') || lastUserText.includes('main course')) {
    return [
      { label: '🥘 Add Kadai Paneer', text: 'Please swap one curry for Kadai Paneer' },
      { label: '🥘 Add Methi Chaman', text: 'Please swap one curry for Methi Chaman' },
      { label: '🍗 Add Mughlai Chicken', text: 'Please swap one curry for Mughlai Chicken Masala' },
      { label: '🍗 Add Mutton Rogan Josh', text: 'Please swap one curry for Mutton Rogan Josh' },
      { label: '✅ Done Editing Curries', text: 'These curries look perfect. Please confirm the estimation' },
    ]
  }

  if (lastUserText.includes('biryani') || lastUserText.includes('dessert') || lastUserText.includes('sweet')) {
    return [
      { label: '🍚 Add Mutton Dum Biryani', text: 'Can we upgrade the Biryani to Hyderabadi Mutton Dum Biryani?' },
      { label: '🍨 Add Qubani Ka Meetha', text: 'Please add Royal Qubani Ka Meetha to Desserts' },
      { label: '🍨 Add Gulab Jamun & Ice Cream', text: 'Please add Hot Gulab Jamun with Vanilla Ice Cream' },
      { label: '✅ Done Editing Desserts', text: 'The desserts and biryani look perfect. Please confirm the estimation' },
    ]
  }

  const hasOccasion = /\b(birthday|housewarming|gruhapravesam|gruhapravesh|wedding|reception|anniversary|corporate|office|farmhouse|get-together|get together|gathering|party|engagement|sangeet|haldi|pooja|puja|cradle ceremony|naming ceremony|celebration|meeting)\b/i.test(allUserText)
  const hasTime = /\b(lunch|dinner|breakfast|morning|afternoon|evening|pm|am|\d{1,2}\s*(?:am|pm)|\d{1,2}:\d{2})\b/i.test(allUserText)
  const hasOutdoorItems = allUserText.includes('veg spread') || allUserText.includes('non-veg spread') || allUserText.includes('499') || lowerReply.includes('499') || allUserText.includes('649') || lowerReply.includes('649') || allUserText.includes('popular veg') || allUserText.includes('hyderabadi non-veg') || extractCustomDishes(allUserText).length >= 2 || allUserText.includes('custom dishes') || allUserText.includes('tray sizing')

  // Case 1: Outdoor Catering Flow (Step-by-step: Occasion -> Date -> Time -> Pax -> Items -> Estimation)
  if (isOutdoorFlow) {
    // A. Estimation State: Main things needed (Pax and Items) are provided!
    if (hasPax && hasOutdoorItems) {
      return [
        { label: '✏️ Edit Starters', text: 'I would like to swap and customize the Starters section' },
        { label: '✏️ Edit Curries', text: 'I would like to swap and customize the Main Curries section' },
        { label: '✏️ Edit Biryani & Desserts', text: 'I would like to swap and customize Biryani & Desserts' },
        { label: '🍲 Add Live Dosa Counter', text: 'Can we add a live Dosa and Tiffin counter to this outdoor catering?' },
        { label: '📱 Save Quote on WhatsApp', text: 'I would like to save this outdoor catering quote for 10 days. My WhatsApp number is ' },
        { label: '👥 Recalculate for 100 Pax', text: 'Please recalculate this outdoor catering quote for 100 guests' },
      ]
    }

    // B. Step 1: Occasion Name (if not provided)
    if (!hasOccasion && !hasPax && !hasOutdoorItems) {
      return [
        { label: '🎉 Birthday Party', text: 'The occasion is a Birthday Party' },
        { label: '🏡 Housewarming', text: 'The occasion is Housewarming (Gruhapravesam)' },
        { label: '💍 Wedding / Reception', text: 'The occasion is a Wedding / Reception' },
        { label: '💼 Corporate Event', text: 'The occasion is a Corporate Event' },
        { label: '🌴 Farmhouse / Gathering', text: 'The occasion is a Farmhouse Get-together' },
      ]
    }

    // C. Step 2: Event Date (if not provided)
    if (!hasDate && !hasPax && !hasOutdoorItems) {
      return getDynamicDateChips()
    }

    // D. Step 3: Event Time (if not provided)
    if (!hasTime && !hasPax && !hasOutdoorItems) {
      return [
        { label: '☀️ Lunch (12 PM - 3 PM)', text: 'The event time is Lunch (12:00 PM - 3:00 PM)' },
        { label: '🌙 Dinner (7:30 PM - 10:30 PM)', text: 'The event time is Dinner (7:30 PM - 10:30 PM)' },
        { label: '🌅 Morning Breakfast (8 AM - 11 AM)', text: 'The event time is Morning Breakfast (8:00 AM - 11:00 AM)' },
      ]
    }

    // E. Step 4: Pax (Guest Count) (if not provided)
    if (!hasPax) {
      return [
        { label: '👥 30 Guests', text: 'We are expecting approximately 30 guests' },
        { label: '👥 50 Guests', text: 'We are expecting approximately 50 guests' },
        { label: '👥 100 Guests', text: 'We are expecting approximately 100 guests' },
        { label: '👥 150 Guests', text: 'We are expecting approximately 150 guests' },
        { label: '👥 200+ Guests', text: 'We are expecting approximately 200 guests' },
      ]
    }

    // F. Step 5: Menu Items / Spread (if not provided)
    if (!hasOutdoorItems) {
      return [
        { label: '🌿 Popular Veg Spread (₹499)', text: 'We would like the Popular Veg Spread at ₹499 per plate' },
        { label: '🍗 Hyderabadi Non-Veg (₹649)', text: 'We would like the Hyderabadi Non-Veg Spread at ₹649 per plate' },
        { label: '🍛 Custom Dishes & Counters', text: 'I want to select custom dishes and live counters' },
      ]
    }

    // Default outdoor estimation chips
    return [
      { label: '🌿 Pure Veg Spread (₹499)', text: 'Please recalculate for Pure Veg Spread at ₹499 per plate' },
      { label: '🍗 Non-Veg Spread (₹649)', text: 'Please recalculate for Hyderabadi Non-Veg Spread at ₹649 per plate' },
      { label: '👥 50 Guests', text: 'Please recalculate this outdoor catering quote for 50 guests' },
      { label: '👥 100 Guests', text: 'Please recalculate this outdoor catering quote for 100 guests' },
      { label: '🍲 Add Live Dosa Counter', text: 'Can we add a live Dosa and Tiffin counter to this outdoor catering?' },
      { label: '📱 Save Quote on WhatsApp', text: 'I would like to save this outdoor catering quote for 10 days. My WhatsApp number is ' },
    ]
  }

  // Case 2: Active Indoor Estimation & Quote (Menu Package has been selected!)
  if (hasPackage) {
    return [
      { label: '✏️ Edit Starters', text: 'I would like to swap and customize the Starters section' },
      { label: '✏️ Edit Curries', text: 'I would like to swap and customize the Main Curries section' },
      { label: '✏️ Edit Biryani & Desserts', text: 'I would like to swap and customize Biryani & Desserts' },
      { label: '📱 Save Quote on WhatsApp', text: 'I would like to save this quote for 10 days. My WhatsApp number is ' },
      { label: '🏛️ Book Hall Viewing', text: 'Can I schedule a banquet hall visit at the branch?' },
      { label: '👥 Recalculate for 150 Pax', text: 'Please recalculate this quote for 150 guests' },
    ]
  }

  // Case 3: Banquet Intake Flow (Strict Sequential Order: Branch -> Date -> Slot -> Pax -> Dietary -> Menu)
  // Step 1: Branch Selection (if branch, date, slot, and pax are all unselected)
  if (!hasBranch && !hasDate && !hasSlot && !hasPax) {
    return [
      { label: '📍 Peerzadiguda Flagship', text: 'I prefer Peerzadiguda Flagship branch for the banquet hall' },
      { label: '📍 Hayathnagar HQ', text: 'I prefer Hayathnagar branch for the banquet hall' },
    ]
  }

  // Step 2: Event Date Selection (if date is missing)
  if (!hasDate) {
    return getDynamicDateChips()
  }

  // Step 3: Slot Timing Selection (Right after date is selected!)
  if (!hasSlot) {
    return [
      { label: '☀️ Lunch (11 AM - 3 PM)', text: 'We are planning for Lunch Slot (11:00 AM - 3:00 PM)' },
      { label: '🌙 Dinner (7 PM - 11 PM)', text: 'We are planning for Dinner Slot (7:00 PM - 11:00 PM)' },
      { label: '🌅 Full Day (6 AM - 10 PM)', text: 'We need the Full Day Slot (6:00 AM - 10:00 PM)' },
    ]
  }

  // Step 4: Guest Count / Pax Selection (Right after slot is selected!)
  if (!hasPax) {
    return [
      { label: '👥 50 Guests', text: 'We are expecting approximately 50 guests (40 adults + 20 kids)' },
      { label: '👥 100 Guests', text: 'We are expecting approximately 100 guests' },
      { label: '👥 150 Guests', text: 'We are expecting approximately 150 guests' },
      { label: '👥 200 Guests', text: 'We are expecting approximately 200 guests' },
      { label: '👥 300+ Guests', text: 'We are expecting a grand gathering of 300+ guests' },
    ]
  }

  // Step 5: Dietary Preference Selection (Right after pax is selected!)
  if (!lastDietary) {
    return [
      { label: '🌿 Pure Veg', text: 'We prefer Pure Vegetarian menu packages' },
      { label: '🥗 Veg & Non-Veg', text: 'We prefer Veg and Non-Veg menu packages' },
      { label: '🍗 Non-Veg', text: 'We prefer Non-Veg menu packages' },
    ]
  }

  // Step 6: Menu Package Selection (Based on dietary choice!)
  if (lastDietary === 'veg') {
    return [
      { label: '🌱 Standard Veg Menu (₹600)', text: 'I would like the standard Veg Menu at ₹600 per plate' },
      { label: '👑 Grand Veg Menu (₹700)', text: 'I would like the Grand Veg Menu at ₹700 per plate' },
      { label: '🍗 Switch to Veg & Non-Veg', text: 'Actually, please show me the Veg and Non-Veg menu packages' },
    ]
  }

  return [
    { label: '🍗 Standard Non-Veg Menu (₹800)', text: 'I would like the Non-Veg Menu at ₹800 per plate' },
    { label: '🌟 Grand Non-Veg Menu (₹900)', text: 'I would like the Grand Non-Veg Menu at ₹900 per plate' },
    { label: '💎 Platinum Non-Veg (₹1,000)', text: 'I would like the Platinum Non-Veg Menu at ₹1,000 per plate' },
    { label: '🌿 Switch to Pure Veg', text: 'Actually, please show me the Pure Vegetarian menu packages' },
  ]

  // Default discovery
  return [
    { label: '🏛️ Indoor Catering', text: 'I want an Indoor AC Banquet Hall quote with standard packages' },
    { label: '🚚 Outdoor Catering', text: 'I want Outdoor Catering with custom trays and food setup' },
  ]
}

export function getDynamicDateChips(): Array<{ label: string; text: string; isCalendar?: boolean }> {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const ist = new Date(utc + 3600000 * 5.5)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const fullMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // 1. Tomorrow
  const tomorrow = new Date(ist)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getDate()} ${months[tomorrow.getMonth()]}`
  const tomorrowFull = `${tomorrow.getDate()} ${fullMonths[tomorrow.getMonth()]} ${tomorrow.getFullYear()}`

  // 2. This Saturday
  const currentDay = ist.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  let daysToSat = (6 - currentDay + 7) % 7
  if (daysToSat === 0) daysToSat = 7 // If today is Saturday, target next Saturday
  const thisSat = new Date(ist)
  thisSat.setDate(thisSat.getDate() + daysToSat)
  const thisSatStr = `${thisSat.getDate()} ${months[thisSat.getMonth()]}`
  const thisSatFull = `Saturday, ${thisSat.getDate()} ${fullMonths[thisSat.getMonth()]} ${thisSat.getFullYear()}`

  // 3. This Sunday
  let daysToSun = (7 - currentDay) % 7
  if (daysToSun === 0) daysToSun = 7 // If today is Sunday, target next Sunday
  const thisSun = new Date(ist)
  thisSun.setDate(thisSun.getDate() + daysToSun)
  const thisSunStr = `${thisSun.getDate()} ${months[thisSun.getMonth()]}`
  const thisSunFull = `Sunday, ${thisSun.getDate()} ${fullMonths[thisSun.getMonth()]} ${thisSun.getFullYear()}`

  // 4. Next Saturday
  const nextSat = new Date(thisSat)
  nextSat.setDate(nextSat.getDate() + 7)
  const nextSatStr = `${nextSat.getDate()} ${months[nextSat.getMonth()]}`
  const nextSatFull = `Saturday, ${nextSat.getDate()} ${fullMonths[nextSat.getMonth()]} ${nextSat.getFullYear()}`

  return [
    { label: `⚡ Tomorrow (${tomorrowStr})`, text: `The event date is Tomorrow, ${tomorrowFull}` },
    { label: `🎉 This Sat (${thisSatStr})`, text: `The event date is ${thisSatFull}` },
    { label: `🌟 This Sun (${thisSunStr})`, text: `The event date is ${thisSunFull}` },
    { label: `📅 Next Sat (${nextSatStr})`, text: `The event date is ${nextSatFull}` },
    { label: `📅 Pick from Calendar`, text: ``, isCalendar: true },
  ]
}
