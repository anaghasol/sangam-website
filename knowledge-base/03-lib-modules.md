# `lib/` Modules Reference

All business logic lives here, used primarily by `app/api/chat/route.ts`.
Sizes are approximate line counts (as of this writing) to show where the
complexity actually lives.

| File | Lines | What it does |
|---|---|---|
| `sangam-catering.ts` | ~780 | **Core live-data layer.** Fetches halls, menus, dishes, pricing from the `eventmgmt` schema (`SANGAM_ORG_ID` constant identifies this org in a multi-tenant DB). Key exports: `getSangamCateringLiveData()`, `getHallsBookedOnDate(eventDate)` (bug fix 2026-10-04 — which halls are already booked on a date, uncached, fails open — see `09-bugfixes-and-rules-log.md`), `getBranchIdByName()`, `getOccasionIdByName()`, `getIndoorMenuStructured()`, `getIndoorMenuDishBreakdown()`, `getSangamCateringChatContext(branchId?)` (assembles the pricing block injected into the chat prompt; now branch-scoped when `branchId` is given — its text cache is keyed per branch, not one shared string — bug fix 2026-10-04). Types: `LiveHall`, `LiveMenu`, `LiveDish`, `CateringLiveData`, `StructuredMenuSection`. |
| `catering-portions.ts` | ~1300 | **Quote math / NLP-lite parsing.** Guest-count breakdowns (`calculateEffectiveGuests`), tray-quantity sizing (`calculateTrayQuantity`), extracting custom/event info from free-text: `extractCustomDishes` (legacy, matches only the small static `COMMON_DISH_CATALOG`), **`extractDishesFromText(text, live?, defaultQuantity?)`** (bug fix 2026-09-30/10-06 — matches the **live** dish catalog first, capturing real `dish_id`/price/`personsPerUnit`/category, falls back to the static list only for unknown names — returns `MatchedDish[]`; this is the one real pricing/quote-saving should use, not `extractCustomDishes`), `extractExplicitEventDate` (shared date parser, bug fix 2026-10-04 — used both for early hall-availability checks and quote-save, instead of two separate inline regexes). Hall picking: `pickHallForGuestCount(halls, branchId, guestCount, bookedHallIds?)` — now excludes already-booked halls and returns `null` (not a cross-branch guess) when a known branch has zero halls (bug fix 2026-10-04). `generatePopularCateringQuote()` builds a full estimate — as of 2026-10-06 its custom/suggested outdoor paths price from real live dish rates, not a flat guessed per-plate number (see `09-bugfixes-and-rules-log.md`). Also `getCateringPortionRulesText()` — portion rules fed to the AI. |
| `sangam-booking-intelligence.ts` | ~450 | Looks at **past bookings** to inform new ones: `getIndoorBookingIntelligence()`, `getOutdoorBookingIntelligence()` — tier-2 fallback when no live package matches (see system prompt logic in `05-chat-ai-logic.md`). As of 2026-10-06, `getOutdoorBookingIntelligence()` also calls a new internal `getPopularOutdoorDishNames(occasionId)` which mines real `booking.menu_selection` history to surface actual most-frequently-chosen dish names per occasion (not just average spend) — per-dish pricing still always comes from live `dish_pricing`, never from this. Type: `SimilarBookingSummary`. |
| `sangam-knowledge.ts` | 142 | Vector search over the knowledge base seeded from `sangam-catering-knowledge.md`. `searchSangamKnowledgeChunks()` (raw similarity search), `getSangamUnifiedKnowledgeContext()` (combines knowledge chunks + other context for the prompt). |
| `sangam-sales.ts` | 123 | `getSangamSalesContext()` — sales/upsell framing injected into the prompt (loyalty discounts, upsell prompts, etc. — verify exact content when editing). |
| `customer-lookup.ts` | 238 | Returning-customer detection: `extractPhoneNumber()`, `lookupCustomerByPhone()` → `CustomerProfile` (incl. `PastCateringEvent[]`) — powers the "5% loyalty discount if returning customer" logic referenced in the chat prompt. |
| `sangam-branch-distance.ts` | 42 | `haversineKm()` + `sortBranchesByNearest()` — straight-line distance helpers, presumably for branch/delivery-feasibility logic. `BranchLocation` interface. |
| `free-ai.ts` | 164 | `askFreeModels(system, msgs)` — the actual LLM call. Tries a chain of model providers (check the file for the current provider order/keys — this is the piece most likely to need updating if a provider changes pricing/availability). |
| `chat-session.ts` | ~31 | `getOrCreateChatSessionId()` — session id management (ties a browser session to `sangam.chat_sessions` in Supabase, see `04-database.md`). **Bug fix (2026-09-30):** this used to be defined only inside `app/embed/chat/page.tsx`; the homepage widget (`app/page.tsx`) never generated/sent a `sessionId` at all, so its conversations never got logged. Now a shared module both chat surfaces import — **any new chat UI must import this and send its result as `sessionId` in the `/api/chat` body**, or its conversations will silently vanish from `sangam.chat_sessions`. See `09-bugfixes-and-rules-log.md`. |
| `greeting.ts` | 132 | `getDynamicArjunGreeting(lang)` — time-of-day/localized greeting text. |
| `suggestion-i18n.ts` | 77 | `translateSuggestionLabel()` + `SUGGESTION_LABEL_TR` — English quick-reply chip labels translated to Telugu/Hindi. |

## Conventions worth knowing
- "Live" in a function name (`getSangamCateringLiveData`, `LiveHall`,
  `LiveMenu`, `LiveDish`) means *queried fresh from the DB this request* —
  as opposed to anything hardcoded or cached in the prompt text.
- Functions returning `*ChatContext` or `*Context` (e.g.
  `getSangamCateringChatContext`, `getSangamUnifiedKnowledgeContext`,
  `getSangamSalesContext`) are string-builders meant to be concatenated
  into the LLM system/context prompt in `app/api/chat/route.ts` — if you
  add a new one, you also need to wire it into that route.
