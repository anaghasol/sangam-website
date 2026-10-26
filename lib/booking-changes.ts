/**
 * Booking state + change handling for the chat (2026-10-24).
 *
 * Guests don't stop at the first estimate: after seeing (or even confirming
 * and saving) a quote they say "make it 300 guests", "let's try the Grand
 * Non Veg menu instead", "remove fish fry and add gulab jamun", "change the
 * date to 12 Dec 2026". Every detail here is therefore resolved from the
 * MOST RECENT thing the guest said, and the before/after of each turn is
 * compared so Arjun can acknowledge the change like a person would
 * ("Sure — updated your guest count from 200 to 300") instead of silently
 * re-printing an estimate, or ignoring the change altogether.
 */
import { extractCustomDishes, extractDishesFromText, extractExplicitEventDate } from '@/lib/catering-portions'
import type { CateringLiveData, LiveMenu } from '@/lib/sangam-catering'
import { latestStatedGuestCount } from '@/lib/hall-capacity'

type Msg = { role: string; content: string }
type Lang = 'en' | 'te' | 'hi'

export const BRANCHES = ['Peerzadiguda', 'Hayathnagar', 'Malkapur', 'Mansoorabad', 'Koyyalagudem']

/** The branch the guest named most recently (last one named, if several in one message). */
export function latestMentionedBranch(msgs: Msg[]): string | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role !== 'user') continue
    const lower = msgs[i].content.toLowerCase()
    const hits = BRANCHES.filter(b => lower.includes(b.toLowerCase()))
    if (hits.length > 0) {
      return hits.reduce((a, b) => lower.lastIndexOf(b.toLowerCase()) > lower.lastIndexOf(a.toLowerCase()) ? b : a)
    }
  }
  return null
}

/** Index of the latest user message that states a dietary preference, and what it was. */
export function latestDietary(msgs: Msg[]): { diet: 'veg' | 'non-veg'; index: number } | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role !== 'user') continue
    const txt = msgs[i].content.toLowerCase()
    if (txt.includes('non-veg') || txt.includes('non veg') || txt.includes('nonveg')) return { diet: 'non-veg', index: i }
    if (txt.includes('pure veg') || txt.includes('vegetarian') || txt.includes('vegan') || txt.includes('veg only') || /\bveg\b/.test(txt)) return { diet: 'veg', index: i }
  }
  return null
}

/**
 * The latest user message that picks an indoor package — a real menu name
 * from eventmgmt.menu, a "₹700 per plate" style price, or a package phrase
 * ("Grand Veg Menu", "Platinum"). A dietary-preference answer ("We prefer
 * Veg and Non-Veg menu packages") is NOT a package pick. Returns the message
 * text (to price the quote from) and its index, or null if none yet.
 */
export function latestMenuSelection(msgs: Msg[], indoorMenus: LiveMenu[] = []): { text: string; index: number } | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role !== 'user') continue
    const text = msgs[i].content
    const lower = text.toLowerCase().replace(/-/g, ' ')
    if (/menu packages|other .{0,15}menus|menus? (?:available|options)/.test(lower)) continue
    const namesRealMenu = indoorMenus.some(m => m.name && lower.includes(m.name.toLowerCase().replace(/-/g, ' ')))
    const namesPrice = /(?:₹|rs\.?\s*)\s*(?:600|700|800|900|1,?000)\b|\b(?:600|700|800|900|1,?000)\s*(?:\/|per)\s*plate/.test(lower)
    const namesPackage = /\b(?:standard|grand|platinum)\b.{0,12}\bmenu\b|\bplatinum\b|\b(?:veg|non veg) menu\b/.test(lower)
    if (namesRealMenu || namesPrice || namesPackage) return { text, index: i }
  }
  return null
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, c => c.toUpperCase())
}

/** Dish names in one message — live catalog first (real names), then the static catalog. */
function dishesIn(text: string, live?: CateringLiveData): Map<string, string> {
  const found = new Map<string, string>()
  // Live-catalog names keep their real spelling; static-catalog names
  // (stored lowercase) are title-cased for display.
  for (const d of extractDishesFromText(text, live, 1)) found.set(d.name.toLowerCase(), d.dishId ? d.name : titleCase(d.name))
  for (const n of extractCustomDishes(text)) if (!found.has(n.toLowerCase())) found.set(n.toLowerCase(), titleCase(n))
  return found
}

const REPLACE_RE = /\b(?:replace|swap|substitute|change)\b\s+(.+?)\s+\b(?:with|for|to)\b\s+(.+)/i
const REMOVE_RE = /\b(?:remove|without|drop|exclude|delete|cancel|skip|take out|no need (?:of|for)?|don'?t (?:want|need))\b/i
const ADD_SPLIT_RE = /\b(?:and\s+)?(?:add|include|put|plus|instead)\b/i
const RESET_RE = /\b(?:only these|new menu|whole menu|entire menu|start over|change the menu to|menu is now)\b/i

/**
 * The outdoor dish list as it stands NOW — replaying every message in
 * order and applying "add / remove / replace X with Y / new menu" edits.
 * Previously every dish ever mentioned stayed on the list forever, so
 * "remove fish fry" could never take a dish off (and it was still priced
 * and saved).
 */
export function resolveOutdoorDishes(msgs: Msg[], live?: CateringLiveData): string[] {
  const list = new Map<string, string>()
  const addAll = (m: Map<string, string>) => m.forEach((v, k) => list.set(k, v))
  const removeAll = (m: Map<string, string>) => m.forEach((_, k) => list.delete(k))
  for (const msg of msgs) {
    if (msg.role !== 'user') continue
    const text = msg.content
    const replace = text.match(REPLACE_RE)
    if (replace) {
      const out = dishesIn(replace[1], live)
      const into = dishesIn(replace[2], live)
      if (out.size > 0 || into.size > 0) {
        removeAll(out)
        addAll(into)
        continue
      }
    }
    if (REMOVE_RE.test(text)) {
      const split = text.search(ADD_SPLIT_RE)
      removeAll(dishesIn(split > 0 ? text.slice(0, split) : text, live))
      if (split > 0) addAll(dishesIn(text.slice(split), live))
      continue
    }
    const found = dishesIn(text, live)
    if (found.size === 0) continue
    if (RESET_RE.test(text) && found.size >= 2) list.clear()
    addAll(found)
  }
  return [...list.values()]
}

/** Everything about the booking that a guest can change mid-conversation. */
export type BookingSnapshot = {
  pax: number | null
  date: string | null
  branch: string | null
  diet: 'veg' | 'non-veg' | null
  menuSelection: string | null
  dishes: string[]
}

export function snapshotBooking(msgs: Msg[], live?: CateringLiveData): BookingSnapshot {
  const users = msgs.filter(m => m.role === 'user')
  let date: string | null = null
  for (let i = users.length - 1; i >= 0 && !date; i--) date = extractExplicitEventDate(users[i].content)
  return {
    pax: latestStatedGuestCount(msgs),
    date,
    branch: latestMentionedBranch(msgs),
    diet: latestDietary(msgs)?.diet ?? null,
    menuSelection: latestMenuSelection(msgs, live?.indoorMenus)?.text ?? null,
    dishes: resolveOutdoorDishes(msgs, live),
  }
}

export type BookingChange =
  | { kind: 'pax'; from: number; to: number }
  | { kind: 'date'; from: string; to: string }
  | { kind: 'branch'; from: string; to: string }
  | { kind: 'diet'; from: string; to: string }
  | { kind: 'menu' }
  | { kind: 'dishes'; added: string[]; removed: string[] }

/**
 * What the guest changed in their latest message, compared to the booking
 * as it stood just before it. Only CHANGES are reported — a detail given
 * for the first time is an answer, not a change.
 */
export function diffBooking(prev: BookingSnapshot, cur: BookingSnapshot): BookingChange[] {
  const out: BookingChange[] = []
  if (prev.pax != null && cur.pax != null && prev.pax !== cur.pax) out.push({ kind: 'pax', from: prev.pax, to: cur.pax })
  if (prev.date && cur.date && prev.date !== cur.date) out.push({ kind: 'date', from: prev.date, to: cur.date })
  if (prev.branch && cur.branch && prev.branch !== cur.branch) out.push({ kind: 'branch', from: prev.branch, to: cur.branch })
  if (prev.diet && cur.diet && prev.diet !== cur.diet) out.push({ kind: 'diet', from: prev.diet, to: cur.diet })
  if (prev.menuSelection && cur.menuSelection && prev.menuSelection !== cur.menuSelection) out.push({ kind: 'menu' })
  if (prev.dishes.length > 0) {
    const before = new Set(prev.dishes.map(d => d.toLowerCase()))
    const after = new Set(cur.dishes.map(d => d.toLowerCase()))
    const added = cur.dishes.filter(d => !before.has(d.toLowerCase()))
    const removed = prev.dishes.filter(d => !after.has(d.toLowerCase()))
    if (added.length || removed.length) out.push({ kind: 'dishes', added, removed })
  }
  return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1] || m} ${y}`
}

const L: Record<Lang, {
  intro: string
  pax: (a: number, b: number) => string
  date: (a: string, b: string) => string
  branch: (a: string, b: string) => string
  diet: (b: string) => string
  menu: (name: string) => string
  added: (d: string) => string
  removed: (d: string) => string
  savedUpdated: (code: string) => string
  codeChanged: (oldCode: string, newCode: string) => string
  revised: string
}> = {
  en: {
    intro: 'Sure, no problem! I\'ve updated your booking',
    pax: (a, b) => `guest count **${a} → ${b}**`,
    date: (a, b) => `event date **${a} → ${b}**`,
    branch: (a, b) => `branch **${a} → ${b}**`,
    diet: b => `menu preference now **${b === 'veg' ? 'Pure Veg' : 'Veg & Non-Veg'}**`,
    menu: n => `package now **${n}**`,
    added: d => `added **${d}**`,
    removed: d => `removed **${d}**`,
    savedUpdated: code => `✅ Your saved booking **${code}** has been updated with these changes.`,
    codeChanged: (o, n) => `Since the date/branch changed, your booking code is now **${n}** (it replaces ${o}).`,
    revised: 'Here\'s your revised estimate 👇',
  },
  te: {
    intro: 'తప్పకుండా! మీ బుకింగ్‌ను అప్‌డేట్ చేశాను',
    pax: (a, b) => `అతిథుల సంఖ్య **${a} → ${b}**`,
    date: (a, b) => `ఈవెంట్ తేదీ **${a} → ${b}**`,
    branch: (a, b) => `బ్రాంచ్ **${a} → ${b}**`,
    diet: b => `మెనూ ప్రాధాన్యత ఇప్పుడు **${b === 'veg' ? 'ప్యూర్ వెజ్' : 'వెజ్ & నాన్-వెజ్'}**`,
    menu: n => `ప్యాకేజీ ఇప్పుడు **${n}**`,
    added: d => `**${d}** జోడించాను`,
    removed: d => `**${d}** తీసేశాను`,
    savedUpdated: code => `✅ మీ సేవ్ చేసిన బుకింగ్ **${code}** ఈ మార్పులతో అప్‌డేట్ అయింది.`,
    codeChanged: (o, n) => `తేదీ/బ్రాంచ్ మారినందున, మీ బుకింగ్ కోడ్ ఇప్పుడు **${n}** (${o} స్థానంలో).`,
    revised: 'మీ సవరించిన అంచనా ఇదిగో 👇',
  },
  hi: {
    intro: 'ज़रूर, कोई बात नहीं! मैंने आपकी बुकिंग अपडेट कर दी है',
    pax: (a, b) => `मेहमानों की संख्या **${a} → ${b}**`,
    date: (a, b) => `इवेंट की तारीख **${a} → ${b}**`,
    branch: (a, b) => `ब्रांच **${a} → ${b}**`,
    diet: b => `मेनू पसंद अब **${b === 'veg' ? 'प्योर वेज' : 'वेज और नॉन-वेज'}**`,
    menu: n => `पैकेज अब **${n}**`,
    added: d => `**${d}** जोड़ा`,
    removed: d => `**${d}** हटाया`,
    savedUpdated: code => `✅ आपकी सेव की गई बुकिंग **${code}** इन बदलावों के साथ अपडेट हो गई है।`,
    codeChanged: (o, n) => `तारीख/ब्रांच बदलने से आपका बुकिंग कोड अब **${n}** है (${o} की जगह)।`,
    revised: 'यह रहा आपका संशोधित अनुमान 👇',
  },
}

/**
 * A short, human acknowledgement of what changed — e.g. "Sure, no problem!
 * I've updated your booking: guest count 200 → 300; package now Grand Non
 * Veg Menu. Here's your revised estimate 👇" — plus a note when the saved
 * quote was updated or its booking code changed. Null when nothing changed.
 */
export function buildChangeAck(
  lang: Lang,
  changes: BookingChange[],
  ctx: { packageName?: string | null; savedCode?: string | null; previousCode?: string | null; showRevised?: boolean }
): string | null {
  if (changes.length === 0) return null
  const t = L[lang] || L.en
  const parts: string[] = []
  for (const c of changes) {
    if (c.kind === 'pax') parts.push(t.pax(c.from, c.to))
    else if (c.kind === 'date') parts.push(t.date(fmtDate(c.from), fmtDate(c.to)))
    else if (c.kind === 'branch') parts.push(t.branch(c.from, c.to))
    else if (c.kind === 'diet') parts.push(t.diet(c.to))
    else if (c.kind === 'menu' && ctx.packageName) parts.push(t.menu(ctx.packageName))
    else if (c.kind === 'dishes') {
      if (c.added.length) parts.push(t.added(c.added.join(', ')))
      if (c.removed.length) parts.push(t.removed(c.removed.join(', ')))
    }
  }
  if (parts.length === 0) return null
  const lines = [`${t.intro}: ${parts.join('; ')}.`]
  if (ctx.savedCode && ctx.previousCode && ctx.previousCode !== ctx.savedCode) lines.push(t.codeChanged(ctx.previousCode, ctx.savedCode))
  if (ctx.savedCode) lines.push(t.savedUpdated(ctx.savedCode))
  if (ctx.showRevised !== false) lines.push(t.revised)
  return lines.join('\n') + '\n\n'
}
