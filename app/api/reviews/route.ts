import { NextResponse } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' } })
}

// Cache in-process between serverless warm invocations
let cache: { data: ReviewsResponse; ts: number } | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

const BRANCHES = [
  { id: 'peerzadiguda',        query: 'Sangam Hotel Peerzadiguda Hyderabad India' },
  { id: 'hayathnagar',         query: 'Sangam Hotel Hayathnagar Hyderabad India' },
  { id: 'malkapur',            query: 'Sangam Hotel Malkapur Choutuppal Telangana' },
  { id: 'bakes-hayathnagar',   query: 'Sangam Bakes Cakes Hayathnagar Hyderabad' },
  { id: 'bakes-mansoorabad',   query: 'Sangam Bakes Cakes Mansoorabad LB Nagar Hyderabad' },
  { id: 'tiffins-mansoorabad', query: 'Sangam Hotel Mansoorabad LB Nagar Hyderabad' },
  { id: 'tiffins-koyyalagudem',query: 'Sangam Hotel Koyyalagudem Choutuppal Nalgonda' },
]

export interface SangamReview {
  author: string
  rating: number
  text: string
  time: string
  branch: string
  branchId: string
  photoUrl?: string
}

interface ReviewsResponse {
  reviews: SangamReview[]
  totalFetched: number
  branches: { id: string; rating: number; count: number }[]
}

async function fetchBranchReviews(
  branchId: string,
  query: string,
  key: string
): Promise<{ reviews: SangamReview[]; rating: number; count: number }> {
  try {
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${key}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const searchData = await searchRes.json()
    const place = searchData.results?.[0]
    if (!place?.place_id) return { reviews: [], rating: 0, count: 0 }

    const branchLabel = place.name || query.split(' ').slice(0, 3).join(' ')

    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,user_ratings_total,reviews&reviews_sort=newest&key=${key}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const details = await detailsRes.json()
    const result = details.result || {}

    const reviews: SangamReview[] = (result.reviews || [])
      .filter((r: { rating: number; text: string }) => r.rating >= 4 && r.text?.trim().length > 20)
      .map((r: {
        author_name: string
        rating: number
        text: string
        relative_time_description: string
        profile_photo_url?: string
      }) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text.trim().slice(0, 320),
        time: r.relative_time_description || '',
        branch: branchLabel,
        branchId,
        photoUrl: r.profile_photo_url,
      }))

    return {
      reviews,
      rating: result.rating || place.rating || 0,
      count: result.user_ratings_total || place.user_ratings_total || 0,
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
    BRANCHES.map(b => fetchBranchReviews(b.id, b.query, key))
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

  // Shuffle so branches interleave naturally in the marquee
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
