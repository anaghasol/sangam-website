# Bug Fixes & Rules Log

> A dated changelog of non-obvious bugs fixed and business rules added to
> the chat/catering logic — the "why is the code doing it this weird way"
> answers, kept in one place so the next change doesn't accidentally
> re-introduce an old bug. Add a new dated entry here whenever you fix a
> bug or add a rule that isn't self-evident from the code alone — most of
> these were originally only documented as inline code comments; this file
> collects them so they're findable without reading every diff.
>
> **Status note (as of this writing):** everything below is already in the
> working tree (`lib/catering-portions.ts`, `lib/sangam-catering.ts`,
> `lib/sangam-booking-intelligence.ts`, `lib/sangam-knowledge.ts`,
> `app/api/chat/route.ts`, `app/page.tsx`, `app/embed/chat/page.tsx`,
> `lib/chat-session.ts`) but **not yet committed to git**. Once committed,
> keep adding new entries here the same way — don't let this file go stale
> just because the "uncommitted" caveat no longer applies.

---

## 2026-10-06 — Outdoor pricing was a flat guessed rate, not real dish prices

**Problem:** Any custom outdoor spread (guest naming their own dishes) was
priced with a flat per-plate number — ₹649 if any dish was non-veg, else
₹499 (≥8 dishes) or ₹399 — picked purely from dish *count*, completely
ignoring each dish's real price in `eventmgmt.dish_pricing`. Worse, the
detection that triggered this path only matched the small hardcoded
`COMMON_DISH_CATALOG` list, so a guest naming ≥2 *real* dishes straight
from the live catalog often didn't even trigger the custom-menu branch at
all and fell through to a different, also-wrong, generic price.

**Fix** (`lib/catering-portions.ts`):
- `extractDishesFromText()` (new) matches against the **live** dish catalog
  first (capturing the real `dish_id`, price, `personsPerUnit`, category),
  falling back to the static list only for names the live catalog doesn't
  carry.
- `generatePopularCateringQuote()`'s custom-menu branch now sums **real
  per-dish line costs** (qty × live price, using each dish's own
  `personsPerUnit` or a standard portion default) instead of a flat
  guessed rate. Any dish with no live price shows as "pricing to be
  confirmed by our catering manager" rather than silently folding a guess
  into the total.
- The *AI-suggested* outdoor spread (no live outdoor package exists, guest
  didn't name dishes) got the same treatment: one representative dish per
  section is picked from the live catalog and priced for real; a section
  with nothing live on file shows "to be confirmed" instead of a guess.

**Rule going forward:** there is **no fixed outdoor "package"** in the
database today (`eventmgmt.menu` has no outdoor rows) — never invent one
("Popular Veg Spread ₹499", "Hyderabadi Non-Veg ₹649" never existed as real
rows). Outdoor pricing must always trace back to a real `dish_pricing` row
or say "to be confirmed."

**Also touched:** `app/api/chat/route.ts` (the fallback-reply branch that
used to render these same two fake package lines when `liveCateringData.
outdoorMenus` was empty — now asks for dishes directly or offers Arjun's
suggestion instead); `deriveChipsFromReply()` and
`generateDynamicSuggestionsCore()` (quick-reply chips offering "Popular Veg
Spread (₹499)" / "Hyderabadi Non-Veg (₹649)" replaced with "Suggest a
Spread for Me" / "Custom Dishes & Live Counters").

---

## 2026-10-06 — Outdoor "similar past orders" tier had no real dishes to point to

**Problem:** The system prompt's tier-2 fallback for outdoor menu
suggestions ("check what similar past orders typically included") pointed
at `getOutdoorBookingIntelligence()`, which only ever surfaced **average
spend** on past orders — never which dishes those orders actually
contained. There was nothing real for the AI to ground a "most of our
outdoor guests go with..." suggestion in.

**Fix** (`lib/sangam-booking-intelligence.ts`): new
`getPopularOutdoorDishNames()` mines `booking.menu_selection.sections[].
items[].name` across past outdoor bookings (scoped to the same occasion
when there's enough history — ≥5 rows; else widens to all outdoor orders
rather than call a 1–2-booking sample "popular"), counts frequency, returns
the top dishes. Surfaced in the prompt as "MOST FREQUENTLY CHOSEN DISHES ON
PAST OUTDOOR ORDERS." Pricing for these still always comes from live
`dish_pricing`, never from this count.

---

## 2026-10-04 — Hall availability was never checked before recommending/saving

**Problem:** `pickHallForGuestCount()` only matched halls by capacity —
never checked whether a hall was already booked on the requested
`event_date`. This meant the chat could recommend, confirm, and even
**save a booking against a hall that was already taken that day**.
(Flagged by the event-booking PWA team.)

**Fix:**
- `lib/sangam-catering.ts`: new `getHallsBookedOnDate(eventDate)` — reads
  non-cancelled `eventmgmt.booking` rows for that date, returns the set of
  booked `hall_id`s. Deliberately **not** cached (unlike the 20-min
  hall/menu cache) since availability changes with every new booking.
  Fails open (returns empty set, never throws) — a lookup failure means
  "availability unknown," not "block everything."
- `lib/catering-portions.ts`: `pickHallForGuestCount()` now takes an
  optional `bookedHallIds: Set<string>` and excludes them from the pool
  before picking.
- `app/api/chat/route.ts`: extracts an explicit event date early
  (`extractExplicitEventDate`, see below) and fetches
  `getHallsBookedOnDate()` for it alongside the other context calls; the
  hall list shown to the AI is annotated per-hall ("— ALREADY BOOKED on
  {date}" / "— available on {date}"); the system prompt now explicitly
  forbids offering/confirming a hall marked already-booked for that date.
  **At save time**, availability is re-checked fresh for the final
  `targetDate` (not reused from the earlier lookup) — `targetDate` can
  differ from the early-detected date, and other bookings may have landed
  since.

**Rule going forward:** any code path that recommends or confirms a
specific hall for a specific date must check `getHallsBookedOnDate()` for
that exact date first — capacity match alone is not enough.

---

## 2026-10-04 — Hall picking/display ignored branch scoping in two places

**Problem #1:** `pickHallForGuestCount()` — when a branch_id was given but
that branch genuinely had no halls on file, it silently fell back to
searching *every* hall across *every* branch, so it could hand back a hall
belonging to a completely different branch than the one being booked.

**Fix:** a known branch with zero halls now returns `null` (the chat tells
the guest availability will be confirmed by the manager) instead of
guessing from the full org-wide pool.

**Problem #2:** `getSangamCateringChatContext()` (the general knowledge-
context text block) always listed *every* active hall org-wide, with no
branch filter — while `route.ts` separately builds a correctly
branch-scoped `branchHallContext` block. Both blocks landed in the same
prompt, so the AI could pick up a hall from the *unscoped* list and
recommend one from the wrong branch.

**Fix:** `getSangamCateringChatContext(branchId?)` now accepts an optional
branch id and filters its hall list to that branch once one is known (same
behavior as `branchHallContext`). The per-branch text cache is now keyed
by `branchId` (`'__all__'` when none yet) instead of one single shared
cache string, so a cached org-wide list from an earlier branch-less turn
is never served back once a branch has been named.
`getSangamUnifiedKnowledgeContext()` and the `Promise.all` in
`app/api/chat/route.ts` were updated to resolve `branchId` *before* that
call (not inside the same `Promise.all`) so both blocks are guaranteed to
use the same branch scope rather than racing.

---

## 2026-09-30 — Dish/menu details going missing on saved quotes

**Problem:** Two separate bugs combined to make saved quotes frequently
have an **empty dish list**:
1. Dish matching for the saved `menu_selection` only checked the small
   static `COMMON_DISH_CATALOG` — most real conversations (which reference
   real live-catalog dishes) matched nothing.
2. `menu_selection.menu_name` was always a fixed display string
   ("Indoor Banquet Catering" / "Outdoor Custom Catering") — never the
   actual `eventmgmt.menu` row id that priced the quote, so there was no
   real `menu_id` to trace back to.

**Fix** (`app/api/chat/route.ts`, save-quote path): matches dishes against
the live catalog via `extractDishesFromText()` (real `dish_id`s now
populate `dish_ids`/`items`); resolves and stores the actual `menu_id`
(`resolvedMenuId`) and real menu name. Logs a warning (non-fatal) if zero
dishes could be matched, rather than saving silently empty.

---

## 2026-09-30 — Homepage chat widget never logged to `sangam.chat_sessions`

**Problem:** `getOrCreateChatSessionId()` originally lived only inside
`app/embed/chat/page.tsx` and was sent as `sessionId` in *that* page's
`/api/chat` request body. The **main site's own chat widget**
(`app/page.tsx`) — the surface most customers actually use — never
generated or sent a `sessionId` at all. The server-side logger
(`logChatSession` in `app/api/chat/route.ts`) silently no-ops on an empty
`sessionId`, so every homepage-widget conversation ran the logging code
every turn but it always wrote nothing — a totally silent data-loss bug.

**Fix:** moved `getOrCreateChatSessionId()` into its own module
(`lib/chat-session.ts`) so both chat surfaces share one implementation;
`app/page.tsx` now generates/sends a `sessionId` the same way the embed
page does. **Rule going forward:** any new chat entry point must call
`getOrCreateChatSessionId()` from `lib/chat-session.ts` and include it as
`sessionId` in the `/api/chat` request body, or its conversations will
silently vanish from analytics with no error anywhere.

---

## How to use this file
- Add a new `## YYYY-MM-DD — short title` entry per bug fix / new rule.
- State the **problem** (what was actually wrong and its real-world
  effect), the **fix** (what changed, where), and a **"rule going
  forward"** line when the fix implies a constraint future code must keep
  respecting.
- Cross-link to `06-todo-and-open-items.md` for anything still unresolved,
  and to `05-chat-ai-logic.md` if the fix changes a documented workflow
  rule there — keep that file's description of current behavior in sync.
