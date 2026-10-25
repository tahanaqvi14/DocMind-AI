import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { embedText } from "@/lib/embeddings";
import { streamRagAnswer } from "@/lib/llm";
import type { RetrievedChunk, Citation } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SIMILARITY_THRESHOLD = 0.55;
const MATCH_COUNT = 5;
const MAX_MESSAGE_CHARS = 4000;

interface MatchRow {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

/**
 * Streaming protocol: the response body is plain text, except the very
 * first chunk is a JSON line prefixed with "@@CITATIONS@@" naming the
 * grounding passages, so the client can render citation chips before the
 * answer even finishes streaming. Everything after that is answer text.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { message?: unknown; chatId?: unknown; documentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const chatId = typeof body.chatId === "string" ? body.chatId : undefined;
  const documentId = typeof body.documentId === "string" ? body.documentId : null;
  if (!message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `Please keep questions under ${MAX_MESSAGE_CHARS.toLocaleString()} characters.` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // The admin client bypasses RLS, so a client-supplied chatId must be
  // checked against the caller explicitly — otherwise anyone could read (as
  // model context) and write into another user's chat just by sending its id.
  if (chatId) {
    const { data: ownChat } = await admin
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!ownChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
  }

  // Embed the question and retrieve grounded context BEFORE writing
  // anything, so a Gemini or database failure leaves no empty chat and no
  // unanswered question behind — just an error the chat UI can show.
  let matches: unknown;
  try {
    const queryEmbedding = await embedText(message);
    const { data, error: matchError } = await admin.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_owner_id: user.id,
      match_count: MATCH_COUNT,
      match_document_id: documentId,
    });
    if (matchError) throw matchError;
    matches = data;
  } catch (err) {
    console.error("Retrieval failed:", err);
    return NextResponse.json(
      { error: "Couldn't process your question right now. Please try again in a moment." },
      { status: 502 }
    );
  }

  // Get or create the chat thread.
  let activeChatId = chatId;
  if (!activeChatId) {
    const { data: newChat, error } = await admin
      .from("chats")
      .insert({ owner_id: user.id, title: message.slice(0, 60) })
      .select()
      .single();
    if (error || !newChat) {
      return NextResponse.json({ error: "Couldn't start a new chat. Please try again." }, { status: 500 });
    }
    activeChatId = newChat.id as string;
  }

  // Prior turns for conversational context: the 10 MOST RECENT (newest
  // first here, flipped back to chronological order below). Ascending +
  // limit would keep replaying the first 10 messages of a long chat.
  const { data: priorMessages } = await admin
    .from("messages")
    .select("role, content")
    .eq("chat_id", activeChatId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  await admin.from("messages").insert({
    chat_id: activeChatId,
    owner_id: user.id,
    role: "user",
    content: message,
  });

  const relevant = ((matches ?? []) as MatchRow[]).filter(
    (m) => m.similarity >= SIMILARITY_THRESHOLD
  );

  let fileNameById = new Map<string, string>();
  if (relevant.length > 0) {
    const { data: docs } = await admin
      .from("documents")
      .select("id, file_name")
      .in("id", Array.from(new Set(relevant.map((m) => m.document_id))));
    fileNameById = new Map(
      ((docs ?? []) as { id: string; file_name: string }[]).map((d) => [d.id, d.file_name])
    );
  }

  const retrieved: RetrievedChunk[] = relevant.map((m) => ({
    id: m.id,
    documentId: m.document_id,
    fileName: fileNameById.get(m.document_id) ?? "Unknown document",
    chunkIndex: m.chunk_index,
    content: m.content,
    similarity: m.similarity,
  }));

  const citations: Citation[] = retrieved.map((r) => ({
    document_id: r.documentId,
    file_name: r.fileName,
    chunk_index: r.chunkIndex,
    snippet: r.content.slice(0, 220),
    similarity: r.similarity,
  }));

  const history = ((priorMessages ?? []) as { role: string; content: string }[])
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const encoder = new TextEncoder();
  let fullAnswer = "";

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`@@CITATIONS@@${JSON.stringify({ chatId: activeChatId, citations })}\n`)
      );

      try {
        for await (const token of streamRagAnswer(message, retrieved, history)) {
          fullAnswer += token;
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        console.error("Groq streaming failed:", err);
        const msg = "\n\n[Error: the model failed to respond. Please try again.]";
        fullAnswer += msg;
        controller.enqueue(encoder.encode(msg));
      }

      await admin.from("messages").insert({
        chat_id: activeChatId,
        owner_id: user.id,
        role: "assistant",
        content: fullAnswer,
        citations,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
