#!/usr/bin/env node
/**
 * Seeds sangam-catering-knowledge.md into sangam.knowledge_chunks, so the
 * chat's semantic/keyword search in lib/sangam-knowledge.ts
 * (searchSangamKnowledgeChunks) has something real to find.
 *
 * Embeddings are OPTIONAL. If OPENAI_API_KEY is present in .env.local, each
 * chunk is seeded with a real OpenAI embedding and true vector similarity
 * search is used by the chat. If OPENAI_API_KEY is NOT present (as of this
 * writing it isn't, and only GROQ_API_KEY / GEMINI_API_KEY are configured),
 * chunks are still seeded — just with embedding left null — and the chat's
 * existing keyword fallback (ILIKE search on `content`) picks them up
 * immediately. No functionality is blocked on getting an OpenAI key; running
 * this script again later after adding one will backfill embeddings onto
 * chunks that don't have one yet, upgrading them to vector search in place.
 *
 * SAFE BY DESIGN — READ + INSERT ONLY, NEVER DELETE, AND UPDATE ONLY TO ADD
 * A MISSING EMBEDDING:
 *   - Before inserting a chunk, it checks whether a chunk with the exact
 *     same content already exists (active=true). If it exists and already
 *     has an embedding, it's left alone. If it exists but has no embedding
 *     yet and OPENAI_API_KEY is now available, it gets ONE UPDATE that only
 *     sets the embedding column — never touches content/category/active.
 *   - It never deletes, updates content, or deactivates any existing row.
 *     Running this repeatedly as you edit the markdown file only ever adds
 *     rows for genuinely new/changed sections — nothing already in the
 *     table is ever removed, since "don't delete data" is an explicit
 *     instruction for this project.
 *
 * Usage:
 *   node scripts/seed-knowledge.mjs
 *   node scripts/seed-knowledge.mjs path/to/other-file.md   (optional override)
 *
 * Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL (or VITE_ variant) and
 * SUPABASE_SERVICE_ROLE_KEY. OPENAI_API_KEY is optional (see above).
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
  console.log(
    'No OPENAI_API_KEY found in .env.local — seeding WITHOUT embeddings.\n' +
    'Chunks will still be inserted and picked up by the chat\'s keyword\n' +
    'fallback search right away. Add OPENAI_API_KEY later and re-run this\n' +
    'script to upgrade existing chunks to real vector search in place.\n'
  )
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
  if (!OPENAI_API_KEY) return null
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

async function findExistingChunk(content) {
  const { data } = await client
    .from('knowledge_chunks')
    .select('id, embedding')
    .eq('active', true)
    .eq('content', content)
    .limit(1)
  return data && data.length > 0 ? data[0] : null
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
  let insertedNoEmbedding = 0
  let backfilled = 0
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

    const existing = await findExistingChunk(chunk.content)

    if (existing) {
      // Already seeded. Only action ever taken on an existing row: if it has
      // no embedding yet and we now have OPENAI_API_KEY, backfill just the
      // embedding column — never touch anything else on the row.
      if (!existing.embedding && OPENAI_API_KEY) {
        try {
          const embedding = await getEmbedding(chunk.content)
          const { error } = await client.from('knowledge_chunks').update({ embedding }).eq('id', existing.id)
          if (error) throw error
          backfilled++
          console.log(`  ~ backfilled embedding: ${chunk.heading}`)
          await new Promise(r => setTimeout(r, 100))
        } catch (e) {
          console.warn(`  ! failed to backfill embedding for "${chunk.heading}":`, e.message || e)
        }
      } else {
        skippedExisting++
      }
      continue
    }

    try {
      const embedding = await getEmbedding(chunk.content)
      const { error } = await client.from('knowledge_chunks').insert({
        content: chunk.content,
        category: chunk.category,
        source: 'manual',
        embedding, // null when no OPENAI_API_KEY — keyword fallback still finds it
        active: true,
      })
      if (error) throw error
      if (embedding) inserted++
      else insertedNoEmbedding++
      console.log(`  + seeded${embedding ? '' : ' (no embedding — keyword search only)'}: ${chunk.heading}`)
      if (OPENAI_API_KEY) await new Promise(r => setTimeout(r, 100)) // gentle on the embeddings rate limit
    } catch (e) {
      console.warn(`  ! failed to seed "${chunk.heading}":`, e.message || e)
    }
  }

  console.log(
    `\nDone. Inserted ${inserted} with embeddings, ${insertedNoEmbedding} without (keyword-only), ` +
    `backfilled ${backfilled} embedding(s), skipped ${skippedExisting} (already seeded), ` +
    `skipped ${skippedTodo} (still placeholder text).`
  )
  if (skippedTodo > 0) {
    console.log('Fill in the TODOs in sangam-catering-knowledge.md and re-run to seed those sections.')
  }
  if (insertedNoEmbedding > 0) {
    console.log('Add OPENAI_API_KEY to .env.local and re-run this script anytime to upgrade those chunks to real vector search.')
  }
}

main().catch(e => {
  console.error('Seed script failed:', e)
  process.exit(1)
})
