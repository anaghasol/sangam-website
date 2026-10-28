/**
 * Voice input helpers for the chat (2026-10-26).
 *
 * A guest taps the mic and speaks in the chat's language (English, Telugu or
 * Hindi). The browser turns the speech into text; if it isn't English it is
 * translated to English before it is sent, because the booking logic reads
 * English keywords (veg / non-veg, branch names, "next Monday"...). The chat
 * bubble still shows what the guest actually said, and the reply comes back
 * in the language they chose — exactly as if they had typed the message.
 */
export type ChatLang = 'en' | 'te' | 'hi'

/** BCP-47 locale handed to the browser's speech recognizer. */
export const SPEECH_LOCALE: Record<ChatLang, string> = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' }

/** Which script a piece of text is mostly written in. */
export function detectScript(text: string): ChatLang {
  const telugu = (text.match(/[ఀ-౿]/g) || []).length
  const devanagari = (text.match(/[ऀ-ॿ]/g) || []).length
  if (telugu === 0 && devanagari === 0) return 'en'
  return telugu >= devanagari ? 'te' : 'hi'
}

/** True when the text has Telugu / Hindi letters, so the server logic can't read it as-is. */
export const needsTranslation = (text: string): boolean => detectScript(text) !== 'en'

/** Speech engines add stray spaces and trailing punctuation; the chat wants one tidy line. */
export const cleanTranscript = (text: string): string => text.replace(/\s+/g, ' ').trim().slice(0, 500)

type ResultLike = { isFinal: boolean; 0: { transcript: string } }
const joinText = (a: string, b: string) => cleanTranscript(`${a} ${b}`)

/**
 * Collects what the recognizer hears across pauses and restarts. Finished
 * phrases are kept; words still being recognised ("interim") are shown live and
 * — importantly — kept if the engine stops before finalising them, which used
 * to silently drop the last few words.
 */
export function createTranscript() {
  let committed = ''
  let interim = ''
  return {
    /** Feed a recognizer result event (`results`, `resultIndex`). Returns the text so far. */
    push(results: ArrayLike<ResultLike>, resultIndex = 0): string {
      interim = ''
      for (let i = resultIndex; i < results.length; i++) {
        const t = results[i][0].transcript
        if (results[i].isFinal) committed = joinText(committed, t)
        else interim += t
      }
      return joinText(committed, interim)
    },
    /** The engine stopped (or is about to restart): keep unfinished words rather than losing them. */
    endSegment() {
      committed = joinText(committed, interim)
      interim = ''
    },
    text: (): string => joinText(committed, interim),
    reset() {
      committed = ''
      interim = ''
    },
  }
}

/**
 * Spoken text → English (client side). Returns the original text unchanged if
 * it is already English or the translation can't be had — the chat then still
 * works, because the server understands and answers any language.
 */
export async function translateToEnglish(text: string, timeoutMs = 7000): Promise<string> {
  const spoken = cleanTranscript(text)
  if (!spoken || !needsTranslation(spoken)) return spoken
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: spoken, from: detectScript(spoken) }),
      signal: ctl.signal,
    })
    if (!res.ok) return spoken
    const data = await res.json()
    return typeof data.text === 'string' && data.text.trim() ? data.text.trim() : spoken
  } catch {
    return spoken
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Cleans a model's translation: it must be one short line of English. Anything
 * else (an apology, a explanation, a refusal, leftover Telugu/Hindi) means the
 * translation can't be trusted, so null is returned and the caller keeps the
 * original text.
 */
export function sanitizeTranslation(raw: string | null | undefined, original: string): string | null {
  if (!raw) return null
  let t = raw.trim()
    .replace(/^["'“”`]+|["'“”`]+$/g, '')
    .replace(/^(?:english\s*)?translation\s*[:\-–]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t || needsTranslation(t)) return null
  if (t.length > original.length * 4 + 120) return null
  if (/\b(?:i (?:cannot|can't|am unable)|as an ai|sorry)\b/i.test(t)) return null
  return t
}
