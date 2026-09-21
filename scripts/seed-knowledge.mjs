#!/usr/bin/env node
/**
 * Seeds sangam-catering-knowledge.md into sangam.knowledge_chunks with real
 * OpenAI embeddings, so the chat's semantic search in
 * lib/sangam-knowledge.ts (searchSangamKnowledgeChunks) has something real
 * to find. Until this has been run at least once with actual content and a
 * real OPENAI_API_KEY, that vector search always falls through to its
 * keyword fallback against an empty table.
 *
 * SAFE BY DESIGN — READ + INSERT ONLY, NEVER DELETE OR UPDATE:
 *   - Before inserting a chunk, it checks whether a chunk with the exact
 *     same content already exists (active=true) and skips it if so.
 *   - It never deletes, updates, or deactivates any existing row. Running
 *     this repeatedly as you edit the markdown file only ever adds rows for
 *     genuinely new/changed sections — nothing already in the table is ever
 *     touched, let alone removed.
 *   - If you ever rewrite a section's wording, its old chunk stays in the
 *     table (harmless — semantic search just has an extra, slightly stale
 *     match). Deliberately not doing anything smarter than that here, since
 *     "don't delete data" was an explicit instruction.
 *
 * Usage:
 *   node scripts/seed-knowledge.mjs
 *   node scripts/seed-knowledge.mjs path/to/other-file.md   (optional override)
 *
 * Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL (or VITE_ variant),
 * SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY (not yet present in this
 * project's .env.local as of this writing — add it before running for real).
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

// ── Minimal .env.local loader (no dotenv dependency, matches this repo's
// existing style of using raw fetch() instead of pulling in extra packages) ──
function loadEnvLocal() {
  const envPath = join(projectRoot, '.env.local')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local — nothing to seed into.')
  process.exit(1)
}
if (!OPENAI_API_KEY) {
  console.error(
    'Missing OPENAI_API_KEY in .env.local.\n' +
    'This is the same key sangam-knowledge.ts already checks for before it will\n' +
    'attempt vector search — without it, every chunk seeded here would have no\n' +
    'embedding and the semantic search this is for could never find it.\n' +
    'Add OPENAI_API_KEY=sk-... to .env.local and re-run.'
  )
  process.exit(1)
}

const client = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'sangam' } })

function chunkMarkdown(md) {
  // Split on H2 headers ("## Heading") — each section becomes one chunk.
  // Keeps the H1 title + intro blockquote out of the seeded chunks (it's
  // instructions for humans editing the file, not knowledge for the AI).
  const sections = md.split(/\n(?=## )/g).filter(s => s.trim().startsWith('## '))
  return sections.map(section => {
    const headingMatch = section.match(/^##\s+(.+)/)
    const heading = headingMatch ? headingMatch[1].trim() : 'general'
    const category = heading.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    return { heading, category, content: section.trim() }
  })
}

async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  })
  const data = await res.json()
  if (!data?.data?.[0]?.embedding) {
    throw new Error(`OpenAI embedding failed: ${data?.error?.message || res.status}`)
  }
  return data.data[0].embedding
}

async function chunkAlreadyExists(content) {
  const { data } = await client
    .from('knowledge_chunks')
    .select('id')
    .eq('active', true)
    .eq('content', content)
    .limit(1)
  return !!(data && data.length > 0)
}

async function main() {
  const filePath = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(projectRoot, 'sangam-catering-knowledge.md')
  if (!existsSync(filePath)) {
    console.error(`Knowledge file not found: ${filePath}`)
    process.exit(1)
  }

  const md = readFileSync(filePath, 'utf-8')
  const chunks = chunkMarkdown(md)
  console.log(`Parsed ${chunks.length} section(s) from ${filePath}`)

  let inserted = 0
  let skippedExisting = 0
  let skippedTodo = 0

  for (const chunk of chunks) {
    // Skip sections that are still all placeholders — seeding "TODO" text
    // would just teach the AI to say "TODO" to a customer.
    const nonHeadingText = chunk.content.replace(/^##.*$/m, '').trim()
    const todoCount = (nonHeadingText.match(/TODO/g) || []).length
    const lineCount = nonHeadingText.split('\n').filter(l => l.trim().startsWith('-')).length
    if (lineCount > 0 && todoCount >= lineCount) {
      skippedTodo++
      continue
    }

    if (await chunkAlreadyExists(chunk.content)) {
      skippedExisting++
      continue
    }

    try {
      const embedding = await getEmbedding(chunk.content)
      const { error } = await client.from('knowledge_chunks').insert({
        content: chunk.content,
        category: chunk.category,
        source: 'manual',
        embedding,
        active: true,
      })
      if (error) throw error
      inserted++
      console.log(`  + seeded: ${chunk.heading}`)
      await new Promise(r => setTimeout(r, 100)) // gentle on the embeddings rate limit
    } catch (e) {
      console.warn(`  ! failed to seed "${chunk.heading}":`, e.message || e)
    }
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skippedExisting} (already seeded), skipped ${skippedTodo} (still placeholder text).`)
  if (skippedTodo > 0) {
    console.log('Fill in the TODOs in sangam-catering-knowledge.md and re-run to seed those sections.')
  }
}

main().catch(e => {
  console.error('Seed script failed:', e)
  process.exit(1)
})
