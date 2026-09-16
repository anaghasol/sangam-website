import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBranchIdByName } from '@/lib/sangam-catering'

// NOTE: nothing in app/page.tsx or app/embed/chat/page.tsx currently calls
// this route — the chat's own [SAVE_QUOTE:...] handling in app/api/chat/route.ts
// is what actually persists bookings today. Kept working/consistent in case
// a client is wired up to call it directly.

function sbEvent() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'eventmgmt' } })
}

export async function POST(req: NextRequest) {
  try {
    const { whatsappPhone, customerName, guestCount, serviceType, eventDate, dishNames, subtotal, branch } = await req.json()

    if (!whatsappPhone) {
      return NextResponse.json({ error: 'WhatsApp phone is required' }, { status: 400 })
    }

    // Generate unique quote / booking reference number (e.g. SGM-8942)
    const quoteNumber = `SGM-${Math.floor(1000 + Math.random() * 9000)}`
    const validUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const targetDate = eventDate && /^\d{4}-\d{2}-\d{2}$/.test(eventDate)
      ? eventDate
      : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    // Real branch_id looked up by name; falls back to the flagship UUID only
    // if no branch was given or the lookup fails (never silently drops the booking).
    const resolvedBranchId = branch ? await getBranchIdByName(String(branch)) : null
    if (branch && !resolvedBranchId) {
      console.warn(`[save-quote] Could not resolve branch_id for "${branch}" — using fallback UUID.`)
    }
    const branchId = resolvedBranchId || '6215d413-e566-44a8-b8fd-f2b2d5a90e98'

    const client = sbEvent()
    let savedBooking = null

    if (client) {
      const { data, error } = await client
        .from('booking')
        .insert({
          branch_id: branchId,
          service_type: (serviceType || 'outdoor').toLowerCase().includes('inhouse') || (serviceType || '').toLowerCase().includes('indoor') ? 'inhouse' : 'outdoor',
          event_date: targetDate,
          pax: guestCount || 50,
          status: 'draft',
          booking_code: quoteNumber,
          total_amount: subtotal || null,
          amount_paid: 0,
          payment_status: 'unpaid',
          catering_contacts: {
            whatsapp_phone: whatsappPhone,
            customer_name: customerName || 'Guest',
            source: 'ai_chatbot',
            valid_until: validUntil,
            dish_summary: dishNames || 'Sangam Catering Package'
          },
          menu_selection: {
            dishes: Array.isArray(dishNames) ? dishNames : [dishNames || 'Custom Selection'],
            service: serviceType || 'Outdoor Catering'
          }
        })
        .select()
        .single()

      if (!error && data) {
        savedBooking = data
      }
    }

    return NextResponse.json({
      ok: true,
      quote: {
        quote_number: quoteNumber,
        whatsapp_phone: whatsappPhone,
        guest_count: guestCount,
        valid_until: validUntil,
        total_amount: subtotal,
        booking_id: savedBooking?.id || null
      }
    })
  } catch (err) {
    console.error('Error in /api/sangam/save-quote:', err)
    return NextResponse.json({ error: 'Failed to save quote' }, { status: 500 })
  }
}
