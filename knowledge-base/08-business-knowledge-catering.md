# Business/Catering Knowledge — Summary of `sangam-catering-knowledge.md`

> This is a short map of what's inside `/sangam-catering-knowledge.md`
> (repo root) — the actual business-policy content fed to the AI's vector
> store via `npm run seed:knowledge`. Read the real file before editing
> anything; this page just helps you find the right section fast and
> tracks which numbers are still unconfirmed placeholders.
>
> **Last synced with the source file:** 2026-09-21 (per that file's own
> footer). If you edit `sangam-catering-knowledge.md`, update this summary
> too so it doesn't go stale.

## What's in there, section by section

1. **Live Counters & Add-Ons** — Live Dosa Counter, Live Chaat Counter,
   Live Tandoor & Kebab Counter: what's included, per-person pricing,
   minimum charge, service window, distance policy, and the combined-
   minimum-charge stacking rule when a customer books more than one.
2. **Hyderabadi Specials Menu** — traditional add-on dishes beyond the
   standard packages (Bagara Baingan, Mirchi Ka Salan, Khatti Dal, Double
   Ka Meetha, Qubani Ka Meetha, Sheer Khurma, Haleem — Haleem is seasonal
   only), plus guidance on what a "Hyderabadi style" request should
   actually include.
3. **À La Carte Add-On Tray Pricing** — fallback reference pricing (by
   category: veg curry/starter, chicken, mutton/prawn, extra naan/roti,
   extra dessert) for a dish requested beyond a package's selection limit
   that has no add-on price already recorded in the menu builder.
4. **Booking & Advance Payment Policy** — advance %, balance timing,
   accepted payment methods, cancellation policy, reschedule policy.
5. **Outdoor Catering — Delivery & Distance Rules** — service radius,
   beyond-radius transport charge/feasibility rule, minimum guest count for
   delivery, setup lead time.
6. **Complimentary Inclusions** — what's bundled free with indoor vs.
   outdoor bookings.
7. **Loyalty & Discount Policy** — the 5% returning-customer discount (this
   one IS live/real — see `lib/customer-lookup.ts` + the chat prompt, not
   a draft), and that anything beyond 5% is the catering manager's call,
   never the AI's.
8. **Seasonal & Occasion Guidance** — suggested dish combinations by season
   (wedding season Oct–Feb, festive Aug–mid Sep) and by occasion type
   (pooja/religious, corporate lunch, birthday party).
9. **Frequently Asked Questions** — draft Q&As (DJ/decorator policy,
   parking, outside food/cake, alcohol/corkage, booking lead time) — all
   still TODO, unconfirmed with ops.

## ⚠️ Everything marked "(draft — confirm)" is NOT real Sangam policy yet

The whole file was bootstrapped by adapting a sibling project's
("Sitara's") catering-knowledge.md to Sangam's Hyderabadi context and
INR pricing — it is explicitly a **placeholder scaffold**, not confirmed
numbers. Per the file's own footer: review every "draft — confirm" line
with the Sangam ops team before trusting it in a live quote. The one
exception already treated as real: the 5% loyalty discount (section 7),
which is already wired into the chat logic.

**Do not let the AI (or a human skimming only the chat's replies) treat a
draft number as final** — if you see the chat state one of these prices
confidently, that's a prompt-engineering gap, not confirmed pricing; see
`06-todo-and-open-items.md` for the running list of what still needs ops
sign-off.

## How this knowledge actually reaches the chatbot

```
sangam-catering-knowledge.md  (## sections = chunks)
        │  npm run seed:knowledge  (scripts/seed-knowledge.mjs)
        ▼
sangam.knowledge_chunks / sangam.knowledge_base   (pgvector, Supabase)
        │  searchSangamKnowledgeChunks()  (lib/sangam-knowledge.ts)
        ▼
getSangamUnifiedKnowledgeContext()  →  injected into the chat system prompt
        ▼
app/api/chat/route.ts  (Arjun)
```

**Important:** this file is for things that *aren't* already in a database
table — hall/menu/dish pricing lives in `eventmgmt.*` and comes through
`lib/sangam-catering.ts` instead (see `04-database.md`, `05-chat-ai-logic.md`).
Never duplicate DB-backed numbers here; it's for policy/business rules the
DB doesn't model (live counters, specials, payment/cancellation policy,
seasonal guidance, FAQs).

**Each `##` heading = one retrieval chunk** — keep new sections focused so
retrieval stays precise (a chunk mixing five unrelated policies will match
poorly against any single specific question).

## Action item
Get real numbers from Sangam ops for every "(draft — confirm)" line above,
update `sangam-catering-knowledge.md` directly, bump its footer date, then
run `npm run seed:knowledge` to re-embed. Until that happens, treat any
chat reply that surfaces one of these numbers as provisional.
