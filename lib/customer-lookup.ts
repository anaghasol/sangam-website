/**
 * Customer Recognition & Phone Lookup Service.
 *
 * Checks customer history across:
 * 1. `sangam_order_items` (PetPooja sales records by customer_phone)
 * 2. `public.users` (Registered users & contacts by voice_phone / whatsapp_phone)
 * 3. `eventmgmt.booking` (Past event bookings)
 */
import { createClient } from '@supabase/supabase-js'

export type CustomerProfile = {
  phone: string
  name: string | null
  orderCount: number
  totalSpend: number
  favoriteItems: string[]
  isReturning: boolean
  loyaltyDiscountPercent: number
  lastOrderDate?: string
}

function sbPublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
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
    // 1. Check PetPooja sales records (sangam_order_items)
    const { data: orderRows } = await client
      .from('sangam_order_items')
      .select('customer_name, item_name, item_total, ordered_at')
      .ilike('customer_phone', `%${phone.slice(-10)}%`)
      .order('ordered_at', { ascending: false })
      .limit(50)

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

    const isReturning = orderCount > 0 || !!customerName

    return {
      phone,
      name: customerName,
      orderCount,
      totalSpend: Math.round(totalSpend),
      favoriteItems: topItems,
      isReturning,
      loyaltyDiscountPercent: isReturning ? 5 : 0,
      lastOrderDate
    }
  } catch (err) {
    console.warn('Customer lookup error:', err)
    return null
  }
}
