import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createTranscript, detectScript, needsTranslation, cleanTranscript, sanitizeTranslation, SPEECH_LOCALE } from '@/lib/voice'

describe('Voice input (2026-10-26)', () => {
  test('speech locale follows the chat language', () => {
    assert.deepEqual(SPEECH_LOCALE, { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' })
  })

  test('script detection: Telugu, Hindi, English', () => {
    assert.equal(detectScript('నాకు 200 మందికి క్యాటరింగ్ కావాలి'), 'te')
    assert.equal(detectScript('मुझे 200 लोगों के लिए केटरिंग चाहिए'), 'hi')
    assert.equal(detectScript('book me indoor catering for 200'), 'en')
    assert.equal(detectScript('nenu 200 mandi ki catering kavali'), 'en') // Telugu in English letters needs no script handling
  })

  test('only Telugu / Hindi script is sent for translation', () => {
    assert.ok(needsTranslation('వచ్చే సోమవారం డిన్నర్'))
    assert.ok(needsTranslation('अगले सोमवार डिनर'))
    assert.ok(!needsTranslation('next Monday dinner'))
    assert.ok(!needsTranslation(''))
  })

  test('transcripts are tidied and capped', () => {
    assert.equal(cleanTranscript('  book   me \n catering  '), 'book me catering')
    assert.equal(cleanTranscript('x'.repeat(900)).length, 500)
  })

  test('a translation must be clean English or it is rejected', () => {
    const orig = 'వచ్చే సోమవారం డిన్నర్ 200 మంది'
    assert.equal(sanitizeTranslation('"Next Monday dinner for 200 people"', orig), 'Next Monday dinner for 200 people')
    assert.equal(sanitizeTranslation('Translation: Next Monday dinner, 200 guests', orig), 'Next Monday dinner, 200 guests')
    assert.equal(sanitizeTranslation('Next Monday dinner, నాన్ వెజ్', orig), null) // leftover Telugu
    assert.equal(sanitizeTranslation("I'm sorry, I cannot translate that", orig), null)
    assert.equal(sanitizeTranslation('', orig), null)
    assert.equal(sanitizeTranslation(null, orig), null)
    assert.equal(sanitizeTranslation('word '.repeat(200), orig), null) // runaway reply
  })

  test("transcript: keeps finished phrases across pauses and shows live words", () => {
    const tr = createTranscript()
    const seg = (isFinal: boolean, transcript: string) => ({ isFinal, 0: { transcript } })
    assert.equal(tr.push([seg(false, "book me")], 0), "book me")
    assert.equal(tr.push([seg(true, "book me indoor catering")], 0), "book me indoor catering")
    // after a pause the engine starts a new phrase at resultIndex 1
    assert.equal(tr.push([seg(true, "book me indoor catering"), seg(false, "for 200")], 1), "book me indoor catering for 200")
    assert.equal(tr.push([seg(true, "book me indoor catering"), seg(true, "for 200 people")], 1), "book me indoor catering for 200 people")
  })

  test("transcript: words the engine never finalised are kept when it stops", () => {
    const tr = createTranscript()
    tr.push([{ isFinal: true, 0: { transcript: "non veg" } }], 0)
    tr.push([{ isFinal: true, 0: { transcript: "non veg" } }, { isFinal: false, 0: { transcript: "next monday dinner" } }], 1)
    tr.endSegment() // engine stopped before finalising
    assert.equal(tr.text(), "non veg next monday dinner")
    // a restarted engine begins its own results list again at index 0 without losing anything
    assert.equal(tr.push([{ isFinal: false, 0: { transcript: "for 200 people" } }], 0), "non veg next monday dinner for 200 people")
    tr.reset()
    assert.equal(tr.text(), "")
  })
})
