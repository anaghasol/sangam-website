import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { getDynamicArjunGreeting } from '@/lib/greeting'
import { translateSuggestionLabel } from '@/lib/suggestion-i18n'

describe('Multilingual Greeting & i18n Intelligence', () => {
  test('getDynamicArjunGreeting: English greeting enforces Arjun persona and brand', () => {
    const greeting = getDynamicArjunGreeting('en')
    assert.ok(greeting.includes('Arjun'), 'Greeting must identify as Arjun')
    assert.ok(greeting.includes('Sangam Hotels Hyderabad'), 'Greeting must include brand name')
    assert.ok(greeting.includes('Indoor AC Banquet Hall') || greeting.includes('AC Banquet'), 'Must mention banquet options')
  })

  test('getDynamicArjunGreeting: Telugu greeting provides native Telugu script and Arjun persona', () => {
    const greeting = getDynamicArjunGreeting('te')
    assert.ok(greeting.includes('నమస్తే') || greeting.includes('శుభోదయం'), 'Must contain Telugu salutation')
    assert.ok(greeting.includes('అర్జున్'), 'Must identify as Arjun in Telugu')
    assert.ok(greeting.includes('సంగం హోటల్స్ హైదరాబాద్'), 'Must mention Sangam Hotels in Telugu')
  })

  test('getDynamicArjunGreeting: Hindi greeting provides native Devanagari script and Arjun persona', () => {
    const greeting = getDynamicArjunGreeting('hi')
    assert.ok(greeting.includes('नमस्ते') || greeting.includes('सुप्रभात'), 'Must contain Hindi salutation')
    assert.ok(greeting.includes('अर्जुन'), 'Must identify as Arjun in Hindi')
    assert.ok(greeting.includes('संगम होटल्स हैदराबाद'), 'Must mention Sangam Hotels in Hindi')
  })

  test('translateSuggestionLabel: correctly translates quick reply chips for Telugu and Hindi', () => {
    // Indoor Catering chip
    assert.equal(translateSuggestionLabel('🏛️ Indoor Catering', 'te'), '🏛️ ఇండోర్ కేటరింగ్')
    assert.equal(translateSuggestionLabel('🏛️ Indoor Catering', 'hi'), '🏛️ इंडोर केटरिंग')

    // Outdoor Catering chip
    assert.equal(translateSuggestionLabel('🚚 Outdoor Catering', 'te'), '🚚 అవుట్‌డోర్ కేటరింగ్')
    assert.equal(translateSuggestionLabel('🚚 Outdoor Catering', 'hi'), '🚚 आउटडोर केटरिंग')

    // English leaves label unchanged
    assert.equal(translateSuggestionLabel('🏛️ Indoor Catering', 'en'), '🏛️ Indoor Catering')

    // Unmatched chip passes through safely
    assert.equal(translateSuggestionLabel('Unknown Custom Chip', 'te'), 'Unknown Custom Chip')
  })
})
