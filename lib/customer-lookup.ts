/**
 * Customer Recognition & Phone Lookup Service.
 *
 * Checks customer history across:
 * 1. `sangam_order_items` (PetPooja sales records by customer_phone)
 * 2. `public.users` (Registered users & contacts by voice_phone / whatsapp_phone)
 * 3. `eventmgmt.customer_profile` + `booking_customer` + `booking` (real past
 *    catering/banquet bookings — separate from PetPooja retail orders above,
 *    and previously not checked at all despite the docstring here claiming it)
 *
 * Read-only throughout — every query here is a SELECT. Nothing in this file
 * writes, updates, or deletes rows in any table.
 */
import { createClient } from '@supabase/supabase-js'

export type PastCateringEvent = {
  bookingCode: string | null
  eventDate: string | null
  occasion: string | null
  pax: number | null
  branchName: string | null
  serviceType: string | null
  totalAmount: number | null
}

export type CustomerProfile = {
  phone: string
  name: string | null
  orderCount: number
  totalSpend: number
  favoriteItems: string[]
  isReturning: boolean
  loyaltyDiscountPercent: number
  lastOrderDate?: string
  /** Real catering/banquet booking history, from eventmgmt — not PetPooja retail. */
  cateringBookingCount: number
  lastCateringEvent: PastCateringEvent | null
  tags: string[]
  notes: string | null
}

function sbPublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function sbEvent() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'eventmgmt' } })
}

/**
 * Looks up real catering/banquet booking history for a phone number via
 * eventmgmt.customer_profile -> booking_customer -> booking (+ occasion,
 * hall, branches for readable labels). Read-only.
 */
async function lookupCateringHistory(phone: string): Promise<{
  count: number
  lastEvent: PastCateringEvent | null
  tags: string[]
  notes: string | null
}> {
  const empty = { count: 0, lastEvent: null, tags: [], notes: null }
  const client = sbEvent()
  if (!client) return empty

  try {
    const last10 = phone.slice(-10)

    // customer_profile is the master identity; booking_customer is the
    // per-booking snapshot. A customer can exist in booking_customer without
    // a matching customer_profile row (older bookings), so search both.
    const [profileRes, bcRes] = await Promise.all([
      client.from('customer_profile').select('id, tags, notes').ilike('phone', `%${last10}%`).limit(1),
      client.from('booking_customer').select('booking_id').ilike('phone', `%${last10}%`).limit(50),
    ])

    const profile = profileRes.data?.[0]
    let bookingIds = (bcRes.data || []).map((r: any) => r.booking_id)

    // If a customer_profile matched, also pull any booking_customer rows
    // linked by profile id (covers bookings recorded under a slightly
    // different phone format but the same master profile).
    if (profile?.id) {
      const { data: byProfile } = await client
        .from('booking_customer')
        .select('booking_id')
        .eq('customer_profile_id', profile.id)
        .limit(50)
      bookingIds = [...new Set([...bookingIds, ...(byProfile || []).map((r: any) => r.booking_id)])]
    }

    if (bookingIds.length === 0) {
      return { count: 0, lastEvent: null, tags: profile?.tags || [], notes: profile?.notes || null }
    }

    const { data: bookings } = await client
      .from('booking')
      .select('booking_code, event_date, pax, service_type, total_amount, status, occasion_id, branch_id')
      .in('id', bookingIds)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: false })
      .limit(20)

    if (!bookings || bookings.length === 0) {
      return { count: 0, lastEvent: null, tags: profile?.tags || [], notes: profile?.notes || null }
    }

    // branches lives in the public schema, not eventmgmt — needs the other client.
    const publicClient = sbPublic()
    const latest = bookings[0]
    const [occRes, branchRes] = await Promise.all([
      latest.occasion_id ? client.from('occasion').select('name').eq('id', latest.occasion_id).limit(1) : Promise.resolve({ data: null } as any),
      latest.branch_id && publicClient ? publicClient.from('branches').select('name').eq('id', latest.branch_id).limit(1) : Promise.resolve({ data: null } as any),
    ]).catch(() => [{ data: null }, { data: null }] as any)

    const lastEvent: PastCateringEvent = {
      bookingCode: latest.booking_code || null,
      eventDate: latest.event_date || null,
      occasion: occRes?.data?.[0]?.name || null,
      pax: latest.pax ?? null,
      branchName: branchRes?.data?.[0]?.name || null,
      serviceType: latest.service_type || null,
      totalAmount: latest.total_amount ?? null,
    }

    return { count: bookings.length, lastEvent, tags: profile?.tags || [], notes: profile?.notes || null }
  } catch (e) {
    console.warn('Catering booking history lookup failed (non-fatal):', e)
    return empty
  }
}

/**
 * Extracts a 10-digit Indian phone number from text if present.
 */
export function extractPhoneNumber(text: string): string | null {
  if (!text) return null
  // Match +91-XXXXXXXXXX or 10-digit number starting with 6, 7, 8, 9
  const cleaned = text.replace(/[\s\-\(\)]/g, '')
  const match = cleaned.match(/(?:\+91|91)?([6-9]\d{9})\b/)
  return match ? match[1] : null
}

/**
 * Looks up customer history and loyalty eligibility by phone number.
 */
export async function lookupCustomerByPhone(rawPhone: string): Promise<CustomerProfile | null> {
  const phone = extractPhoneNumber(rawPhone) || rawPhone.trim()
  if (!phone || phone.length < 10) return null

  const client = sbPublic()
  if (!client) return null

  try {
    // 1. Check PetPooja sales records (sangam_order_items) and real catering
    // booking history (eventmgmt) in parallel — two different kinds of
    // "returning customer" that both matter for recognition.
    const [orderRes, cateringHistory] = await Promise.all([
      client
        .from('sangam_order_items')
        .select('customer_name, item_name, item_total, ordered_at')
        .ilike('customer_phone', `%${phone.slice(-10)}%`)
        .order('ordered_at', { ascending: false })
        .limit(50),
      lookupCateringHistory(phone),
    ])
    const orderRows = orderRes.data

    let customerName: string | null = null
    let totalSpend = 0
    let orderCount = 0
    const itemCounts = new Map<string, number>()
    let lastOrderDate: string | undefined

    if (orderRows && orderRows.length > 0) {
      orderCount = orderRows.length
      lastOrderDate = orderRows[0].ordered_at

      for (const row of orderRows) {
        if (!customerName && row.customer_name && row.customer_name !== '.' && row.customer_name.trim().length > 1) {
          customerName = row.customer_name.trim()
        }
        totalSpend += Number(row.item_total) || 0
        if (row.item_name) {
          itemCounts.set(row.item_name, (itemCounts.get(row.item_name) || 0) + 1)
        }
      }
    }

    // 2. If name not found, check public.users
    if (!customerName) {
      const { data: userRows } = await client
        .from('users')
        .select('first_name, last_name')
        .or(`voice_phone.ilike.%${phone.slice(-10)}%,whatsapp_phone.ilike.%${phone.slice(-10)}%`)
        .limit(1)

      if (userRows && userRows.length > 0) {
        const u = userRows[0]
        customerName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || null
      }
    }

    const topItems = [...itemCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)

    // A returning customer now means EITHER a past retail order (PetPooja)
    // OR a past real catering/banquet booking (eventmgmt) — previously only
    // the former counted, so a customer who'd only ever booked an event
    // (never ordered food directly) was invisible to this lookup.
    const isReturning = orderCount > 0 || !!customerName || cateringHistory.count > 0

    return {
      phone,
      name: customerName,
      orderCount,
      totalSpend: Math.round(totalSpend),
      favoriteItems: topItems,
      isReturning,
      loyaltyDiscountPercent: isReturning ? 5 : 0,
      lastOrderDate,
      cateringBookingCount: cateringHistory.count,
      lastCateringEvent: cateringHistory.lastEvent,
      tags: cateringHistory.tags,
      notes: cateringHistory.notes,
    }
  } catch (err) {
    console.warn('Customer lookup error:', err)
    return null
  }
}
