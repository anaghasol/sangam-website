/**
 * Sangam Unified Knowledge Engine & Vector RAG Integration.
 * 
 * Aggregates all real database layers for the Chat AI assistant (Arjun):
 * - Vector Knowledge Chunks (`sangam.knowledge_chunks`)
 * - Real PetPooja Sales Facts (`sangam_popular_items`)
 * - Banquet Halls & Catering DB (`eventmgmt` schema)
 * - Catering Portion Rules & Tray Math (`lib/catering-portions.ts`)
 */
import { createClient } from '@supabase/supabase-js'
import { getSangamSalesContext } from '@/lib/sangam-sales'
import { getSangamCateringChatContext } from '@/lib/sangam-catering'
import { getCateringPortionRulesText } from '@/lib/catering-portions'

type KnowledgeChunk = {
  id: number
  content: string
  category: string
  similarity: number
}

function sbSangam() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { db: { schema: 'sangam' } })
}

/**
 * Performs vector / keyword search on sangam.knowledge_chunks
 */
export async function searchSangamKnowledgeChunks(userQuery: string, limit = 6): Promise<string> {
  const client = sbSangam()
  if (!client || !userQuery) return ''

  try {
    // 1. Try vector similarity RPC search if embeddings extension is active
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        const embRes = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: userQuery.slice(0, 4000)
          })
        })
        const embData = await embRes.json()
        const embedding = embData?.data?.[0]?.embedding

        if (embedding && Array.isArray(embedding)) {
          const { data: rpcData, error: rpcErr } = await client.rpc('match_knowledge_chunks', {
            query_embedding: embedding,
            match_count: limit,
            match_threshold: 0.30
          })

          if (!rpcErr && rpcData && rpcData.length > 0) {
            const lines = (rpcData as KnowledgeChunk[]).map(c => `• [${c.category.toUpperCase()}] ${c.content}`)
            return `RELEVANT KNOWLEDGE CHUNKS (Vector Search Match):\n${lines.join('\n')}`
          }
        }
      } catch (e) {
        console.warn('OpenAI embedding lookup skipped, using keyword chunk search fallback.', e)
      }
    }

    // 2. Keyword fallback search on sangam.knowledge_chunks if vector RPC is unavailable
    const terms = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    let query = client.from('knowledge_chunks').select('id, content, category').eq('active', true).limit(limit)

    if (terms.length > 0) {
      query = query.ilike('content', `%${terms[0]}%`)
    }

    const { data: textData } = await query
    if (textData && textData.length > 0) {
      const lines = textData.map((c: any) => `• [${(c.category || 'general').toUpperCase()}] ${c.content}`)
      return `RELEVANT KNOWLEDGE CHUNKS (DB Keyword Match):\n${lines.join('\n')}`
    }
  } catch (e) {
    console.warn('Error querying sangam.knowledge_chunks:', e)
  }

  return ''
}

/**
 * Unifies all knowledge layers for the Chat AI assistant (Arjun):
 * - Vector Knowledge Chunks (`sangam.knowledge_chunks`)
 * - Real PetPooja Sales Facts (`sangam_popular_items`)
 * - Banquet Halls & Catering DB (`eventmgmt` schema)
 * - Portion Math & Tray Capacity Rules
 */
export async function getSangamUnifiedKnowledgeContext(userQuery: string): Promise<string> {
  const [vectorChunks, salesContext, cateringContext] = await Promise.all([
    searchSangamKnowledgeChunks(userQuery),
    getSangamSalesContext(),
    getSangamCateringChatContext()
  ])

  const portionRules = getCateringPortionRulesText()

  const blocks = [
    vectorChunks,
    portionRules,
    salesContext,
    cateringContext
  ].filter(Boolean)

  return blocks.join('\n\n')
}
