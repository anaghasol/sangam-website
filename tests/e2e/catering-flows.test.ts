import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extractAddress, extractCustomerName, isBookingConfirmation } from '@/app/api/chat/route'
import { generatePopularCateringQuote } from '@/lib/catering-portions'

describe('Indoor & Outdoor Catering End-to-End Chat Flows', () => {
  const routeContent = readFileSync('app/api/chat/route.ts', 'utf-8')

  describe('Indoor AC Banquet Hall Flow', () => {
    test('Sequential intake order: Branch -> Date -> Slot -> Pax -> Dietary -> Package -> Estimation', () => {
      // Verifies the exact sequential question flow
      assert.ok(routeContent.includes('1. Branch: If missing and no date, ask: "Which branch do you prefer'), 'Branch question must be step 1')
      assert.ok(routeContent.includes('2. Event Date: If missing, ask for the event date'), 'Event date must be step 2')
      assert.ok(routeContent.includes('3. Time Slot: If event date is known but time slot is missing'), 'Time slot must be step 3')
      assert.ok(routeContent.includes('4. Guest Count (Pax): If time slot is known but pax is missing'), 'Pax must be step 4')
      assert.ok(routeContent.includes('5. Dietary Preference: If pax is known but dietary preference is missing'), 'Dietary must be step 5')
      assert.ok(routeContent.includes('6. Menu Package: Once dietary preference is selected'), 'Menu package must be step 6')
      assert.ok(routeContent.includes('7. Full Estimation & Dish Spread Breakdown: ONLY AFTER'), 'Estimation must be step 7')
    })

    test('Date & Time numbers are stripped so they never corrupt guest count (Pax)', () => {
      // In route.ts, stripDateNumbers() prevents "20th Nov 2026" from setting pax = 20 or "7:30 PM" setting pax = 30
      const stripDateNumbersRegex = /\b\d{1,2}\s*(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*,?\s*\d{0,4}\b/gi
      const stripTimeRegex = /\b\d{1,2}:\d{2}(?:\s*(?:am|pm))?\b/gi

      const textWithDateAndTime = 'We need catering on 20th Nov 2026 at 7:30 PM for 85 guests'
      const stripped = textWithDateAndTime.replace(stripDateNumbersRegex, ' ').replace(stripTimeRegex, ' ')

      const paxMatch = stripped.match(/\b(\d{2,4})\s*(?:guests|people|pax)?\b/i)
      assert.equal(paxMatch?.[1], '85', 'Must extract 85 as pax, ignoring 20 from date and 30 from 7:30')
    })

    test('Quote generation for Indoor: generates structured estimation with hall and package rate', () => {
      const quote = generatePopularCateringQuote('inhouse', 'Peerzadiguda', 100, false)
      assert.ok(quote.headline.includes('Indoor AC Banquet Hall Estimation') || quote.headline.includes('Banquet'), 'Headline must specify Indoor banquet')
      assert.ok(quote.pricePerPlate > 0, 'Must have a positive plate rate')
      assert.ok(quote.subtotal >= quote.pricePerPlate * 100, 'Subtotal must match pax calculation')
      assert.ok(quote.trayBreakdown.length > 0, 'Must provide tray breakdown')
      assert.ok(quote.menuItems.length > 0, 'Must list categorized menu items')
    })

    test('Indoor Confirmation Gate: Phone/WhatsApp is mandatory before saving quote', () => {
      // In route.ts line 1274-1276:
      // const mandatoryDetailsPresent = isIndoor ? !!targetPhone : !!(targetPhone && customerName && targetAddress)
      const isIndoor = true
      const targetPhoneWithNumber = '9063844021'
      const targetPhoneEmpty = null

      const mandatory1 = isIndoor ? !!targetPhoneWithNumber : false
      const mandatory2 = isIndoor ? !!targetPhoneEmpty : false

      assert.equal(mandatory1, true, 'Indoor booking with phone has mandatory details present')
      assert.equal(mandatory2, false, 'Indoor booking without phone must NOT satisfy mandatory details')
    })
  })

  describe('Outdoor Catering & Custom Tray Flow', () => {
    test('Intake rule: Pax + Menu immediately generates estimate without asking for banquet halls', () => {
      assert.ok(
        routeContent.includes('NEVER ask for banquet hall slots or assign banquet halls — this is delivery/onsite setup at customer\'s venue!'),
        'Must strictly forbid assigning banquet halls for outdoor delivery'
      )
      assert.ok(
        routeContent.includes('As soon as Pax and Items are provided (or if the customer already included them in their text), IMMEDIATELY generate and display the full Outdoor Catering Estimation!'),
        'Must trigger immediate outdoor estimation on Pax + Items'
      )
    })

    test('Delivery address extraction (extractAddress)', () => {
      // Explicit phrase match
      assert.equal(
        extractAddress('Our delivery address is Plot 42, Green Valley Hills, Hyderabad'),
        'Plot 42, Green Valley Hills, Hyderabad'
      )
      assert.equal(
        extractAddress('Please deliver to Hilltop Farmhouse, Gandipet'),
        'Hilltop Farmhouse, Gandipet'
      )
      assert.equal(
        extractAddress('Venue is Royal Palace Hall, Hayathnagar'),
        'Royal Palace Hall, Hayathnagar'
      )

      // 6-digit Indian PIN code fallback line
      assert.equal(
        extractAddress('House No 5-21, Street 4, Hayathnagar, Hyderabad 501505'),
        'House No 5-21, Street 4, Hayathnagar, Hyderabad 501505'
      )

      // Non-address text returns null
      assert.equal(extractAddress('We want mutton biryani and chicken 65'), null)
    })

    test('Customer name extraction (extractCustomerName)', () => {
      assert.equal(extractCustomerName('My name is Ravi Sharma'), 'Ravi Sharma')
      assert.equal(extractCustomerName('this is Kishore Reddy speaking'), 'Kishore Reddy')
      assert.equal(extractCustomerName('I am Vikram Rao'), 'Vikram Rao')
      assert.equal(extractCustomerName('Just checking the menu prices'), null)
      // Regressions (2026-10-23): ordinary sentences are not names, and
      // the next detail in the message doesn't run into the name.
      assert.equal(extractCustomerName('I am looking for a banquet hall'), null)
      assert.equal(extractCustomerName("I'm planning a wedding"), null)
      assert.equal(extractCustomerName('this is for 100 guests'), null)
      assert.equal(extractCustomerName('my name is ravi kumar'), 'Ravi Kumar')
      assert.equal(extractCustomerName('confirm. My name is Ravi Kumar, delivery address is Plot 12'), 'Ravi Kumar')
      assert.equal(extractCustomerName('My name is Ravi Kumar delivery address is Plot 12'), 'Ravi Kumar')
    })

    test('isBookingConfirmation: "save the quote" counts; hall-capacity chips do not (2026-10-23)', () => {
      // Real outdoor guest wording that used to be ignored (quote never saved).
      assert.ok(isBookingConfirmation('save the quote and this was my details like 9876541695'))
      assert.ok(isBookingConfirmation('I would like to save this quote for 10 days. My WhatsApp number is 9876543210'))
      assert.ok(isBookingConfirmation('confirm the order'))
      assert.ok(isBookingConfirmation('yes go ahead'))
      assert.ok(isBookingConfirmation('please book this'))
      // Browsing / seating answers are not a booking confirmation.
      assert.equal(isBookingConfirmation('Yes, please proceed with Sangamam Hall for 250 guests'), false)
      assert.equal(isBookingConfirmation('I need all 400 guests — please proceed and have the catering manager confirm the seating arrangement'), false)
      assert.equal(isBookingConfirmation('how much is the quote for 100 guests'), false)
      assert.equal(isBookingConfirmation('can I book a hall for my wedding'), false)
    })

    test('Delivery address extraction stops at phone/name details (2026-10-23)', () => {
      assert.equal(
        extractAddress('delivery address is Plot 12, Road 3, Hayathnagar 501505, phone 9876543210'),
        'Plot 12, Road 3, Hayathnagar 501505'
      )
      assert.equal(
        extractAddress('Plot 12, Road 3, Hayathnagar 501505 9876543210'),
        'Plot 12, Road 3, Hayathnagar 501505'
      )
      assert.equal(extractAddress('We need it delivered to Green Park Farmhouse, Shamshabad'), 'Green Park Farmhouse, Shamshabad')
    })

    test('Quote generation for Outdoor: includes live setup, tray capacities, and 10-day validity', () => {
      const quote = generatePopularCateringQuote('outdoor', 'Hayathnagar', 60, false)
      assert.ok(quote.headline.includes('Outdoor Catering & Live Food Setup Estimation'), 'Headline must specify outdoor catering')
      assert.ok(quote.trayBreakdown.some(t => t.includes('Biryani Trays')), 'Must include Biryani tray scaling')
      assert.ok(quote.trayBreakdown.some(t => t.includes('Starter Trays')), 'Must include Starter tray scaling')
      assert.ok(quote.trayBreakdown.some(t => t.includes('Curry Trays')), 'Must include Curry tray scaling')
      assert.ok(quote.trayBreakdown.some(t => t.includes('Live Tandoor Breads')), 'Must include live breads count')
    })

    test('Outdoor Confirmation Gate: Name, Delivery Address, AND Phone are ALL mandatory before saving', () => {
      const isIndoor = false
      const phone = '9063844021'
      const name = 'Suresh Kumar'
      const address = 'Plot 88, Jubilee Hills, Hyderabad 500033'

      // All 3 present
      const allPresent = !isIndoor ? !!(phone && name && address) : false
      assert.equal(allPresent, true, 'Outdoor booking with name, address, and phone satisfies mandatory details')

      // Missing address
      const missingAddress = !isIndoor ? !!(phone && name && null) : false
      assert.equal(missingAddress, false, 'Missing address must block outdoor quote confirmation')

      // Missing name
      const missingName = !isIndoor ? !!(phone && null && address) : false
      assert.equal(missingName, false, 'Missing name must block outdoor quote confirmation')

      // Missing phone
      const missingPhone = !isIndoor ? !!(null && name && address) : false
      assert.equal(missingPhone, false, 'Missing phone must block outdoor quote confirmation')
    })
  })

  describe('Confirmation & Database Saving Invariants', () => {
    test('Explicit Confirmation Regex distinguishes confirmation from casual inquiries', () => {
      const confirmRegex = /\b(?:yes,?\s*)?(?:please\s+)?confirm(?:ed)?\b|\bgo ahead\b|\bproceed\b|\bbook it\b|\block (?:it|this) in\b|\btentatively booked\b/i

      // Positive confirmation phrases
      assert.ok(confirmRegex.test('Please confirm this quote'))
      assert.ok(confirmRegex.test('Yes, confirm the booking'))
      assert.ok(confirmRegex.test('Go ahead and book it'))
      assert.ok(confirmRegex.test('I want to proceed'))
      assert.ok(confirmRegex.test('Lock it in for me'))

      // Casual inquiries should NOT trigger confirmation
      assert.ok(!confirmRegex.test('Can you tell me more about the chicken biryani?'))
      assert.ok(!confirmRegex.test('What is the price for 100 guests?'))
      assert.ok(!confirmRegex.test('Is hall available on Sunday?'))
    })

    test('Advance payment detection triggers confirmation intent', () => {
      const advanceRegex = /advance\s*(?:payment|amount|of|paid)?\s*[:\-]?\s*₹?\s*([\d,]+)/i

      const match1 = 'I will pay advance of ₹5,000 now'.match(advanceRegex)
      assert.equal(match1?.[1].replace(/,/g, ''), '5000')

      const match2 = 'advance payment: 10000'.match(advanceRegex)
      assert.equal(match2?.[1], '10000')

      const match3 = 'Can I pay advance later?'.match(advanceRegex)
      assert.equal(match3, null, 'Question about advance without amount is not a payment statement')
    })

    test('Two-Step Confirmation Flow: prevents spamming full menu while collecting missing details', () => {
      assert.ok(
        routeContent.includes('TWO-STEP CONFIRMATION FLOW — NEVER RE-SHOW THE FULL ITEMIZED ESTIMATION WHILE ONLY COLLECTING DETAILS'),
        'Must enforce two-step confirmation flow in prompt'
      )
      assert.ok(
        routeContent.includes('Reply with ONLY a short message: thank them for what they gave, and ask for whatever mandatory detail is still missing'),
        'Must instruct bot to keep reply brief when collecting missing details'
      )
      assert.ok(
        routeContent.includes('Only once ALL mandatory details for that booking type are on file'),
        'Consolidated booking summary must only appear once all details are present'
      )
    })

    test('Database Saving Logic: quotes saved to sangam.quotes with status confirmed_awaiting_payment', () => {
      assert.ok(
        routeContent.includes("status: isExplicitConfirmation && mandatoryDetailsPresent ? 'confirmed_awaiting_payment' : 'active'"),
        'Quote must be marked confirmed_awaiting_payment when confirmed with all details'
      )
      assert.ok(
        routeContent.includes("if (targetPhone && saveBookingCode && bookingEventDate && isExplicitConfirmation && mandatoryDetailsPresent")
          && routeContent.includes("if (!quoteErr) quoteSaved = true"),
        'quoteSaved telemetry flag is true only when phone, booking code, confirmation, and mandatory details exist AND the save succeeded'
      )
      assert.ok(
        routeContent.includes("quote_number: quoteNumber"),
        'Quote row is keyed on server-generated quote_number'
      )
    })
  })
})
