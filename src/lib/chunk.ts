import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Splits raw document text into overlapping chunks sized for embedding +
 * retrieval. Overlap preserves context across chunk boundaries so an answer
 * that straddles two chunks doesn't lose its grounding.
 */
export async function chunkText(text: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const chunks = await splitter.splitText(text);
  // Drop near-empty fragments (e.g. stray whitespace pages)
  return chunks.map((c) => c.trim()).filter((c) => c.length > 20);
}
