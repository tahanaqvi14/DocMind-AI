import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { extractText } from "@/lib/parse";
import { chunkText } from "@/lib/chunk";
import { embedChunks } from "@/lib/embeddings";
import { PLAN_LIMITS } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Enforce plan limits before doing any expensive work
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plan as "free" | "pro") ?? "free";
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((count ?? 0) >= PLAN_LIMITS[plan].maxDocuments) {
    return NextResponse.json(
      {
        error: `You've hit the ${PLAN_LIMITS[plan].label} plan limit of ${PLAN_LIMITS[plan].maxDocuments} documents. Upgrade to Pro for unlimited uploads.`,
      },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." },
      { status: 400 }
    );
  }

  // Admin client bypasses RLS for the write-heavy embedding insert, but every
  // row we write is still explicitly scoped to the verified user.id above.
  const admin = createAdminClient();

  const { data: doc, error: docError } = await admin
    .from("documents")
    .insert({
      owner_id: user.id,
      file_name: file.name,
      file_type: fileType,
      file_size_bytes: file.size,
      status: "processing",
    })
    .select()
    .single();

  if (docError || !doc) {
    console.error("Supabase insert error (documents):", docError);
    return NextResponse.json(
      { error: docError?.message || "Failed to create document record" },
      { status: 500 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, fileType);

    if (!text || text.trim().length < 20) {
      throw new Error("Couldn't extract readable text from this file.");
    }

    const chunks = await chunkText(text);
    if (chunks.length === 0) {
      throw new Error("No usable text chunks were produced from this file.");
    }

    const vectors = await embedChunks(chunks);

    const rows = chunks.map((content, i) => ({
      document_id: doc.id,
      owner_id: user.id,
      chunk_index: i,
      content,
      embedding: vectors[i],
    }));

    // Insert in batches to stay well under request size limits
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error: chunkError } = await admin
        .from("document_chunks")
        .insert(rows.slice(i, i + BATCH));
      if (chunkError) throw chunkError;
    }

    await admin
      .from("documents")
      .update({ status: "ready", chunk_count: chunks.length })
      .eq("id", doc.id);

    return NextResponse.json({ document: { ...doc, status: "ready", chunk_count: chunks.length } });
  } catch (err) {
    await admin
      .from("documents")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown processing error",
      })
      .eq("id", doc.id);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process document" },
      { status: 500 }
    );
  }
}
