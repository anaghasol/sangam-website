import { NextRequest, NextResponse } from 'next/server'
import { getSangamUnifiedKnowledgeContext } from '@/lib/sangam-knowledge'
import { askFreeModels } from '@/lib/free-ai'
import { lookupCustomerByPhone, extractPhoneNumber } from '@/lib/customer-lookup'
import { calculateEffectiveGuests, generatePopularCateringQuote } from '@/lib/catering-portions'
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

CATERING SERVICE TYPES & PRICING:
1. INDOOR AC BANQUET HALLS (from eventmgmt.hall & eventmgmt.menu):
   - PEERZADIGUDA FLAGSHIP HALLS:
     * SANGAMAM Hall (4th Floor): 250–500 pax, Grand Banquet, Lifts, Valet Parking, Flat charge ₹30,000 / Full day ₹150,000 (Free hall if catering ≥ ₹200,000)
     * ARANGAM Hall (3rd Floor): 100–150 pax, AC Banquet, Flat charge ₹20,000 / Full day ₹40,000 (Free hall if catering ≥ ₹100,000)
     * MAGUDAM Hall (3rd Floor): 100–150 pax, AC Banquet, Flat charge ₹20,000 / Full day ₹40,000 (Free hall if catering ≥ ₹100,000)
     * MADURAM Hall (1st Floor): 50–100 pax, AC Banquet, Flat charge ₹10,000 / Full day ₹20,000 (Free hall if catering ≥ ₹50,000)
     * Classic Hall (Ground Floor): Up to 220 pax, AC Banquet, Flat charge ₹7,000 / Full day ₹18,000 (Free hall if catering ≥ ₹60,000)
   - HAYATHNAGAR SANGAM HALL (2nd Floor): 50–200 pax, AC Banquet, Lifts, Valet Parking, Flat charge ₹20,000 / Full day ₹30,000 (Free hall if catering ≥ ₹50,000)

   - STANDARD INDOOR MENU PACKAGES (eventmgmt.menu):
     * Veg Menu: ₹600/plate (1 Welcome Drink, 2 Veg Starters, 2 Main Curries, 1 Dal, 1 Veg Biryani, 2 Breads, 2 Desserts)
     * Grand Veg Menu: ₹700/plate (1 Welcome Drink, 3 Premium Veg Starters, 3 Main Curries, 1 Dal, 1 Special Biryani, 2 Breads, 3 Desserts)
     * Non-Veg Menu: ₹800/plate (1 Welcome Drink, 2 Non-Veg Starters, 1 Veg Starter, 2 Non-Veg Curries, 1 Veg Curry, 1 Chicken Dum Biryani, 2 Breads, 2 Desserts)
     * Grand Non-Veg Menu: ₹900/plate (1 Welcome Drink, 3 Non-Veg Starters, 2 Veg Starters, 3 Non-Veg Curries, 2 Veg Curries, Hyderabadi Chicken Dum Biryani, 2 Breads, 3 Desserts)
     * Platinum Non-Veg Menu: ₹1,000/plate (Grand wedding spread with Mutton Dum Biryani, live counters, royal desserts)

2. OUTDOOR CATERING & CUSTOM TRAYS:
   - 100% custom menu & tray-based catering (no rigid package lock-in).
   - Tray Capacities: Biryani/Rice (25-30 pax/tray), Starters (40-50 pax/tray), Curries/Dals (35-45 pax/tray), Live Breads (2.5 pcs/pax), Desserts (35-40 pax/tray).

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
6. Menu Package: Once dietary preference is selected, present only the matching packages:
   - If Pure Veg: Standard Veg Menu (₹600/plate) or Grand Veg Menu (₹700/plate).
   - If Veg & Non-Veg / Non-Veg: Standard Non-Veg Menu (₹800/plate), Grand Non-Veg Menu (₹900/plate), or Platinum Non-Veg Menu (₹1,000/plate).
7. Full Estimation & Dish Spread Breakdown: ONLY AFTER the customer selects their menu package, generate the full estimation:
   - Matching AC Banquet Hall based on pax and branch (e.g. Maduram for 50–100 pax, Arangam/Magudam for 100–150 pax, Classic for up to 220 pax, Sangamam Grand for 250–500 pax).
   - Pricing: Guest count × Plate rate = Total Catering Amount. (Mention hall fee is waived complimentary!).
   - Itemized Dish Spread organized by SECTION with "[✏️ Edit]" tag on each section header:
     ### 🍹 Welcome Drinks [✏️ Edit]
     • Fresh Mint Mojito / Welcome Juice
     ### 🥗 Starters & Appetizers [✏️ Edit]
     • ... (specific dishes included in that package)
     ### 🍛 Main Course Curries [✏️ Edit]
     • ... (specific dishes included in that package)
     ### 🍲 Dal & Traditional [✏️ Edit]
     • ... (specific dishes included in that package)
     ### 🍚 Rice & Biryani [✏️ Edit]
     • ... (specific dishes included in that package)
     ### 🫓 Live Tandoor Breads [✏️ Edit]
     • ... (specific breads)
     ### 🍨 Sweets & Desserts [✏️ Edit]
     • ... (specific desserts)
   - Explain: "You can tap any [✏️ Edit] button next to a section header or the quick action chips below to customize dishes, or share your WhatsApp number to lock in your 10-day draft quote!"

CUSTOM DISHES INTAKE RULE:
- When a customer names specific dishes (e.g. Aloo Mutter Paneer, Bagara Baingan, Cabbage Pakoda, Dosakaya, Double Ka Meetha, Green Salad, Masala Vada, Palak Dal, Plain Curd, Pulihora, Sambar, Veg Pulao):
  1. Include ALL requested dishes in the categorized menu.
  2. For 20 pax, specify 1 Full Tray per dish (sufficient for 20-30 guests).
  3. Estimate an all-inclusive rate (e.g. ₹450 - ₹550/plate for grand veg spreads, ₹600 - ₹750/plate for non-veg).
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
        customerContext = `\nCUSTOMER RECOGNITION (VERIFIED RETURNING CUSTOMER):\n• Name: ${profile.name || 'Valued Guest'}\n• Phone: ${profile.phone}\n• Total Past Orders: ${profile.orderCount}\n• Loyalty Discount: 5% Applicable on food total!${favs}\nInstruction: Greet the customer warmly by name and apply their 5% loyalty discount in quotes!`
      }
    }

    // 3. Fetch Unified Knowledge Context (RAG, PetPooja, Eventmgmt DB, Portion Rules)
    const extraContext = await getSangamUnifiedKnowledgeContext(lastUserMsg)
    const intakeStatusContext = `\nCURRENT INTAKE STATUS (DO NOT RE-ASK FOR ALREADY PROVIDED DETAILS):\n` +
      `• Branch: ${mentionedBranch || 'Not specified yet'}\n` +
      `• Date: ${hasDateDetected ? 'Already Provided' : 'Pending'}\n` +
      `• Time Slot: ${hasSlotDetected ? 'Already Provided' : 'Pending'}\n` +
      `• Guest Count (Pax): ${hasPaxDetected ? `${effectiveAdults} Guests` : 'Pending'}\n` +
      `• Dietary Preference: ${lastDietaryDetected || 'Pending'}\n` +
      `• Menu Package: ${hasPackageDetected ? 'Selected' : 'Pending'}\n` +
      `CRITICAL INSTRUCTION: Review the CURRENT INTAKE STATUS above. Under NO circumstance should you ask for any field that is 'Already Provided'. Acknowledge the user's latest choice and prompt ONLY for the NEXT 'Pending' step in this exact order: Date -> Time Slot -> Pax -> Dietary -> Menu -> Estimation.`

    const systemPrompt = [
      SYSTEM_PROMPT,
      customerContext,
      extraContext,
      intakeStatusContext
    ].filter(Boolean).join('\n\n')

    // 4. Query AI Providers Cascade
    let reply = await askFreeModels(systemPrompt, recentMsgs)

    // 5. Smart Fallback if AI providers rate-limit
    if (!reply) {
      if (hasPackageDetected) {
        const serviceType = isOutdoor ? 'outdoor' : 'inhouse'
        const quote = generatePopularCateringQuote(
          serviceType,
          mentionedBranch || 'Peerzadiguda / Hayathnagar',
          effectiveAdults,
          isVegOnly,
          [],
          lastUserMsg + ' ' + allUserText
        )

        const mult = loyaltyDiscount > 0 ? 0.95 : 1.0
        const totalWithDiscount = Math.round(quote.finalTotal * mult)
        const discountLine = loyaltyDiscount > 0 ? `\n• **5% Loyalty Discount Applied**: -₹${Math.round(quote.finalTotal * 0.05).toLocaleString('en-IN')}` : ''

        reply = `${quote.headline}\n\n` +
          `📋 **Menu Spread & Dishes Included**:\n` +
          `${quote.menuItems.join('\n\n')}\n\n` +
          `💰 **Estimation**: ₹${quote.pricePerPlate}/plate × ${effectiveAdults} Guests = **₹${totalWithDiscount.toLocaleString('en-IN')}**${discountLine}\n\n` +
          `• **Banquet Amenities**: AC Banquet Hall, Stage, Audio/Mic Setup & Dedicated Banquet Staff Included!\n` +
          `• **Hall Fee Status**: Complimentary / Waived with catering package!\n\n` +
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
        if (lastDietaryDetected === 'veg') {
          reply = "Here are our available **Pure Veg Banquet Packages**:\n\n• 🌱 **Standard Veg Menu** (₹600/plate) — 1 Welcome Drink, 2 Veg Starters, 2 Main Curries, Dal, Veg Biryani, 2 Breads, 2 Desserts\n• 👑 **Grand Veg Menu** (₹700/plate) — 1 Welcome Drink, 4 Premium Starters, 3 Curries, Dal, Special Biryani, 3 Breads, 3 Desserts\n\nPlease select which menu package you'd like an estimation for!"
        } else {
          reply = "Here are our available **Non-Veg Banquet Packages**:\n\n• 🍗 **Standard Non-Veg Menu** (₹800/plate) — 1 Welcome Drink, 3 Starters, 3 Curries, Chicken Dum Biryani + Veg Biryani, Breads, 2 Desserts\n• 🌟 **Grand Non-Veg Menu** (₹900/plate) — 1 Welcome Drink, 4 Starters (Fish/Chicken/Veg), 4 Curries (Mutton/Chicken/Veg), Biryani, Breads, 3 Desserts\n• 💎 **Platinum Non-Veg Menu** (₹1,000/plate) — Royal Feast with Mutton Dum Biryani, Mutton Seekh Kebab, Tandoori Prawns & Live counters\n\nPlease select which menu package you'd like an estimation for!"
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
        const calculatedTotal = parsedTotal > 0 ? parsedTotal : Math.round(((isIndoor ? (isVegOnly ? 600 : 800) : 450) * (effectiveAdults || 20)) * (loyaltyDiscount > 0 ? 0.95 : 1))

        const client = sbEvent()

        if (client) {
          const { data: savedBooking, error: insErr } = await client
            .from('booking')
            .insert({
              branch_id: mentionedBranch === 'Peerzadiguda' ? '6215d413-e566-44a8-b8fd-f2b2d5a90e98' : '6215d413-e566-44a8-b8fd-f2b2d5a90e98',
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
        { label: '🏛️ Indoor Banquet Packages', text: 'I want an Indoor AC Banquet Hall quote with standard packages' },
        { label: '🚚 Outdoor Catering & Trays', text: 'I want Outdoor Catering with custom trays and live food setup' },
        { label: '🍛 Custom Menu Quote', text: 'I want to share my custom dish list for catering to calculate tray quantities and pricing' }
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
      { label: '🏛️ Indoor Banquet Packages', text: 'I want an Indoor AC Banquet Hall quote with standard packages' },
      { label: '🚚 Outdoor Catering & Trays', text: 'I want Outdoor Catering with custom trays and live food setup' },
      { label: '🍛 Custom Menu Quote', text: 'I want to share my custom dish list for catering to calculate tray quantities and pricing' },
      { label: '📍 Explore Branches & Halls', text: 'What banquet halls and branches do you have available?' },
    ]
  }

  const hasIndoor = allUserText.includes('indoor') || allUserText.includes('banquet') || allUserText.includes('hall')
  const hasOutdoor = allUserText.includes('outdoor') || allUserText.includes('tray') || allUserText.includes('delivery')
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

  // Case 1: Active Estimation & Quote (Menu Package has been selected!)
  if (hasPackage) {
    const lastUserText = userMessages[userMessages.length - 1]?.content.toLowerCase() || ''

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

    // Default Estimation Quick Actions
    return [
      { label: '✏️ Edit Starters', text: 'I would like to swap and customize the Starters section' },
      { label: '✏️ Edit Curries', text: 'I would like to swap and customize the Main Curries section' },
      { label: '✏️ Edit Biryani & Desserts', text: 'I would like to swap and customize Biryani & Desserts' },
      { label: '📱 Save Quote on WhatsApp', text: 'I would like to save this quote for 10 days. My WhatsApp number is ' },
      { label: '🏛️ Book Hall Viewing', text: 'Can I schedule a banquet hall visit at the branch?' },
      { label: '👥 Recalculate for 150 Pax', text: 'Please recalculate this quote for 150 guests' },
    ]
  }

  // Case 2: Outdoor Catering Flow (only if explicitly outdoor and not indoor)
  if (hasOutdoor && !hasIndoor && !hasDate && !hasSlot) {
    if (!hasPax) {
      return [
        { label: '👥 20 Guests', text: 'We are planning catering for 20 guests' },
        { label: '👥 50 Guests', text: 'We are planning catering for 50 guests' },
        { label: '👥 100 Guests', text: 'We are planning catering for 100 guests' },
        { label: '👥 150 Guests', text: 'We are planning catering for 150 guests' },
      ]
    }
    if (!hasBranch) {
      return [
        { label: '🚚 Deliver to Peerzadiguda Area', text: 'Catering delivery is needed around Peerzadiguda / Uppal area' },
        { label: '🚚 Deliver to Hayathnagar Area', text: 'Catering delivery is needed around Hayathnagar / L B Nagar area' },
      ]
    }
    return [
      { label: '📋 Popular Veg Spread', text: 'Please generate a popular Andhra vegetarian catering spread with tray sizing' },
      { label: '🍗 Hyderabadi Non-Veg Spread', text: 'Please generate a Hyderabadi Dum Biryani & Non-Veg spread with tray sizing' },
      { label: '🍲 Live Dosa & Tiffin Counter', text: 'Can we include a live Dosa & Tandoor counter with this catering?' },
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
    { label: '🏛️ Indoor Banquet Packages', text: 'I want an Indoor AC Banquet Hall quote with standard packages' },
    { label: '🚚 Outdoor Catering & Trays', text: 'I want Outdoor Catering with custom trays and live food setup' },
    { label: '🍛 Custom Menu Quote', text: 'I want to share my custom dish list for catering to calculate tray quantities and pricing' },
    { label: '📍 Explore Branches & Halls', text: 'What banquet halls and branches do you have available?' },
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
