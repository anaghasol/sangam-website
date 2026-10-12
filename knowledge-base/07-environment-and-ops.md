# Environment, Scripts & Ops

## Local dev
```bash
npm run dev      # next dev — http://localhost:3000
npm run build    # next build
npm run start    # next start (production server)
npm run lint     # eslint
npm run seed:knowledge   # node scripts/seed-knowledge.mjs — pushes sangam-catering-knowledge.md into the pgvector store
```

## Environment variables (`.env.example` / `.env.local`)
| Var | Purpose |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Powers `/api/reviews` (and possibly location/branch lookups). |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase client access. |
| `NEXT_PUBLIC_SUPABASE_SCHEMA` / `SUPABASE_SCHEMA` | Both set to `sangam` — the app's default schema. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side elevated Supabase access (used in `lib/*` server functions, admin routes). |
| `VITE_SUPABASE_*` | Appears duplicated from the Next.js vars — likely leftover from a Vite-based tool/script (check `scripts/` for anything non-Next.js that needs these) rather than used by the Next app itself. |
| `GROQ_API_KEY` | One of the providers `lib/free-ai.ts` tries. |
| `OMNIROUTE_API_KEY` / `OMNIROUTE_BASE_URL` | Another AI routing provider/proxy — `OMNIROUTE_BASE_URL` defaults to `localhost:20128`, suggesting a local dev-only service; confirm what's needed in production. |

**Note:** treat real keys in `.env.local` as secrets as usual; see
`06-todo-and-open-items.md` for a flag about `.env.example` possibly
containing non-placeholder values.

## Scripts (`scripts/`)
| Script | Purpose |
|---|---|
| `seed-knowledge.mjs` | Embeds `sangam-catering-knowledge.md` sections into `sangam.knowledge_chunks` / `sangam.knowledge_base`. Run after editing that file. |
| `petpooja-backfill.sh` | Shell script to backfill historical POS data from Petpooja. |
| `petpooja-export.js` | Exports data in a Petpooja-compatible format (or from Petpooja — check direction before running). |
| `petpooja-ingest.mjs` | Ingests Petpooja data into `sangam_order_items` / `sangam_daily_item_sales`. |
| `chrome-eval.js` | Likely a browser-based eval/test script for the chat widget (verify usage before running against production). |

## Deployment
Standard Next.js app — README points at Vercel. No custom deploy config
beyond `next.config.ts` observed; confirm env vars above are set in the
Vercel project before deploying.

## Supabase migrations
Apply files in `supabase/migrations/` in filename (timestamp) order via
the Supabase CLI or dashboard SQL editor — see `04-database.md` for what
each one adds.
