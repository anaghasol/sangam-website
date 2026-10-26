import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { latestMentionedBranch, latestDietary, latestMenuSelection, resolveOutdoorDishes, snapshotBooking, diffBooking, buildChangeAck } from '@/lib/booking-changes'
import { latestStatedGuestCount } from '@/lib/hall-capacity'

const u = (content: string) => ({ role: 'user', content })
const a = (content: string) => ({ role: 'assistant', content })

describe('Booking changes after an estimate (2026-10-24)', () => {
  test('latestMentionedBranch: the most recent branch wins', () => {
    assert.equal(latestMentionedBranch([u('Peerzadiguda'), a('ok'), u('actually Hayathnagar')]), 'Hayathnagar')
    assert.equal(latestMentionedBranch([u('not Peerzadiguda, Hayathnagar please')]), 'Hayathnagar')
    assert.equal(latestMentionedBranch([u('hello')]), null)
  })

  test('latestMenuSelection: latest package pick wins; a dietary answer is not a pick', () => {
    const msgs = [u('I would like the Platinum Non-Veg Menu at ₹1,000 per plate'), a('...'), u('lets try the Grand Veg Menu at ₹700 per plate instead')]
    assert.match(latestMenuSelection(msgs)!.text, /Grand Veg/)
    assert.equal(latestMenuSelection([u('We prefer Veg and Non-Veg menu packages')]), null)
    assert.equal(latestMenuSelection([u('do you have any other veg menus')]), null)
  })

  test('latestDietary: index of the latest diet statement', () => {
    const d = latestDietary([u('pure veg'), a('ok'), u('actually make it non veg')])
    assert.deepEqual(d, { diet: 'non-veg', index: 2 })
  })

  test('resolveOutdoorDishes: add, remove, replace', () => {
    const msgs = [
      u('Chicken 65, Chicken Dum Biryani, Gulab Jamun'),
      u('remove gulab jamun'),
      u('also add double ka meetha'),
      u('replace chicken 65 with paneer tikka'),
    ]
    assert.deepEqual(resolveOutdoorDishes(msgs).map(d => d.toLowerCase()).sort(), ['chicken dum biryani', 'double ka meetha', 'paneer tikka'])
  })

  test('latestStatedGuestCount: "make it 300" and a bare number answering the guest question', () => {
    assert.equal(latestStatedGuestCount([u('200 guests'), a('estimate'), u('make it 300')]), 300)
    assert.equal(latestStatedGuestCount([a('How many guests are you expecting?'), u('108')]), 108)
    // Money and dates are never a guest count.
    assert.equal(latestStatedGuestCount([u('200 guests'), a('estimate'), u('make it 5000 advance')]), 200)
    assert.equal(latestStatedGuestCount([u('200 guests'), a('What advance would you like to pay?'), u('5000')]), 200)
  })

  test('diffBooking: reports only real changes, not first answers', () => {
    const before = snapshotBooking([u('Peerzadiguda'), u('5 November 2026'), u('200 guests'), u('Grand Veg Menu at ₹700 per plate')])
    const after = snapshotBooking([u('Peerzadiguda'), u('5 November 2026'), u('200 guests'), u('Grand Veg Menu at ₹700 per plate'), u('make it 250 guests and move it to 12 November 2026')])
    const changes = diffBooking(before, after)
    assert.deepEqual(changes.map(c => c.kind).sort(), ['date', 'pax'])
    assert.deepEqual(diffBooking(snapshotBooking([u('hi')]), snapshotBooking([u('hi'), u('200 guests')])), [])
  })

  test('buildChangeAck: human acknowledgement, saved-update and code-change notes', () => {
    const ack = buildChangeAck('en', [{ kind: 'pax', from: 200, to: 300 }, { kind: 'menu' }], { packageName: 'Grand Non Veg Menu', savedCode: 'PA05113210' })!
    assert.match(ack, /Sure, no problem!/)
    assert.match(ack, /200 → 300/)
    assert.match(ack, /Grand Non Veg Menu/)
    assert.match(ack, /saved booking \*\*PA05113210\*\* has been updated/)
    const moved = buildChangeAck('en', [{ kind: 'date', from: '2026-11-05', to: '2026-11-12' }], { savedCode: 'PA12113210', previousCode: 'PA05113210' })!
    assert.match(moved, /5 Nov 2026 → 12 Nov 2026/)
    assert.match(moved, /now \*\*PA12113210\*\* \(it replaces PA05113210\)/)
    assert.equal(buildChangeAck('en', [], {}), null)
    assert.match(buildChangeAck('te', [{ kind: 'pax', from: 200, to: 300 }], {})!, /అతిథుల సంఖ్య/)
  })
})
