import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveIndoorDishChanges, priceAddedDish, buildDishChangeAck, STANDARD_ADDON_RATE, NO_DISH_CHANGES } from '@/lib/indoor-dish-changes'
import { generatePopularCateringQuote } from '@/lib/catering-portions'
import { translateSuggestionLabel, SUGGESTION_LABEL_TR } from '@/lib/suggestion-i18n'
import type { CateringLiveData, StructuredMenuSection } from '@/lib/sangam-catering'

const u = (content: string) => ({ role: 'user', content })
const a = (content: string) => ({ role: 'assistant', content })
const MENU = ['Gobi 65', 'Chicken 65', 'Fish Fry', 'Paneer Butter Masala', 'Dal Tadka', 'Gulab Jamun']

const live = {
  dishesByCategory: {
    starters: [{ id: 's1', name: 'Bhindi Fry', dietaryType: 'veg', price: 900, unitLabel: 'Tray', personsPerUnit: 45, category: 'starters', text: '' }],
    curries: [{ id: 'c1', name: 'Mutton Rogan Josh', dietaryType: 'non-veg', price: 3800, unitLabel: 'Tray', personsPerUnit: 38, category: 'curries', text: '' }],
    biryanis: [], breads: [{ id: 'b1', name: 'Butter Naan', dietaryType: 'veg', price: 20, unitLabel: 'Piece', personsPerUnit: null, category: 'breads', text: '' }],
    desserts: [], beverages: [], others: [],
  },
} as unknown as CateringLiveData

describe('Indoor dish changes (2026-10-26)', () => {
  test('remove a package dish; package-only names are matched', () => {
    const c = resolveIndoorDishChanges([u('remove fish fry')], { menuDishNames: MENU })
    assert.deepEqual(c.removed, ['Fish Fry'])
    assert.deepEqual(c.added, [])
    assert.deepEqual(resolveIndoorDishChanges([u('please remove sushi')], { menuDishNames: MENU }), NO_DISH_CHANGES)
  })

  test('add a dish found in the database → priced per plate from its tray price', () => {
    const c = resolveIndoorDishChanges([u('can you add bhindi fry')], { menuDishNames: MENU, live })
    assert.equal(c.added.length, 1)
    assert.deepEqual({ name: c.added[0].name, perPlate: c.added[0].perPlate, source: c.added[0].source }, { name: 'Bhindi Fry', perPlate: 20, source: 'database' }) // 900 / 45
  })

  test('bread priced per piece × 2.5; non-veg database dish divides by what a tray serves', () => {
    assert.equal(priceAddedDish('butter naan', live).perPlate, 50)
    assert.equal(priceAddedDish('mutton rogan josh', live).perPlate, 100) // 3800 / 38
  })

  test('add a dish NOT in the database → standard rate: veg ₹60, non-veg ₹80', () => {
    const veg = resolveIndoorDishChanges([u('add vankaya fry')], { menuDishNames: MENU, live }).added[0]
    assert.deepEqual({ perPlate: veg.perPlate, veg: veg.veg, source: veg.source }, { perPlate: STANDARD_ADDON_RATE.veg, veg: true, source: 'standard-rate' })
    assert.equal(STANDARD_ADDON_RATE.veg, 60)
    const nv = resolveIndoorDishChanges([u('also add chicken lollipop')], { menuDishNames: MENU, live }).added[0]
    assert.deepEqual({ perPlate: nv.perPlate, veg: nv.veg }, { perPlate: STANDARD_ADDON_RATE.nonVeg, veg: false })
    assert.equal(STANDARD_ADDON_RATE.nonVeg, 80)
  })

  test('a dish already in the package is not added again; removed then re-added is restored', () => {
    assert.deepEqual(resolveIndoorDishChanges([u('add gobi 65')], { menuDishNames: MENU }), NO_DISH_CHANGES)
    const c = resolveIndoorDishChanges([u('remove dal tadka'), a('ok'), u('add dal tadka back')], { menuDishNames: MENU })
    assert.deepEqual(c.removed, [])
  })

  test('remove + add in one message, and replace X with an off-menu Y', () => {
    const c1 = resolveIndoorDishChanges([u('remove fish fry and add apollo fish')], { menuDishNames: MENU, live })
    assert.deepEqual(c1.removed, ['Fish Fry'])
    assert.equal(c1.added[0].name, 'Apollo Fish')
    assert.equal(c1.added[0].perPlate, 80)
    const c2 = resolveIndoorDishChanges([u('replace fish fry with bhindi fry')], { menuDishNames: MENU, live })
    assert.deepEqual(c2.removed, ['Fish Fry'])
    assert.equal(c2.added[0].name, 'Bhindi Fry')
  })

  test('a removed extra comes off again; several dishes in one message', () => {
    const c = resolveIndoorDishChanges([u('add vankaya fry, tomato pappu'), a('ok'), u('remove vankaya fry')], { menuDishNames: MENU, live })
    assert.deepEqual(c.added.map(x => x.name), ['Tomato Pappu'])
  })

  test('chips and ordinary sentences are not dish requests', () => {
    for (const t of ['Swap in "Gobi 65" for the Starters section', 'I would like to swap and customize the Starters section', 'We are expecting approximately 100 guests', 'Please add 20 more guests', 'This estimation looks good, please confirm', 'I want to add a dish that is not in the menu']) {
      assert.deepEqual(resolveIndoorDishChanges([u(t)], { menuDishNames: MENU, live }), NO_DISH_CHANGES, t)
    }
  })

  test('acknowledgement: names what changed and the price basis, in every language', () => {
    const now = resolveIndoorDishChanges([u('remove fish fry and add vankaya fry and add bhindi fry')], { menuDishNames: MENU, live })
    const en = buildDishChangeAck('en', NO_DISH_CHANGES, now)
    assert.match(en, /Removed \*\*Fish Fry\*\*/)
    assert.match(en, /Bhindi Fry\*\* — \+₹20\/plate/)
    assert.match(en, /standard veg add-on rate of \+₹60\/plate/)
    assert.equal(buildDishChangeAck('en', now, now), '')
    assert.match(buildDishChangeAck('te', NO_DISH_CHANGES, now), /Fish Fry/)
    assert.match(buildDishChangeAck('hi', NO_DISH_CHANGES, now), /Bhindi Fry/)
  })

  test('quote: added dishes raise the plate rate and total; removed dishes leave the spread, rate unchanged', () => {
    const sections: StructuredMenuSection[] = [{
      sectionId: 's', sectionName: 'Starters', categoryName: 'Starters', selectionLimit: 3, isAddon: false, isAccompaniment: false,
      dishes: [{ name: 'Gobi 65' }, { name: 'Fish Fry' }, { name: 'Chicken 65' }],
    }] as unknown as StructuredMenuSection[]
    const base = { indoorMenus: [{ id: 'm1', name: 'Standard Non-Veg Menu', pricePerPax: 800, dietaryType: 'non-veg', description: null, menuType: 'indoor', text: '' }], halls: [], outdoorMenus: [], dishesByCategory: live.dishesByCategory, occasions: [], hasLiveHalls: false, hasLiveMenus: true, hasLiveDishes: true } as unknown as CateringLiveData
    const breakdown = new Map([['m1', sections]])
    const plain = generatePopularCateringQuote('inhouse', 'Peerzadiguda', 100, false, [], 'Standard Non-Veg Menu', base, null, breakdown)
    assert.equal(plain.pricePerPlate, 800)

    const changes = resolveIndoorDishChanges([u('remove fish fry and add vankaya fry')], { menuDishNames: ['Gobi 65', 'Fish Fry', 'Chicken 65'], live: base })
    const q = generatePopularCateringQuote('inhouse', 'Peerzadiguda', 100, false, [], 'Standard Non-Veg Menu', base, null, breakdown, undefined, changes)
    assert.equal(q.pricePerPlate, 860) // 800 + ₹60 standard veg add-on
    assert.equal(q.finalTotal, 86000)
    const spread = q.menuItems.join('\n')
    assert.doesNotMatch(spread.split('### ➖')[0], /Fish Fry/)
    assert.match(spread, /Added Dishes[\s\S]*Vankaya Fry — \+₹60\/plate/)
    assert.match(q.trayBreakdown.join('\n'), /\+₹60\/plate/)
  })
})

describe('Chip labels are translated (2026-10-26)', () => {
  test('every static chip label in the chat code has a Telugu and Hindi entry', () => {
    const decode = (s: string) => s.replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    const missing: string[] = []
    for (const f of ['app/api/chat/route.ts', 'lib/hall-capacity.ts']) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/label:\s*(['"])((?:(?!\1).)*?)\1/g)) {
        const label = decode(m[2].replace(/\\(?=[^u])/g, ''))
        if (!SUGGESTION_LABEL_TR[label] && !/\$\{/.test(label)) missing.push(label)
      }
    }
    assert.deepEqual(missing, [])
  })

  test('date and guest-count labels are translated by pattern', () => {
    assert.match(translateSuggestionLabel('⚡ Tomorrow (Sat, 26 Oct)', 'te'), /రేపు \(Sat, 26 Oct\)/)
    assert.match(translateSuggestionLabel('🎉 This Sat (Sat, 31 Oct)', 'hi'), /इस शनिवार/)
    assert.match(translateSuggestionLabel('✅ Proceed with 250 guests', 'te'), /250/)
    assert.equal(translateSuggestionLabel('👍 Happy with this menu', 'en'), '👍 Happy with this menu')
    assert.notEqual(translateSuggestionLabel('👍 Happy with this menu', 'hi'), '👍 Happy with this menu')
  })
})
