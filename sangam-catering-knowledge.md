# Sangam Hotels Hyderabad — Catering Knowledge Base

> Single source of truth for anything the chat needs to know that ISN'T already
> in a database table (hall/menu/dish pricing already comes live from
> `eventmgmt` — don't duplicate numbers here that the DB already has).
> Add or edit a section below and re-run `node scripts/seed-knowledge.mjs`
> to push it into the AI's knowledge base. Each `##` section becomes one
> chunk — keep sections focused so retrieval stays precise.


---

## Live Counters & Add-Ons

Live counters need on-site staff and a dedicated setup — same idea as Sitara's
live dosa/chaat/kebab stations, adapted to what a Hyderabadi banquet crowd
actually asks for.

### Live Dosa Counter
- **What's included:** 4–5 varieties — Plain Dosa, Masala Dosa, Onion Dosa, Rava Dosa, Podi Dosa (or similar)
- **Pricing (draft — confirm):** ₹120/person
- **Minimum charge (draft — confirm):** ₹8,000 (regardless of guest count)
- **Service window (draft — confirm):** 2-hour live counter
- **Distance policy (draft — confirm):** Included free within Hyderabad city limits from the dispatching branch (Peerzadiguda, Hayathnagar, or Malkapur); beyond that, ask the customer to call the catering manager at +91 90638 44021 to confirm feasibility and any extra transport charge.
- **Mention as:** "Our live dosa counter is a favorite at events — ₹120/person for a 2-hour counter with 4–5 dosa varieties, minimum ₹8,000."

### Live Chaat Counter
- **What's included:** Pani Puri, Papdi Chaat, Dahi Puri, Sev Puri, Samosa Chaat (or similar)
- **Pricing (draft — confirm):** ₹120/person
- **Minimum charge (draft — confirm):** ₹8,000 (same policy as the dosa counter)
- **Distance policy (draft — confirm):** Same as Live Dosa Counter above.
- **Mention as:** "Our live chaat counter is perfect for the cocktail/welcome hour — ₹120/person, includes pani puri, papdi chaat, dahi puri and more."

### Live Tandoor & Kebab Counter
- **What's included:** Chicken Seekh Kebab, Chicken Tikka, Tandoori Chicken, Paneer Tikka (veg option) — already referenced as "Live Tandoor & Roti preparation counter" in outdoor quotes; this section gives it a standalone price when booked as its own add-on rather than bundled into a package.
- **Pricing (draft — confirm):** ₹150/person
- **Minimum charge (draft — confirm):** ₹10,000 (non-veg counters run a higher minimum than veg-only counters)
- **Distance policy (draft — confirm):** Same as Live Dosa Counter above.
- **Mention as:** "Our live tandoor & kebab counter is a hit with non-veg guests — ₹150/person, minimum ₹10,000."

### Live Counter Rules (CRITICAL):
1. If `guest_count × per-person rate` is less than the minimum charge, charge the minimum instead.
2. Customer can book multiple live counters together (e.g. dosa + chaat = ₹240/person combined, minimums added: ₹16,000 combined) — **(draft — confirm this is really how combined minimums should work; Sitara does it this way but Sangam's ops team should sign off)**.
3. For events outside Hyderabad city limits, don't quote a live-counter price outright — say it needs the catering manager's confirmation (+91 90638 44021) for feasibility and transport.

---

## Hyderabadi Specials Menu

Traditional Hyderabadi/Telangana dishes Sangam can add to a spread beyond the
standard package menus (parallel to Sitara's Telugu Specials section).

### Hyderabadi Staples (we serve these) — **all tray prices below are draft, confirm real figures:**
- **Bagara Baingan** (Hyderabadi-style stuffed baby eggplant in peanut-sesame gravy) — ₹1,800/half tray, ₹3,200/full tray
- **Mirchi Ka Salan** (Chili & peanut curry, classic biryani accompaniment) — ₹1,600/half tray, ₹2,800/full tray
- **Khatti Dal** (Tangy Hyderabadi lentil curry) — ₹1,400/half tray, ₹2,400/full tray
- **Double Ka Meetha** (Bread & milk dessert) — ₹1,800/half tray, ₹3,200/full tray
- **Qubani Ka Meetha** (Apricot dessert) — ₹2,600/half tray, ₹3,600/full tray
- **Sheer Khurma** (Vermicelli, milk & dry-fruit dessert — festive favorite) — ₹1,800/half tray, ₹3,200/full tray
- **Haleem** (Slow-cooked wheat & meat stew — seasonal, typically Ramzan) — ₹2,500/half tray, ₹4,500/full tray, availability seasonal only, confirm before offering

### Hyderabadi Menu Guidance:
- When a customer asks for "Hyderabadi style" or "authentic Telangana menu" → suggest a combination of:
  - Hyderabadi Chicken/Veg Dum Biryani (already on the live menu list)
  - Mirchi Ka Salan + Raita as the biryani accompaniment
  - Bagara Baingan as the vegetarian main
  - Double Ka Meetha or Qubani Ka Meetha as dessert
- A traditional Hyderabadi spread is typically served as: Biryani + Salan + Raita + a curry + a dessert, rather than a North-Indian-style multi-curry buffet.
- Haleem is only offered seasonally — check availability with the catering manager before quoting it, don't offer it year-round by default.

---

## À La Carte Add-On Tray Pricing (Reference)

For a dish requested beyond a package's selection limit that has no per-dish
add-on price already recorded in the menu builder (see the chat's own
overage-charge rule), use this as the fallback reference so the AI never has
to just say "confirm with the manager" for every single extra dish.
**Every figure below is a draft placeholder — confirm real numbers:**

| Category | Half Tray (~25 pax) | Full Tray (~50 pax) |
|----------|---------------------|----------------------|
| Vegetarian curry/starter | ₹1,500 | ₹2,800 |
| Chicken curry/starter | ₹2,000 | ₹3,800 |
| Mutton/Prawn curry | ₹2,800 | ₹5,200 |
| Extra Naan/Roti | ₹15/piece | — |
| Extra Dessert | ₹40/piece | ₹2,800 (full tray) |

---

## Booking & Advance Payment Policy

**Every figure in this section is a draft placeholder based on common
Hyderabad banquet-hall practice — confirm the real numbers before seeding:**

- Advance payment required to confirm a booking: 25% of the estimated total (draft — confirm)
- Balance payment due: on the day of the event, before service begins (draft — confirm)
- Accepted payment methods: Cash, UPI, Bank Transfer, Card (draft — confirm which; card may carry a processing charge, similar to Sitara's 2.9%)
- Cancellation policy: draft — confirm refund percentage and notice period (e.g. "50% refund if cancelled 15+ days before the event, no refund within 7 days")
- Date-change / rescheduling policy: draft — confirm (e.g. "one free reschedule if requested 10+ days in advance")

---

## Outdoor Catering — Delivery & Distance Rules

**Draft placeholders — confirm the real service radius and charges:**

- Service area: Hyderabad city + roughly 25 km of the dispatching branch (draft — confirm)
- Beyond the standard radius: additional transport charge, or the catering manager confirms feasibility by phone (draft — confirm which)
- Minimum order value or guest count for outdoor delivery: 30 guests (draft — confirm)
- Setup lead time required before the event: at least 2 hours before serving time (draft — confirm)

---

## Complimentary Inclusions

- **Indoor bookings:** Salan & Raitha with biryani, drinking water, and standard buffet service staff are included at no extra charge with every package (draft — confirm exact inclusions per package tier)
- **Outdoor bookings:** Buffet chafing dishes, warmers, live counter setup (where applicable), dedicated serving staff, and premium disposable cutlery are included — already stated in the chat's outdoor estimation reply; this line just documents it for the knowledge base too.

---

## Loyalty & Discount Policy

- Standard returning-customer discount: 5% (already applied automatically by the chat — do not restate a different number here)
- Any discount beyond 5% is decided by the catering manager, never by the AI — see the seasonal demand guidance already built into the chat for how it talks about this.
- Any other loyalty perks (priority slot booking, complimentary tasting, etc.): TODO — none confirmed yet, leave blank until Ravi confirms

---

## Seasonal & Occasion Guidance

- **Wedding season (Oct–Feb):** Hyderabadi Chicken/Veg Dum Biryani, Bagara Baingan, Paneer Butter Masala, and Double Ka Meetha are the most-requested combination (draft — confirm against real booking history once the booking-intelligence feature has enough data)
- **Festive season (Aug–mid Sep, Diwali/Dussehra period):** demand rises — the chat already gives a lighter discount stance during high-demand months; no specific dish guidance confirmed yet (TODO)
- **Pooja/religious events:** typically all-vegetarian; suggest Veg Dum Biryani, Bagara Baingan, Paneer dishes, and Hyderabadi vegetarian specials (draft — confirm this is Sangam's actual convention)
- **Corporate lunches:** quick, crowd-pleasing menus — Chicken Dum Biryani + Paneer Butter Masala + Garlic Naan (draft — confirm)
- **Birthday parties:** Chicken 65, Hyderabadi Dum Biryani, Gulab Jamun tend to be crowd favorites (draft — confirm)
- Any months/dates that are fully booked out or unavailable: TODO — none confirmed yet

---

## Frequently Asked Questions

**Draft Q&As based on common banquet-hall questions — confirm the real
answers, especially for Peerzadiguda/Hayathnagar-specific facilities:**

- Q: Can we bring our own DJ/decorator? — A: TODO (confirm Sangam's policy — many halls allow outside decorators but require outside DJ/sound vendors to coordinate with in-house staff)
- Q: Is parking available at Peerzadiguda / Hayathnagar? — A: TODO (confirm capacity and whether valet is offered)
- Q: Can we bring outside food/cake for a small celebration alongside the catered menu? — A: TODO (confirm policy, especially for desserts/cakes)
- Q: Is alcohol permitted, and is there a corkage charge? — A: TODO (relevant given the "Liquor Menu" package already in the live pricing data — confirm the actual corkage/BYO policy)
- Q: How far in advance should we book to guarantee our preferred date? — A: TODO (confirm typical lead time, especially for wedding season)

---

*Last updated: 2026-09-21 — draft rebuilt from Sitara's catering-knowledge.md, converted to INR and adapted to Sangam's Hyderabadi context. Every figure marked "draft — confirm" is a placeholder estimate, not a real Sangam policy — review before running `node scripts/seed-knowledge.mjs`.*
