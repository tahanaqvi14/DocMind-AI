import Groq from "groq-sdk";
import type { RetrievedChunk } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `You are DocMind AI, an assistant that answers questions using ONLY the
document excerpts provided in the context below. These excerpts come from files the user
uploaded themselves.

Rules:
1. Answer using ONLY information found in the provided context. Never use outside knowledge.
2. If the context does not contain enough information to answer, say clearly:
   "I don't know — this isn't covered in the documents you've uploaded." Do not guess or
   fill gaps with general knowledge.
3. When you use a fact from a specific excerpt, reference it naturally (e.g. "According to
   the excerpt from [document]..."). The UI will render structured citations separately, so
   you don't need to output citation markup yourself — just stay grounded in what's given.
4. Be concise and direct. Do not pad answers with filler.
5. Write like you're chatting, not drafting a report. For a short factual answer, just answer
   in a sentence or two — no headers, no bullet lists, no bold-everywhere. Reserve Markdown
   structure (headers, bullet lists, tables) for when the content genuinely benefits from it —
   e.g. a real table of numbers, or a list of several distinct items the user asked for. Never
   nest multiple heading levels in a chat reply.`;

function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(No relevant excerpts were found for this question.)";
  return chunks
    .map(
      (c, i) =>
        `[Excerpt ${i + 1} — from "${c.fileName}"]\n${c.content}`
    )
    .join("\n\n---\n\n");
}

/**
 * Streams a grounded chat completion. Yields text tokens as they arrive so
 * the route handler can pipe them straight to the client for a typing effect.
 */
export async function* streamRagAnswer(
  question: string,
  chunks: RetrievedChunk[],
  history: { role: "user" | "assistant"; content: string }[] = []
): AsyncGenerator<string> {
  const context = buildContext(chunks);

  const stream = await groq.chat.completions.create({
    model: MODEL,
    stream: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      {
        role: "user",
        content: `Context (document excerpts):\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  for await (const part of stream) {
    const token = part.choices[0]?.delta?.content || "";
    if (token) yield token;
  }
}
