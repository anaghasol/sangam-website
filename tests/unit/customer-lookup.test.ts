import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { extractPhoneNumber } from '@/lib/customer-lookup'

describe('Customer Recognition & Phone Extraction', () => {
  test('extractPhoneNumber: standard Indian 10-digit mobile numbers', () => {
    assert.equal(extractPhoneNumber('My phone number is 9063844021'), '9063844021')
    assert.equal(extractPhoneNumber('Call 9849012345 please'), '9849012345')
    assert.equal(extractPhoneNumber('Contact 7702112233 for details'), '7702112233')
    assert.equal(extractPhoneNumber('Reach me at 6301122334'), '6301122334')
  })

  test('extractPhoneNumber: handles +91 prefix and country codes', () => {
    assert.equal(extractPhoneNumber('+91 90638 44021'), '9063844021')
    assert.equal(extractPhoneNumber('+91-9849012345'), '9849012345')
    assert.equal(extractPhoneNumber('919849012345'), '9849012345')
  })

  test('extractPhoneNumber: handles spaces, hyphens, and parentheses', () => {
    assert.equal(extractPhoneNumber('(90638) 44021'), '9063844021')
    assert.equal(extractPhoneNumber('98490-12345'), '9849012345')
    assert.equal(extractPhoneNumber('+91 (906) 384-4021'), '9063844021')
  })

  test('extractPhoneNumber: safely ignores numbers that are not Indian mobile numbers', () => {
    // Guest counts or prices should never be extracted as phone numbers
    assert.equal(extractPhoneNumber('I need catering for 50 people on 25th Dec 2026'), null)
    assert.equal(extractPhoneNumber('Quote around 499 or 649 per plate'), null)
    assert.equal(extractPhoneNumber('1234567'), null) // Too short
    assert.equal(extractPhoneNumber(''), null)
  })
})
