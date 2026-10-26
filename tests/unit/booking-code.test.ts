import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { generateIndoorBookingCode, generateOutdoorBookingCode, generateChatBookingCode, latestStatedEventDate } from '@/lib/booking-code'

describe('Booking Code Generation (2026-10-23 spec)', () => {
  test('generateIndoorBookingCode: {BRANCH_FIRST}{BRANCH_LAST}{DD}{MM}{PHONE_LAST4}', () => {
    assert.equal(generateIndoorBookingCode('Trichy', '2026-11-05', '9876543210'), 'TY05113210')
    assert.equal(generateIndoorBookingCode('Peerzadiguda', '2026-11-05', '9876543210'), 'PA05113210')
    assert.equal(generateIndoorBookingCode('Hayathnagar', '2026-12-25', '+91 90638 44021'), 'HR25124021')
    assert.equal(generateIndoorBookingCode('Hayath Nagar', '2026-12-25', '9063844021'), 'HR25124021')
  })

  test('generateOutdoorBookingCode: OC{DD}{MM}{PHONE_LAST4}', () => {
    assert.equal(generateOutdoorBookingCode('2026-04-17', '9876543210'), 'OC17043210')
  })

  test('fallbacks: missing branch -> X, missing date -> 00, short phone left-padded with 0', () => {
    assert.equal(generateIndoorBookingCode('', '2026-11-05', '9876543210'), 'XX05113210')
    assert.equal(generateOutdoorBookingCode('', '42'), 'OC00000042')
  })

  test('every code is exactly 10 characters', () => {
    assert.equal(generateIndoorBookingCode('Malkapur', '2026-01-09', '9849012345').length, 10)
    assert.equal(generateOutdoorBookingCode('2026-01-09', '9849012345').length, 10)
  })

  test('generateChatBookingCode: no code until date + phone (+ branch for indoor) are known', () => {
    const base = { branchName: 'Peerzadiguda', eventDate: '2026-11-05', phone: '9876543210' }
    assert.equal(generateChatBookingCode({ serviceType: 'inhouse', ...base }), 'PA05113210')
    assert.equal(generateChatBookingCode({ serviceType: 'outdoor', ...base, branchName: null }), 'OC05113210')
    assert.equal(generateChatBookingCode({ serviceType: 'inhouse', ...base, branchName: null }), null)
    assert.equal(generateChatBookingCode({ serviceType: 'inhouse', ...base, eventDate: null }), null)
    assert.equal(generateChatBookingCode({ serviceType: 'outdoor', ...base, phone: null }), null)
  })

  test('latestStatedEventDate: a corrected date wins over the first one mentioned', () => {
    assert.equal(latestStatedEventDate(['Event on 20 Nov 2026', '100 guests', 'Actually make it 25 November 2026']), '2026-11-25')
    assert.equal(latestStatedEventDate(['Event on 20 Nov 2026', 'my number is 9876543210']), '2026-11-20')
    assert.equal(latestStatedEventDate(['next weekend please']), null)
  })
})
