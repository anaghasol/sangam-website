# Status, TODOs & Open Items

> Keep this file current — update it whenever you finish something on this
> list or discover a new gap. This is the file to read to answer
> "what's left to do" without re-deriving it from a stale memory.

## Done / working (as of this writing)
- Next.js site with homepage, embeddable chat widget (`app/embed/`,
  `public/sangam-widget.js`).
- Chat endpoint (`/api/chat`) with live DB-backed pricing for both indoor
  banquet and outdoor catering flows.
- Supabase schema for halls/menus/bookings (`eventmgmt`), quotes, chat
  sessions, reviews, and a pgvector knowledge base.
- Customer lookup by phone for returning-customer loyalty discount.
- Past-booking intelligence (indoor + outdoor) as a dish-suggestion
  fallback tier — as of 2026-10-06 outdoor intelligence also surfaces real
  most-frequently-chosen dish names per occasion, not just spend.
- Petpooja POS sync scripts (backfill/export/ingest) feeding sales data.
- i18n for quick-reply suggestion chips (English/Telugu/Hindi).
- Admin endpoints: check-bookings, seed-knowledge.
- **Hall double-booking prevented** — availability is checked
  (`getHallsBookedOnDate`) before a hall is recommended AND again fresh
  before a quote is saved (fixed 2026-10-04).
- **Branch-scoped hall lists** — the general knowledge-context block and
  the route's own hall list both filter to the mentioned branch; no more
  org-wide hall leaking into a branch-specific conversation (fixed
  2026-10-04).
- **Real per-dish outdoor pricing** — custom and AI-suggested outdoor
  spreads now price from live `dish_pricing`, not a flat guessed rate; no
  fake "Popular Veg Spread ₹499" / "Hyderabadi Non-Veg ₹649" package names
  anywhere (fixed 2026-10-06).
- **Saved quotes carry real dish/menu data** — `extractDishesFromText`
  matches the live catalog so `dish_ids`/`items`/`menu_id` on a saved quote
  are no longer frequently empty (fixed 2026-09-30).
- **Homepage widget now logs chat sessions** — `lib/chat-session.ts` is
  shared by both chat surfaces; the homepage widget previously never sent
  a `sessionId` and its conversations silently never reached
  `sangam.chat_sessions` (fixed 2026-09-30).

> ⚠️ **The five items above are fixed in the working tree but not yet
> committed to git** (`git status` shows them as modified/untracked as of
> this writing). Commit them, then remove this note. See
> `09-bugfixes-and-rules-log.md` for the full writeup of each.

## Known "draft — confirm with ops" items
These are flagged **inside `sangam-catering-knowledge.md`** itself (not
code) as not-yet-confirmed with the Sangam ops team. Don't treat these
numbers as final:
- Live Dosa Counter, Live Chaat Counter, Live Tandoor & Kebab Counter
  pricing/minimums/service windows — all marked "(draft — confirm)".
- Combined live-counter minimum-charge stacking rule (adapted from a
  sibling project "Sitara") — explicitly flagged as needing Sangam's own
  ops sign-off.
- Hyderabadi Specials Menu tray prices (Bagara Baingan, Mirchi Ka Salan,
  Khatti Dal, Double Ka Meetha, Qubani Ka Meetha, Sheer Khurma, Haleem) —
  all draft tray prices, Haleem also seasonal-availability-gated.

**Action needed:** get real numbers from Sangam ops for all of the above,
update `sangam-catering-knowledge.md`, then run
`npm run seed:knowledge` to re-embed.

## Things worth double-checking / likely gaps (inferred from code, verify before relying on these)
- No visible automated test suite (`package.json` has no `test` script) —
  confirm whether there's a testing strategy, or whether this is
  intentionally manual-QA-only for now.
- Admin routes (`/api/admin/*`) — verify these are actually
  access-controlled before exposing the site publicly; nothing in the
  route list obviously shows auth middleware.
- `app/api/chat/route.ts` is ~2150 lines, almost entirely one file —
  consider whether the prompt-text portion should move to its own
  constant/file (e.g. alongside `sangam-catering-knowledge.md`'s pattern)
  to make it easier to diff/review prompt changes separately from code
  changes.
- Confirm `lib/free-ai.ts`'s provider chain is still valid (free-tier LLM
  APIs change terms/pricing/availability often) — this is the most
  "rot-prone" file in the repo.
- `.env.example` contains what look like **live, non-placeholder keys**
  (Supabase anon key, Groq key, Google Places key) — worth checking
  whether `.env.example` should instead hold placeholder values, since
  example files are often less tightly access-controlled / more likely to
  be shared than `.env.local`.

## How to use this file going forward
When you (human or AI) complete a task from this list, move it to "Done /
working" with a one-line note. When you discover new business rules that
are still unconfirmed, or new technical debt, add it here rather than
letting it live only in chat history or a PR description.
