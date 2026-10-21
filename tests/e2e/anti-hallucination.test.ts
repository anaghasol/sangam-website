import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

describe('Anti-Hallucination & Prompt Invariants', () => {
  const routeContent = readFileSync('app/api/chat/route.ts', 'utf-8')

  test('SYSTEM_PROMPT: strictly enforces database pricing invariant', () => {
    // The non-negotiable rule forbidding ungrounded ₹ numbers
    assert.ok(
      routeContent.includes('PRICING RULE — NON-NEGOTIABLE'),
      'Must contain the non-negotiable pricing rule header'
    )
    assert.ok(
      routeContent.includes('Every hall name, hall price, menu package name and per-plate price you state MUST come from the "REAL DATABASE CATERING & EVENT PRICING" block'),
      'Must instruct model to only state prices present in the DB block'
    )
    assert.ok(
      routeContent.includes('+91 90638 44021'),
      'Must include the direct catering manager contact number for unconfirmed prices'
    )
  })

  test('SYSTEM_PROMPT: enforces 2026-10-06 bug regression (no flat guessed outdoor packages)', () => {
    // The prompt must explicitly state that there is no fixed outdoor package
    assert.ok(
      routeContent.includes('There is currently NO fixed outdoor "package" in the system'),
      'Must explicitly forbid inventing generic outdoor packages'
    )
    assert.ok(
      routeContent.includes('never name or price one as if it were a real package'),
      'Must warn against naming fake outdoor spreads'
    )
  })

  test('SYSTEM_PROMPT: enforces 2026-10-04 hall availability invariant', () => {
    assert.ok(
      routeContent.includes('Never choose or confirm a hall marked "ALREADY BOOKED" for the requested date'),
      'Prompt must instruct the model to never assign or confirm a booked hall'
    )
  })

  test('SYSTEM_PROMPT: enforces Arjun hospitality persona and bans AI identity claims', () => {
    assert.ok(
      routeContent.includes('Never say you are an AI — you are Arjun, the hospitality manager.'),
      'Must enforce Arjun persona and forbid claiming to be an AI'
    )
    assert.ok(
      routeContent.includes('Flagship Outlet & Banquets: Peerzadiguda'),
      'Must include official Sangam outlet details'
    )
    assert.ok(
      routeContent.includes('Head Office & Outlet: Hayathnagar'),
      'Must include Hayathnagar head office'
    )
  })

  test('Deterministic fallback messages exist for all 3 languages (en, te, hi)', () => {
    assert.ok(routeContent.includes("ERROR_FALLBACK_L: Record<'en' | 'te' | 'hi'"), 'Must declare multilingual fallback')
    assert.ok(
      routeContent.includes('\\u0c28\\u0c2e\\u0c38\\u0c4d\\u0c15\\u0c3e\\u0c30\\u0c02') || routeContent.includes('నమస్కారం'),
      'Must contain Telugu error fallback'
    )
    assert.ok(routeContent.includes('te:') && routeContent.includes('hi:'), 'Must configure te and hi fallbacks')
  })
})
