import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

// gemini-embedding-001 defaults to 3072 dims; we pin it down to 768 via
// outputDimensionality to keep vectors compact and match the pgvector
// column defined in supabase/migrations/0001_init.sql.
const OUTPUT_DIMENSIONALITY = 768;

/** Embeds a single string (e.g. a user's question) into a 768-dim vector. */
export async function embedText(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: MODEL,
    contents: text,
    config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: OUTPUT_DIMENSIONALITY },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("Gemini returned no embedding values.");
  return values;
}

/**
 * Embeds many document chunks. Batches with a small delay between calls to
 * stay comfortably under Gemini's free-tier per-minute rate limit.
 */
export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  const BATCH_SIZE = 10;
  const DELAY_MS = 400;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const response = await ai.models.embedContent({
      model: MODEL,
      contents: batch,
      config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: OUTPUT_DIMENSIONALITY },
    });
    const batchVectors = response.embeddings?.map((e) => e.values);
    if (!batchVectors || batchVectors.some((v) => !v)) {
      throw new Error("Gemini returned incomplete embedding values for a batch.");
    }
    vectors.push(...(batchVectors as number[][]));
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return vectors;
}
