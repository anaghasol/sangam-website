# API Routes (`app/api/*`)

| Route | File | Purpose |
|---|---|---|
| `POST /api/chat` | `app/api/chat/route.ts` | Main chat endpoint. Assembles the system prompt + live DB context (halls, menus, pricing, booking intelligence, customer lookup, knowledge chunks), calls `askFreeModels`, returns Arjun's reply. ~2150 lines — most of the business logic for conversation flow lives inline here as prompt text (see `05-chat-ai-logic.md`). |
| `/api/admin/check-bookings` | `app/api/admin/check-bookings/route.ts` | Admin utility — checks existing bookings (used for hall-availability sanity checks / ops). |
| `/api/admin/seed-knowledge` | `app/api/admin/seed-knowledge/route.ts` | HTTP trigger to (re)seed the knowledge vector store — the HTTP twin of `node scripts/seed-knowledge.mjs`. |
| `/api/instagram` | `app/api/instagram/route.ts` | Fetches/serves Instagram content for the site (e.g. a feed widget). |
| `/api/reviews` | `app/api/reviews/route.ts` | Fetches/serves reviews (likely Google Places, given `GOOGLE_PLACES_API_KEY` in `.env.example`). |
| `POST /api/sangam/save-quote` | `app/api/sangam/save-quote/route.ts` | Persists a generated catering quote/lead to Supabase (`eventmgmt`/`sangam` quotes tables — see `04-database.md`). |

## Open questions / things to verify when editing these
- Confirm which routes are called by the public site vs. the embed widget
  (`app/embed/`) vs. admin-only tooling — route-level auth/guarding isn't
  obviously centralized; check each route file for how (or whether) admin
  routes are protected before exposing them further.
- `save-quote` and `check-bookings` both touch booking/quote state — if you
  change one, check the other for consistency (race conditions on hall
  availability between quote save and admin check).
