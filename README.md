# DocMind AI

**Chat with your documents — grounded, cited, and honest about what it doesn't know.**

DocMind AI is a multi-tenant RAG (Retrieval-Augmented Generation) SaaS. Users
upload their own PDFs, Word docs, or text files, and get an instant AI
chatbot that answers questions using *only* that content — with citations
pointing back to the exact document and passage behind every claim. If the
answer isn't in the uploaded documents, it says so instead of guessing.

**Live demo:** _[add your Vercel URL here after deploying]_
**Demo video:** _[add a Loom/YouTube link here]_

---

## Why this exists

Most "chat with your PDF" demos are a thin wrapper around a single API call
with no real multi-tenancy, no verifiable citations, and no guardrails
against hallucination. This project is built to look and behave like an
actual product: isolated per-user workspaces enforced at the database level,
streaming answers with clickable source citations, usage analytics, and a
real (test-mode) billing flow with plan limits.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Server components, API routes, and the frontend in one deployable unit |
| Styling | Tailwind CSS | Fast iteration, small bundle |
| Auth + DB | Supabase (Postgres + Auth) | Email/password + Google OAuth, Row Level Security for multi-tenancy, free tier |
| Vector search | Supabase **pgvector** | No separate vector database to run or pay for — cosine similarity search lives in Postgres |
| Chunking | LangChain.js (`RecursiveCharacterTextSplitter`) | Battle-tested chunk/overlap strategy |
| Embeddings | Google Gemini (`text-embedding-004`) | Free tier, 768-dim vectors |
| Chat LLM | Groq (Llama 3.3 70B) | Extremely fast streaming inference, free tier |
| Billing | Stripe (**test mode**) | Real checkout flow, no real charges |
| Hosting | Vercel | Zero-config Next.js deploys, free tier |

**Monthly cost: $0**, using each provider's free tier.

## Architecture

```
                         ┌────────────────────────────────────────┐
                         │              Browser (Next.js)          │
                         │  Landing · Auth · Dashboard · Chat UI   │
                         └───────────────┬──────────────────────────┘
                                          │
                                          ▼
                         ┌────────────────────────────────────────┐
                         │        Next.js API Routes (Vercel)      │
                         │                                          │
                         │  /api/upload  ──► parse → chunk → embed │
                         │  /api/chat    ──► embed Q → retrieve →  │
                         │                   stream Groq answer    │
                         │  /api/usage, /api/documents             │
                         │  /api/stripe/checkout, /webhook         │
                         └───┬─────────────┬─────────────┬─────────┘
                             │             │             │
                 ┌───────────▼──┐ ┌────────▼───────┐ ┌────▼──────────┐
                 │   Supabase    │ │  Gemini API    │ │   Groq API    │
                 │  Postgres +   │ │  (embeddings)  │ │ (chat, LLM)   │
                 │  pgvector +   │ └────────────────┘ └───────────────┘
                 │  Auth + RLS   │
                 └───────┬───────┘
                         │
                 ┌───────▼───────┐
                 │  Stripe (test) │
                 │   subscriptions│
                 └────────────────┘
```

**RAG pipeline, step by step:**

1. **Upload** → file is parsed (`pdf-parse` / `mammoth` / raw text) into plain text.
2. **Chunk** → text is split into ~1000-character overlapping chunks (LangChain.js).
3. **Embed** → each chunk is embedded via Gemini into a 768-dim vector, stored in `document_chunks.embedding` (pgvector column).
4. **Ask** → the user's question is embedded the same way.
5. **Retrieve** → a Postgres RPC (`match_document_chunks`) does a cosine-similarity search scoped to that user's rows only, returning the top 5 matches above a relevance threshold.
6. **Generate** → the matched chunks are injected into a system prompt that instructs the model to answer *only* from that context, or say it doesn't know. Groq streams the answer token-by-token back to the client.
7. **Cite** → each answer carries structured citation metadata (document, chunk index, snippet, similarity score) rendered as clickable chips under the message.

**Multi-tenancy** is enforced at the database layer with Postgres Row Level
Security — every table (`documents`, `document_chunks`, `chats`, `messages`)
has policies scoping all reads/writes to `auth.uid()`, so one user's data is
structurally unreachable by another, not just hidden by the UI.

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── (auth)/login, signup     # Auth pages
│   ├── auth/callback            # OAuth/email confirm callback
│   ├── dashboard/                # Protected app shell
│   │   ├── page.tsx              # Analytics overview
│   │   ├── documents/            # Upload + document list
│   │   └── chat/                 # RAG chat interface
│   ├── pricing/                  # Stripe checkout
│   └── api/
│       ├── upload/               # Parse → chunk → embed → store
│       ├── chat/                 # Streaming RAG endpoint
│       ├── documents/            # List/delete
│       ├── usage/                # Dashboard analytics
│       └── stripe/               # Checkout + webhook
├── components/                   # UI components
├── lib/
│   ├── supabase/                 # Client/server/middleware helpers
│   ├── parse.ts                  # PDF/DOCX/TXT text extraction
│   ├── chunk.ts                  # LangChain text splitting
│   ├── embeddings.ts              # Gemini embedding calls
│   └── llm.ts                     # Groq streaming chat completion
├── types/                        # Shared TypeScript types
└── proxy.ts                      # Auth session refresh + route protection

supabase/migrations/0001_init.sql # Full schema: tables, RLS, RPC, triggers
```

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd docmind-ai
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier).
2. In **SQL Editor**, paste and run the contents of `supabase/migrations/0001_init.sql`. This creates all tables, enables pgvector, sets up Row Level Security, and creates the similarity-search function.
3. In **Authentication → Providers**, enable **Google** OAuth (optional but recommended) — you'll need a Google Cloud OAuth client ID/secret.
4. In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and your production URL later) as a redirect URL.
5. Copy your keys from **Project Settings → API**: `Project URL`, `anon public` key, and `service_role` key.

### 3. Get a Groq API key

Go to [console.groq.com](https://console.groq.com) → API Keys → create one (free tier).

### 4. Get a Gemini API key

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → create a key (free tier).

### 5. Set up Stripe (test mode)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com), stay in **Test mode** (toggle top-right).
2. **Products** → create a "Pro" product with a recurring monthly price → copy the `price_id`.
3. **Developers → API keys** → copy the test `Publishable key` and `Secret key`.
4. For local webhook testing, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run `stripe listen --forward-to localhost:3000/api/stripe/webhook` — it will print a webhook signing secret to use locally.

### 6. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in every value in `.env.local` with the keys from steps 2–5.

### 7. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`. Sign up, upload a PDF/DOCX/TXT file, wait for it to show "Ready," then ask it a question in the chat.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo.
3. In the import screen, expand **Environment Variables** and paste in everything from your `.env.local` (all the `NEXT_PUBLIC_*` and secret keys). Set `NEXT_PUBLIC_APP_URL` to your upcoming Vercel URL (e.g. `https://docmind-ai.vercel.app`) — you can update it after the first deploy once you know the final URL.
4. Click **Deploy**.
5. Once deployed, go back to **Supabase → Authentication → URL Configuration** and add `https://<your-vercel-url>/auth/callback` as an additional redirect URL.
6. In **Stripe → Developers → Webhooks**, add an endpoint pointing to `https://<your-vercel-url>/api/stripe/webhook`, select the `checkout.session.completed` and `customer.subscription.deleted` events, and copy the new signing secret into your Vercel project's `STRIPE_WEBHOOK_SECRET` env var (then redeploy).
7. Visit your live URL, sign up, and test the full flow end to end.

## Plan limits

- **Free** — 3 documents, unlimited questions.
- **Pro** — unlimited documents, via Stripe test-mode subscription (`4242 4242 4242 4242`, any future expiry, any CVC).

## What makes this more than a wrapper

- **Verifiable citations** — every answer links back to the specific document and passage it came from, with a similarity score, not just a vague "sourced from your files."
- **Refuses to hallucinate** — the system prompt explicitly instructs the model to say "I don't know" when retrieved context doesn't support an answer, and a similarity threshold filters out weak matches before they ever reach the model.
- **Real multi-tenant isolation** — enforced with Postgres Row Level Security, not just application-level filtering.
- **Production build discipline** — typed end-to-end, clean production build, graceful error/empty/loading states throughout.

## License

MIT — do whatever you'd like with this.
#   D o c M i n d - A I  
 