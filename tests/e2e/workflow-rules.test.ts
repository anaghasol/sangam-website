import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

describe('Conversational Workflow & Intake Guardrails', () => {
  const routeContent = readFileSync('app/api/chat/route.ts', 'utf-8')

  test('Outdoor Catering Workflow: strictly separates outdoor delivery from banquet halls', () => {
    assert.ok(
      routeContent.includes('NEVER ask for banquet hall slots or assign banquet halls — this is delivery/onsite setup at customer\'s venue!'),
      'Outdoor catering must never assign or ask for banquet halls'
    )
    assert.ok(
      routeContent.includes('The MAIN things needed for estimation are **Pax** and **Items/Menu**'),
      'Must define Pax and Items as the core estimation triggers'
    )
    assert.ok(
      routeContent.includes('IMMEDIATELY generate and display the full Outdoor Catering Estimation!'),
      'Must enforce immediate estimation without gating behind a multi-step survey'
    )
  })

  test('Indoor Banquet Workflow: enforces strict sequential intake order', () => {
    assert.ok(
      routeContent.includes('INDOOR BANQUET CONVERSATIONAL WORKFLOW (STRICT SEQUENTIAL INTAKE):'),
      'Must define sequential indoor intake header'
    )
    // Verify the sequential order 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7
    const branchIdx = routeContent.indexOf('1. Branch: If missing and no date')
    const dateIdx = routeContent.indexOf('2. Event Date: If missing')
    const slotIdx = routeContent.indexOf('3. Time Slot: If event date is known')
    const paxIdx = routeContent.indexOf('4. Guest Count (Pax): If time slot is known')
    const dietaryIdx = routeContent.indexOf('5. Dietary Preference: If pax is known')
    const packageIdx = routeContent.indexOf('6. Menu Package: Once dietary preference')
    const fullEstIdx = routeContent.indexOf('7. Full Estimation & Dish Spread Breakdown:')

    assert.ok(branchIdx !== -1 && dateIdx !== -1 && slotIdx !== -1 && paxIdx !== -1 && dietaryIdx !== -1 && packageIdx !== -1 && fullEstIdx !== -1, 'All intake steps must exist')
    assert.ok(branchIdx < dateIdx && dateIdx < slotIdx && slotIdx < paxIdx && paxIdx < dietaryIdx && dietaryIdx < packageIdx && packageIdx < fullEstIdx, 'Intake steps must follow strict sequential order')
  })

  test('Confirmation Invariant: NEVER claim booking is confirmed without explicit user confirmation', () => {
    assert.ok(
      routeContent.includes('NEVER CLAIM A BOOKING IS "CONFIRMED"/"BOOKED"/"PLACED"/"RESERVED" UNLESS THE CUSTOMER JUST EXPLICITLY SAID SO'),
      'Must contain the explicit confirmation guardrail header'
    )
    assert.ok(
      routeContent.includes('never write the literal phrase "to be confirmed" anywhere in an estimation reply'),
      'Must avoid literal "to be confirmed" phrase which could trigger false booking state'
    )
  })

  test('Two-Step Confirmation Flow: prevents spamming full estimation while gathering details', () => {
    assert.ok(
      routeContent.includes('TWO-STEP CONFIRMATION FLOW — NEVER RE-SHOW THE FULL ITEMIZED ESTIMATION WHILE ONLY COLLECTING DETAILS'),
      'Must enforce two-step confirmation flow'
    )
    assert.ok(
      routeContent.includes('do NOT print the full itemized estimation again'),
      'Must instruct bot to keep follow-up brief (1-2 sentences) when taking name/phone'
    )
  })

  test('Deterministic State Machine Fallback in Route handler', () => {
    // Check that code enforces sequential questions deterministically
    assert.ok(
      routeContent.includes('if (!hasBranchDetected) reply = fb.indoorBranch'),
      'Must enforce branch question when branch is missing'
    )
    assert.ok(
      routeContent.includes('else if (!hasDateDetected) reply = fb.indoorDate'),
      'Must enforce date question when date is missing'
    )
    assert.ok(
      routeContent.includes('else if (!hasSlotDetected) reply = fb.indoorSlot'),
      'Must enforce slot question when slot is missing'
    )
    assert.ok(
      routeContent.includes('else if (!hasPaxDetected) reply = fb.indoorPax'),
      'Must enforce pax question when pax is missing'
    )
  })
})
