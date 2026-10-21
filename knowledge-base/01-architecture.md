# Architecture & Folder Layout

## Stack
- **Framework:** Next.js 16.2.9 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Database/Backend:** Supabase (Postgres) — schema name `sangam` (see
  `.env` → `SUPABASE_SCHEMA`), plus a second logical schema `eventmgmt`
  referenced throughout the catering code for halls/menus/bookings/quotes.
- **AI:** No single committed LLM vendor — `lib/free-ai.ts` (`askFreeModels`)
  tries a chain of free/low-cost model providers (see that file) rather
  than calling one fixed API. Vector knowledge search also lives in
  Supabase (`lib/sangam-knowledge.ts`).
- **Chat widget delivery:** `app/embed/` (embeddable chat widget route) +
  `public/sangam-widget.js` (the embed script third parties/pages load).
- **Deploy target:** Vercel (standard Next.js deploy, per README).

## Top-level layout

```
app/
  page.tsx            — main site homepage
  layout.tsx          — root layout
  globals.css         — Tailwind globals
  embed/              — embeddable chat widget page (for iframe embedding)
  api/
    chat/route.ts            — the chat endpoint Arjun runs on (see 05-chat-ai-logic.md)
    admin/check-bookings/    — admin utility endpoint
    admin/seed-knowledge/    — triggers/seeds the knowledge vector store from HTTP
    instagram/route.ts       — Instagram feed/integration endpoint
    reviews/route.ts         — Google/other reviews endpoint
    sangam/save-quote/route.ts — persists a generated catering quote

lib/                  — all business logic (see 03-lib-modules.md)
public/               — static assets: branch photos, videos, widget script, logos
scripts/              — one-off/maintenance Node scripts (seeding, Petpooja sync, eval)
supabase/migrations/  — SQL migrations, timestamp-named (see 04-database.md)
sangam-catering-knowledge.md — business knowledge fed to the vector store (NOT engineering docs)
knowledge-base/       — THIS folder: engineering/project knowledge for humans + AI
```

## Data flow, at a glance

```
Customer message
   → app/api/chat/route.ts
        → lib/sangam-knowledge.ts        (vector search: general knowledge chunks)
        → lib/sangam-catering.ts         (live halls/menus/pricing from eventmgmt.*)
        → lib/sangam-booking-intelligence.ts (similar past bookings, indoor/outdoor)
        → lib/sangam-sales.ts            (sales/upsell context)
        → lib/customer-lookup.ts         (returning-customer lookup by phone)
        → lib/catering-portions.ts       (guest-count math, tray sizing, quote generation)
        → lib/free-ai.ts  (askFreeModels) (sends assembled SYSTEM_PROMPT + context to an LLM)
   ← AI reply (estimate, questions, confirmations)
   → app/api/sangam/save-quote/route.ts  (when a quote/lead is finalized)
```

`lib/chat-session.ts` and `lib/greeting.ts` / `lib/suggestion-i18n.ts` handle
session-id bookkeeping and UI copy (greetings, quick-reply chip labels) in
English/Telugu/Hindi.

## Key architectural decision: DB is the source of truth for pricing

The chat's system prompt (`app/api/chat/route.ts`, ~2150 lines) is written
to explicitly forbid the LLM from inventing hall names, prices, or dish
names — every number must be pulled from the live `eventmgmt` data block
assembled by `lib/sangam-catering.ts` and injected into the prompt per
request. This is the single most important invariant in the codebase; see
`05-chat-ai-logic.md` for details.
