# Chat AI Logic (Arjun) — `app/api/chat/route.ts`

This is the single most important file in the project (~2150 lines) and
most of its "logic" is actually a very long, carefully engineered system
prompt string, not control flow. Read this before editing it.

## Persona
"Arjun" — the Hospitality & Catering Manager at Sangam Hotels Hyderabad.
Warm, concise, hospitable, speaks with pride about the brand. Not "AI
assistant"-sounding.

## The non-negotiable invariant: pricing/menu data must come from the DB
The prompt explicitly instructs the model: every hall name, hall price,
menu package name and per-plate price it states **must** come from the
"REAL DATABASE CATERING & EVENT PRICING" block appended to the prompt
(built by `lib/sangam-catering.ts`). If live data is unavailable, the
model must say pricing will be confirmed by the catering manager
(+91 90638 44021) — never invent a number. **Any change to this route
must preserve this rule**, since it's the main defence against the LLM
hallucinating prices/halls/dishes.

This now extends to **outdoor** pricing too: there is **no real outdoor
"package"** in `eventmgmt.menu` today. A flat guessed per-plate rate
(₹499/₹649) used to stand in for this and was removed (2026-10-06) — every
outdoor dish quoted must trace back to a real `eventmgmt.dish_pricing` row
(via `extractDishesFromText` in `lib/catering-portions.ts`) or be shown as
"pricing to be confirmed by our catering manager." See
`09-bugfixes-and-rules-log.md` for the full story — don't reintroduce a
flat-rate fallback here.

**Also non-negotiable: a hall must never be offered or confirmed if it's
already booked on the requested date.** `getHallsBookedOnDate()`
(`lib/sangam-catering.ts`) is checked both when building the hall list
shown to the AI and again, freshly, right before a quote is saved. See
`09-bugfixes-and-rules-log.md` (2026-10-04 entries).

## Two service types, two different conversational workflows

### 1. Outdoor Catering & Custom Trays (delivery/onsite at customer venue)
- Never asks for banquet hall slots or assigns a hall.
- Step-by-step intake, never re-asking for info already given: Occasion →
  Event Date/Time → Guest Count → Menu/Spread → Delivery Address + Name +
  Phone (mandatory before booking confirmation, but asked *after* showing
  the estimate, not before).
- **Menu-selection priority order when the guest asks Arjun to decide the
  spread** (never skip a tier):
  1. A real **live outdoor package** matching dietary preference, if one
     exists (`lib/sangam-catering.ts` data).
  2. Else, **past similar orders** for that occasion
     (`lib/sangam-booking-intelligence.ts` → `getOutdoorBookingIntelligence`,
     "MOST FREQUENTLY CHOSEN DISHES" / "PAST OUTDOOR BOOKINGS"). There is
     currently **no fixed outdoor "package"** in the system — the model is
     told never to name/price one as if it existed.
  3. Else, build from the **general dish catalog by category** — every
     dish must come from that catalog.
  - If the guest names specific dishes themselves, that overrides all
    three tiers (see "CUSTOM DISHES INTAKE RULE" in the prompt —
    implemented by `extractDishesFromText` / `extractCustomDishes` in
    `lib/catering-portions.ts`).
- Estimate needs only **Pax + Items**; once both are known, show the
  estimate immediately (occasion/date/time are acknowledged if given, not
  blocking). Output format: headline, event details, menu by section
  (Welcome Drinks / Starters / Main Course Curries / Rice & Biryani / Live
  Tandoor Breads / Sweets & Desserts), tray-sizing breakdown, price/plate ×
  pax (with 5% loyalty discount if `lib/customer-lookup.ts` finds a
  returning customer), what's included, a reference ID, 10-day validity.

### 2. Indoor AC Banquet Halls
Strict sequential intake, only ever asking for the next missing field,
never re-asking: Branch → Event Date → Time Slot (Lunch/Dinner/Full Day) →
Guest Count (adults+kids) → Dietary Preference → Menu Package (only
packages matching dietary preference, exact names/prices from live data)
→ **Full Estimation** (only after package is chosen):
- Hall picked from the live hall list by pax + branch
  (`pickHallForGuestCount` in `lib/catering-portions.ts`), **never** a hall
  marked "ALREADY BOOKED" for that date (`getHallsBookedOnDate` in
  `lib/sangam-catering.ts`) — pick the next one that fits, or defer to the
  manager if none fit.
- Price = guest count × plate rate (from live data). Hall fee only waived
  if live data confirms the catering total meets that hall's free-hall
  threshold.
- Itemized dish spread by section, using exactly the dishes/sections given
  in the live pricing block for that package (sourced via
  `getIndoorMenuStructured` / `getIndoorMenuDishBreakdown` in
  `lib/sangam-catering.ts`) — no inventing dishes, no "(Choose any N)"
  notes or "[Edit]" tags (retired UI pattern — don't reintroduce it).

## Context assembled per request (roughly, in order)
1. `getSangamUnifiedKnowledgeContext()` — vector-search knowledge chunks
   relevant to the user's message (`lib/sangam-knowledge.ts`).
2. `getSangamCateringLiveData()` / `getSangamCateringChatContext()` — live
   halls/menus/pricing (`lib/sangam-catering.ts`).
3. `getIndoorBookingIntelligence()` / `getOutdoorBookingIntelligence()` —
   past-booking signal for tier-2 fallback (`lib/sangam-booking-intelligence.ts`).
4. `getSangamSalesContext()` — upsell/loyalty framing (`lib/sangam-sales.ts`).
5. `lookupCustomerByPhone()` — returning-customer check, if a phone number
   was extracted from the conversation (`lib/customer-lookup.ts`).
6. Guest-count / dish / date extraction from the user's free text
   (`lib/catering-portions.ts`).
7. All of the above + `SYSTEM_PROMPT` → `askFreeModels()`
   (`lib/free-ai.ts`) → reply.

## If you're changing this file
- Keep the "pricing must come from the live block" rule intact — it's
  repeated multiple times in the prompt deliberately.
- If you change the output format (headers, emoji, section order), check
  `app/embed/` and `public/sangam-widget.js` for any front-end parsing
  that depends on exact text/markdown structure.
- The file mixes prompt-engineering text with actual TypeScript logic —
  when grepping for behavior, remember a lot of "rules" are just prompt
  instructions to the LLM, not code paths you can unit test directly.
