# Database (Supabase / Postgres)

Two logical schemas are used:
- **`sangam`** — this app's own tables (default schema per `.env` →
  `SUPABASE_SCHEMA=sangam`).
- **`eventmgmt`** — a shared/multi-tenant catering-and-events schema (not
  owned solely by this project — `SANGAM_ORG_ID` in
  `lib/sangam-catering.ts` scopes queries to this org within it).

## Migrations (`supabase/migrations/`, chronological)

| File | Adds |
|---|---|
| `20260831000000_sangam_petpooja.sql` | `sangam_order_items`, `sangam_daily_item_sales` — POS sales data synced from Petpooja (see `scripts/petpooja-*`). |
| `20260904000000_sangam_reviews.sql` | `sangam_reviews` — stored reviews (feeds `/api/reviews`). |
| `20260905000000_eventmgmt_catering_booking.sql` | `eventmgmt.catering`, `eventmgmt.hall`, `eventmgmt.menu`, `eventmgmt.occasion`, `eventmgmt.booking` — **the core banquet/catering domain**: halls, menu packages, occasions, and bookings. This is the live pricing source `lib/sangam-catering.ts` reads from. |
| `20260907000000_sangam_knowledge_vector.sql` | `pgvector` extension + `sangam.knowledge_chunks`, `sangam.knowledge_base` — the vector store `lib/sangam-knowledge.ts` searches; populated from `sangam-catering-knowledge.md` via `scripts/seed-knowledge.mjs`. |
| `20260908000000_sangam_quotes.sql` | `sangam.quotes` — saved customer quotes/leads (written by `/api/sangam/save-quote`). |
| `20260925000000_sangam_quotes_full_json.sql` | Alters `sangam.quotes` to add a full-JSON column (stores the complete generated quote object, not just summary fields). |
| `20260927000000_sangam_chat_sessions.sql` | `sangam.chat_sessions` — backs `lib/chat-session.ts` session tracking. |
| `20260930000000_sangam_quotes_admin_notes.sql` | Alters `sangam.quotes` to add admin notes (ops team annotating a lead/quote). |

## Things to check before changing schema
- `eventmgmt.*` tables look shared beyond this one site/org — confirm
  before altering column types or dropping anything; prefer additive
  migrations (as the existing `ALTER TABLE ... quotes` migrations do).
- Petpooja sync (`scripts/petpooja-backfill.sh`, `scripts/petpooja-export.js`,
  `scripts/petpooja-ingest.mjs`) writes into `sangam_order_items` /
  `sangam_daily_item_sales` — if sales-context logic (`lib/sangam-sales.ts`)
  changes, check whether it depends on these tables' current shape.
