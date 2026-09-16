-- Sangam Knowledge Base & Vector RAG Schema
-- 
-- Stores domain knowledge chunks and pgvector embeddings in the `sangam` schema,
-- enabling similarity search (match_knowledge_chunks) for the AI Chatbot.

create schema if not exists sangam;

-- Enable pgvector extension for semantic similarity search
create extension if not exists vector;

-- 1. Knowledge Chunks Table (for vector embeddings)
create table if not exists sangam.knowledge_chunks (
  id          bigserial primary key,
  content     text not null,
  category    text default 'general',
  source      text default 'manual',
  embedding   vector(1536), -- OpenAI text-embedding-3-small / 1536-dim vector
  tenant_id   uuid,
  active      boolean default true,
  created_at  timestamp with time zone default now()
);

-- 2. Knowledge Base Table (for static rules & policies)
create table if not exists sangam.knowledge_base (
  id          bigserial primary key,
  title       text not null,
  content     text not null,
  category    text default 'general',
  active      boolean default true,
  updated_at  timestamp with time zone default now()
);

-- 3. HNSW Vector Index for Fast Cosine Similarity Search
create index if not exists knowledge_chunks_hnsw_idx
  on sangam.knowledge_chunks using hnsw (embedding vector_cosine_ops);

-- Index on category & active status
create index if not exists idx_sangam_kc_category on sangam.knowledge_chunks (category) where active = true;

-- 4. Match Knowledge Chunks RPC Function
create or replace function sangam.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 8,
  match_threshold float default 0.35
)
returns table (
  id bigint,
  content text,
  category text,
  similarity float
)
language plpgsql as $$
begin
  return query
  select
    kc.id,
    kc.content,
    kc.category,
    1 - (kc.embedding <=> query_embedding) as similarity
  from sangam.knowledge_chunks kc
  where kc.active = true
    and kc.embedding is not null
    and (1 - (kc.embedding <=> query_embedding)) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;
