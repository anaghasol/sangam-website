// TEMPORARY diagnostic route — checks whether today's test conversations
// actually landed real rows in eventmgmt.booking (which IS an exposed
// PostgREST schema, unlike sangam), to calibrate against the sangam-schema
// exposure problem found while seeding knowledge_chunks.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sbEvent() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'eventmgmt' } })
}
function sbSangam() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'sangam' } })
}

export async function GET() {
  const out: any = {}

  const ev = sbEvent()
  if (ev) {
    const { data, error } = await ev
      .from('booking')
      .select('id, booking_code, service_type, status, created_at')
      .ilike('booking_code', 'SGM-%')
      .order('created_at', { ascending: false })
      .limit(20)
    out.eventmgmt_booking = { count: data?.length ?? 0, error: error?.message, rows: data }
  }

  const sg = sbSangam()
  if (sg) {
    const { data, error } = await sg
      .from('quotes')
      .select('id, quote_number, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    out.sangam_quotes = { count: data?.length ?? 0, error: error?.message, rows: data }
  }

  return NextResponse.json(out)
}
