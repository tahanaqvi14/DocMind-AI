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

-- 1b. Same idea for everything else: read your own rows, delete your own
-- documents, and write nothing directly.
--
-- "crud own" let any user insert document rows (and their own embeddings)
-- straight from the browser, skipping the server's plan check — unlimited
-- documents on the Free plan — and rewrite messages that feed the usage
-- dashboard. All real writes go through the server with the service-role
-- key, which bypasses RLS, so the app loses nothing. Chunks are removed by
-- ON DELETE CASCADE when their document is, which RLS does not block.
drop policy if exists "documents: crud own" on documents;
drop policy if exists "documents: read own" on documents;
drop policy if exists "documents: delete own" on documents;
create policy "documents: read own" on documents for select using (auth.uid() = owner_id);
create policy "documents: delete own" on documents for delete using (auth.uid() = owner_id);

drop policy if exists "chunks: crud own" on document_chunks;
drop policy if exists "chunks: read own" on document_chunks;
create policy "chunks: read own" on document_chunks for select using (auth.uid() = owner_id);

drop policy if exists "chats: crud own" on chats;
drop policy if exists "chats: read own" on chats;
create policy "chats: read own" on chats for select using (auth.uid() = owner_id);

drop policy if exists "messages: crud own" on messages;
drop policy if exists "messages: read own" on messages;
create policy "messages: read own" on messages for select using (auth.uid() = owner_id);

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
