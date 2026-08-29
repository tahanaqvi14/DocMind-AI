-- ═══════════════════════════════════════════════════════════════
-- DocMind AI — Initial schema
-- Run this in Supabase Dashboard → SQL Editor (or via `supabase db push`)
-- ═══════════════════════════════════════════════════════════════

-- 1. Enable pgvector for embedding storage + similarity search
create extension if not exists vector;

-- 2. Profiles: one row per authenticated user, tracks plan/limits
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- 3. Documents: uploaded files, one workspace = one user (owner_id)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size_bytes bigint not null default 0,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error_message text,
  chunk_count int not null default 0,
  created_at timestamptz not null default now()
);

-- 4. Document chunks: the actual RAG unit — text + embedding vector
-- text-embedding-004 (Gemini) produces 768-dimensional vectors
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

-- ANN index for fast similarity search (cosine distance)
create index if not exists document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists document_chunks_owner_idx on document_chunks (owner_id);
create index if not exists documents_owner_idx on documents (owner_id);

-- 5. Chat threads
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now()
);

-- 6. Messages within a chat, with citation metadata for assistant replies
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb default '[]'::jsonb, -- [{document_id, file_name, chunk_index, snippet}]
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_idx on messages (chat_id, created_at);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security — this is what makes multi-tenancy actually safe.
-- Every table is scoped so a user can only ever see their own rows.
-- ═══════════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table chats enable row level security;
alter table messages enable row level security;

create policy "profiles: read own" on profiles for select using (auth.uid() = id);
create policy "profiles: update own" on profiles for update using (auth.uid() = id);
create policy "profiles: insert own" on profiles for insert with check (auth.uid() = id);

create policy "documents: crud own" on documents for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "chunks: crud own" on document_chunks for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "chats: crud own" on chats for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "messages: crud own" on messages for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ═══════════════════════════════════════════════════════════════
-- Similarity search RPC — called from the RAG chat API route.
-- Scoped to owner_id so one user's search never leaks another's docs.
-- ═══════════════════════════════════════════════════════════════

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
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.chunk_index,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.owner_id = match_owner_id
    and (match_document_id is null or document_chunks.document_id = match_document_id)
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- ═══════════════════════════════════════════════════════════════
-- Auto-create a profile row whenever a new auth user signs up
-- ═══════════════════════════════════════════════════════════════

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
