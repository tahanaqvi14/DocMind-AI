export type Plan = "free" | "pro";

export interface Profile {
  id: string;
  email: string;
  plan: Plan;
  stripe_customer_id: string | null;
  created_at: string;
}

export type DocumentStatus = "processing" | "ready" | "failed";

export interface DocumentRow {
  id: string;
  owner_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  status: DocumentStatus;
  error_message: string | null;
  chunk_count: number;
  created_at: string;
}

export interface RetrievedChunk {
  id: string;
  documentId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export interface Citation {
  document_id: string;
  file_name: string;
  chunk_index: number;
  snippet: string;
  similarity: number;
}

export interface ChatRow {
  id: string;
  owner_id: string;
  title: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  chat_id: string;
  owner_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
}

/** Vercel rejects request bodies over 4.5 MB before the function even runs
 *  (with a non-JSON 413), so uploads are capped just below that. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const PLAN_LIMITS: Record<Plan, { maxDocuments: number; label: string }> = {
  free: { maxDocuments: 3, label: "Free" },
  pro: { maxDocuments: Infinity, label: "Pro" },
};
