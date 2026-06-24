import { NextResponse } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' } })
}

let cache: { data: ReviewsResponse; ts: number } | null = null
const CACHE_TTL = 60 * 60 * 1000

// Hardcoded place_ids to skip the textsearch step (faster + saves quota)
const BRANCHES = [
  { id: 'peerzadiguda',         placeId: 'ChIJq9AcaqWfyzsR7AYE2m93hGU', name: 'Sangam Hotel Peerzadiguda' },
  { id: 'hayathnagar',          placeId: 'ChIJb_7phrihyzsR0YdAt6ots2Y', name: 'Sangam Hotel Hayathnagar' },
  { id: 'malkapur',             placeId: 'ChIJE4DWKCANyzsRmuj9lZBkAAA', name: 'Sangam Hotels · JIO BP Plaza' },
  { id: 'bakes-hayathnagar',    placeId: 'ChIJvSPSRXmhyzsR_AfEtsejQzQ', name: 'Sangam Bakes and Cakes · Hayathnagar' },
  { id: 'bakes-mansoorabad',    placeId: 'ChIJUX01EqOfyzsRWwVU_0mpvc0', name: 'Sangam Bakes and Cakes · Mansoorabad' },
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
  branches: { id: string; rating: number; count: number }[]
}

interface GReview {
  author_name: string
  rating: number
  text: string
  relative_time_description: string
}

async function fetchDetails(placeId: string, sort: 'newest' | 'most_relevant', key: string): Promise<GReview[]> {
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

async function fetchBranch(
  branchId: string,
  placeId: string,
  branchName: string,
  key: string
): Promise<{ reviews: SangamReview[]; rating: number; count: number }> {
  try {
    // Fetch branch metadata + newest reviews in parallel, then most_relevant
    const metaRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&reviews_sort=newest&key=${key}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const metaData = await metaRes.json()
    const result = metaData.result || {}
    const newestRaw: GReview[] = result.reviews || []

    // Also fetch most_relevant to get a different set
    const relevantRaw = await fetchDetails(placeId, 'most_relevant', key)

    // Merge and de-duplicate by author+text snippet
    const seen = new Set<string>()
    const merged: GReview[] = []
    for (const r of [...newestRaw, ...relevantRaw]) {
      const key = `${r.author_name}::${r.text?.slice(0, 40)}`
      if (!seen.has(key)) {
        seen.add(key)
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

    return {
      reviews,
      rating: result.rating || 0,
      count: result.user_ratings_total || 0,
    }
  } catch {
    return { reviews: [], rating: 0, count: 0 }
  }
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: CORS })
  }

  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    return NextResponse.json({ reviews: [], totalFetched: 0, branches: [] }, { status: 200, headers: CORS })
  }

  const results = await Promise.allSettled(
    BRANCHES.map(b => fetchBranch(b.id, b.placeId, b.name, key))
  )

  const allReviews: SangamReview[] = []
  const branchSummary: { id: string; rating: number; count: number }[] = []

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      allReviews.push(...result.value.reviews)
      branchSummary.push({
        id: BRANCHES[i].id,
        rating: result.value.rating,
        count: result.value.count,
      })
    }
  })

  // Fisher-Yates shuffle so branches interleave naturally
  for (let i = allReviews.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allReviews[i], allReviews[j]] = [allReviews[j], allReviews[i]]
  }

  const response: ReviewsResponse = {
    reviews: allReviews,
    totalFetched: allReviews.length,
    branches: branchSummary,
  }

  cache = { data: response, ts: Date.now() }
  return NextResponse.json(response, { headers: CORS })
}
