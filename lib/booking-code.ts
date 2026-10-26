/**
 * Booking code generation for chat quotes.
 *
 * The code shown to the guest on a quote IS the booking code: it is saved as
 * sangam.quotes.quote_number and, once payment is done and the quote is
 * promoted, reused verbatim as eventmgmt.booking.booking_code.
 *
 * Format (10 characters, per the booking-code spec, 2026-10-23):
 *   Indoor  (banquet):  {BRANCH_FIRST}{BRANCH_LAST}{DD}{MM}{PHONE_LAST4}  e.g. TY05113210
 *   Outdoor (OCater):   OC{DD}{MM}{PHONE_LAST4}                           e.g. OC17043210
 *
 * The code is derived from the booking's own details, so it can only be
 * generated once the event date and phone number (and, for indoor, the
 * branch) are known -- and it stays the same on every turn as long as those
 * details don't change.
 */
import { extractExplicitEventDate } from '@/lib/catering-portions'

function phoneLast4(phone: string): string {
  return (phone || '').replace(/\D/g, '').slice(-4).padStart(4, '0')
}

/** `{BRANCH_FIRST}{BRANCH_LAST}{DD}{MM}{PHONE_LAST4}` — eventDate is YYYY-MM-DD. */
export function generateIndoorBookingCode(branchName: string, eventDate: string, phone: string): string {
  const cleanBranch = (branchName || '').replace(/\s+/g, '').toUpperCase()
  const prefix = (cleanBranch[0] || 'X') + (cleanBranch[cleanBranch.length - 1] || 'X')
  const [, mm, dd] = (eventDate || '').split('-')
  return `${prefix}${dd || '00'}${mm || '00'}${phoneLast4(phone)}`
}

/** `OC{DD}{MM}{PHONE_LAST4}` — eventDate is YYYY-MM-DD. */
export function generateOutdoorBookingCode(eventDate: string, phone: string): string {
  const [, mm, dd] = (eventDate || '').split('-')
  return `OC${dd || '00'}${mm || '00'}${phoneLast4(phone)}`
}

/**
 * The booking code for a chat booking, or null while a required detail is
 * still missing — never a code built from a placeholder date/branch/phone.
 */
export function generateChatBookingCode(opts: {
  serviceType: 'inhouse' | 'outdoor'
  branchName: string | null
  eventDate: string | null
  phone: string | null
}): string | null {
  const { serviceType, branchName, eventDate, phone } = opts
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !phone) return null
  if (serviceType === 'outdoor') return generateOutdoorBookingCode(eventDate, phone)
  if (!branchName) return null
  return generateIndoorBookingCode(branchName, eventDate, phone)
}

/**
 * The event date the guest most recently stated (YYYY-MM-DD), scanning their
 * messages newest-first — so a corrected date ("actually make it 25 Nov
 * 2026") changes the code, instead of the first date ever mentioned winning.
 */
export function latestStatedEventDate(userMessages: string[]): string | null {
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const d = extractExplicitEventDate(userMessages[i])
    if (d) return d
  }
  return null
}
