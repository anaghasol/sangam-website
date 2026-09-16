# Sangam Hotels Hyderabad — Catering Knowledge Base

> Single source of truth for anything the chat needs to know that ISN'T already
> in a database table (hall/menu/dish pricing already comes live from
> `eventmgmt` — don't duplicate numbers here that the DB already has).
> Add or edit a section below and re-run `node scripts/seed-knowledge.mjs`
> to push it into the AI's knowledge base. Each `##` section becomes one
> chunk — keep sections focused so retrieval stays precise.
>
> Ravi: the numbers below are PLACEHOLDERS (marked `TODO`) — I don't have
> your real policy figures, only what's already in the code/DB. Replace
> every `TODO` with the real number/policy before seeding this for real.

---

## Booking & Advance Payment Policy

- Advance payment required to confirm a booking: TODO (e.g. "25% of estimated total")
- Balance payment due: TODO (e.g. "on the day of the event, before service begins")
- Accepted payment methods: TODO (cash, UPI, card, bank transfer — confirm which)
- Cancellation policy: TODO (refund %, notice period required)
- Date-change / rescheduling policy: TODO

## Outdoor Catering — Delivery & Distance Rules

- Service area: TODO (e.g. "within Hyderabad city + 25km of the dispatching branch")
- Beyond the standard radius: TODO (extra transport charge? decline? confirm by phone?)
- Minimum order value or guest count for outdoor delivery: TODO
- Setup lead time required before the event: TODO

## Live Counters & Add-Ons

- What live counters are offered (dosa, chaat, kebab, etc. — if any): TODO
- Pricing basis for live counters (per person? flat fee? minimum charge?): TODO
- Decoration / stage setup add-ons and pricing: TODO
- Valet parking availability and cost (if not already covered by hall data): TODO
- Manpower/serving-staff pricing when not already covered by a package: TODO

## Complimentary Inclusions

- What's included at no extra charge with every indoor booking: TODO
- What's included at no extra charge with every outdoor order: TODO

## Loyalty & Discount Policy

- Standard returning-customer discount: 5% (already applied automatically by the chat — do not restate a different number here)
- Any discount beyond 5% is decided by the catering manager, never by the AI — see the seasonal demand guidance already built into the chat for how it talks about this.
- Any other loyalty perks (priority slot booking, complimentary tasting, etc.): TODO

## Seasonal & Occasion Guidance

- Wedding season months and what tends to be requested then: TODO
- Pooja/religious event conventions (all-veg by default? specific dishes?): TODO
- Corporate event conventions (quick service, specific menu style?): TODO
- Any months/dates that are fully booked out or unavailable: TODO

## Frequently Asked Questions

- Q: TODO (e.g. "Can we bring our own DJ/decorator?") — A: TODO
- Q: TODO (e.g. "Is parking available at Peerzadiguda?") — A: TODO
- Q: TODO — A: TODO

---

*Last updated: TODO — add new policies/FAQs here and re-run the seed script to push them into the AI's knowledge base.*
