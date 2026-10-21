# Sangam Hotels Hyderabad — Website & AI Catering Chat — Knowledge Base

> This folder is the project's own knowledge base: short, structured `.md` files
> describing what this codebase is, how it's wired together, and what's
> done vs. pending — written so an AI assistant (or a new dev) can get
> oriented fast without re-reading every source file.
>
> This is NOT the same as `sangam-catering-knowledge.md` in the repo root —
> that file is catering/business knowledge (live-counter pricing, specials
> menus) that gets embedded into a vector DB for the chatbot to retrieve at
> runtime. This folder is engineering/project knowledge, for humans and
> coding assistants working ON the codebase.

## What this project is

A Next.js 16 (App Router) website for **Sangam Hotels Hyderabad** (by
Sameeksha Hospitality) with an embeddable AI chat widget, "Arjun", that
handles catering/banquet inquiries end-to-end: indoor AC banquet hall
bookings and outdoor/custom tray catering — gathering event details,
generating live-priced estimates from the hall/menu database, and saving
leads/quotes.

- **Brand:** Sangam Hotels Hyderabad — restaurants, banquets/catering,
  bakeries, tiffin outlets. Branches: Peerzadiguda (flagship, 24h),
  Hayathnagar (head office, 6am–11pm), Malkapur (highway, JIO BP Plaza).
  Bakeries at Hayathnagar & Mansoorabad. Tiffin outlets at Mansoorabad &
  Koyyalagudem.
- **Contact:** +91 90638 44021 | info@sangamhotelshyderabad.com
- **The chat persona:** "Arjun", the Hospitality & Catering Manager.

## Where to start reading

| If you need to understand... | Read |
|---|---|
| Folder/file layout, tech stack | `01-architecture.md` |
| HTTP API endpoints (`app/api/*`) | `02-api-routes.md` |
| The `lib/*.ts` business-logic modules | `03-lib-modules.md` |
| Supabase schema & migrations | `04-database.md` |
| How the chatbot's system prompt & reasoning actually work | `05-chat-ai-logic.md` |
| What's done, in progress, broken, or still "(draft — confirm)" | `06-todo-and-open-items.md` |
| Env vars, local dev, scripts, deploy | `07-environment-and-ops.md` |
| The business/catering policy knowledge fed to the chatbot's vector store | `08-business-knowledge-catering.md` |
| Dated log of non-obvious bug fixes & rules added to the chat logic | `09-bugfixes-and-rules-log.md` |

## Golden rules for anyone (human or AI) working on this codebase

1. **Never hardcode prices, hall names, or dish names into the chat system
   prompt or code.** All catering pricing/menu/hall data MUST come live
   from the `eventmgmt` Supabase schema via `lib/sangam-catering.ts`. See
   `05-chat-ai-logic.md`.
2. **Business/menu knowledge** (live-counter pricing, specials, policies
   not in a DB table) belongs in `/sangam-catering-knowledge.md` at the
   repo root, then pushed to the vector store with
   `npm run seed:knowledge` (`scripts/seed-knowledge.mjs`). Don't duplicate
   DB-backed numbers there.
3. **This `knowledge-base/` folder** is for engineering context about the
   repo itself — update it whenever architecture, routes, or lib modules
   change meaningfully, so the next session (human or AI) doesn't have to
   re-derive it from scratch.
4. Read `AGENTS.md` at repo root first — this Next.js version has breaking
   changes vs. training data; check `node_modules/next/dist/docs/` before
   writing Next.js-specific code.
5. **Before changing anything in the chat/catering/booking logic, read
   `09-bugfixes-and-rules-log.md`.** Several non-obvious bugs (hall
   double-booking, flat-guessed outdoor pricing, silently-lost saved
   quotes, a chat surface that never logged sessions) have already been
   found and fixed here — the log explains the "why", so a future change
   doesn't quietly reintroduce one of them.
