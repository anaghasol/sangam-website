import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { composeOutdoorSuggestion, parseKnowledgeMenu, sectionForDish, isNonVegDish, quoteOutdoorSuggestion, suggestionDishNames, SOUTH_SEED_MENU } from '@/lib/outdoor-menu'
import type { CateringLiveData } from '@/lib/sangam-catering'

const dishesOf = (s: ReturnType<typeof composeOutdoorSuggestion>, key: string) => s.sections.find(x => x.key === key)?.dishes ?? []

describe('Outdoor menu suggestion (2026-10-25)', () => {
  test('nothing on file: falls back to the South seed menu', () => {
    const s = composeOutdoorSuggestion({ diet: 'veg', occasion: 'birthday' })
    assert.equal(s.source, 'seed')
    assert.deepEqual(s.sourcesUsed, ['seed'])
    assert.ok(dishesOf(s, 'starters').length > 0 && dishesOf(s, 'rice').length > 0 && dishesOf(s, 'desserts').length > 0)
  })

  test('Pure Veg never contains a non-veg dish, from any tier', () => {
    const s = composeOutdoorSuggestion({
      diet: 'veg',
      knowledge: ['Starters: Chicken 65, Gobi 65'],
      pastDishes: ['Mutton Dum Biryani', 'Apollo Fish', 'Veg Dum Biryani'],
      trendingDishes: ['Chicken Fry', 'Paneer Tikka'],
    })
    assert.ok(suggestionDishNames(s).every(d => !isNonVegDish(d)), suggestionDishNames(s).join(', '))
  })

  test('non-veg spread includes non-veg dishes', () => {
    const s = composeOutdoorSuggestion({ diet: 'non-veg' })
    assert.ok(suggestionDishNames(s).some(isNonVegDish))
  })

  test('priority: knowledge base first, then past bookings, then trending, then seed', () => {
    const s = composeOutdoorSuggestion({
      diet: 'veg',
      occasion: 'birthday',
      knowledge: ['Outdoor birthday menu\nStarters: Corn Pakoda'],
      pastDishes: ['Veg Cutlet', 'Pulka'],
      trendingDishes: ['Paneer Tikka'],
    })
    // Birthday allows 4 starters: knowledge, past, trending, then seed top-up.
    assert.deepEqual(dishesOf(s, 'starters').slice(0, 3), ['Corn Pakoda', 'Veg Cutlet', 'Paneer Tikka'])
    assert.equal(dishesOf(s, 'starters').length, 4)
    assert.equal(s.source, 'knowledge')
    assert.deepEqual(s.sourcesUsed, ['knowledge', 'past-bookings', 'trending', 'seed'])
    assert.equal(dishesOf(s, 'breads')[0], 'Pulka')
  })

  test('past bookings alone: source is past-bookings, seed only tops up', () => {
    const s = composeOutdoorSuggestion({ diet: 'non-veg', pastDishes: ['Chicken Dum Biryani', 'Gobi 65'] })
    assert.equal(s.source, 'past-bookings')
    assert.equal(dishesOf(s, 'rice')[0], 'Chicken Dum Biryani')
  })

  test('no duplicate dishes across tiers', () => {
    const s = composeOutdoorSuggestion({ diet: 'veg', pastDishes: ['gobi 65'], trendingDishes: ['Gobi 65'] })
    const names = suggestionDishNames(s).map(n => n.toLowerCase())
    assert.equal(new Set(names).size, names.length)
  })

  test('weddings get a bigger spread than corporate events', () => {
    const wedding = suggestionDishNames(composeOutdoorSuggestion({ diet: 'non-veg', occasion: 'wedding' })).length
    const corporate = suggestionDishNames(composeOutdoorSuggestion({ diet: 'non-veg', occasion: 'corporate' })).length
    assert.ok(wedding > corporate)
  })

  test('never contains an indoor package name', () => {
    for (const diet of ['veg', 'non-veg'] as const) {
      const text = suggestionDishNames(composeOutdoorSuggestion({ diet })).join(' ').toLowerCase()
      assert.doesNotMatch(text, /platinum|grand veg|grand non|standard (?:veg|non)/)
    }
  })

  test('seed menu dishes all land in the section they are listed under', () => {
    for (const diet of ['veg', 'non-veg'] as const) {
      for (const [key, dishes] of Object.entries(SOUTH_SEED_MENU[diet])) {
        for (const d of dishes) assert.equal(sectionForDish(d), key === 'drinks' ? 'drinks' : key, `${d} (${diet})`)
      }
    }
  })

  test('parseKnowledgeMenu reads "Section: a, b" lines and ignores the rest', () => {
    const m = parseKnowledgeMenu(['Outdoor wedding spread\n- Starters: Gobi 65, Mirchi Bajji (hot)\n* Rice & Biryani: Pulihora\nSome prose: not a menu'])
    assert.deepEqual(m.starters, ['Gobi 65', 'Mirchi Bajji'])
    assert.deepEqual(m.rice, ['Pulihora'])
    assert.equal(Object.keys(m).length, 2)
  })

  test('sectionForDish: sorts retail items out', () => {
    assert.equal(sectionForDish('Masala Vada'), 'starters')
    assert.equal(sectionForDish('Paneer Butter Masala'), 'curries')
    assert.equal(sectionForDish('Bendakaya Fry'), 'curries')
    assert.equal(sectionForDish('Tea'), null)
    assert.equal(sectionForDish('Sangam Spl. Thali'), null)
  })

  test('quoteOutdoorSuggestion: prices only live-priced dishes, flags the rest, no guessed rate', () => {
    const s = composeOutdoorSuggestion({ diet: 'veg' })
    const none = quoteOutdoorSuggestion(s, 100, undefined)
    assert.equal(none.finalTotal, 0)
    assert.equal(none.usedLiveData, false)
    assert.match(none.menuItems.join('\n'), /pricing to be confirmed/)

    const live = {
      dishesByCategory: {
        starters: [{ id: '1', name: 'Gobi 65', dietaryType: 'veg', price: 400, unitLabel: 'Tray', personsPerUnit: 50, category: 'starters', text: '' }],
        biryanis: [], curries: [], breads: [], desserts: [], beverages: [], others: [],
      },
    } as unknown as CateringLiveData
    const q = quoteOutdoorSuggestion(s, 100, live)
    assert.equal(q.finalTotal, 800) // 2 trays × ₹400; everything else unpriced
    assert.equal(q.pricePerPlate, 8)
    assert.equal(q.usedLiveData, true)
    assert.match(q.headline, /Pure Veg/)
  })
})
