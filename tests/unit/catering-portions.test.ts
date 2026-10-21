import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateEffectiveGuests,
  calculateTrayQuantity,
  extractDishesFromText,
  pickHallForGuestCount,
  matchSectionByText,
  extractExplicitEventDate,
  getCateringPortionRulesText,
} from '@/lib/catering-portions'
import type { LiveHall, StructuredMenuSection } from '@/lib/sangam-catering'

describe('Catering Portions & Math Engine', () => {
  test('calculateEffectiveGuests: 2 kids = 1 adult equivalent portion', () => {
    // 40 adults, 10 kids -> 40 + ceil(10 / 2) = 45 effective
    const result1 = calculateEffectiveGuests(40, 10)
    assert.equal(result1.adults, 40)
    assert.equal(result1.kids, 10)
    assert.equal(result1.effectiveAdults, 45)

    // 50 adults, 5 kids -> 50 + ceil(5 / 2) = 53 effective
    const result2 = calculateEffectiveGuests(50, 5)
    assert.equal(result2.adults, 50)
    assert.equal(result2.kids, 5)
    assert.equal(result2.effectiveAdults, 53)

    // 0 kids -> effective equals adults
    const result3 = calculateEffectiveGuests(80, 0)
    assert.equal(result3.effectiveAdults, 80)

    // Minimum boundary: 0 guests returns minimum 1
    const result4 = calculateEffectiveGuests(0, 0)
    assert.equal(result4.effectiveAdults, 1)
  })

  test('calculateTrayQuantity: Biryani and rice dishes (25-30 pax per full tray)', () => {
    // 1 tray serves up to 28 guests
    assert.equal(calculateTrayQuantity('Signature Chicken Biryani', 25), 1)
    assert.equal(calculateTrayQuantity('Veg Pulao', 28), 1)
    assert.equal(calculateTrayQuantity('Mutton Dum Biryani', 56), 2)
    assert.equal(calculateTrayQuantity('Jeera Rice', 100), 4) // ceil(100 / 28) = 4
  })

  test('calculateTrayQuantity: Starters and appetizers (40-50 pax per full tray)', () => {
    // Category 'starter' or 'snack' serves up to 45 guests (100-120 pieces)
    assert.equal(calculateTrayQuantity('starter', 40), 1)
    assert.equal(calculateTrayQuantity('Paneer Tikka', 45), 1) // matches 'tikka'
    assert.equal(calculateTrayQuantity('starter', 50), 2) // ceil(50 / 45) = 2
    assert.equal(calculateTrayQuantity('Tangdi Kebab', 90), 2) // matches 'kebab'
    assert.equal(calculateTrayQuantity('snack', 135), 3)
  })

  test('calculateTrayQuantity: Curries and dals spread rules', () => {
    // Standard buffet (< 8 dishes): 1 tray serves ~40 pax
    assert.equal(calculateTrayQuantity('curry', 40, 6), 1)
    assert.equal(calculateTrayQuantity('dal', 70, 6), 2) // ceil(70 / 40) = 2

    // Large spread (>= 8 dishes): guests take smaller portions, 1 tray serves ~70 pax
    assert.equal(calculateTrayQuantity('curry', 70, 10), 1) // ceil(70 / 70) = 1
    assert.equal(calculateTrayQuantity('paneer gravy', 140, 12), 2)
  })

  test('calculateTrayQuantity: Sweets and desserts (35-40 pax per full tray)', () => {
    assert.equal(calculateTrayQuantity('dessert', 35), 1)
    assert.equal(calculateTrayQuantity('sweet', 40), 2) // ceil(40 / 35) = 2
    assert.equal(calculateTrayQuantity('dessert', 70), 2)
  })

  test('extractDishesFromText: extracts dishes from customer text', () => {
    const text = 'We need Bagara Baingan, Aloo Mutter Paneer, and Chicken 65 for our event'
    const matched = extractDishesFromText(text)
    const names = matched.map(m => m.name.toLowerCase())

    assert.ok(names.includes('bagara baingan'))
    assert.ok(names.includes('aloo mutter paneer'))
    assert.ok(names.includes('chicken 65'))
    assert.equal(matched.find(m => m.name.toLowerCase() === 'chicken 65')?.dietaryType, 'non-veg')
    assert.equal(matched.find(m => m.name.toLowerCase() === 'bagara baingan')?.dietaryType, 'veg')
  })

  test('extractExplicitEventDate: parses natural 4-digit year dates into YYYY-MM-DD', () => {
    assert.equal(extractExplicitEventDate('We need catering on 25th Dec 2026 for dinner'), '2026-12-25')
    assert.equal(extractExplicitEventDate('Event is on 5 January 2027'), '2027-01-05')
    assert.equal(extractExplicitEventDate('Book for 15 Aug 2026 lunch'), '2026-08-15')
    assert.equal(extractExplicitEventDate('Tomorrow lunch'), null, 'Must return null without 4-digit year to avoid guessing')
  })

  test('pickHallForGuestCount: respects capacity, branch scoping, and booked hall exclusion', () => {
    const mockHalls: LiveHall[] = [
      { id: 'hall-peer-1', name: 'Kohinoor Ballroom', minPax: 100, maxPax: 300, branchId: 'peerzadiguda', hallPrice: 50000 },
      { id: 'hall-peer-2', name: 'Sapphire Hall', minPax: 40, maxPax: 120, branchId: 'peerzadiguda', hallPrice: 25000 },
      { id: 'hall-hayath-1', name: 'Grand Hayath Hall', minPax: 50, maxPax: 200, branchId: 'hayathnagar', hallPrice: 35000 },
    ]

    // 1. Picks fitting hall for Peerzadiguda for 80 pax -> Sapphire Hall
    const pick1 = pickHallForGuestCount(mockHalls, 'peerzadiguda', 80)
    assert.equal(pick1?.id, 'hall-peer-2')

    // 2. Regression 2026-10-04: If Sapphire Hall is booked on the date, must skip and pick Kohinoor Ballroom
    const bookedHalls = new Set(['hall-peer-2'])
    const pick2 = pickHallForGuestCount(mockHalls, 'peerzadiguda', 80, bookedHalls)
    assert.equal(pick2?.id, 'hall-peer-1', 'Must skip booked hall and pick next available')

    // 3. Regression 2026-10-04: Never leak halls from another branch
    const pick3 = pickHallForGuestCount(mockHalls, 'malkapur', 50)
    assert.equal(pick3, null, 'Must return null if requested branch has no matching halls, not fall back to other branches')
  })

  test('matchSectionByText: finds structured section by exact label or synonym', () => {
    const mockSections: StructuredMenuSection[] = [
      { sectionId: 'sec-1', sectionName: 'Welcome Drinks', categoryName: 'Beverages', items: [] },
      { sectionId: 'sec-2', sectionName: 'Hot Starters', categoryName: 'Appetizers', items: [] },
      { sectionId: 'sec-3', sectionName: 'Royal Biryani', categoryName: 'Rice Special', items: [] },
    ]

    // Exact name match
    assert.equal(matchSectionByText(mockSections, 'change the Welcome Drinks')?.sectionId, 'sec-1')
    // Synonym match: "appetizer" -> Hot Starters
    assert.equal(matchSectionByText(mockSections, 'can we swap an appetizer?')?.sectionId, 'sec-2')
    // Synonym match: "biryani" -> Royal Biryani
    assert.equal(matchSectionByText(mockSections, 'add another biryani item')?.sectionId, 'sec-3')
    // No match
    assert.equal(matchSectionByText(mockSections, 'unrelated inquiry'), null)
  })

  test('getCateringPortionRulesText: contains mandatory rules for Arjun prompt', () => {
    const rules = getCateringPortionRulesText()
    assert.ok(rules.includes('2 Kids count as 1 Adult Portion'))
    assert.ok(rules.includes('Biryani / Pulao: 1 Full Tray (≈5 kg) feeds 25–30 guests'))
    assert.ok(rules.includes('Starters / Appetizers: 1 Full Tray (≈100–120 pcs) feeds 40–50 guests'))
    assert.ok(rules.includes('maximum 5% loyalty discount'))
  })
})
