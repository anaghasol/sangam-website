// TEMPORARY internal utility route — runs the same keyword-mode knowledge
// seeding as scripts/seed-knowledge.mjs, but server-side inside the running
// Next.js dev server (which has real internet access to Supabase, unlike
// the device-bridge shell or the seeding script run from an isolated
// sandbox). Insert-only / one safe UPDATE-if-missing-embedding, exactly
// like the CLI script — see that file's header comment for the full safety
// rationale. Meant to be hit once from the browser, then deleted.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function sbSangam() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'sangam' } })
}

function chunkMarkdown(md: string) {
  const sections = md.split(/\n(?=## )/g).filter(s => s.trim().startsWith('## '))
  return sections.map(section => {
    const headingMatch = section.match(/^##\s+(.+)/)
    const heading = headingMatch ? headingMatch[1].trim() : 'general'
    const category = heading.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    return { heading, category, content: section.trim() }
  })
}

export async function GET() {
  const client = sbSangam()
  if (!client) return NextResponse.json({ error: 'No Supabase client (missing env vars)' }, { status: 500 })

  const filePath = join(process.cwd(), 'sangam-catering-knowledge.md')
  const md = readFileSync(filePath, 'utf-8')
  const chunks = chunkMarkdown(md)

  const log: string[] = [`Parsed ${chunks.length} section(s)`]
  let inserted = 0, skippedExisting = 0, skippedTodo = 0

  for (const chunk of chunks) {
    const nonHeadingText = chunk.content.replace(/^##.*$/m, '').trim()
    const todoCount = (nonHeadingText.match(/TODO/g) || []).length
    const lineCount = nonHeadingText.split('\n').filter(l => l.trim().startsWith('-')).length
    if (lineCount > 0 && todoCount >= lineCount) {
      skippedTodo++
      log.push(`- skipped (still TODO): ${chunk.heading}`)
      continue
    }

    const { data: existing } = await client
      .from('knowledge_chunks')
      .select('id')
      .eq('active', true)
      .eq('content', chunk.content)
      .limit(1)

    if (existing && existing.length > 0) {
      skippedExisting++
      log.push(`= already seeded: ${chunk.heading}`)
      continue
    }

    const { error } = await client.from('knowledge_chunks').insert({
      content: chunk.content,
      category: chunk.category,
      source: 'manual',
      embedding: null,
      active: true,
    })
    if (error) {
      log.push(`! failed "${chunk.heading}": ${error.message}`)
    } else {
      inserted++
      log.push(`+ seeded (keyword search only): ${chunk.heading}`)
    }
  }

  log.push(`Done. Inserted ${inserted}, skipped ${skippedExisting} (already seeded), skipped ${skippedTodo} (placeholder).`)
  return NextResponse.json({ log, inserted, skippedExisting, skippedTodo })
}
