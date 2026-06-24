import { NextResponse } from 'next/server'

const CORS = { 'Access-Control-Allow-Origin': '*' }

export interface IgPost {
  id: string
  media_url: string
  thumbnail_url?: string
  permalink: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  timestamp: string
}

let cache: { posts: IgPost[]; ts: number } | null = null
const CACHE_TTL = 30 * 60 * 1000 // 30 min

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' } })
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ posts: cache.posts }, { headers: CORS })
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ posts: [], error: 'INSTAGRAM_ACCESS_TOKEN not set' }, { status: 200, headers: CORS })
  }

  try {
    // Refresh the token (extends it by 60 days each time, keeps it alive)
    fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`,
      { signal: AbortSignal.timeout(5000) }
    ).catch(() => {})

    // Fetch latest 12 posts
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=12&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const data = await res.json()

    if (!data.data) {
      return NextResponse.json({ posts: [], error: data.error?.message || 'No data' }, { headers: CORS })
    }

    const posts: IgPost[] = (data.data as IgPost[]).filter(
      p => p.media_type === 'IMAGE' || p.media_type === 'CAROUSEL_ALBUM' || p.media_type === 'VIDEO'
    )

    cache = { posts, ts: Date.now() }
    return NextResponse.json({ posts }, { headers: CORS })
  } catch (e) {
    return NextResponse.json({ posts: [], error: String(e) }, { headers: CORS })
  }
}
