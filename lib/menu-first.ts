/**
 * Menu-first conversation order (2026-10-26).
 *
 * When a guest opens with "suggest me something" / "book me something" the
 * chat does not start collecting event details. It goes:
 *
 *   1. Indoor or Outdoor?      (if they haven't said)
 *   2. Branch
 *   3. Diet (Pure Veg / Veg & Non-Veg / Non-Veg)
 *   4. Show a menu             (indoor: the packages, then the picked one's
 *                               dishes; outdoor: the suggested spread)
 *   5. "Are you happy with this menu?"
 *   6. Only once they are happy: the usual details (date, slot/time, guest
 *      count, address, name, phone) and the full estimate.
 *
 * Nothing is stored for this: the state is read back from the conversation —
 * the review question carries a fixed marker, and a later affirmative guest
 * message counts as approval.
 */
type Msg = { role: string; content: string }

/** The guest is asking us to choose / recommend rather than naming what they want. */
export const MENU_FIRST_INTENT_RE = /\b(?:suggest|recommend|surprise me|book me|something (?:for|nice|good|special|tasty)|you (?:choose|decide|pick|suggest)|your (?:choice|pick))\b/i

/** Text of the review question, in every supported language — also how we find it in history. */
export const MENU_HAPPY_MARKER = /happy with this menu|ఈ మెనూతో సంతోషంగా|इस मेनू से खुश/i

const AFFIRM_ASCII_RE = /\b(?:yes|yeah|yep|yup|ok|okay|sure|fine|good|great|perfect|happy|love it|confirm(?:ed)?|proceed|go ahead|looks good|sounds good|done|finali[sz]e|continue|next)\b/i
const AFFIRM_OTHER_RE = /👍|✅|సరే|అవును|బాగుంది|हाँ|ठीक|बढ़िया|अच्छा/
const CHANGE_RE = /\b(?:swap|change|remove|replace|instead|different|another|add|more|less|no|not|don'?t|without|other|modify|edit)\b/i

/**
 * A real priced estimate is on screen (its headline, total or booking code).
 * Deliberately NOT the word "estimate": our own questions say "the package
 * you'd like an estimation for", and matching that switched menu-first off.
 */
export const ESTIMATE_SHOWN_RE = /hall estimation|live food setup estimation|custom outdoor catering quote|suggested spread — live|💰|🔖|booking summary|reference id/i

export const hasMenuFirstIntent = (msgs: Msg[]): boolean =>
  msgs.some(m => m.role === 'user' && MENU_FIRST_INTENT_RE.test(m.content))

/** True for "yes / ok / looks good / happy" — and not when they also ask for a change. */
export function isMenuApproval(text: string): boolean {
  if (CHANGE_RE.test(text)) return false
  return AFFIRM_ASCII_RE.test(text) || AFFIRM_OTHER_RE.test(text)
}

/** Whether a menu has been put in front of the guest yet, and whether they have said they're happy with it. */
export function menuReviewState(msgs: Msg[]): { shown: boolean; approved: boolean } {
  let lastShown = -1
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].role === 'assistant' && MENU_HAPPY_MARKER.test(msgs[i].content)) lastShown = i
  }
  if (lastShown < 0) return { shown: false, approved: false }
  const approved = msgs.slice(lastShown + 1).some(m => m.role === 'user' && isMenuApproval(m.content))
  return { shown: true, approved }
}

export type MenuFirstStep = 'service' | 'branch' | 'diet' | 'menu' | 'review' | 'done'

export function menuFirstStep(s: {
  serviceKnown: boolean
  hasBranch: boolean
  hasDiet: boolean
  review: { shown: boolean; approved: boolean }
}): MenuFirstStep {
  if (!s.serviceKnown) return 'service'
  if (!s.hasBranch) return 'branch'
  if (!s.hasDiet) return 'diet'
  if (!s.review.shown) return 'menu'
  return s.review.approved ? 'done' : 'review'
}
