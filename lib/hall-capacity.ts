/**
 * Indoor hall-capacity check for the chat intake (2026-10-23).
 *
 * Once the guest count is known for an indoor booking, it's compared against
 * the real max_pax of the branch's halls (eventmgmt.hall, already loaded into
 * CateringLiveData.halls). If even the largest available hall can't seat that
 * many guests, Arjun stops and asks the guest whether to proceed — naming the
 * hall and roughly how many guests it holds — instead of silently quoting a
 * hall that's too small.
 */
import type { LiveHall } from '@/lib/sangam-catering'

/** A hall's real seating limit: max_pax, falling back to capacity. */
export function hallCapacity(h: LiveHall): number | null {
  return h.maxPax ?? h.capacity ?? null
}

/**
 * The largest hall at this branch that isn't already booked on the event
 * date, or null when the branch has no hall with a known capacity on file
 * (in which case no capacity check can be made — never guess one).
 */
export function findLargestAvailableHall(
  halls: LiveHall[],
  branchId: string | null,
  bookedHallIds?: Set<string>
): { hall: LiveHall; capacity: number } | null {
  if (!branchId) return null
  let best: { hall: LiveHall; capacity: number } | null = null
  for (const h of halls) {
    if (h.branchId !== branchId) continue
    if (bookedHallIds?.has(h.id)) continue
    const cap = hallCapacity(h)
    if (cap == null || cap <= 0) continue
    if (!best || cap > best.capacity) best = { hall: h, capacity: cap }
  }
  return best
}

// Fixed, language-independent marker embedded in the capacity question (in
// every language), so a plain "yes" reply to it can be resolved back to the
// hall's capacity on any later turn — see latestStatedGuestCount.
const CAPACITY_MARKER = /\(max (\d+) pax\)/i
export const capacityMarker = (n: number) => `(max ${n} pax)`

// A reply made up only of yes-words (English, plus common Telugu/Hindi).
const AFFIRMATIVE_WORDS = /^(?:yes|yeah|yep|ok|okay|sure|fine|proceed|go|ahead|continue|please|pls|haan|ha|avunu|sare|सही|हाँ|हां|ఓకే|అవును|సరే)$/i
const isAffirmativeOnly = (text: string): boolean => {
  const words = text.trim().split(/[\s.!,]+/).filter(Boolean)
  return words.length > 0 && words.length <= 5 && words.every(w => AFFIRMATIVE_WORDS.test(w))
}

/** Phrase the "keep all my guests" chip sends; any later turn honours it. */
export const KEEP_ALL_GUESTS_PHRASE = 'please proceed and have the catering manager confirm the seating arrangement'

/**
 * The guest count the customer most recently stated, scanning newest-first,
 * so a correction ("make it 250 guests", "recalculate for 150 guests", or a
 * plain "yes" to the hall-capacity question) replaces the earlier number.
 * Previously the FIRST "N guests" in the whole conversation always won,
 * so a guest could never reduce their count to fit a hall.
 * Returns null when no explicit count is found (caller keeps its fallback).
 */
export function latestStatedGuestCount(msgs: { role: string; content: string }[]): number | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.role !== 'user') continue
    const explicit = m.content.match(/(\d+)\s*\+?\s*(?:adults|people|guests|persons|pax)\b/i)
    if (explicit) return parseInt(explicit[1], 10)
    // "make it 300", "change it to 250", "increase to 400" (2026-10-24) —
    // how guests actually revise a count. Skipped when the message is about
    // money (an advance amount) or a date, so "make it 5000 advance" or
    // "change it to 12 Dec" never become a guest count.
    if (!/advance|₹|\brs\b|rupees|amount|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(m.content)) {
      const revise = m.content.match(/\b(?:make it|change (?:it )?to|update (?:it )?to|revise (?:it )?to|increase (?:it )?to|reduce (?:it )?to|decrease (?:it )?to|go with|let'?s do)\s+(\d{2,4})\b/i)
      if (revise) return parseInt(revise[1], 10)
      // A bare number ("300") answering a guest-count question.
      const bare = m.content.trim().match(/^(\d{2,4})\+?$/)
      if (bare) {
        const prevQ = msgs.slice(0, i).reverse().find(x => x.role === 'assistant')
        if (prevQ && /guest|pax|అతిథ|मेहमान/i.test(prevQ.content)) return parseInt(bare[1], 10)
      }
    }
    if (isAffirmativeOnly(m.content)) {
      const prev = msgs.slice(0, i).reverse().find(x => x.role === 'assistant')
      const marker = prev?.content.match(CAPACITY_MARKER)
      if (marker) return parseInt(marker[1], 10)
    }
  }
  return null
}

/** True once the guest has chosen to keep a count above the largest hall's capacity. */
export function hasAcceptedOverCapacity(userText: string): boolean {
  return userText.toLowerCase().includes(KEEP_ALL_GUESTS_PHRASE)
}

type Lang = 'en' | 'te' | 'hi'

const CAPACITY_Q: Record<Lang, (p: { pax: number; hall: string; cap: number; branch: string }) => string> = {
  en: ({ pax, hall, cap, branch }) =>
    `Thank you! Just a heads-up on seating: for **${pax} guests**, our largest available hall at **${branch}** is **${hall}**, which comfortably holds around **${cap} guests** ${capacityMarker(cap)}.\n\n` +
    `Shall we proceed with **${hall}** for around **${cap} guests**? Or, if you need all ${pax} guests, I can continue and our catering manager will confirm the seating arrangement with you.`,
  te: ({ pax, hall, cap, branch }) =>
    `ధన్యవాదాలు! సీటింగ్ గురించి ఒక విషయం: **${pax} అతిథుల** కోసం, **${branch}**లో మా అతిపెద్ద అందుబాటులో ఉన్న హాల్ **${hall}**, ఇది సుమారు **${cap} మంది అతిథులకు** సరిపోతుంది ${capacityMarker(cap)}.\n\n` +
    `సుమారు **${cap} మంది అతిథుల**తో **${hall}**తో కొనసాగించమంటారా? లేదా మీకు మొత్తం ${pax} మంది అతిథులు అవసరమైతే, నేను కొనసాగిస్తాను మరియు మా కేటరింగ్ మేనేజర్ సీటింగ్ ఏర్పాటును మీతో నిర్ధారిస్తారు.`,
  hi: ({ pax, hall, cap, branch }) =>
    `धन्यवाद! बैठने की व्यवस्था के बारे में एक बात: **${pax} मेहमानों** के लिए, **${branch}** में हमारा सबसे बड़ा उपलब्ध हॉल **${hall}** है, जिसमें लगभग **${cap} मेहमान** आराम से बैठ सकते हैं ${capacityMarker(cap)}.\n\n` +
    `क्या हम लगभग **${cap} मेहमानों** के साथ **${hall}** में आगे बढ़ें? या अगर आपको सभी ${pax} मेहमान चाहिए, तो मैं आगे बढ़ता हूँ और हमारे केटरिंग मैनेजर बैठने की व्यवस्था आपके साथ कन्फर्म करेंगे।`,
}

/** The deterministic "your guest count exceeds our largest hall" question + its chips. */
export function buildCapacityQuestion(
  lang: Lang,
  p: { pax: number; hall: string; cap: number; branch: string }
): { reply: string; suggestions: Array<{ label: string; text: string }> } {
  return {
    reply: (CAPACITY_Q[lang] || CAPACITY_Q.en)(p),
    suggestions: [
      { label: `✅ Proceed with ${p.cap} guests`, text: `Yes, please proceed with ${p.hall} for ${p.cap} guests` },
      { label: `👥 Keep all ${p.pax} guests`, text: `I need all ${p.pax} guests — ${KEEP_ALL_GUESTS_PHRASE}` },
      { label: '🚚 Switch to Outdoor Catering', text: `I want Outdoor Catering for ${p.pax} guests at my own venue` },
      { label: '📞 Call Catering Manager', text: 'Please connect me with the catering manager' },
    ],
  }
}
