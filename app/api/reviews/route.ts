import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' } })
}

let cache: { data: ReviewsResponse; ts: number } | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

const BRANCHES = [
  { id: 'peerzadiguda',         placeId: 'ChIJq9AcaqWfyzsR7AYE2m93hGU', name: 'Sangam Hotel · Peerzadiguda' },
  { id: 'hayathnagar',          placeId: 'ChIJb_7phrihyzsR0YdAt6ots2Y', name: 'Sangam Hotel · Hayathnagar' },
  { id: 'malkapur',             placeId: 'ChIJE4DWKCANyzsRmuj9lZBkAAA', name: 'Sangam Hotels · JIO BP Plaza' },
  { id: 'bakes-hayathnagar',    placeId: 'ChIJvSPSRXmhyzsR_AfEtsejQzQ', name: 'Sangam Bakes & Cakes · Hayathnagar' },
  { id: 'bakes-mansoorabad',    placeId: 'ChIJUX01EqOfyzsRWwVU_0mpvc0', name: 'Sangam Bakes & Cakes · Mansoorabad' },
  { id: 'tiffins-mansoorabad',  placeId: 'ChIJfc0AtTGfyzsRfSHjjoCvM0M', name: 'Sangam Hotel · Mansoorabad' },
  { id: 'tiffins-koyyalagudem', placeId: 'ChIJ8UbADUQNyzsRSsmPF9KvoIg', name: 'Sangam Hotel · Koyyalagudem' },
]

export interface SangamReview {
  author: string
  rating: number
  text: string
  time: string
  branch: string
  branchId: string
}

interface ReviewsResponse {
  reviews: SangamReview[]
  totalFetched: number
}

interface GReview {
  author_name: string
  rating: number
  text: string
  relative_time_description: string
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function fetchFromGoogle(placeId: string, sort: 'newest' | 'most_relevant', key: string): Promise<GReview[]> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&reviews_sort=${sort}&key=${key}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const data = await res.json()
    return data.result?.reviews || []
  } catch {
    return []
  }
}

async function fetchAndPersistBranch(
  branchId: string,
  placeId: string,
  branchName: string,
  key: string,
  sb: ReturnType<typeof getSupabase>
): Promise<SangamReview[]> {
  const [newest, relevant] = await Promise.all([
    fetchFromGoogle(placeId, 'newest', key),
    fetchFromGoogle(placeId, 'most_relevant', key),
  ])

  const seen = new Set<string>()
  const merged: GReview[] = []
  for (const r of [...newest, ...relevant]) {
    const dedupeKey = `${r.author_name}::${r.text?.slice(0, 40)}`
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey)
      merged.push(r)
    }
  }

  const reviews: SangamReview[] = merged
    .filter(r => r.rating >= 4 && r.text?.trim().length > 15)
    .map(r => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text.trim().slice(0, 300),
      time: r.relative_time_description || '',
      branch: branchName,
      branchId,
    }))

  // Persist new reviews to Supabase (upsert ignores duplicates via UNIQUE constraint)
  if (sb && reviews.length > 0) {
    await sb.from('sangam_reviews').upsert(
      reviews.map(r => ({
        author: r.author,
        rating: r.rating,
        text: r.text,
        time_desc: r.time,
        branch: r.branch,
        branch_id: r.branchId,
      })),
      { onConflict: 'author,branch_id,text', ignoreDuplicates: true }
    )
  }

  return reviews
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: CORS })
  }

  const sb = getSupabase()
  const googleKey = process.env.GOOGLE_PLACES_API_KEY

  // Always try to fetch fresh from Google and persist
  let freshReviews: SangamReview[] = []
  if (googleKey) {
    const results = await Promise.allSettled(
      BRANCHES.map(b => fetchAndPersistBranch(b.id, b.placeId, b.name, googleKey, sb))
    )
    results.forEach(r => {
      if (r.status === 'fulfilled') freshReviews.push(...r.value)
    })
  }

  // Pull the full accumulated set from Supabase (may be hundreds over time)
  let allReviews: SangamReview[] = freshReviews
  if (sb) {
    const { data } = await sb
      .from('sangam_reviews')
      .select('author, rating, text, time_desc, branch, branch_id')
      .gte('rating', 4)
      .order('fetched_at', { ascending: false })
      .limit(500)

    if (data && data.length > 0) {
      allReviews = data.map(r => ({
        author: r.author,
        rating: r.rating,
        text: r.text,
        time: r.time_desc || '',
        branch: r.branch,
        branchId: r.branch_id,
      }))
    }
  }

  // Fisher-Yates shuffle
  for (let i = allReviews.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allReviews[i], allReviews[j]] = [allReviews[j], allReviews[i]]
  }

  const response: ReviewsResponse = {
    reviews: allReviews,
    totalFetched: allReviews.length,
  }

  cache = { data: response, ts: Date.now() }
  return NextResponse.json(response, { headers: CORS })
}
