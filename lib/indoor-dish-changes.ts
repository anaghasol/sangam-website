/**
 * Dish changes on an indoor package (2026-10-26).
 *
 * After an indoor estimate the guest can:
 *   • swap a dish for another dish from the same section — handled by the
 *     section-catalog flow in app/api/chat/route.ts, not here;
 *   • REMOVE a dish from the package ("remove fish fry");
 *   • ADD a dish that isn't part of the package ("add bhindi fry").
 *
 * An added dish is priced like this, per plate:
 *   1. It is looked up in the dish database (eventmgmt.dish + dish_pricing).
 *      If found with a price, per plate = tray price ÷ guests the tray serves
 *      (breads: price × 2.5 pieces).
 *   2. If it isn't in the database (or has no price), the standard add-on
 *      rate applies: ₹60 for a veg dish, ₹80 for a non-veg dish, decided from
 *      the dish name. Final pricing is still confirmed by the catering manager.
 *
 * Removing a dish does not change the package rate.
 *
 * Everything is re-derived from the guest's messages in order, so a later
 * "add it back" / "remove it" always wins and nothing is stored.
 */
import type { CateringLiveData, LiveDish } from '@/lib/sangam-catering'
import { DEFAULT_PERSONS_PER_UNIT } from '@/lib/catering-portions'
import { findLiveDish, isNonVegDish } from '@/lib/outdoor-menu'

type Msg = { role: string; content: string }

/** Per-plate charge for an added dish that isn't in the dish database. */
export const STANDARD_ADDON_RATE = { veg: 60, nonVeg: 80 } as const

export type AddedDish = {
  name: string
  perPlate: number
  veg: boolean
  /** 'database' = priced from dish_pricing; 'standard-rate' = the flat veg/non-veg add-on rate. */
  source: 'database' | 'standard-rate'
}
export type IndoorDishChanges = { removed: string[]; added: AddedDish[] }
export const NO_DISH_CHANGES: IndoorDishChanges = { removed: [], added: [] }

const REMOVE_RE = /\b(?:remove|delete|drop|exclude|take out|skip|without|no need (?:of|for)|don'?t (?:want|need))\b/i
const ADD_RE = /\b(?:add|include|plus|extra|one more|also (?:want|need|add|include)|can (?:you|we) (?:also )?(?:add|include))\b/i
const CHANGE_VERB_RE = new RegExp(`${REMOVE_RE.source}|${ADD_RE.source}`, 'gi')
const REPLACE_RE = /\b(?:replace|swap|substitute|change)\b\s+(.+?)\s+\b(?:with|for)\b\s+(.+)/i
const NOT_A_DISH_RE = /\b(?:guests?|pax|people|persons|hall|date|menu|package|section|selection|branch|slot|lunch|dinner|catering|booking|quote|estimat\w*|confirm\w*|number|phone|whatsapp|time|price|rate|plate|dish(?:es)?|item|items|something|anything|more|else|other|another)\b/i

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const titleCase = (s: string) => s.replace(/\b[a-z]/g, c => c.toUpperCase())

function sameDish(a: string, b: string): boolean {
  const na = norm(a), nb = norm(b)
  if (!na || !nb) return false
  return na === nb || (na.length >= 4 && nb.includes(na)) || (nb.length >= 4 && na.includes(nb))
}

/** Dish names out of a phrase like "a bhindi fry, and some raita please". */
function itemsIn(phrase: string): string[] {
  return phrase
    .replace(/["“”]/g, '')
    .split(/,|\band\b|&|\+|\bor\b/i)
    .map(p => p
      .replace(/\b(?:please|pls|too|also|as well|to (?:the )?(?:menu|list|package|order|estimate|quote)|from (?:the )?(?:menu|list|package|order|estimate|quote)|in (?:the )?(?:menu|list|package)|for me)\b.*$/i, '')
      .replace(/^\s*(?:a|an|some|the|one|1|more|extra|another)\s+/i, '')
      .replace(/[.!?]+$/g, '')
      .trim())
    .filter(p => p.length >= 3 && p.length <= 40 && p.split(' ').length <= 5 && !/^\d+$/.test(p) && !NOT_A_DISH_RE.test(p))
}

/** Per-plate price of a database dish, or null when it has no usable price. */
export function perPlateFromDish(d: LiveDish): number | null {
  if (d.price == null || d.price <= 0) return null
  if (d.category === 'breads') return Math.max(1, Math.round(d.price * 2.5))
  const per = d.personsPerUnit ?? DEFAULT_PERSONS_PER_UNIT[d.category] ?? DEFAULT_PERSONS_PER_UNIT.others
  return Math.max(1, Math.round(d.price / per))
}

export function priceAddedDish(name: string, live?: CateringLiveData): AddedDish {
  const found = findLiveDish(name, live)
  const dt = (found?.dietaryType || '').toLowerCase()
  const veg = dt ? !dt.includes('non') : !isNonVegDish(name)
  const dbPrice = found ? perPlateFromDish(found) : null
  if (found && dbPrice != null) return { name: found.name, perPlate: dbPrice, veg, source: 'database' }
  return { name: titleCase(name), perPlate: veg ? STANDARD_ADDON_RATE.veg : STANDARD_ADDON_RATE.nonVeg, veg, source: 'standard-rate' }
}

/**
 * The guest's current set of removed / added dishes.
 * `menuDishNames` = every dish in the chosen package's sections (so "remove X"
 * only removes a real package dish, and "add X" is ignored when X is already
 * part of the package — a section swap covers that case).
 */
export function resolveIndoorDishChanges(msgs: Msg[], opts: { menuDishNames: string[]; live?: CateringLiveData }): IndoorDishChanges {
  const removed: string[] = []
  const added: AddedDish[] = []

  const remove = (item: string) => {
    const dish = opts.menuDishNames.find(d => sameDish(d, item))
    if (dish) { if (!removed.includes(dish)) removed.push(dish); return }
    const i = added.findIndex(a => sameDish(a.name, item))
    if (i >= 0) added.splice(i, 1)
  }
  const add = (item: string) => {
    const dish = opts.menuDishNames.find(d => sameDish(d, item))
    if (dish) { const i = removed.indexOf(dish); if (i >= 0) removed.splice(i, 1); return }
    if (added.some(a => sameDish(a.name, item))) return
    added.push(priceAddedDish(item, opts.live))
  }

  for (const msg of msgs) {
    if (msg.role !== 'user') continue
    const text = msg.content
    // Chip texts ("Swap in "X" for the Y section") are section swaps, not adds.
    if (/^\s*swap in\s*"/i.test(text)) continue

    const replace = text.match(REPLACE_RE)
    if (replace) {
      const out = itemsIn(replace[1]).filter(i => opts.menuDishNames.some(d => sameDish(d, i)) || added.some(a => sameDish(a.name, i)))
      const into = itemsIn(replace[2])
      // Only a replacement whose "from" is a real dish counts — otherwise this is some other sentence.
      if (out.length > 0) {
        out.forEach(remove)
        // A replacement dish that is part of the package is a section swap (handled elsewhere); anything else is added.
        into.filter(i => !opts.menuDishNames.some(d => sameDish(d, i))).forEach(add)
        continue
      }
    }

    // Each verb ("remove", "add", ...) takes the dish names up to the next verb,
    // so "add X and remove Y" and "remove Y and add X" read the same.
    const hits = [...text.matchAll(CHANGE_VERB_RE)]
    hits.forEach((h, i) => {
      const from = (h.index ?? 0) + h[0].length
      const to = i + 1 < hits.length ? hits[i + 1].index : text.length
      const items = itemsIn(text.slice(from, to))
      if (REMOVE_RE.test(h[0])) items.forEach(remove)
      else items.forEach(add)
    })
  }
  return { removed, added }
}

const ACK_L = {
  en: {
    removed: (n: string) => `✅ Removed **${n}** from your menu (the package rate stays the same).`,
    restored: (n: string) => `✅ **${n}** is back on your menu.`,
    addedDb: (n: string, p: number) => `✅ Added **${n}** — +₹${p}/plate.`,
    addedStd: (n: string, p: number, veg: boolean) => `✅ Added **${n}**. It isn't on our dish price list yet, so the standard ${veg ? 'veg' : 'non-veg'} add-on rate of +₹${p}/plate applies (veg ₹${STANDARD_ADDON_RATE.veg} / non-veg ₹${STANDARD_ADDON_RATE.nonVeg}); our catering manager will confirm the final price.`,
  },
  te: {
    removed: (n: string) => `✅ మీ మెనూ నుండి **${n}** తీసివేయబడింది (ప్యాకేజీ రేటు మారదు).`,
    restored: (n: string) => `✅ **${n}** మళ్లీ మీ మెనూలో చేరింది.`,
    addedDb: (n: string, p: number) => `✅ **${n}** జోడించబడింది — +₹${p}/ప్లేట్.`,
    addedStd: (n: string, p: number, veg: boolean) => `✅ **${n}** జోడించబడింది. ఇది మా డిష్ ధరల జాబితాలో ఇంకా లేదు, కాబట్టి ${veg ? 'వెజ్' : 'నాన్-వెజ్'} స్టాండర్డ్ యాడ్-ఆన్ రేటు +₹${p}/ప్లేట్ వర్తిస్తుంది (వెజ్ ₹${STANDARD_ADDON_RATE.veg} / నాన్-వెజ్ ₹${STANDARD_ADDON_RATE.nonVeg}); తుది ధరను మా కేటరింగ్ మేనేజర్ నిర్ధారిస్తారు.`,
  },
  hi: {
    removed: (n: string) => `✅ आपके मेनू से **${n}** हटा दिया गया (पैकेज रेट वही रहेगा)।`,
    restored: (n: string) => `✅ **${n}** फिर से आपके मेनू में है।`,
    addedDb: (n: string, p: number) => `✅ **${n}** जोड़ा गया — +₹${p}/प्लेट।`,
    addedStd: (n: string, p: number, veg: boolean) => `✅ **${n}** जोड़ा गया। यह अभी हमारी डिश प्राइस लिस्ट में नहीं है, इसलिए ${veg ? 'वेज' : 'नॉन-वेज'} स्टैंडर्ड ऐड-ऑन रेट +₹${p}/प्लेट लागू होगा (वेज ₹${STANDARD_ADDON_RATE.veg} / नॉन-वेज ₹${STANDARD_ADDON_RATE.nonVeg}); अंतिम कीमत हमारे केटरिंग मैनेजर कन्फर्म करेंगे।`,
  },
} as const

/** One line per change between `prev` and `now` (empty string when nothing changed). */
export function buildDishChangeAck(lang: 'en' | 'te' | 'hi', prev: IndoorDishChanges, now: IndoorDishChanges): string {
  const L = ACK_L[lang] ?? ACK_L.en
  const lines: string[] = []
  const newlyRemoved = now.removed.filter(n => !prev.removed.includes(n))
  const droppedExtras = prev.added.filter(a => !now.added.some(b => b.name === a.name)).map(a => a.name)
  if (newlyRemoved.length + droppedExtras.length > 0) lines.push(L.removed([...newlyRemoved, ...droppedExtras].join(', ')))
  for (const n of prev.removed.filter(n => !now.removed.includes(n))) lines.push(L.restored(n))
  for (const a of now.added.filter(a => !prev.added.some(b => b.name === a.name))) {
    lines.push(a.source === 'database' ? L.addedDb(a.name, a.perPlate) : L.addedStd(a.name, a.perPlate, a.veg))
  }
  return lines.length > 0 ? lines.join('\n') + '\n\n' : ''
}

/** Total extra per plate from added dishes. */
export const extraPerPlate = (c?: IndoorDishChanges): number => (c?.added ?? []).reduce((s, a) => s + a.perPlate, 0)
export const hasDishChanges = (c?: IndoorDishChanges): boolean => !!c && (c.removed.length > 0 || c.added.length > 0)
