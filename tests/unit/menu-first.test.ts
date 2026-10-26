import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ESTIMATE_SHOWN_RE, hasMenuFirstIntent, isMenuApproval, menuReviewState, menuFirstStep } from '@/lib/menu-first'

const u = (content: string) => ({ role: 'user', content })
const a = (content: string) => ({ role: 'assistant', content })
const ASK = 'Are you **happy with this menu**? If so, I will take the remaining details.'

describe('Menu-first conversation order (2026-10-26)', () => {
  test('intent: suggest / book me something, not plain booking details', () => {
    assert.ok(hasMenuFirstIntent([u('suggest me a menu')]))
    assert.ok(hasMenuFirstIntent([u('book me something nice for my birthday')]))
    assert.ok(hasMenuFirstIntent([u('hi'), a('hello'), u('you decide')]))
    assert.ok(!hasMenuFirstIntent([u('hall for 200 guests on 12 Dec at Peerzadiguda')]))
    assert.ok(!hasMenuFirstIntent([a('I can suggest a menu'), u('hi')]))
  })

  test('approval: yes/ok/happy yes, change requests no', () => {
    for (const t of ['yes', 'Yes, I am happy with this menu, please continue', 'looks good 👍', 'ok proceed', 'సరే', 'हाँ ठीक है']) assert.ok(isMenuApproval(t), t)
    for (const t of ['change the starters', 'remove gobi 65', 'no, something different', 'swap the dessert', 'yes but add fish fry', 'Peerzadiguda']) assert.ok(!isMenuApproval(t), t)
  })

  test('review state follows the marker and only later guest messages approve', () => {
    assert.deepEqual(menuReviewState([u('suggest'), a('veg or non-veg?'), u('veg')]), { shown: false, approved: false })
    assert.deepEqual(menuReviewState([u('x'), a('menu ' + ASK)]), { shown: true, approved: false })
    assert.deepEqual(menuReviewState([u('yes ok'), a('menu ' + ASK), u('change the starters')]), { shown: true, approved: false })
    assert.deepEqual(menuReviewState([a('menu ' + ASK), u('change the starters'), a('updated ' + ASK), u('perfect')]), { shown: true, approved: true })
    // An "ok" said BEFORE the menu was shown is not approval of it.
    assert.equal(menuReviewState([u('ok'), a('menu ' + ASK)]).approved, false)
  })

  test('step order: service → branch → diet → menu → review → done', () => {
    const base = { serviceKnown: true, hasBranch: true, hasDiet: true, review: { shown: false, approved: false } }
    assert.equal(menuFirstStep({ ...base, serviceKnown: false, hasBranch: false, hasDiet: false }), 'service')
    assert.equal(menuFirstStep({ ...base, hasBranch: false, hasDiet: false }), 'branch')
    assert.equal(menuFirstStep({ ...base, hasDiet: false }), 'diet')
    assert.equal(menuFirstStep(base), 'menu')
    assert.equal(menuFirstStep({ ...base, review: { shown: true, approved: false } }), 'review')
    assert.equal(menuFirstStep({ ...base, review: { shown: true, approved: true } }), 'done')
  })

  test("estimate detection: our own questions do not count, a real estimate does", () => {
    for (const q of ["Please select which menu package you'd like an estimation for!", "I'll follow up with an estimate.", "Are you **happy with this menu**? I will prepare your quote."]) assert.ok(!ESTIMATE_SHOWN_RE.test(q), q)
    for (const e of ["🏛️ **Indoor AC Banquet Hall Estimation (Peerzadiguda)**", "💰 **Estimation**: ₹600/plate", "🔖 Booking code will be generated"]) assert.ok(ESTIMATE_SHOWN_RE.test(e), e)
  })
})
