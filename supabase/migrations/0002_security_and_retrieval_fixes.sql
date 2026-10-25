-- ═══════════════════════════════════════════════════════════════
-- DocMind AI — security + retrieval fixes
-- Run this AFTER 0001_init.sql (Supabase Dashboard → SQL Editor).
-- Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

-- 1. Users must not be able to write their own profile row.
--
-- "profiles: update own" let any signed-in user call, from the browser with
-- the public anon key:
--   supabase.from('profiles').update({ plan: 'pro' }).eq('id', <own id>)
-- and get Pro without paying (or point stripe_customer_id at someone else's
-- Stripe customer and open their billing portal). Profiles are created by the
-- handle_new_user trigger and changed only by server routes using the
-- service-role key, so neither policy is needed.
drop policy if exists "profiles: update own" on profiles;
drop policy if exists "profiles: insert own" on profiles;

-- 2. Exact (not approximate) similarity search, scoped to the user first.
--
-- The ivfflat index from 0001 was built on an empty table, so its lists are
-- untrained, and approximate indexes filter AFTER the index scan: with many
-- users, the few probed lists often hold none of this user's chunks, so the
-- search silently returns nothing and the bot answers "I don't know" about
-- documents that are right there. Filtering by owner in a MATERIALIZED CTE
-- first makes the planner rank only this user's chunks, exactly.
create or replace function match_document_chunks(
  query_embedding vector(768),
  match_owner_id uuid,
  match_count int default 5,
  match_document_id uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  similarity float
)
language sql stable
as $$
  with owned as materialized (
    select
      document_chunks.id,
      document_chunks.document_id,
      document_chunks.chunk_index,
      document_chunks.content,
      document_chunks.embedding
    from document_chunks
    where document_chunks.owner_id = match_owner_id
      and (match_document_id is null or document_chunks.document_id = match_document_id)
  )
  select
    owned.id,
    owned.document_id,
    owned.chunk_index,
    owned.content,
    1 - (owned.embedding <=> query_embedding) as similarity
  from owned
  order by owned.embedding <=> query_embedding
  limit match_count;
$$;
