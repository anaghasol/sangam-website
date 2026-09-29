import { NextRequest, NextResponse } from 'next/server'
import { getSangamUnifiedKnowledgeContext } from '@/lib/sangam-knowledge'
import { askFreeModels } from '@/lib/free-ai'
import { lookupCustomerByPhone, extractPhoneNumber } from '@/lib/customer-lookup'
import { calculateEffectiveGuests, generatePopularCateringQuote, extractCustomDishes, pickHallForGuestCount, matchSectionByText, findDishesInSectionFromText } from '@/lib/catering-portions'
import { getSangamCateringLiveData, getBranchIdByName, getOccasionIdByName, getIndoorMenuStructured } from '@/lib/sangam-catering'
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
   - Step 5: Delivery Address (full address/venue where the food must be delivered/set up), Customer Name, and Phone/WhatsApp Number — these are MANDATORY before the booking can be confirmed/saved (see MANDATORY CUSTOMER DETAILS section below), but do NOT block the estimation itself — show the estimation first, then ask for these to lock in the booking.
3. Estimation Rule: The MAIN things needed for estimation are **Pax** and **Items/Menu**.
   - As soon as Pax and Items are provided (or if the customer already included them in their text), IMMEDIATELY generate and display the full Outdoor Catering Estimation!
   - Acknowledge Occasion, Date, and Time if provided.
   - Display:
     * Headline: 🚚 **Outdoor Catering & Live Food Setup Estimation**
     * Event Details (Occasion, Date & Time if known)
     * Menu spread & dishes organized by section (NO "[Edit]" tags, NO "(Choose any N)" notes — just the section name and its picked dishes):
       ### 🍹 Welcome Drinks
       ### 🥗 Starters & Appetizers
       ### 🍛 Main Course Curries
       ### 🍚 Rice & Biryani
       ### 🫓 Live Tandoor Breads
       ### 🍨 Sweets & Desserts
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
   - Itemized Dish Spread organized by SECTION — every section of the chosen package must appear, in order. The REAL dish breakdown (real categories, sections, default/most-booked dishes, add-on upcharges) is supplied under that menu's price line in the "REAL DATABASE CATERING & EVENT PRICING" block below — use those exact dishes and section names. Never invent a dish that isn't listed there. If a package has no breakdown listed (older menus not yet in the menu builder), say the exact dish list will be confirmed by the catering manager rather than inventing one.
     - DO NOT list every dish on file for a section, and DO NOT print a "(Choose any N)" note or any "[Edit]" tag anywhere — that layout is retired. The data block below already shows only each section's most-booked/default picks, capped to that section's own limit — reproduce exactly what's shown there, nothing more, nothing less, with no limit label attached.
     - Never mention tapping "Edit" on a section — there is no such control. The customer can only change something by telling you in plain text (e.g. "swap the starters") or using the quick action chips below the reply.
     - Overage rule: if the guest asks for MORE dishes in a section than its stated limit N, the extra dish(es) beyond N are chargeable add-ons — use that specific dish's own [add-on]/extra-price figure from the data block if it has one; if the requested extra dish has no extra-price figure on file, say the extra charge for it will be confirmed by the catering manager rather than inventing a number. Never let an over-the-limit selection pass as free.
     - A section marked [add-on, extra charge applies] is NOT included in the base plate rate — only add its price if the guest selects it.
     - A section marked [complimentary] is included at no extra charge.
   - Explain: "You can use the quick action chips below to customize dishes, or share your WhatsApp number to lock in your 10-day draft quote!"

CUSTOM DISHES INTAKE RULE:
- When a customer names specific dishes (e.g. Aloo Mutter Paneer, Bagara Baingan, Cabbage Pakoda, Dosakaya, Double Ka Meetha, Green Salad, Masala Vada, Palak Dal, Plain Curd, Pulihora, Sambar, Veg Pulao):
  1. Include ALL requested dishes in the categorized menu.
  2. For 20 pax, specify 1 Full Tray per dish (sufficient for 20-30 guests).
  3. Base the all-inclusive rate on the closest live spread price from the block below, adjusted for dish count — never invent a rate that isn't grounded in that data.
  4. Never replace user dishes with generic defaults.

MANDATORY CUSTOMER DETAILS BEFORE CONFIRMING A BOOKING:
- INDOOR bookings: **Phone/WhatsApp number is mandatory** before you can save/confirm the quote. Name is nice-to-have but not blocking. After showing the full estimation, ask: "Could you share your phone/WhatsApp number so I can lock in this 10-day quote for you?" if it hasn't been given yet.
- OUTDOOR bookings: **Name, full delivery Address, and Phone/WhatsApp number are all mandatory** before you can save/confirm the quote (there is no banquet hall to anchor the booking to, so we need to know who and where). After showing the full estimation, ask for whichever of these three is still missing, e.g.: "To confirm this outdoor catering booking, could you share your name, the delivery address/venue, and your phone/WhatsApp number?"
- Never fabricate or assume a name, address, or phone number — only use what the customer actually typed.
- ADVANCE PAYMENT: once phone (indoor) or name+address+phone (outdoor) are known, ask if they'd like to pay an advance to confirm/hold the booking, e.g.: "Would you like to pay an advance now to confirm this booking? We accept any advance amount — just let me know how much you'd like to pay." If the customer states an advance amount (e.g. "I'll pay ₹5000 advance"), acknowledge it clearly in your reply restating the exact amount (e.g. "Noting your ₹5,000 advance payment") so it can be recorded — never invent or round an advance amount they didn't state.

TWO-STEP CONFIRMATION FLOW — NEVER RE-SHOW THE FULL ITEMIZED ESTIMATION WHILE ONLY COLLECTING DETAILS:
- The FIRST time you show the full estimation (headline, menu spread, pricing, tray breakdown), end it by asking for whichever mandatory detail(s) are still missing, exactly as above.
- On every turn AFTER that, once the customer is just confirming ("confirm", "go ahead", "book it") or handing over a missing detail (name/address/phone/advance amount) — and is NOT asking to change the menu, pax, or dishes — do NOT print the full itemized estimation again. Reply with ONLY a short message: thank them for what they gave, and ask for whatever mandatory detail is still missing (if any). Keep it to 1-2 sentences.
- Only once ALL mandatory details for that booking type are on file (phone for indoor; name + address + phone for outdoor), reply ONCE with a single consolidated "Booking Summary" that combines: the quote recap (menu/package, pricing, guest count) AND the customer's own details (name, phone, address if outdoor) together in one message, followed by a thank-you/confirmation note that it's been saved and the catering manager will follow up. This consolidated summary should only be shown once, at the moment the booking becomes complete — not repeated on later turns unless the customer asks to see it again.

NEVER CLAIM A BOOKING IS "CONFIRMED"/"BOOKED"/"PLACED"/"RESERVED" UNLESS THE CUSTOMER JUST EXPLICITLY SAID SO:
- Do NOT use the words "confirmed", "booked", "placed", or "reserved" to describe the STATUS of a booking anywhere in your reply — including in section labels like "Status:" — UNLESS the customer's most recent message itself contains an explicit confirmation ("yes", "confirm", "go ahead", "book it", "proceed") or a stated advance payment amount.
- This applies even to unrelated uses of these words about OTHER things (e.g. hall/date availability, staff follow-up). Rephrase instead: say "our catering manager will confirm availability" as "our catering manager will get in touch to finalize availability" — never write the literal phrase "to be confirmed" anywhere in an estimation reply, since downstream systems treat the word "confirmed" appearing anywhere in your reply as equivalent to the customer confirming the booking.
- While showing an estimate (before the customer has said yes/confirm), always frame it as a quote/estimate only — e.g. "Here's your estimate" not "Here's your booking" — and end by asking them to reply "confirm" if they'd like to proceed, never assuming they already have.
- Only once the customer's OWN message contains an explicit confirmation (or advance amount) may you say the booking is confirmed/being saved.

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

// Draft quotes generated in chat live in sangam.quotes (separate schema from
// eventmgmt) — a lightweight, always-on record of "a quote was shown to this
// customer", independent of whether they ever confirm a real booking.
function sbSangam() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'sangam' } })
}

// Localized reply for the catch-all error handler -- previously this was a
// single hardcoded English string, so a Telugu/Hindi customer who hit an
// unhandled error mid-conversation would suddenly get an English reply,
// which reads as the chat "breaking" out of their language. Chip labels are
// left in English here since app/embed/chat/page.tsx already translates
// every suggestion label at render time via translateSuggestionLabel().
const ERROR_FALLBACK_L: Record<'en' | 'te' | 'hi', { reply: string; suggestions: Array<{ label: string; text: string }> }> = {
  en: {
    reply: 'Hello! I am here to help you plan your catering and banquet events with Sangam Hotels. Could you please let me know which branch and how many guests you are expecting, or call our manager directly at +91 90638 44021?',
    suggestions: [
      { label: '\ud83c\udfdb\ufe0f Indoor Catering', text: 'I want an Indoor AC Banquet Hall quote with standard packages' },
      { label: '\ud83d\ude9a Outdoor Catering', text: 'I want Outdoor Catering with custom trays and food setup' },
    ],
  },
  te: {
    reply: '\u0c28\u0c2e\u0c38\u0c4d\u0c15\u0c3e\u0c30\u0c02! \u0c38\u0c02\u0c17\u0c02 \u0c39\u0c4b\u0c1f\u0c32\u0c4d\u0c38\u0c4d\u200c\u0c24\u0c4b \u0c2e\u0c40 \u0c15\u0c46\u0c1f\u0c30\u0c3f\u0c02\u0c17\u0c4d \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c08\u0c35\u0c46\u0c02\u0c1f\u0c4d\u200c\u0c28\u0c41 \u0c2a\u0c4d\u0c32\u0c3e\u0c28\u0c4d \u0c1a\u0c47\u0c2f\u0c21\u0c02\u0c32\u0c4b \u0c38\u0c39\u0c3e\u0c2f\u0c02 \u0c1a\u0c47\u0c2f\u0c21\u0c3e\u0c28\u0c3f\u0c15\u0c3f \u0c07\u0c15\u0c4d\u0c15\u0c21 \u0c09\u0c28\u0c4d\u0c28\u0c3e\u0c28\u0c41. \u0c26\u0c2f\u0c1a\u0c47\u0c38\u0c3f \u0c0e\u0c2f\u0c3f \u0c2c\u0c4d\u0c30\u0c3e\u0c02\u0c1a\u0c4d \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c0e\u0c02\u0c26\u0c30\u0c41 \u0c05\u0c24\u0c3f\u0c25\u0c41\u0c32\u0c41 \u0c05\u0c02\u0c1f\u0c41\u0c28\u0c4d\u0c28\u0c30\u0c4b \u0c1a\u0c46\u0c2a\u0c4d\u0c2a\u0c17\u0c32\u0c30\u0c3e, \u0c32\u0c47\u0c26\u0c3e \u0c2e\u0c3e \u0c2e\u0c47\u0c28\u0c47\u0c1c\u0c30\u0c4d\u200c\u0c15\u0c3f \u0c28\u0c47\u0c30\u0c41\u0c17\u0c3e \u0c15\u0c3e\u0c32\u0c4d \u0c1a\u0c47\u0c2f\u0c02\u0c21\u0c3f +91 90638 44021?',
    suggestions: [
      { label: '\ud83c\udfdb\ufe0f Indoor Catering', text: 'I want an Indoor AC Banquet Hall quote with standard packages' },
      { label: '\ud83d\ude9a Outdoor Catering', text: 'I want Outdoor Catering with custom trays and food setup' },
    ],
  },
  hi: {
    reply: '\u0928\u092e\u0938\u094d\u0924\u0947! \u0938\u0902\u0917\u092e \u0939\u094b\u091f\u0932\u094d\u0938 \u0915\u0947 \u0938\u093e\u0925 \u0906\u092a\u0915\u0947 \u0915\u0947\u091f\u0930\u093f\u0902\u0917 \u0914\u0930 \u092c\u0947\u0902\u0915\u094d\u0935\u0947\u0924 \u0915\u093e \u0906\u092f\u094b\u091c\u0928 \u092c\u0928\u093e\u0928\u0947 \u092e\u0947\u0902 \u092e\u0926\u0926 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u0913 \u092e\u0948\u0902 \u092f\u0939\u093e\u0902 \u0939\u0942\u0902\u0964 \u0915\u0943\u092a\u092f\u093e \u092c\u0924\u093e\u0947\u0902 \u0915\u093f\u0938 \u092c\u094d\u0930\u093e\u0902\u091a \u0914\u0930 \u0915\u093f\u0924\u0928\u0947 \u092e\u0947\u0939\u092e\u093e\u0928, \u092f\u093e \u0938\u0940\u0927\u0947 \u0939\u092e\u093e\u0930\u0947 \u092e\u0947\u0928\u0947\u091c\u0930 \u0915\u094b +91 90638 44021 \u092a\u0930 \u0915\u0949\u0932 \u0915\u0930\u0947\u0902?',
    suggestions: [
      { label: '\ud83c\udfdb\ufe0f Indoor Catering', text: 'I want an Indoor AC Banquet Hall quote with standard packages' },
      { label: '\ud83d\ude9a Outdoor Catering', text: 'I want Outdoor Catering with custom trays and food setup' },
    ],
  },
}

// Fire-and-forget write of the full transcript into sangam.chat_sessions,
// upserted on session_id -- keyed on the frontend's per-tab session id, not
// on quote_number, so a browsing conversation that never reaches a quote
// still gets a row (unlike sangam.quotes, which stays gated on explicit
// confirmation + phone -- see the gate above). Never throws: a logging
// failure must never affect the customer-facing reply.
async function logChatSession(
  sessionId: string,
  allMsgs: { role: string; content: string }[],
  latestReply: string,
  meta: { language: string; serviceType: string; phone: string | null; branch: string | null; quoteNumber: string | null; quoteSaved: boolean }
) {
  if (!sessionId) return
  try {
    const client = sbSangam()
    if (!client) return
    const fullTranscript = [...allMsgs, { role: 'assistant', content: latestReply }]
    const { error } = await client
      .from('chat_sessions')
      .upsert({
        session_id: sessionId,
        messages: fullTranscript,
        message_count: fullTranscript.length,
        last_language: meta.language,
        last_service_type: meta.serviceType,
        detected_phone: meta.phone,
        detected_branch: meta.branch,
        quote_number: meta.quoteNumber,
        quote_saved: meta.quoteSaved,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' })
    if (error) console.warn('[ChatLog] sangam.chat_sessions upsert failed (non-fatal):', error.message)
  } catch (err) {
    console.warn('[ChatLog] logChatSession threw (non-fatal):', err)
  }
}

/**
 * Extracts a plain-text delivery address from a message, for outdoor
 * catering bookings. Looks for an explicit "address is / deliver to /
 * venue is" phrase first, and falls back to a line containing a 6-digit
 * Indian PIN code (a strong signal the text is an address). Never invents
 * an address — returns null when nothing matches.
 */
function extractAddress(text: string): string | null {
  if (!text) return null
  const phraseMatch = text.match(/(?:delivery address|address is|deliver(?:y)?\s*(?:to|at)|venue is|venue address|location is)\s*[:\-]?\s*([^\n]{8,150})/i)
  if (phraseMatch) return phraseMatch[1].trim().replace(/[.\s]+$/, '')
  const pinLineMatch = text.match(/^[^\n]*\b\d{6}\b[^\n]*$/m)
  if (pinLineMatch) return pinLineMatch[0].trim()
  return null
}

/**
 * Extracts a customer's stated name from free text (e.g. "my name is Ravi",
 * "this is Ravi speaking", "I am Ravi"). Only used as a fallback when the
 * phone-lookup didn't already resolve a name for a returning customer.
 * Never invents a name.
 */
function extractCustomerName(text: string): string | null {
  if (!text) return null
  const m = text.match(/(?:my name is|this is|i am|i'm|\bname\s*(?:is|:|-)?\s*)\s*([A-Z][a-zA-Z]{1,30}(?:\s+[A-Z][a-zA-Z]{1,30}){0,2})\b/i)
  return m ? m[1].trim() : null
}

export async function POST(req: NextRequest) {
  // Declared outside the try block (and given a safe default) so the
  // catch-all error handler below can still reply in the customer's chosen
  // language instead of always falling back to English -- previously this
  // was a `const` scoped inside the try block, invisible to catch, which
  // meant any mid-conversation error silently switched a Telugu/Hindi
  // customer's reply to English.
  let responseLang: string = 'en'
  let sessionIdForLog: string = ''
  // Hoisted alongside sessionIdForLog so the catch block below can still
  // log whatever the customer actually typed, even when the error happens
  // partway through the pipeline (bad AI response, a Supabase lookup
  // throwing, a regex blowing up on unexpected input, etc.) -- only a
  // malformed request body itself (req.json() throwing) leaves this empty,
  // since there's nothing to log in that case.
  let rawMsgsForLog: { role: string; content: string }[] = []
  try {
    const { messages, responseLanguage, sessionId } = await req.json()
    sessionIdForLog = typeof sessionId === 'string' ? sessionId.slice(0, 64) : ''
    rawMsgsForLog = Array.isArray(messages) ? messages : []

    // `allMsgs` is the FULL, untruncated conversation — used for every
    // fact-detection check below (branch, date, slot, pax, dietary, phone,
    // address...), because a fact stated early in a long conversation must
    // never be "forgotten" just because the chat has since moved on.
    // `recentMsgs` stays a bounded window (last 10) and is used ONLY for
    // what's actually sent to the AI provider as chat turns, and for the
    // suggestion-chip generator — both fine to bound for cost. Previously
    // ALL detection ran off `recentMsgs`, so once a conversation passed 10
    // messages, an early answer (e.g. the branch picked in message #2) fell
    // out of the window and the bot — and the CURRENT INTAKE STATUS block
    // fed to the AI — both silently treated it as "Pending" again, causing
    // the bot to re-ask a question the customer had already answered.
    const allMsgs = (messages as { role: string; content: string }[])
    const recentMsgs = allMsgs.slice(-10)
    const lastUserMsg = allMsgs.filter(m => m.role === 'user').pop()?.content || ''
    const allUserText = allMsgs.filter(m => m.role === 'user').map(m => m.content).join(' ')
    const lowerAllText = allUserText.toLowerCase()

    // ── Multi-language support ──────────────────────────────────────────
    // Priority: (1) an explicit language request in the customer's own
    // latest message always wins ("reply in Telugu" overrides everything
    // else, mid-conversation, every time); (2) a `responseLanguage` toggle
    // sent by the frontend (a language selector, if the UI has one);
    // (3) auto-detected script from what the customer actually typed —
    // Telugu and Devanagari (Hindi) Unicode ranges; (4) default English.
    // Dish names, prices, dates, phone numbers and person names ALWAYS stay
    // in English regardless of language — only conversational text switches.
    const LANG_NAMES: Record<string, string> = { en: 'English', te: 'Telugu', hi: 'Hindi' }
    const explicitLangMatch = lastUserMsg.match(/\b(?:reply|respond|talk|speak|answer)\s*(?:to me)?\s*in\s+(telugu|hindi|english)\b/i)
      || lastUserMsg.match(/\b(telugu|hindi|english)\s*(?:lo|me|mein)?\s*(?:cheppu|matladu|bolo|reply|please)\b/i)
    const explicitLang = explicitLangMatch
      ? (explicitLangMatch[1].toLowerCase().startsWith('tel') ? 'te' : explicitLangMatch[1].toLowerCase().startsWith('hin') ? 'hi' : 'en')
      : null
    const hasTeluguScript = /[\u0C00-\u0C7F]/.test(lastUserMsg)
    const hasDevanagariScript = /[\u0900-\u097F]/.test(lastUserMsg)
    const autoDetectedLang = hasTeluguScript ? 'te' : hasDevanagariScript ? 'hi' : null
    // Priority: (1) an explicit "reply in <language>" ask in this exact
    // message always wins. (2) If the customer is typing in Telugu or
    // Hindi script right now, honor that over a stale UI toggle — the UI
    // always sends *some* value (it defaults to 'en'), so if this came
    // after responseLanguage the toggle would silently win every time the
    // customer forgot to switch it, even while typing in Telugu — which
    // was the actual bug: auto-detected script was never reachable because
    // 'en' from the toggle always matched first. (3) Otherwise, the
    // explicit UI toggle selection. (4) Default English.
    responseLang = explicitLang || autoDetectedLang || (responseLanguage && LANG_NAMES[responseLanguage] ? responseLanguage : null) || 'en'
    const langName = LANG_NAMES[responseLang] || 'English'
    const languageContext = responseLang !== 'en'
      ? `\nLANGUAGE INSTRUCTION (CRITICAL — FOLLOW EXACTLY):\nRespond in **${langName}** for this reply.\n- Greetings, questions, descriptions, instructions, section headers → ${langName} (e.g. "ధరల వివరాలు:" not "Pricing Details:" in Telugu; "मूल्य विवरण:" not "Pricing Details:" in Hindi).\n- Dish names → keep in English (Chicken Biryani, Paneer Tikka, Bagara Baingan).\n- Prices, dates, quantities, phone numbers, person names, order/quote codes → keep in English (₹800, 55 Guests, SGM-1234).\n- Do NOT mix in a different Indian language than ${langName} — if ${langName} is Telugu, do not answer in Hindi, and vice versa.\n- The customer may type in any language or script — understand them regardless, but ALWAYS reply in ${langName} unless their LATEST message explicitly asks for a different language, in which case switch immediately and obey that instead.\n`
      : `\nLANGUAGE: Respond in English. The customer may type in any language — understand them, but reply in English unless they explicitly ask for a different language (Telugu or Hindi), in which case switch to that language immediately.\n`


    // 1. Extract guest count from entire conversation or fallback.
    // Strip date-shaped number sequences first ("25 December 2026", "20th
    // November", "10/12/2026", a bare "2026"/"2027" year) so a date's day-
    // of-month or year never gets misread as the guest count — e.g. without
    // this, "The event date is 20th November 2026" would set pax to 20 and
    // silently skip the real "how many guests" question later in the flow.
    const stripDateNumbers = (text: string): string => {
      if (!text) return text
      return text
        .replace(/\b\d{1,2}\s*(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*,?\s*\d{0,4}\b/gi, ' ')
        .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}\b/gi, ' ')
        .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, ' ')
        .replace(/\b20[2-3]\d\b/g, ' ')
    }
    const numMatch = stripDateNumbers(lastUserMsg).match(/\b(?:pax\s*)?(\d{2,4})\b/i) || stripDateNumbers(allUserText).match(/\b(?:pax\s*)?(\d{2,4})\b/i)
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
    // Bug fix (2026-09-27): this used to require an exact phrase like "veg
    // only" / "100% veg" / "pure veg" / "vegetarian" -- a customer plainly
    // asking for a "veg menu" (as in the transcript that surfaced this)
    // matched NONE of those, so the estimate silently defaulted to the
    // Non-Veg package while claiming to have understood "veg". Any
    // standalone "veg" word now counts, as long as "non-veg"/"non veg"
    // isn't also present (that combination means a mixed spread, not a
    // veg-only ask).
    const isVegOnly = lowerAllText.includes('veg only') || lowerAllText.includes('100% veg') || lowerAllText.includes('pure veg') || lowerAllText.includes('veg menu')
      || lowerAllText.includes('vegetarian') || lowerAllText.includes('vegan')
      || (/\bveg\b/i.test(lowerAllText) && !lowerAllText.includes('non-veg') && !lowerAllText.includes('non veg') && !lowerAllText.includes('nonveg'))
    
    const hasBranchDetected = mentionedBranch !== ''
    const hasDateDetected = /\b(\d{1,2}[-/.]\d{1,2}|\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|weekend|tomorrow|next week|next month|october|november|december|january|february|september|2026|2027)\b/i.test(lowerAllText)
    const hasSlotDetected = lowerAllText.includes('lunch') || lowerAllText.includes('dinner') || lowerAllText.includes('full day') || (lowerAllText.includes('slot') && (lowerAllText.includes('slot 1') || lowerAllText.includes('slot 2') || lowerAllText.includes('slot 3') || lowerAllText.includes('slot1') || lowerAllText.includes('slot2') || lowerAllText.includes('lunch slot') || lowerAllText.includes('dinner slot')))
    const hasPaxDetected = /\b(\d+)\s*(?:guests?|pax|people|persons|adults)\b/i.test(lowerAllText) || /\bpax\s*\d+\b/i.test(lowerAllText) || rawCount > 0
    const hasPackageDetected = lowerAllText.includes('veg menu') || lowerAllText.includes('non-veg menu') || lowerAllText.includes('grand veg') || lowerAllText.includes('grand non-veg') || lowerAllText.includes('platinum') || lowerAllText.includes('600') || lowerAllText.includes('700') || lowerAllText.includes('800') || lowerAllText.includes('900') || lowerAllText.includes('1000') || lowerAllText.includes('1,000')

    let lastDietaryDetected: 'veg' | 'non-veg' | null = null
    for (const msg of allMsgs.filter(m => m.role === 'user')) {
      const txt = msg.content.toLowerCase()
      if (txt.includes('non-veg') || txt.includes('non veg') || txt.includes('veg and non veg') || txt.includes('veg & non veg')) {
        lastDietaryDetected = 'non-veg'
      } else if (txt.includes('pure veg') || txt.includes('vegetarian') || txt.includes('vegan') || txt.includes('veg only') || txt.includes('pure vegetarian') || /\bveg\b/i.test(txt)) {
        // Was previously excluded whenever the message also contained
        // "package" or "menu" -- meant to avoid mistaking a package NAME
        // for a dietary statement, but it also silently dropped completely
        // ordinary phrasing like "looking veg menu" or "give me veg menu",
        // which is exactly how most customers actually ask for it. The
        // "non-veg"/"non veg" check above already runs first each
        // iteration, so by the time we're here the message doesn't
        // contain that phrase -- any remaining "veg" mention is a genuine
        // veg statement.
        lastDietaryDetected = 'veg'
      }
    }

    // The most recent explicit dietary statement always wins over the
    // "has any veg word appeared anywhere" boolean above -- this is what
    // lets a later correction ("dietary type will be veg, fix that") to
    // actually change which package/price gets quoted, instead of the
    // package staying stuck on whatever `isVegOnly` computed from the
    // whole conversation the first time.
    const effectiveVegOnly = lastDietaryDetected === 'veg' ? true : lastDietaryDetected === 'non-veg' ? false : isVegOnly

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
    for (let i = allMsgs.length - 1; i >= 0; i--) {
      if (allMsgs[i].role === 'user') {
        const p = extractPhoneNumber(allMsgs[i].content)
        if (p) {
          detectedPhone = p
          break
        }
      }
    }

    // Delivery address — only meaningful for outdoor bookings, but detect
    // across the whole conversation regardless (harmless for indoor).
    let detectedAddress: string | null = null
    for (let i = allMsgs.length - 1; i >= 0; i--) {
      if (allMsgs[i].role === 'user') {
        const a = extractAddress(allMsgs[i].content)
        if (a) {
          detectedAddress = a
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
    // New (non-returning) customer — the phone lookup won't have a name on
    // file, so fall back to whatever the customer actually typed themselves.
    if (!customerName) {
      customerName = extractCustomerName(allUserText)
    }

    // 3. Fetch Unified Knowledge Context (RAG, PetPooja, Eventmgmt DB, Portion Rules),
    // the structured live catering data (real halls/menus/dishes), and the real
    // branch_id for whichever branch has been mentioned so far — all in parallel.
    const [extraContext, liveCateringData, resolvedBranchId, resolvedOccasionId, indoorMenuBreakdown] = await Promise.all([
      getSangamUnifiedKnowledgeContext(lastUserMsg),
      getSangamCateringLiveData(),
      mentionedBranch ? getBranchIdByName(mentionedBranch) : Promise.resolve(null),
      detectedOccasionText ? getOccasionIdByName(detectedOccasionText) : Promise.resolve(null),
      getIndoorMenuStructured(),
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
      `CRITICAL INSTRUCTION: If both Pax and Menu/Items are provided (or if user provided them upfront in text), IMMEDIATELY generate and display the full Outdoor Catering Quote with tray sizing (${liveOutdoorPriceLine}), total amount, included services, and the dish sections (no "[Edit]" tags, no "(Choose any N)" notes)! Otherwise, ask ONLY for the NEXT 'Pending' detail in this exact order: Occasion -> Date & Time -> Pax -> Menu/Items. Never ask for fields that are already provided!`
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

    // Language instruction is placed BOTH first and last in the prompt —
    // tested live: with the full ~150-line SYSTEM_PROMPT, a single mention
    // of the language switch got drowned out and the model replied in
    // English regardless. An isolated test confirmed the underlying model
    // handles Telugu/Hindi fine on a short prompt — this is prompt dilution,
    // not a model capability gap — so primacy (first thing read) plus
    // recency (last thing read) is the fix, mirroring how the rest of this
    // prompt already repeats its most critical rules more than once.
    const systemPrompt = [
      languageContext,
      SYSTEM_PROMPT,
      customerContext,
      extraContext,
      branchHallContext,
      bookingIntelligence,
      intakeStatusContext,
      languageContext
    ].filter(Boolean).join('\n\n')

    // Precomputed CTA lines for the deterministic fallback below (step 5).
    // Unlike the AI-driven reply (which reads the mandatory-details rules
    // straight from SYSTEM_PROMPT), this scripted fallback only fires when
    // every free AI provider is unavailable/rate-limited, so it needs its
    // own state-aware ask: don't re-ask for details already given, and
    // acknowledge once the customer has confirmed.
    // ── Scripted-fallback translations (EN/TE/HI) ──────────────────────
    // The AI-generated path already honors `responseLang` via the prompt
    // (languageContext, above). This deterministic fallback — used only
    // when every free AI provider is unavailable/rate-limited — used to be
    // hardcoded English-only, which meant a customer who selected Telugu or
    // Hindi would silently see English every time the AI happened to fail
    // for that turn. FB[lang] gives every scripted string a translation so
    // the whole conversation, not just the AI-generated half, follows the
    // selected language consistently.
    const FB = {
      en: {
        outdoorOccasion: "Namaste! 🙏 I'm Arjun, hospitality and catering manager at Sangam Hotels Hyderabad. What **Occasion** are you planning outdoor catering for? (e.g. Birthday Party, Housewarming, Wedding, Corporate Event)",
        outdoorDate: "Wonderful! What is your planned **Event Date** for the outdoor catering setup & delivery?",
        outdoorTime: "Great! What **Time** would you like the food to be served at your venue?\n\n• ☀️ **Lunch** (12:00 PM – 3:00 PM)\n• 🌙 **Dinner** (7:30 PM – 10:30 PM)\n• 🌅 **Morning Breakfast** (8:00 AM – 11:00 AM)",
        outdoorPax: "Got it! How many **Guests (Pax)** are you expecting for the catering? (e.g. 30, 50, 100, 150+ guests)",
        outdoorItemsPrompt: "Thank you! For {N} guests, which catering menu spread or items would you prefer?",
        indoorBranch: "Namaste! 🙏 I'm Arjun, hospitality and catering manager at Sangam Hotels Hyderabad. Which branch do you prefer for your banquet event — **Peerzadiguda Flagship** or **Hayathnagar**?",
        indoorDate: "Wonderful! What is your planned **Event Date**?",
        indoorSlot: "Great! Which **Time Slot** are you planning for?\n\n• ☀️ **Lunch Slot** (11:00 AM – 3:00 PM)\n• 🌙 **Dinner Slot** (7:00 PM – 11:00 PM)\n• 🌅 **Full Day Slot** (6:00 AM – 10:00 PM)",
        indoorPax: "Got it! How many **Guests (Pax)** are you expecting for the event? (Adults + Kids)",
        indoorDietary: "Thank you! What is your **Dietary Preference** for the event menu?\n\n• 🌿 **Pure Veg**\n• 🥗 **Veg & Non-Veg**\n• 🍗 **Non-Veg**",
        vegPackagesIntro: "Here are our available **Pure Veg Banquet Packages**:",
        nonVegPackagesIntro: "Here are our available **Non-Veg Banquet Packages**:",
        selectPackage: "Please select which menu package you'd like an estimation for!",
        vegPackagesUnavailable: "Our Pure Veg Banquet Packages are being confirmed by our catering manager right now — please call +91 90638 44021 for current pricing, or tell me your guest count and I'll follow up with an estimate.",
        nonVegPackagesUnavailable: "Our Non-Veg Banquet Packages are being confirmed by our catering manager right now — please call +91 90638 44021 for current pricing, or tell me your guest count and I'll follow up with an estimate.",
      },
      te: {
        outdoorOccasion: "నమస్తే! 🙏 నేను అర్జున్, సంగం హోటల్స్ హైదరాబాద్‌లో హాస్పిటాలిటీ మరియు కేటరింగ్ మేనేజర్. మీరు అవుట్‌డోర్ కేటరింగ్ కోసం ఏ **సందర్భం** కోసం ప్లాన్ చేస్తున్నారు? (ఉదా. బర్త్‌డే పార్టీ, గృహప్రవేశం, వివాహం, కార్పొరేట్ ఈవెంట్)",
        outdoorDate: "బాగుంది! అవుట్‌డోర్ కేటరింగ్ సెటప్ & డెలివరీ కోసం మీ ప్రణాళికాబద్ధమైన **ఈవెంట్ తేదీ** ఏమిటి?",
        outdoorTime: "గ్రేట్! మీ వేదిక వద్ద ఆహారం ఏ **సమయంలో** అందించాలనుకుంటున్నారు?\n\n• ☀️ **లంచ్** (12:00 PM – 3:00 PM)\n• 🌙 **డిన్నర్** (7:30 PM – 10:30 PM)\n• 🌅 **మార్నింగ్ బ్రేక్‌ఫాస్ట్** (8:00 AM – 11:00 AM)",
        outdoorPax: "అర్థమైంది! కేటరింగ్ కోసం మీరు ఎంతమంది **అతిథులను (Pax)** ఆశిస్తున్నారు? (ఉదా. 30, 50, 100, 150+ మంది)",
        outdoorItemsPrompt: "ధన్యవాదాలు! {N} అతిథుల కోసం, మీరు ఏ కేటరింగ్ మెనూ స్ప్రెడ్ లేదా ఐటమ్‌లను ఇష్టపడతారు?",
        indoorBranch: "నమస్తే! 🙏 నేను అర్జున్, సంగం హోటల్స్ హైదరాబాద్‌లో హాస్పిటాలిటీ మరియు కేటరింగ్ మేనేజర్. మీ బ్యాంక్వెట్ ఈవెంట్ కోసం మీరు ఏ బ్రాంచ్‌ను ఇష్టపడతారు — **పీర్జాదిగూడ ఫ్లాగ్‌షిప్** లేదా **హయత్‌నగర్**?",
        indoorDate: "బాగుంది! మీ ప్రణాళికాబద్ధమైన **ఈవెంట్ తేదీ** ఏమిటి?",
        indoorSlot: "గ్రేట్! మీరు ఏ **టైమ్ స్లాట్** కోసం ప్లాన్ చేస్తున్నారు?\n\n• ☀️ **లంచ్ స్లాట్** (11:00 AM – 3:00 PM)\n• 🌙 **డిన్నర్ స్లాట్** (7:00 PM – 11:00 PM)\n• 🌅 **ఫుల్ డే స్లాట్** (6:00 AM – 10:00 PM)",
        indoorPax: "అర్థమైంది! ఈవెంట్ కోసం మీరు ఎంతమంది **అతిథులను (Pax)** ఆశిస్తున్నారు? (పెద్దలు + పిల్లలు)",
        indoorDietary: "ధన్యవాదాలు! ఈవెంట్ మెనూ కోసం మీ **డైటరీ ప్రిఫరెన్స్** ఏమిటి?\n\n• 🌿 **ప్యూర్ వెజ్**\n• 🥗 **వెజ్ & నాన్-వెజ్**\n• 🍗 **నాన్-వెజ్**",
        vegPackagesIntro: "మా అందుబాటులో ఉన్న **ప్యూర్ వెజ్ బ్యాంక్వెట్ ప్యాకేజీలు**:",
        nonVegPackagesIntro: "మా అందుబాటులో ఉన్న **నాన్-వెజ్ బ్యాంక్వెట్ ప్యాకేజీలు**:",
        selectPackage: "దయచేసి మీరు ఎస్టిమేషన్ కావాలనుకుంటున్న మెనూ ప్యాకేజీని ఎంచుకోండి!",
        vegPackagesUnavailable: "మా ప్యూర్ వెజ్ బ్యాంక్వెట్ ప్యాకేజీలు ప్రస్తుతం మా కేటరింగ్ మేనేజర్ ద్వారా నిర్ధారించబడుతున్నాయి — ప్రస్తుత ధరల కోసం దయచేసి +91 90638 44021కి కాల్ చేయండి, లేదా మీ అతిథుల సంఖ్య చెప్పండి, నేను అంచనాతో ఫాలో అప్ అవుతాను.",
        nonVegPackagesUnavailable: "మా నాన్-వెజ్ బ్యాంక్వెట్ ప్యాకేజీలు ప్రస్తుతం మా కేటరింగ్ మేనేజర్ ద్వారా నిర్ధారించబడుతున్నాయి — ప్రస్తుత ధరల కోసం దయచేసి +91 90638 44021కి కాల్ చేయండి, లేదా మీ అతిథుల సంఖ్య చెప్పండి, నేను అంచనాతో ఫాలో అప్ అవుతాను.",
      },
      hi: {
        outdoorOccasion: "नमस्ते! 🙏 मैं अर्जुन हूँ, संगम होटल्स हैदराबाद में हॉस्पिटैलिटी और केटरिंग मैनेजर। आप आउटडोर केटरिंग किस **अवसर** के लिए प्लान कर रहे हैं? (जैसे जन्मदिन पार्टी, गृहप्रवेश, शादी, कॉर्पोरेट इवेंट)",
        outdoorDate: "बहुत बढ़िया! आउटडोर केटरिंग सेटअप और डिलीवरी के लिए आपकी योजनाबद्ध **इवेंट तारीख** क्या है?",
        outdoorTime: "बढ़िया! आप अपने वेन्यू पर किस **समय** भोजन परोसना चाहेंगे?\n\n• ☀️ **लंच** (12:00 PM – 3:00 PM)\n• 🌙 **डिनर** (7:30 PM – 10:30 PM)\n• 🌅 **मॉर्निंग ब्रेकफास्ट** (8:00 AM – 11:00 AM)",
        outdoorPax: "समझ गया! केटरिंग के लिए आप कितने **मेहमानों (Pax)** की उम्मीद कर रहे हैं? (जैसे 30, 50, 100, 150+ मेहमान)",
        outdoorItemsPrompt: "धन्यवाद! {N} मेहमानों के लिए, आप कौन सा केटरिंग मेनू स्प्रेड या आइटम पसंद करेंगे?",
        indoorBranch: "नमस्ते! 🙏 मैं अर्जुन हूँ, संगम होटल्स हैदराबाद में हॉस्पिटैलिटी और केटरिंग मैनेजर। आपके बैंक्वेट इवेंट के लिए आप कौन सी ब्रांच पसंद करेंगे — **पीरज़ादिगुड़ा फ्लैगशिप** या **हयातनगर**?",
        indoorDate: "बहुत बढ़िया! आपकी योजनाबद्ध **इवेंट तारीख** क्या है?",
        indoorSlot: "बढ़िया! आप किस **टाइम स्लॉट** के लिए योजना बना रहे हैं?\n\n• ☀️ **लंच स्लॉट** (11:00 AM – 3:00 PM)\n• 🌙 **डिनर स्लॉट** (7:00 PM – 11:00 PM)\n• 🌅 **फुल डे स्लॉट** (6:00 AM – 10:00 PM)",
        indoorPax: "समझ गया! इवेंट के लिए आप कितने **मेहमानों (Pax)** की उम्मीद कर रहे हैं? (वयस्क + बच्चे)",
        indoorDietary: "धन्यवाद! इवेंट मेनू के लिए आपकी **डाइटरी प्रेफरेंस** क्या है?\n\n• 🌿 **प्योर वेज**\n• 🥗 **वेज और नॉन-वेज**\n• 🍗 **नॉन-वेज**",
        vegPackagesIntro: "यह रहे हमारे उपलब्ध **प्योर वेज बैंक्वेट पैकेज**:",
        nonVegPackagesIntro: "यह रहे हमारे उपलब्ध **नॉन-वेज बैंक्वेट पैकेज**:",
        selectPackage: "कृपया बताइए किस मेनू पैकेज के लिए आप अनुमान चाहते हैं!",
        vegPackagesUnavailable: "हमारे प्योर वेज बैंक्वेट पैकेज अभी हमारे केटरिंग मैनेजर द्वारा कन्फर्म किए जा रहे हैं — मौजूदा कीमतों के लिए कृपया +91 90638 44021 पर कॉल करें, या मुझे अपने मेहमानों की संख्या बताएं, मैं अनुमान के साथ फॉलो-अप करूँगा।",
        nonVegPackagesUnavailable: "हमारे नॉन-वेज बैंक्वेट पैकेज अभी हमारे केटरिंग मैनेजर द्वारा कन्फर्म किए जा रहे हैं — मौजूदा कीमतों के लिए कृपया +91 90638 44021 पर कॉल करें, या मुझे अपने मेहमानों की संख्या बताएं, मैं अनुमान के साथ फॉलो-अप करूँगा।",
      },
    } as const
    const fb = FB[(responseLang as 'en' | 'te' | 'hi')] || FB.en

    const fallbackHasConfirmKeyword = /\b(?:yes,?\s*)?(?:please\s+)?confirm(?:ed)?\b|\bgo ahead\b|\bproceed\b|\bbook it\b|\block (?:it|this) in\b/i.test(allUserText)
    const fallbackAdvanceStated = /advance/i.test(allUserText) && /\d/.test(allUserText)
    const outdoorMissingParts: string[] = []
    if (!customerName) outdoorMissingParts.push('**name**')
    if (!detectedAddress) outdoorMissingParts.push('**delivery address**')
    if (!detectedPhone) outdoorMissingParts.push('**phone/WhatsApp number**')
    const CTA_L: Record<'en' | 'te' | 'hi', {
      outdoorMissing: (parts: string, plural: boolean) => string
      outdoorNoted: (name: string, advance: boolean, phone: string) => string
      outdoorOnFile: string
      indoorMissing: string
      indoorNoted: (name: string, advance: boolean, phone: string) => string
      indoorOnFile: string
    }> = {
      en: {
        outdoorMissing: (parts, plural) => `📌 **To confirm this booking**, please share your ${parts} — ${plural ? 'these are' : 'this is'} needed to lock in this 10-day quote. If you'd like to pay an advance now to hold the booking, just let me know the amount!`,
        outdoorNoted: (name, advance, phone) => `✅ Thank you${name ? `, ${name}` : ''}! Your outdoor catering request has been noted and saved${advance ? ', and your advance payment has been noted' : ''}. Our catering manager will reach out on ${phone} to confirm and finalize the remaining details.`,
        outdoorOnFile: `Your name, delivery address, and phone/WhatsApp number are all on file. Reply **"confirm"** to lock in this booking, or let me know if you'd like to pay an advance to hold your slot.`,
        indoorMissing: `📌 **To confirm this booking**, please share your **phone/WhatsApp number** (mandatory) to lock in this 10-day quote. If you'd like to pay an advance now to hold the booking, just let me know the amount!`,
        indoorNoted: (name, advance, phone) => `✅ Thank you${name ? `, ${name}` : ''}! Your indoor banquet request has been noted and saved${advance ? ', and your advance payment has been noted' : ''}. Our catering manager will reach out on ${phone} to confirm and finalize the remaining details.`,
        indoorOnFile: `Your phone/WhatsApp number is on file. Reply **"confirm"** to lock in this booking, or let me know if you'd like to pay an advance to hold your slot.`,
      },
      te: {
        outdoorMissing: (parts, plural) => `📌 **ఈ బుకింగ్‌ను నిర్ధారించడానికి**, దయచేసి మీ ${parts}ని పంచుకోండి — ఈ 10-రోజుల కోటాను లాక్ చేయడానికి ${plural ? 'ఇవి అవసరం' : 'ఇది అవసరం'}. మీరు బుకింగ్‌ను హోల్డ్ చేయడానికి ఇప్పుడే అడ్వాన్స్ చెల్లించాలనుకుంటే, మొత్తాన్ని తెలియజేయండి!`,
        outdoorNoted: (name, advance, phone) => `✅ ధన్యవాదాలు${name ? `, ${name}` : ''}! మీ అవుట్‌డోర్ కేటరింగ్ అభ్యర్థన నమోదు చేయబడింది మరియు సేవ్ చేయబడింది${advance ? ', మరియు మీ అడ్వాన్స్ చెల్లింపు నమోదు చేయబడింది' : ''}. మిగిలిన వివరాలను నిర్ధారించడానికి మా కేటరింగ్ మేనేజర్ ${phone}కి సంప్రదిస్తారు.`,
        outdoorOnFile: `మీ పేరు, డెలివరీ చిరునామా మరియు ఫోన్/వాట్సాప్ నంబర్ అన్నీ ఫైల్‌లో ఉన్నాయి. ఈ బుకింగ్‌ను లాక్ చేయడానికి **"confirm"** అని రిప్లై ఇవ్వండి, లేదా మీ స్లాట్‌ను హోల్డ్ చేయడానికి అడ్వాన్స్ చెల్లించాలనుకుంటే తెలియజేయండి.`,
        indoorMissing: `📌 **ఈ బుకింగ్‌ను నిర్ధారించడానికి**, ఈ 10-రోజుల కోటాను లాక్ చేయడానికి దయచేసి మీ **ఫోన్/వాట్సాప్ నంబర్** (తప్పనిసరి) పంచుకోండి. మీరు బుకింగ్‌ను హోల్డ్ చేయడానికి ఇప్పుడే అడ్వాన్స్ చెల్లించాలనుకుంటే, మొత్తాన్ని తెలియజేయండి!`,
        indoorNoted: (name, advance, phone) => `✅ ధన్యవాదాలు${name ? `, ${name}` : ''}! మీ ఇండోర్ బ్యాంక్వెట్ అభ్యర్థన నమోదు చేయబడింది మరియు సేవ్ చేయబడింది${advance ? ', మరియు మీ అడ్వాన్స్ చెల్లింపు నమోదు చేయబడింది' : ''}. మిగిలిన వివరాలను నిర్ధారించడానికి మా కేటరింగ్ మేనేజర్ ${phone}కి సంప్రదిస్తారు.`,
        indoorOnFile: `మీ ఫోన్/వాట్సాప్ నంబర్ ఫైల్‌లో ఉంది. ఈ బుకింగ్‌ను లాక్ చేయడానికి **"confirm"** అని రిప్లై ఇవ్వండి, లేదా మీ స్లాట్‌ను హోల్డ్ చేయడానికి అడ్వాన్స్ చెల్లించాలనుకుంటే తెలియజేయండి.`,
      },
      hi: {
        outdoorMissing: (parts, plural) => `📌 **इस बुकिंग की पुष्टि के लिए**, कृपया अपना ${parts} साझा करें — इस 10-दिन के कोटेशन को लॉक करने के लिए ${plural ? 'ये आवश्यक हैं' : 'यह आवश्यक है'}। यदि आप अभी बुकिंग होल्ड करने के लिए एडवांस देना चाहते हैं, तो राशि बताएं!`,
        outdoorNoted: (name, advance, phone) => `✅ धन्यवाद${name ? `, ${name}` : ''}! आपका आउटडोर केटरिंग अनुरोध दर्ज और सहेज लिया गया है${advance ? ', और आपका एडवांस भुगतान नोट कर लिया गया है' : ''}। शेष विवरण को अंतिम रूप देने के लिए हमारे केटरिंग मैनेजर ${phone} पर संपर्क करेंगे।`,
        outdoorOnFile: `आपका नाम, डिलीवरी पता और फोन/व्हाट्सएप नंबर सभी फाइल में हैं। इस बुकिंग को लॉक करने के लिए **"confirm"** लिखकर जवाब दें, या यदि आप अपनी स्लॉट होल्ड करने के लिए एडवांस देना चाहते हैं तो बताएं।`,
        indoorMissing: `📌 **इस बुकिंग की पुष्टि के लिए**, इस 10-दिन के कोटेशन को लॉक करने के लिए कृपया अपना **फोन/व्हाट्सएप नंबर** (अनिवार्य) साझा करें। यदि आप अभी बुकिंग होल्ड करने के लिए एडवांस देना चाहते हैं, तो राशि बताएं!`,
        indoorNoted: (name, advance, phone) => `✅ धन्यवाद${name ? `, ${name}` : ''}! आपका इंडोर बैंक्वेट अनुरोध दर्ज और सहेज लिया गया है${advance ? ', और आपका एडवांस भुगतान नोट कर लिया गया है' : ''}। शेष विवरण को अंतिम रूप देने के लिए हमारे केटरिंग मैनेजर ${phone} पर संपर्क करेंगे।`,
        indoorOnFile: `आपका फोन/व्हाट्सएप नंबर फाइल में है। इस बुकिंग को लॉक करने के लिए **"confirm"** लिखकर जवाब दें, या यदि आप अपनी स्लॉट होल्ड करने के लिए एडवांस देना चाहते हैं तो बताएं।`,
      },
    }
    const ctaL = CTA_L[(responseLang as 'en' | 'te' | 'hi')] || CTA_L.en
    const outdoorConfirmCta = outdoorMissingParts.length > 0
      ? ctaL.outdoorMissing(outdoorMissingParts.join(', '), outdoorMissingParts.length > 1)
      : (fallbackHasConfirmKeyword || fallbackAdvanceStated)
        ? ctaL.outdoorNoted(customerName || '', fallbackAdvanceStated, detectedPhone || '')
        : ctaL.outdoorOnFile
    const indoorConfirmCta = !detectedPhone
      ? ctaL.indoorMissing
      : (fallbackHasConfirmKeyword || fallbackAdvanceStated)
        ? ctaL.indoorNoted(customerName || '', fallbackAdvanceStated, detectedPhone || '')
        : ctaL.indoorOnFile

    // 3.5 Deterministic Indoor Dish-Edit & Estimation Renderer
    //
    // Why this exists: once a menu package is picked, showing the dish
    // spread and letting the customer swap a dish in a section used to go
    // straight through the free AI provider, which has no reliable way to
    // enumerate a section's real catalog or remember an earlier swap turn
    // by turn -- it would go blank, invent a dish, or silently drop the
    // customer's earlier choice. Editing a REAL menu's dishes must never
    // drift from the database, so this renders the estimation (and any
    // dish-edit exchange) directly from the real menu_sections/section_dish
    // data -- the AI is bypassed entirely for this, never asked to
    // reproduce or remember the dish list itself.
    let editFlowHandled = false
    let editFlowSuggestions: Array<{ label: string; text: string }> | null = null
    let reply = ''

    if (isIndoor && !isOutdoorFlow && hasPackageDetected && !hasBranchDetected) {
      // Bug fix (2026-09-28): this deterministic renderer used to run as
      // soon as a package was picked, with NO check that a branch had
      // actually been resolved. When the branch question got skipped
      // (e.g. the customer answered with a date/slot instead of naming a
      // branch), it silently fell back to the literal placeholder string
      // 'Peerzadiguda / Hayathnagar' as the "branch name" -- which then
      // printed verbatim in the customer-facing estimate header -- AND,
      // far worse, pickHallForGuestCount() in lib/catering-portions.ts
      // searches ALL halls across every branch whenever it isn't given a
      // real branch id, so it can recommend a hall from a completely
      // different branch (in one real conversation, this surfaced a
      // "Test Hall 1" -- clearly leftover seed/test data -- to a real
      // customer). Branch must be resolved before any estimate is ever
      // computed, no exceptions.
      reply = fb.indoorBranch
      editFlowHandled = true
    } else if (isIndoor && !isOutdoorFlow && hasPackageDetected) {
      // Bug fix (2026-09-27): a genuine NEW question -- "do you have any
      // other veg menus", "what other menus are available" -- used to fall
      // straight through to the "no edit-intent this turn" branch further
      // down, which just re-rendered the exact same estimate again
      // (verbatim, word for word) since it has no dish-swap match. That's
      // what made the bot feel "stuck" repeating itself instead of
      // answering. Detect this specific ask up front and answer it for
      // real, from the live menu list, before any of the swap/re-render
      // logic below even runs.
      const asksForOtherMenus = /\b(?:other|different|any\s+more|alternate|alternative)\b.{0,20}\bmenus?\b|\bmenus?\b.{0,20}\b(?:available|options?|we\s+have)\b/i.test(lastUserMsg)
      if (asksForOtherMenus) {
        const fmtMenu = (m: typeof liveCateringData.indoorMenus[number]) => `\u2022 \ud83c\udf7d\ufe0f **${m.name}** (\u20b9${m.pricePerPax}/plate)${m.description ? ` \u2014 ${m.description}` : ''}`
        const wantVeg = effectiveVegOnly
        const matchingMenus = liveCateringData.indoorMenus.filter(m => {
          const dt = (m.dietaryType || '').toLowerCase()
          const isVegRow = dt.includes('veg') && !dt.includes('non')
          return wantVeg ? isVegRow : !isVegRow
        })
        const otherMenusL: Record<'en' | 'te' | 'hi', { intro: (diet: string) => string; none: (diet: string) => string; askPick: string }> = {
          en: {
            intro: (diet) => `Here are all the ${diet} indoor menu options we currently have on file:`,
            none: (diet) => `We don't have another ${diet} indoor menu on file right now besides the one already quoted -- our catering manager can confirm if a custom spread is possible.`,
            askPick: 'Just let me know which one you\'d like, and I\'ll re-do the estimation for it.',
          },
          te: {
            intro: (diet) => `\u0c2e\u0c3e \u0c35\u0c26\u0c4d\u0c26 \u0c07\u0c2a\u0c4d\u0c2a\u0c41\u0c21\u0c41 \u0c09\u0c28\u0c4d\u0c28 \u0c05\u0c28\u0c4d\u0c28\u0c3f ${diet} \u0c07\u0c02\u0c21\u0c4b\u0c30\u0c4d \u0c2e\u0c46\u0c28\u0c42 \u0c06\u0c2a\u0c4d\u0c37\u0c28\u0c4d\u0c38\u0c4d \u0c07\u0c35\u0c3f:`,
            none: (diet) => `\u0c07\u0c2a\u0c4d\u0c2a\u0c41\u0c21\u0c41 \u0c15\u0c4b\u0c1f\u0c4d \u0c1a\u0c47\u0c38\u0c3f\u0c28 \u0c26\u0c3e\u0c28\u0c4d\u0c28\u0c3f \u0c2e\u0c3f\u0c02\u0c1a\u0c3f \u0c2e\u0c46\u0c1f\u0c4d\u0c1f\u0c4b \u0c2e\u0c3e \u0c35\u0c26\u0c4d\u0c26 \u0c2e\u0c30\u0c4b ${diet} \u0c07\u0c02\u0c21\u0c4b\u0c30\u0c4d \u0c2e\u0c46\u0c28\u0c42 \u0c17\u0c41\u0c30\u0c4d\u0c24\u0c41 \u0c32\u0c47\u0c26\u0c41 -- \u0c15\u0c38\u0c4d\u0c1f\u0c2e\u0c4d \u0c38\u0c4d\u0c2a\u0c4d\u0c30\u0c46\u0c21\u0c4d \u0c15\u0c41\u0c26\u0c41\u0c30\u0c41\u0c24\u0c41\u0c02\u0c1f\u0c47 \u0c2e\u0c3e \u0c15\u0c46\u0c1f\u0c30\u0c3f\u0c02\u0c17\u0c4d \u0c2e\u0c47\u0c28\u0c47\u0c1c\u0c30\u0c4d \u0c15\u0c28\u0c4d\u0c2b\u0c4c\u0c02 \u0c1a\u0c47\u0c2f\u0c17\u0c32\u0c30\u0c41.`,
            askPick: '\u0c0e\u0c26\u0c3f \u0c15\u0c3e\u0c35\u0c3e\u0c32\u0c4b \u0c1a\u0c46\u0c2a\u0c4d\u0c2a\u0c02\u0c21\u0c3f, \u0c05\u0c02\u0c1a\u0c28\u0c3e \u0c05\u0c17\u0c46\u0c02\u0c1a\u0c47\u0c38\u0c4d\u0c24\u0c3e\u0c28\u0c41.',
          },
          hi: {
            intro: (diet) => `\u092f\u0939\u093e\u0902 \u0939\u092e\u093e\u0930\u0947 \u092a\u093e\u0938 \u0905\u092c\u0940 \u0938\u092d\u0940 ${diet} \u0907\u0902\u0921\u094b\u0930 \u092e\u0947\u0928\u0942 \u0935\u093f\u0915\u0932\u094d\u092a \u0939\u0948\u0902:`,
            none: (diet) => `\u0905\u092d\u0940 \u092c\u0924\u093e\u0908 \u0917\u0908 \u0915\u0947 \u0905\u0932\u093e\u0935\u093e \u0939\u092e\u093e\u0930\u0947 \u092a\u093e\u0938 \u0905\u092d\u0940 \u0915\u094b\u0908 \u0926\u0942\u0938\u0930\u093e ${diet} \u0907\u0902\u0921\u094b\u0930 \u092e\u0947\u0928\u0942 \u0928\u0939\u0940\u0902 \u0939\u0948 -- \u0939\u092e\u093e\u0930\u093e \u0915\u0947\u091f\u0930\u093f\u0902\u0917 \u092e\u0947\u0928\u0947\u091c\u0930 \u092c\u0924\u093e \u0938\u0915\u0924\u093e \u0939\u0948 \u0915\u093f \u0915\u094b\u0908 \u0915\u0938\u094d\u091f\u092e \u0938\u094d\u092a\u094d\u0930\u0947\u0921 \u092c\u0928 \u0938\u0915\u0924\u093e \u0939\u0948 \u0915\u093f \u0928\u0939\u0940\u0902\u0964`,
            askPick: '\u092c\u0938 \u092c\u0924\u093e \u0926\u0947\u0902 \u0915\u093f \u0906\u092a\u0915\u094b \u0915\u094c\u0928 \u0938\u093e \u091a\u093e\u0939\u093f\u090f, \u092e\u0947\u0902 \u0909\u0938\u0915\u0947 \u0932\u093f\u090f \u0905\u0928\u0941\u092e\u093e\u0928 \u0926\u0941\u092c\u093e\u0930\u093e \u092c\u0928\u093e \u0926\u0942\u0902\u0917\u093e\u0964',
          },
        }
        const om = otherMenusL[(responseLang as 'en' | 'te' | 'hi')] || otherMenusL.en
        const dietLabel = wantVeg ? 'Veg' : 'Non-Veg'
        reply = matchingMenus.length > 0
          ? `${om.intro(dietLabel)}\n\n${matchingMenus.map(fmtMenu).join('\n')}\n\n${om.askPick}`
          : om.none(dietLabel)
        editFlowHandled = true
      }

      if (!asksForOtherMenus) {
      // Cheap, pure probe call -- just to learn which real menu/sections are
      // active for whatever package the customer picked, before deciding
      // whether this turn is an edit request.
      const probeQuote = generatePopularCateringQuote(
        'inhouse',
        mentionedBranch,
        effectiveAdults,
        effectiveVegOnly,
        [],
        lastUserMsg + ' ' + allUserText,
        liveCateringData,
        resolvedBranchId,
        indoorMenuBreakdown
      )

      if (probeQuote.sections.length > 0) {
        // Accumulate every dish swap the customer has made anywhere in the
        // conversation so far, section by section -- a later swap for the
        // same section replaces an earlier one; nothing here is ever
        // invented, since findDishesInSectionFromText only ever matches a
        // name that's actually in that exact section's real catalog.
        // Bug fix (2026-09-28): matchSectionByText only succeeds when the
        // customer's message ALSO names the section itself ("desserts",
        // "starters") -- but a customer naturally just names the DISH they
        // want ("Butterscotch, fix this", "change to Butterscotch"),
        // never the section it lives in. That meant a plain dish-name
        // correction was silently ignored -- no section matched, so the
        // code fell through to "no edit-intent this turn" and just
        // re-rendered the exact same estimate, unchanged, as if the
        // customer had said nothing. Since every dish name is looked up
        // against that section's REAL catalog either way
        // (findDishesInSectionFromText never invents a match), it's just
        // as safe to find the section by searching every section's real
        // dish list for a name mentioned in the text, and only fall back
        // to requiring an explicit section-name mention when no dish name
        // matches anywhere.
        const findSectionForDishText = (text: string) => {
          const bySectionName = matchSectionByText(probeQuote.sections, text)
          if (bySectionName && findDishesInSectionFromText(bySectionName, text).length > 0) return bySectionName
          for (const sec of probeQuote.sections) {
            if (findDishesInSectionFromText(sec, text).length > 0) return sec
          }
          return bySectionName
        }

        const sectionOverrides: Record<string, string[]> = {}
        for (const msg of allMsgs) {
          if (msg.role !== 'user') continue
          const sec = findSectionForDishText(msg.content)
          if (!sec) continue
          const dishes = findDishesInSectionFromText(sec, msg.content)
          if (dishes.length > 0) {
            sectionOverrides[sec.sectionName] = dishes.map(d => d.name)
          }
        }

        const editSection = findSectionForDishText(lastUserMsg)
        const editDishesNamed = editSection ? findDishesInSectionFromText(editSection, lastUserMsg) : []
        const isKeepCurrentPhrase = /keep\s+(?:the\s+)?current\s+.*\s*selection/i.test(lastUserMsg)

        const EDIT_L: Record<'en' | 'te' | 'hi', {
          browseIntro: (section: string, limit: number | null) => string
          swapConfirmed: (dishes: string, section: string) => string
          keepChipLabel: string
          keepChipText: (section: string) => string
          menuSpreadLabel: string
          estimationLabel: string
          guestsLabel: string
          loyaltyDiscountLabel: string
          swapPrompt: string
          customerDetailsLabel: string
          nameLabel: string
          phoneLabel: string
        }> = {
          en: {
            browseIntro: (section, limit) => `Here are the available dishes for **${section}**${limit ? ` (pick up to ${limit})` : ''} -- tap one to swap it in:`,
            swapConfirmed: (dishes, section) => `\u2705 Got it! Swapped in **${dishes}** for the **${section}** section.\n\n`,
            keepChipLabel: '\u2705 Keep current selection',
            keepChipText: (section) => `Keep the current ${section} selection, please show the final estimation`,
            menuSpreadLabel: 'Menu Spread & Dishes Included',
            estimationLabel: 'Estimation',
            guestsLabel: 'Guests',
            loyaltyDiscountLabel: '5% Loyalty Discount Applied',
            swapPrompt: "Just tell me if you'd like to swap or add anything else, or use the quick action chips below.",
            customerDetailsLabel: 'Your Details',
            nameLabel: 'Name',
            phoneLabel: 'Phone/WhatsApp',
          },
          te: {
            browseIntro: (section, limit) => `**${section}** \u0c15\u0c4b\u0c38\u0c02 \u0c05\u0c02\u0c26\u0c41\u0c2c\u0c3e\u0c1f\u0c41\u0c32\u0c4b \u0c09\u0c28\u0c4d\u0c28 \u0c35\u0c02\u0c1f\u0c15\u0c3e\u0c32\u0c41 \u0c07\u0c35\u0c3f${limit ? ` (${limit} \u0c35\u0c30\u0c15\u0c41 \u0c0e\u0c02\u0c1a\u0c41\u0c15\u0c4b\u0c02\u0c21\u0c3f)` : ''} -- \u0c2e\u0c3e\u0c30\u0c4d\u0c1a\u0c21\u0c3e\u0c28\u0c3f\u0c15\u0c3f \u0c12\u0c15\u0c1f\u0c3f \u0c28\u0c4a\u0c15\u0c4d\u0c15\u0c02\u0c21\u0c3f:`,
            swapConfirmed: (dishes, section) => `\u2705 \u0c05\u0c30\u0c4d\u0c25\u0c2e\u0c48\u0c02\u0c26\u0c3f! **${section}** \u0c38\u0c46\u0c15\u0c4d\u0c37\u0c28\u0c4d\u200c\u0c32\u0c4b **${dishes}** \u0c2e\u0c3e\u0c30\u0c4d\u0c1a\u0c2c\u0c21\u0c3f\u0c02\u0c26\u0c3f.\n\n`,
            keepChipLabel: '\u2705 \u0c07\u0c2a\u0c4d\u0c2a\u0c41\u0c21\u0c41\u0c28\u0c4d\u0c28\u0c26\u0c3f \u0c05\u0c32\u0c3e\u0c17\u0c47 \u0c09\u0c02\u0c1a\u0c41',
            keepChipText: (section) => `${section} \u0c0e\u0c02\u0c2a\u0c3f\u0c15\u0c28\u0c41 \u0c05\u0c32\u0c3e\u0c17\u0c47 \u0c09\u0c02\u0c1a\u0c02\u0c21\u0c3f, \u0c2b\u0c48\u0c28\u0c32\u0c4d \u0c0e\u0c38\u0c4d\u0c1f\u0c3f\u0c2e\u0c47\u0c37\u0c28\u0c4d \u0c1a\u0c42\u0c2a\u0c3f\u0c02\u0c1a\u0c02\u0c21\u0c3f`,
            menuSpreadLabel: '\u0c2e\u0c46\u0c28\u0c42 \u0c38\u0c4d\u0c2a\u0c4d\u0c30\u0c46\u0c21\u0c4d \u0c2e\u0c30\u0c3f\u0c2f\u0c41 \u0c35\u0c02\u0c1f\u0c15\u0c3e\u0c32\u0c41',
            estimationLabel: '\u0c05\u0c02\u0c1a\u0c28\u0c3e',
            guestsLabel: '\u0c05\u0c24\u0c3f\u0c25\u0c41\u0c32\u0c41',
            loyaltyDiscountLabel: '5% \u0c32\u0c3e\u0c2f\u0c32\u0c4d\u0c1f\u0c40 \u0c1f\u0c3f\u0c38\u0c4d\u0c15\u0c4c\u0c02\u0c1f\u0c4d \u0c35\u0c30\u0c4d\u0c24\u0c3f\u0c02\u0c1a\u0c2c\u0c21\u0c3f\u0c02\u0c26\u0c3f',
            swapPrompt: '\u0c07\u0c02\u0c15\u0c47\u0c26\u0c48\u0c28\u0c3e \u0c2e\u0c3e\u0c30\u0c4d\u0c1a\u0c3e\u0c32\u0c2e\u0c3f \u0c32\u0c47\u0c26\u0c3e \u0c1c\u0c4b\u0c21\u0c3f\u0c02\u0c1a\u0c3e\u0c32\u0c02\u0c1f\u0c47 \u0c1a\u0c46\u0c2a\u0c4d\u0c2a\u0c02\u0c21\u0c3f, \u0c32\u0c47\u0c26\u0c3e \u0c15\u0c4d\u0c35\u0c3f\u0c15\u0c4d \u0c05\u0c15\u0c4d\u0c37\u0c28\u0c4d \u0c1a\u0c3f\u0c2a\u0c4d\u0c38\u0c4d \u0c09\u0c2a\u0c2f\u0c4b\u0c17\u0c3f\u0c02\u0c1a\u0c02\u0c21\u0c3f.',
            customerDetailsLabel: '\u0c2e\u0c40 \u0c35\u0c3f\u0c35\u0c30\u0c3e\u0c32\u0c41',
            nameLabel: '\u0c2a\u0c47\u0c30\u0c41',
            phoneLabel: '\u0c2b\u0c4b\u0c28\u0c4d/\u0c35\u0c3e\u0c1f\u0c4d\u0c38\u0c3e\u0c2a\u0c4d',
          },
          hi: {
            browseIntro: (section, limit) => `**${section}** \u0915\u0947 \u0932\u093f\u090f \u0909\u092a\u0932\u092c\u094d\u0927 \u0921\u093f\u0936 \u092f\u0939 \u0939\u0948\u0902${limit ? ` (\u0905\u0927\u093f\u0915\u0924\u092e ${limit} \u0938\u0947\u0932\u0947\u0902)` : ''} -- \u092c\u0926\u0932\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0915\u093f\u0938\u0940 \u090f\u0915 \u092a\u0930 \u091f\u0947\u092a \u0915\u0930\u0947\u0902:`,
            swapConfirmed: (dishes, section) => `\u2705 \u0920\u0940\u0915 \u0939\u0948! **${section}** \u0938\u0947\u0915\u094d\u0936\u0928 \u092e\u0947\u0902 **${dishes}** \u092c\u0926\u0932 \u0926\u093f\u092f\u093e \u0917\u092f\u093e\u0964\n\n`,
            keepChipLabel: '\u2705 \u092e\u094c\u091c\u0942\u0926\u093e \u091a\u092f\u0928 \u0930\u0916\u0947\u0902',
            keepChipText: (section) => `${section} \u0915\u093e \u092e\u094c\u091c\u0942\u0926\u093e \u091a\u092f\u0928 \u0930\u0916\u0947\u0902, \u0915\u0943\u092a\u092f\u093e \u092b\u093e\u0907\u0928\u0932 \u0947\u0938\u094d\u0925\u093f\u092e\u0947\u0936\u0928 \u0926\u093f\u0916\u093e\u0947\u0902`,
            menuSpreadLabel: '\u092e\u0947\u0928\u0942 \u0938\u094d\u092a\u094d\u0930\u0947\u0921 \u0914\u0930 \u0936\u093e\u0915\u093e\u0939\u093e\u0930',
            estimationLabel: '\u0905\u0928\u0941\u092e\u093e\u0928',
            guestsLabel: '\u092e\u0947\u0939\u092e\u093e\u0928',
            loyaltyDiscountLabel: '5% \u0935\u092b\u093e\u0926\u093e\u0930\u0940 \u091b\u0942\u091f \u0932\u093e\u0917\u0942',
            swapPrompt: '\u092f\u0926\u093f \u0906\u092a \u0915\u0941\u091b \u092c\u0926\u0932\u0928\u093e \u092f\u093e \u0915\u0941\u091b \u0914\u0930 \u091c\u094b\u0921\u093c\u0928\u093e \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902 \u0924\u094b \u092c\u0924\u093e\u0947\u0902, \u092f\u093e \u0928\u0940\u091a\u0947 \u0926\u093f\u0947 \u0917\u090f \u0915\u094d\u0935\u093f\u0915 \u090f\u0915\u094d\u0936\u0928 \u091a\u093f\u092a\u094d\u0938 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0947\u0902\u0964',
            customerDetailsLabel: '\u0906\u092a\u0915\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940',
            nameLabel: '\u0928\u093e\u092e',
            phoneLabel: '\u092b\u094b\u0928/\u0935\u094d\u0939\u093e\u091f\u094d\u0938\u0910\u092a',
          },
        }
        const editL = EDIT_L[(responseLang as 'en' | 'te' | 'hi')] || EDIT_L.en

        const renderEstimation = (quote: ReturnType<typeof generatePopularCateringQuote>, swapPrefix = ''): string => {
          const mult = loyaltyDiscount > 0 ? 0.95 : 1.0
          const totalWithDiscount = Math.round(quote.finalTotal * mult)
          const discountLine = loyaltyDiscount > 0 ? `\n\u2022 **${editL.loyaltyDiscountLabel}**: -\u20b9${Math.round(quote.finalTotal * 0.05).toLocaleString('en-IN')}` : ''
          return swapPrefix +
            `${quote.headline}\n\n` +
            `\ud83d\udccb **${editL.menuSpreadLabel}**:\n` +
            `${quote.menuItems.join('\n\n')}\n\n` +
            `\ud83d\udcb0 **${editL.estimationLabel}**: \u20b9${quote.pricePerPlate}/plate \u00d7 ${effectiveAdults} ${editL.guestsLabel} = **\u20b9${totalWithDiscount.toLocaleString('en-IN')}**${discountLine}\n\n` +
            `${quote.trayBreakdown.join('\n')}\n\n` +
            `${editL.swapPrompt}\n\n${indoorConfirmCta}`
        }

        // Bug fix (2026-09-28): once a package was selected, this block
        // re-rendered the FULL itemized estimation on every single turn --
        // including the turn where the customer just typed "confirm" or
        // gave their phone number to lock in the quote. That meant the
        // customer saw the whole quote repeated back to them at exactly
        // the moment they were just trying to hand over their contact
        // details, which read as if the bot hadn't understood them. Now:
        // a plain confirm/details-only turn (no dish-swap intent) gets a
        // short, focused reply instead -- just what's still needed if a
        // mandatory detail (phone) is missing, or, once it's on file, ONE
        // consolidated Booking Summary that combines the quote recap with
        // the customer's own details, shown exactly once at the moment
        // the booking actually becomes save-able.
        const isConfirmOrDetailsTurn = !editSection && (
          /\b(?:yes,?\s*)?(?:please\s+)?confirm(?:ed)?\b|\bgo ahead\b|\bproceed\b|\bbook it\b|\block (?:it|this) in\b/i.test(lastUserMsg)
          || /\b\d{10}\b/.test(lastUserMsg)
          || /whatsapp/i.test(lastUserMsg)
          || /\badvance\b/i.test(lastUserMsg)
        )

        const renderBookingSummary = (quote: ReturnType<typeof generatePopularCateringQuote>): string => {
          const mult = loyaltyDiscount > 0 ? 0.95 : 1.0
          const totalWithDiscount = Math.round(quote.finalTotal * mult)
          const discountLine = loyaltyDiscount > 0 ? `\n\u2022 **${editL.loyaltyDiscountLabel}**: -\u20b9${Math.round(quote.finalTotal * 0.05).toLocaleString('en-IN')}` : ''
          const custLines = [
            `${editL.nameLabel}: ${customerName || '-'}`,
            `${editL.phoneLabel}: ${detectedPhone || '-'}`,
          ].join('\n')
          return `${quote.headline}\n\n` +
            `\ud83d\udccb **${editL.menuSpreadLabel}**:\n` +
            `${quote.menuItems.join('\n\n')}\n\n` +
            `\ud83d\udcb0 **${editL.estimationLabel}**: \u20b9${quote.pricePerPlate}/plate \u00d7 ${effectiveAdults} ${editL.guestsLabel} = **\u20b9${totalWithDiscount.toLocaleString('en-IN')}**${discountLine}\n\n` +
            `${quote.trayBreakdown.join('\n')}\n\n` +
            `\ud83d\udc64 **${editL.customerDetailsLabel}**:\n${custLines}\n\n` +
            `${ctaL.indoorNoted(customerName || '', fallbackAdvanceStated || /\badvance\b/i.test(lastUserMsg), detectedPhone || '')}`
        }

        if (isConfirmOrDetailsTurn) {
          if (detectedPhone) {
            const finalQuote = generatePopularCateringQuote(
              'inhouse', mentionedBranch, effectiveAdults, effectiveVegOnly, [],
              lastUserMsg + ' ' + allUserText, liveCateringData, resolvedBranchId, indoorMenuBreakdown, sectionOverrides
            )
            reply = renderBookingSummary(finalQuote)
          } else {
            reply = indoorConfirmCta
          }
          editFlowHandled = true
        } else if (editSection && editDishesNamed.length > 0) {
          // Explicit swap named in this exact message -- rebuild the quote
          // with every accumulated override (including this new one) and
          // confirm exactly which real dish(es) were swapped in.
          const finalQuote = generatePopularCateringQuote(
            'inhouse', mentionedBranch, effectiveAdults, effectiveVegOnly, [],
            lastUserMsg + ' ' + allUserText, liveCateringData, resolvedBranchId, indoorMenuBreakdown, sectionOverrides
          )
          reply = renderEstimation(finalQuote, editL.swapConfirmed(editDishesNamed.map(d => d.name).join(', '), editSection.sectionName))
          editFlowHandled = true
          editFlowSuggestions = [
            { label: '\ud83d\udd01 Change another dish', text: 'I would like to swap another dish' },
            { label: '\u2705 Confirm this estimation', text: 'This estimation looks good, please confirm' },
            { label: '\ud83d\udcf1 Save Quote on WhatsApp', text: 'I would like to save this quote for 10 days. My WhatsApp number is ' },
          ]
        } else if (editSection && !isKeepCurrentPhrase) {
          // Browsing request: the customer named a real section but no
          // specific dish yet -- show every real dish on file for THAT
          // exact section (never a guess), each as a tappable swap chip.
          reply = `${editL.browseIntro(editSection.sectionName, editSection.selectionLimit)}\n\n` +
            editSection.dishes.map(d => `\u2022 ${d.name}${d.extraPrice ? ` (+\u20b9${d.extraPrice})` : ''}`).join('\n')
          editFlowHandled = true
          const dishChips = editSection.dishes.slice(0, 9).map(d => ({
            label: `\ud83d\udd01 ${d.name}`,
            text: `Swap in "${d.name}" for the ${editSection.sectionName} section`,
          }))
          editFlowSuggestions = [...dishChips, { label: editL.keepChipLabel, text: editL.keepChipText(editSection.sectionName) }]
        } else {
          // No edit-intent this turn (a plain continuation, a "keep current
          // selection" chip, a recalculate-for-N-guests message, etc.) --
          // still render deterministically so any earlier swap is honored
          // and the numbers/dishes shown can never drift out of sync.
          const finalQuote = generatePopularCateringQuote(
            'inhouse', mentionedBranch, effectiveAdults, effectiveVegOnly, [],
            lastUserMsg + ' ' + allUserText, liveCateringData, resolvedBranchId, indoorMenuBreakdown, sectionOverrides
          )
          reply = renderEstimation(finalQuote)
          editFlowHandled = true
        }
      }
      } // end if (!asksForOtherMenus)
    }

    // 4. Query AI Providers Cascade
    if (!editFlowHandled) {
      reply = (await askFreeModels(systemPrompt, recentMsgs)) || ''

      // Bug fix (2026-09-28): the AI is told (STRICT SEQUENTIAL INTAKE) to
      // always ask for the branch before date/slot/pax/dietary/package --
      // but a free-tier model doesn't reliably follow that order under
      // load, and was seen skipping straight to "which time slot?" while
      // the branch was never given. The quick-action chip generator runs
      // independently off the same hasBranchDetected flag and correctly
      // kept showing the branch-choice chips -- so the reply text and the
      // chips visibly disagreed with each other. Branch is foundational
      // (hall lookups below are keyed to it), so enforce it deterministically
      // here rather than trusting the AI to remember: if this is an indoor
      // conversation and no branch has actually been named yet, the branch
      // question always wins, no matter what the AI just asked instead.
      // Extended the same way for every other STRICT SEQUENTIAL INTAKE step,
      // indoor and outdoor alike -- branch was the first one caught (it's
      // the most consequential, since hall lookups key off it), but the
      // free model can just as easily skip ahead past date/slot/pax/
      // dietary (indoor) or occasion/date/time/pax/items (outdoor) too,
      // which would produce the exact same text-vs-chips mismatch one
      // step later. Both flows are asked for in the same strict order the
      // scripted fallback below already uses when the AI fails outright,
      // so this just makes that order non-negotiable even when the AI
      // *does* respond, instead of only when it doesn't.
      if (isIndoor && !isOutdoorFlow && reply) {
        if (!hasBranchDetected) reply = fb.indoorBranch
        else if (!hasDateDetected) reply = fb.indoorDate
        else if (!hasSlotDetected) reply = fb.indoorSlot
        else if (!hasPaxDetected) reply = fb.indoorPax
        else if (!lastDietaryDetected) reply = fb.indoorDietary
      } else if (isOutdoorFlow && reply) {
        if (!hasOccasionDetected) reply = fb.outdoorOccasion
        else if (!hasDateDetected) reply = fb.outdoorDate
        else if (!hasTimeDetected) reply = fb.outdoorTime
        else if (!hasPaxDetected) reply = fb.outdoorPax
        else if (!hasOutdoorItemsDetected) reply = fb.outdoorItemsPrompt.replace('{N}', String(effectiveAdults))
      }
    }

    // 5. Smart Fallback if AI providers rate-limit
    if (!reply) {
      if (isOutdoorFlow) {
        // Bug fix (2026-09-28): same fix as the indoor deterministic
        // renderer -- once pax+items are known, this branch re-rendered
        // the FULL outdoor estimate on every turn, including a bare
        // "confirm" or a phone-number-only reply. Short-circuit those
        // turns to a focused details-ask (or, once every mandatory
        // outdoor detail is on file, one consolidated summary) instead.
        const isOutdoorConfirmOrDetailsTurn = (
          /\b(?:yes,?\s*)?(?:please\s+)?confirm(?:ed)?\b|\bgo ahead\b|\bproceed\b|\bbook it\b|\block (?:it|this) in\b/i.test(lastUserMsg)
          || /\b\d{10}\b/.test(lastUserMsg)
          || /whatsapp/i.test(lastUserMsg)
          || /\badvance\b/i.test(lastUserMsg)
        )
        const outdoorMandatoryPresent = !!(detectedPhone && customerName && detectedAddress)
        // If both pax and items are present (or if user already gave both upfront), estimate cost!
        if (hasPaxDetected && hasOutdoorItemsDetected && isOutdoorConfirmOrDetailsTurn) {
          if (outdoorMandatoryPresent) {
            const pax = (hasPaxDetected && effectiveAdults > 0) ? effectiveAdults : 50
            const isVeg = lastDietaryDetected === 'veg' || effectiveVegOnly || lowerAllText.includes('veg spread')
            const quote = generatePopularCateringQuote(
              'outdoor', mentionedBranch || 'Hyderabad & Suburbs', pax, isVeg, [],
              lastUserMsg + ' ' + allUserText, liveCateringData
            )
            const mult = loyaltyDiscount > 0 ? 0.95 : 1.0
            const totalWithDiscount = Math.round(quote.finalTotal * mult)
            const discountLine = loyaltyDiscount > 0 ? `\n• **5% Loyalty Discount Applied**: -₹${Math.round(quote.finalTotal * 0.05).toLocaleString('en-IN')}` : ''
            const custLines = [
              `Name: ${customerName || '-'}`,
              `Delivery Address: ${detectedAddress || '-'}`,
              `Phone/WhatsApp: ${detectedPhone || '-'}`,
            ].join('\n')
            reply = `${quote.headline}\n\n` +
              `📋 **Menu Spread & Dishes Included**:\n${quote.menuItems.join('\n\n')}\n\n` +
              `🍛 **Portion & Tray Sizing for ${pax} Guests**:\n${quote.trayBreakdown.join('\n')}\n\n` +
              `💰 **Estimation**: ₹${quote.pricePerPlate}/plate × ${pax} Guests = **₹${totalWithDiscount.toLocaleString('en-IN')}**${discountLine}\n\n` +
              `👤 **Your Details**:\n${custLines}\n\n` +
              `${ctaL.outdoorNoted(customerName || '', fallbackAdvanceStated || /\badvance\b/i.test(lastUserMsg), detectedPhone || '')}`
          } else {
            reply = outdoorConfirmCta
          }
        } else if (hasPaxDetected && hasOutdoorItemsDetected) {
          const pax = (hasPaxDetected && effectiveAdults > 0) ? effectiveAdults : 50
          const isVeg = lastDietaryDetected === 'veg' || effectiveVegOnly || lowerAllText.includes('veg spread')

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
            `Just tell me if you'd like to swap or add anything, or use the quick action chips below.\n\n${outdoorConfirmCta}`
        } else if (!hasOccasionDetected && !hasPaxDetected && !hasOutdoorItemsDetected) {
          const pax = (hasPaxDetected && effectiveAdults > 0) ? effectiveAdults : 50
          const isVeg = lastDietaryDetected === 'veg' || effectiveVegOnly || lowerAllText.includes('veg spread')

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
            `Just tell me if you'd like to swap or add anything, or use the quick action chips below.\n\n${outdoorConfirmCta}`
        } else if (!hasOccasionDetected && !hasPaxDetected && !hasOutdoorItemsDetected) {
          reply = fb.outdoorOccasion
        } else if (!hasDateDetected && !hasPaxDetected && !hasOutdoorItemsDetected) {
          reply = fb.outdoorDate
        } else if (!hasTimeDetected && !hasPaxDetected && !hasOutdoorItemsDetected) {
          reply = fb.outdoorTime
        } else if (!hasPaxDetected) {
          reply = fb.outdoorPax
        } else {
          // Items missing
          const vegOutdoor = liveCateringData.outdoorMenus.find(m => (m.dietaryType || '').toLowerCase().includes('veg') && !(m.dietaryType || '').toLowerCase().includes('non'))
          const nonVegOutdoor = liveCateringData.outdoorMenus.find(m => !(m.dietaryType || '').toLowerCase().includes('veg') || (m.dietaryType || '').toLowerCase().includes('non'))
          const vegLine = vegOutdoor ? `• 🌿 **${vegOutdoor.name}** (₹${vegOutdoor.pricePerPax}/plate)${vegOutdoor.description ? ` — ${vegOutdoor.description}` : ''}` : `• 🌿 **Popular Veg Spread** (pricing confirmed by our catering manager)`
          const nonVegLine = nonVegOutdoor ? `• 🍗 **${nonVegOutdoor.name}** (₹${nonVegOutdoor.pricePerPax}/plate)${nonVegOutdoor.description ? ` — ${nonVegOutdoor.description}` : ''}` : `• 🍗 **Non-Veg Spread** (pricing confirmed by our catering manager)`
          reply = `${fb.outdoorItemsPrompt.replace('{N}', String(effectiveAdults))}\n\n${vegLine}\n${nonVegLine}\n• 🍛 **Custom Dishes & Live Counters** (Build your custom menu)`
        }
      } else if (!hasBranchDetected) {
        reply = fb.indoorBranch
      } else if (hasPackageDetected) {
        // Indoor Banquet Quote -- hasBranchDetected is guaranteed true here
        // (checked above), so mentionedBranch is always a real branch name,
        // never the placeholder.
        const quote = generatePopularCateringQuote(
          'inhouse',
          mentionedBranch,
          effectiveAdults,
          effectiveVegOnly,
          [],
          lastUserMsg + ' ' + allUserText,
          liveCateringData,
          resolvedBranchId,
          indoorMenuBreakdown
        )

        const mult = loyaltyDiscount > 0 ? 0.95 : 1.0
        const totalWithDiscount = Math.round(quote.finalTotal * mult)
        const discountLine = loyaltyDiscount > 0 ? `\n• **5% Loyalty Discount Applied**: -₹${Math.round(quote.finalTotal * 0.05).toLocaleString('en-IN')}` : ''

        reply = `${quote.headline}\n\n` +
          `📋 **Menu Spread & Dishes Included**:\n` +
          `${quote.menuItems.join('\n\n')}\n\n` +
          `💰 **Estimation**: ₹${quote.pricePerPlate}/plate × ${effectiveAdults} Guests = **₹${totalWithDiscount.toLocaleString('en-IN')}**${discountLine}\n\n` +
          `${quote.trayBreakdown.join('\n')}\n\n` +
          `Just tell me if you'd like to swap or add anything, or use the quick action chips below to customize dishes.\n\n${indoorConfirmCta}`
      } else if (!hasDateDetected) {
        reply = fb.indoorDate
      } else if (!hasSlotDetected) {
        reply = fb.indoorSlot
      } else if (!hasPaxDetected) {
        reply = fb.indoorPax
      } else if (!lastDietaryDetected) {
        reply = fb.indoorDietary
      } else {
        const fmtMenu = (m: typeof liveCateringData.indoorMenus[number]) => `• 🍽️ **${m.name}** (₹${m.pricePerPax}/plate)${m.description ? ` — ${m.description}` : ''}`
        if (lastDietaryDetected === 'veg') {
          const vegMenus = liveCateringData.indoorMenus.filter(m => (m.dietaryType || '').toLowerCase().includes('veg') && !(m.dietaryType || '').toLowerCase().includes('non'))
          reply = vegMenus.length > 0
            ? `${fb.vegPackagesIntro}\n\n${vegMenus.map(fmtMenu).join('\n')}\n\n${fb.selectPackage}`
            : fb.vegPackagesUnavailable
        } else {
          const nonVegMenus = liveCateringData.indoorMenus.filter(m => !(m.dietaryType || '').toLowerCase().includes('veg') || (m.dietaryType || '').toLowerCase().includes('non'))
          reply = nonVegMenus.length > 0
            ? `${fb.nonVegPackagesIntro}\n\n${nonVegMenus.map(fmtMenu).join('\n')}\n\n${fb.selectPackage}`
            : fb.nonVegPackagesUnavailable
        }
      }
    }

    // 6. Action Parser: EVERYTHING lives in sangam.quotes as JSON until
    // payment is done. Payment is not integrated yet, so a real
    // eventmgmt.booking / booking_customer / booking_outdoor_details /
    // booking_payment row is NEVER written by the chat today — that whole
    // path is gated behind `paymentCompleted` (hardcoded false below) so
    // the logic is ready to switch on later without another rewrite. Until
    // then, both the draft quote AND a customer's explicit confirmation are
    // captured as one upserted row in `sangam.quotes`, with the complete
    // would-be-booking payload (hall pick, menu_selection, outdoor
    // logistics, customer/address details) stored as JSON in
    // `booking_details`. Once payment is wired up, a row with
    // payment_status = 'paid' is what gets promoted into the eventmgmt
    // relational tables — see the dead-but-ready block below.
    // Every write below is an INSERT or an UPSERT keyed on the unique
    // quote_number — never a DELETE.
    const saveTagMatch = reply.match(/\[SAVE_QUOTE:([^\]]+)\]/i)
    let targetPhone = detectedPhone
    let targetAddress = detectedAddress

    if (saveTagMatch) {
      const tagContent = saveTagMatch[1]
      const phoneMatch = tagContent.match(/whatsapp=([^|\]]+)/i)
      if (phoneMatch) targetPhone = phoneMatch[1].trim()
      const addressMatch = tagContent.match(/address=([^|\]]+)/i)
      if (addressMatch) targetAddress = addressMatch[1].trim()
    }

    // Mandatory-details gate for a CONFIRMED booking (per business rule):
    // indoor bookings only need a verified phone/WhatsApp number; outdoor
    // bookings additionally need the customer's name and a delivery address,
    // since there's no banquet hall to anchor the booking to.
    const mandatoryDetailsPresent = isIndoor
      ? !!targetPhone
      : !!(targetPhone && customerName && targetAddress)

    // Business rule (2026-09-27, tightened): sangam.quotes must only ever
    // gain a row once the customer has EXPLICITLY confirmed AND a phone
    // number is on file. A loose keyword match ("quote"/"book"/"phone"/any
    // 10-digit number) used to be enough to save a draft — that meant every
    // browsing conversation with a phone number in it got persisted (and
    // re-upserted on every following message), which is not what "only
    // save confirmed quotes" means. Un-confirmed browsing is still captured
    // in full by the sangam.chat_sessions transcript log below, so nothing
    // is lost — it just isn't written into the quotes table as a draft.
    const looksLikeQuoteMoment = !!(saveTagMatch || /save|quote|hold|book|confirm|advance|phone|whatsapp|\d{10}/i.test(allUserText) || /reference\s*id/i.test(reply))

    // Explicit confirmation signal — distinct from merely mentioning "book"
    // or "quote" while still browsing. An advance payment amount being
    // *mentioned* is still just intent right now (there's no payment
    // gateway to actually charge it), so it's captured in the JSON payload
    // for later, but it does NOT by itself flip anything to "paid".
    //
    // CRITICAL — CUSTOMER TEXT ONLY, NEVER THE AI'S OWN REPLY:
    // This used to also scan `reply` for the words "confirmed" / "tentatively
    // booked", which caused a real bug: the AI's own explanatory text (e.g.
    // "Hall Fee Status: To be confirmed by our catering manager") contains
    // the word "confirmed" even though the customer never confirmed anything,
    // which was silently triggering a real eventmgmt.booking write off a
    // plain estimate request. The AI's own words must never be read back as
    // the customer's intent — only allUserText (what the customer actually
    // typed) can ever satisfy this check.
    const advanceMatchEarly = allUserText.match(/advance\s*(?:payment|amount|of|paid)?\s*[:\-]?\s*₹?\s*([\d,]+)/i)
    const advanceAmountEarly = advanceMatchEarly ? parseInt(advanceMatchEarly[1].replace(/,/g, ''), 10) : 0
    const isExplicitConfirmation = !!(
      advanceAmountEarly > 0 ||
      /\b(?:yes,?\s*)?(?:please\s+)?confirm(?:ed)?\b|\bgo ahead\b|\bproceed\b|\bbook it\b|\block (?:it|this) in\b|\btentatively booked\b/i.test(allUserText)
    )

    // Payment integration doesn't exist yet. This is the single switch that
    // will one day gate promotion into the real eventmgmt tables — flip its
    // source (e.g. a real payment-gateway webhook / booking_payment lookup)
    // once that work is done. Until then it is always false, so the
    // eventmgmt write block further down never runs.
    const paymentCompleted = false

    if (targetPhone && isExplicitConfirmation && mandatoryDetailsPresent) {
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
          return effectiveVegOnly ? isVegRow : true
        })
        const fallbackPlateRate = (dietMatchedLive[0] || liveMenuPool[0])?.pricePerPax
          ?? (isIndoor ? (effectiveVegOnly ? 600 : 800) : 450)
        const calculatedTotal = parsedTotal > 0 ? parsedTotal : Math.round(fallbackPlateRate * (effectiveAdults || 20) * (loyaltyDiscount > 0 ? 0.95 : 1))

        // Real branch_id — resolved above (step 3) for the hall/menu lookup,
        // reused here so nothing is silently lost even before a real
        // eventmgmt write ever happens.
        if (mentionedBranch && !resolvedBranchId) {
          console.warn(`[Quote Save] Could not resolve branch_id for "${mentionedBranch}" from the branches table — using fallback UUID. Verify the branches table/column names.`)
        }
        const branchId = resolvedBranchId || '6215d413-e566-44a8-b8fd-f2b2d5a90e98'
        const pickedHallId = isIndoor ? (pickHallForGuestCount(liveCateringData.halls, resolvedBranchId, effectiveAdults || 20)?.id ?? null) : null

        // Full would-be-booking payload — everything that would eventually
        // be split across eventmgmt.booking / booking_customer /
        // booking_outdoor_details / booking_payment, kept together as one
        // JSON blob until payment is done and it's safe to promote. Shape
        // still mirrors sangam-workmanager-monorepo's own
        // ocaterBookingService.js convention (menu_name/source/sections[].
        // items) so this JSON is a drop-in source for that later insert.
        const bookingDetails = {
          branch_id: branchId,
          hall_id: pickedHallId,
          service_type: isIndoor ? 'inhouse' : 'outdoor',
          event_date: targetDate,
          pax: effectiveAdults || 20,
          total_amount: calculatedTotal,
          catering_contacts: {
            whatsapp_phone: targetPhone,
            customer_name: customerName || 'Valued Guest',
            source: 'ai_chatbot',
            valid_until: validUntil,
            branch: mentionedBranch || 'Hayathnagar / Peerzadiguda'
          },
          menu_selection: {
            menu_name: isIndoor ? 'Indoor Banquet Catering' : 'Outdoor Custom Catering',
            source: 'ai_chatbot',
            sections: [{
              type: 'items',
              dish_ids: [],
              items: extractCustomDishes(lastUserMsg + ' ' + allUserText).map(name => ({ name, quantity: effectiveAdults || 20 }))
            }],
            custom_notes: lastUserMsg.slice(0, 300),
            guest_count: effectiveAdults || 20
          },
          outdoor_details: !isIndoor ? {
            address_label: targetAddress || '',
            delivery_type: 'outdoor',
            dispatch_branch_id: branchId,
            manpower_needed: false,
            boys_count: 0,
            girls_count: 0,
            welcome_girls_count: 0,
            setup_required: false,
            table_count: 0,
          } : null,
          requested_advance_amount: advanceAmountEarly > 0 ? advanceAmountEarly : null,
          customer_confirmed: isExplicitConfirmation,
          mandatory_details_present: mandatoryDetailsPresent,
        }

        // ── Everything is saved here, in sangam.quotes, as JSON. No writes ──
        // ── to eventmgmt happen until paymentCompleted flips true.        ──
        const sangamClient = sbSangam()
        if (sangamClient) {
          const { error: quoteErr } = await sangamClient
            .from('quotes')
            .upsert({
              quote_number: quoteNumber,
              whatsapp_phone: targetPhone,
              guest_count: effectiveAdults || 20,
              event_type: isIndoor ? 'Indoor Banquet Catering' : 'Outdoor Custom Catering',
              event_date: targetDate,
              dishes: lastUserMsg.slice(0, 500),
              total_amount: calculatedTotal,
              valid_until: validUntil,
              customer_name: customerName || null,
              address: targetAddress || null,
              service_type: isIndoor ? 'inhouse' : 'outdoor',
              payment_status: 'unpaid',
              booking_details: bookingDetails,
              // Not a real booking confirmation yet — just marks that the
              // customer said "confirm"/"proceed" so it's easy to find the
              // ones waiting on payment. Real promotion needs payment_status
              // to flip to 'paid' first (see the gated block below).
              status: isExplicitConfirmation && mandatoryDetailsPresent ? 'confirmed_awaiting_payment' : 'active',
            }, { onConflict: 'quote_number' })
          if (quoteErr) console.warn('[Quote] sangam.quotes upsert failed (non-fatal):', quoteErr.message)
          else console.log(`[Quote] #${quoteNumber} saved to sangam.quotes (${isExplicitConfirmation && mandatoryDetailsPresent ? 'confirmed_awaiting_payment' : 'active'})`)
        }

        // ── Dead until payment is integrated: promotion into the real ──
        // ── eventmgmt relational tables. Left fully implemented (not  ──
        // ── deleted) so switching `paymentCompleted` on later is a    ──
        // ── one-line change, not a rewrite. Per the standing "no data ──
        // ── deletion" rule this never touches the sangam.quotes row   ──
        // ── except to flip its status once promoted.                 ──
        if (paymentCompleted && isExplicitConfirmation && mandatoryDetailsPresent) {
          const client = sbEvent()

          if (client) {
            // Idempotency guard: allUserText is cumulative across the whole
            // conversation, so once a booking exists, every later message
            // would otherwise re-satisfy this condition and re-insert a
            // duplicate booking. Check for an existing, non-cancelled
            // booking for this exact phone + event date + service type
            // first, and skip the insert entirely if one already exists.
            const { data: existingBooking } = await client
              .from('booking')
              .select('id, booking_code')
              .eq('service_type', isIndoor ? 'inhouse' : 'outdoor')
              .eq('event_date', targetDate)
              .contains('catering_contacts', { whatsapp_phone: targetPhone })
              .neq('status', 'cancelled')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (existingBooking) {
              console.log(`[Quote Promote] Booking already exists for this phone+date+service (${existingBooking.booking_code}) — skipping duplicate insert.`)
            } else {
            const { data: savedBooking, error: insErr } = await client
              .from('booking')
              .insert({
                branch_id: bookingDetails.branch_id,
                hall_id: bookingDetails.hall_id,
                service_type: bookingDetails.service_type,
                event_date: bookingDetails.event_date,
                pax: bookingDetails.pax,
                status: 'pending',
                booking_code: quoteNumber,
                total_amount: bookingDetails.total_amount,
                amount_paid: 0,
                payment_status: 'unpaid',
                catering_contacts: bookingDetails.catering_contacts,
                menu_selection: bookingDetails.menu_selection,
              })
              .select()
              .single()

            if (!insErr && savedBooking) {
              console.log(`[Quote Promote] Quote #${quoteNumber} successfully persisted into eventmgmt.booking!`)

              try {
                const { error: custErr } = await client.from('booking_customer').insert({
                  booking_id: savedBooking.id,
                  customer_name: customerName || 'Valued Guest',
                  phone: targetPhone,
                  whatsapp: targetPhone,
                })
                if (custErr) console.warn('[Quote Promote] booking_customer insert failed (non-fatal):', custErr.message)
              } catch (custEx) {
                console.warn('[Quote Promote] booking_customer insert threw (non-fatal):', custEx)
              }

              if (!isIndoor && bookingDetails.outdoor_details) {
                try {
                  const { error: outdoorErr } = await client.from('booking_outdoor_details').insert({
                    booking_id: savedBooking.id,
                    ...bookingDetails.outdoor_details,
                  })
                  if (outdoorErr) console.warn('[Quote Promote] booking_outdoor_details insert failed (non-fatal):', outdoorErr.message)
                } catch (outdoorEx) {
                  console.warn('[Quote Promote] booking_outdoor_details insert threw (non-fatal):', outdoorEx)
                }
              }

              if (advanceAmountEarly > 0 && advanceAmountEarly <= calculatedTotal) {
                try {
                  const { error: payErr } = await client.from('booking_payment').insert({
                    booking_id: savedBooking.id,
                    amount: advanceAmountEarly,
                    payment_type: 'advance',
                    status: 'success',
                  })
                  if (payErr) console.warn('[Quote Promote] booking_payment (advance) insert failed (non-fatal):', payErr.message)
                  else console.log(`[Quote Promote] Advance payment of ₹${advanceAmountEarly} recorded for booking ${savedBooking.id}`)
                } catch (payEx) {
                  console.warn('[Quote Promote] booking_payment insert threw (non-fatal):', payEx)
                }
              }

              if (sangamClient) {
                const { error: statusErr } = await sangamClient
                  .from('quotes')
                  .update({ status: 'confirmed', payment_status: 'paid' })
                  .eq('quote_number', quoteNumber)
                if (statusErr) console.warn('[Quote Promote] sangam.quotes status update failed (non-fatal):', statusErr.message)
              }
            }
            } // end existingBooking-not-found branch (idempotency guard)
          }
        }
      } catch (err) {
        console.warn('Failed writing quote:', err)
      }
    }
    // Clean up any remaining internal tags
    reply = reply.replace(/\[SAVE_QUOTE:[^\]]+\]/gi, '').trim()

    // 7. Generate Contextual Dynamic Suggestion Chips
    const suggestions = editFlowSuggestions ?? generateDynamicSuggestionsCore(recentMsgs, reply)

    // 8. Log the full transcript for analytics -- every turn, regardless of
    // whether a quote was ever saved (sangam.quotes only ever gets a row
    // once the customer has explicitly confirmed AND given a phone number;
    // this table is the only record of everything else -- browsing,
    // questions, abandoned chats). Fire-and-forget: never let a logging
    // failure affect the customer-facing reply.
    void logChatSession(sessionIdForLog, allMsgs, reply, {
      language: responseLang,
      serviceType: isIndoor ? 'inhouse' : 'outdoor',
      phone: targetPhone || detectedPhone,
      branch: mentionedBranch || null,
      quoteNumber: (reply.match(/SGM-?[A-Z0-9]{4,6}/i) || allUserText.match(/SGM-?[A-Z0-9]{4,6}/i))?.[0]?.toUpperCase() || null,
      quoteSaved: !!(targetPhone && isExplicitConfirmation && mandatoryDetailsPresent),
    })

    return NextResponse.json({ reply, suggestions, customerName, loyaltyDiscount })
  } catch (err) {
    console.error('Error in /api/chat route:', err)
    const errL = ERROR_FALLBACK_L[(responseLang as 'en' | 'te' | 'hi')] || ERROR_FALLBACK_L.en
    // Log this turn too -- an error must never mean the customer's message
    // silently vanishes from sangam.chat_sessions. Best-effort: if
    // rawMsgsForLog is empty (the request body itself was unparseable),
    // there's nothing to log and this is a no-op (logChatSession also
    // no-ops on an empty sessionId).
    if (rawMsgsForLog.length > 0) {
      void logChatSession(sessionIdForLog, rawMsgsForLog, errL.reply, {
        language: responseLang,
        serviceType: 'unknown',
        phone: null,
        branch: null,
        quoteNumber: null,
        quoteSaved: false,
      })
    }
    return NextResponse.json({
      reply: errL.reply,
      suggestions: errL.suggestions,
    })
  }
}

function generateDynamicSuggestionsCore(
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
  // Kept in sync with `mentionedBranch` detection in the main POST handler
  // above (5 branches) -- this used to only recognize 3, so a customer who
  // named Mansoorabad or Koyyalagudem would get a reply that correctly
  // moved past the branch question, but branch-selection chips that kept
  // reappearing underneath as if nothing had been said.
  const hasBranch = allUserText.includes('peerzadiguda') || allUserText.includes('hayathnagar') || allUserText.includes('malkapur') || allUserText.includes('mansoorabad') || allUserText.includes('koyyalagudem')
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
    } else if (txt.includes('pure veg') || txt.includes('vegetarian') || txt.includes('vegan') || txt.includes('veg only') || txt.includes('pure vegetarian') || /\bveg\b/i.test(txt)) {
      // Fixed alongside the same bug in the main handler above: this used
      // to skip "veg" whenever the message also said "menu" or "package",
      // which dropped ordinary phrasing like "veg menu please" or "as
      // vegetarian suggest menu for that" -- and it never recognized
      // "vegan" at all, since that's a different word, not "veg" + suffix.
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
  // Step 1: Branch Selection
  //
  // Bug fix (2026-09-28): this used to require date, slot, AND pax to ALSO
  // still be missing before branch chips would show -- but a customer
  // typically states guest count in their very first message ("200
  // people"), which made `hasPax` true from turn 1 and permanently skipped
  // this branch-chip step. The reply TEXT (generated separately, by the AI
  // or the scripted fallback) correctly kept asking "which branch?" every
  // turn, but the chips shown underneath jumped straight to date options --
  // exactly the out-of-sync chips a customer would see (bot asks "which
  // branch", chips offer "Tomorrow / This Sat / This Sun"). Branch is now
  // checked on its own, matching the "strict sequential order" the comment
  // above already claimed.
  if (!hasBranch) {
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
  // (No code after this point in the function — dietary is always resolved
  // by here, since !lastDietary is handled earlier above. A "default
  // discovery" fallback used to sit after this return and could never run;
  // removed rather than left as dead code.)
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

export { generateDynamicSuggestionsCore as generateDynamicSuggestions }
