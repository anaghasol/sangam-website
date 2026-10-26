import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { findLargestAvailableHall, latestStatedGuestCount, hasAcceptedOverCapacity, buildCapacityQuestion, KEEP_ALL_GUESTS_PHRASE } from '@/lib/hall-capacity'
import { pickHallForGuestCount } from '@/lib/catering-portions'
import type { LiveHall } from '@/lib/sangam-catering'

const hall = (id: string, branchId: string, maxPax: number | null, capacity: number | null = null): LiveHall => ({
  id, branchId, name: id, minPax: null, maxPax, capacity, isAc: true, floor: null, flatCharge: null,
  fullDayPrice: null, minCateringValueForFree: null, valetParking: false, text: id,
})
const HALLS = [
  hall('Maduram', 'peer', 100),
  hall('Sangamam', 'peer', 250),
  hall('Hayath Grand', 'hay', 500),
  hall('NoCap', 'peer', null, 300),
]

describe('Indoor Hall Capacity Check (2026-10-23)', () => {
  test('findLargestAvailableHall: largest hall of THIS branch only, max_pax falling back to capacity', () => {
    assert.deepEqual(findLargestAvailableHall(HALLS, 'peer')?.hall.id, 'NoCap')
    assert.equal(findLargestAvailableHall(HALLS, 'peer')?.capacity, 300)
    // Hayathnagar's 500-pax hall must never count for Peerzadiguda.
    assert.equal(findLargestAvailableHall(HALLS.filter(h => h.id !== 'NoCap'), 'peer')?.capacity, 250)
  })

  test('findLargestAvailableHall: skips halls booked on the date; no branch -> no check', () => {
    assert.equal(findLargestAvailableHall(HALLS, 'peer', new Set(['NoCap', 'Sangamam']))?.hall.id, 'Maduram')
    assert.equal(findLargestAvailableHall(HALLS, null), null)
    assert.equal(findLargestAvailableHall(HALLS, 'unknown-branch'), null)
  })

  test('latestStatedGuestCount: the most recent count wins', () => {
    const msgs = [
      { role: 'user', content: 'We are expecting 400 guests' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'Please recalculate this quote for 150 guests' },
    ]
    assert.equal(latestStatedGuestCount(msgs), 150)
    assert.equal(latestStatedGuestCount([{ role: 'user', content: 'Grand Veg Menu at ₹700 per plate' }]), null)
  })

  test('latestStatedGuestCount: a plain "yes" to the capacity question means the hall capacity', () => {
    const q = buildCapacityQuestion('en', { pax: 400, hall: 'Sangamam', cap: 250, branch: 'Peerzadiguda' })
    const base = [{ role: 'user', content: 'We are expecting 400 guests' }, { role: 'assistant', content: q.reply }]
    assert.equal(latestStatedGuestCount([...base, { role: 'user', content: 'Yes, proceed' }]), 250)
    assert.equal(latestStatedGuestCount([...base, { role: 'user', content: 'ok' }, { role: 'assistant', content: 'dietary?' }, { role: 'user', content: 'veg' }]), 250)
    // "yes" to any other question doesn't change the count.
    assert.equal(latestStatedGuestCount([base[0], { role: 'assistant', content: 'Shall I continue?' }, { role: 'user', content: 'yes' }]), 400)
    // Telugu question carries the same marker.
    const te = buildCapacityQuestion('te', { pax: 400, hall: 'Sangamam', cap: 250, branch: 'Peerzadiguda' })
    assert.equal(latestStatedGuestCount([base[0], { role: 'assistant', content: te.reply }, { role: 'user', content: 'సరే' }]), 250)
  })

  test('capacity question chips: proceed with hall capacity, or keep all guests', () => {
    const q = buildCapacityQuestion('en', { pax: 400, hall: 'Sangamam', cap: 250, branch: 'Peerzadiguda' })
    assert.match(q.reply, /Sangamam/)
    assert.match(q.reply, /250 guests/)
    assert.equal(latestStatedGuestCount([{ role: 'user', content: q.suggestions[0].text }]), 250)
    assert.equal(latestStatedGuestCount([{ role: 'user', content: q.suggestions[1].text }]), 400)
    assert.ok(hasAcceptedOverCapacity(q.suggestions[1].text))
    assert.ok(q.suggestions[1].text.includes(KEEP_ALL_GUESTS_PHRASE))
    assert.equal(hasAcceptedOverCapacity('We are expecting 400 guests'), false)
  })

  test('pickHallForGuestCount: strictly branch-scoped — no branch means no hall', () => {
    assert.equal(pickHallForGuestCount(HALLS, null, 80), null)
    assert.equal(pickHallForGuestCount(HALLS, 'unknown-branch', 80), null)
    assert.equal(pickHallForGuestCount(HALLS, 'peer', 450)?.branchId, 'peer')
  })
})
