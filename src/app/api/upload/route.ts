import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { extractText } from "@/lib/parse";
import { chunkText } from "@/lib/chunk";
import { embedChunks } from "@/lib/embeddings";
import { failStaleUploads } from "@/lib/documents";
import { MAX_UPLOAD_BYTES, PLAN_LIMITS } from "@/types";

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

  // Admin client bypasses RLS for the write-heavy embedding insert, but every
  // row we write is still explicitly scoped to the verified user.id above.
  const admin = createAdminClient();

  // Failed uploads hold no content, so they do not use up a plan slot — and
  // an upload that died mid-processing counts as failed, not as a document.
  await failStaleUploads(admin, user.id);
  const plan = (profile?.plan as "free" | "pro") ?? "free";
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .neq("status", "failed");

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

  // Browsers on machines without Office (common on Windows) send .docx
  // files with an empty MIME type, which the dropzone accepts by extension —
  // so fall back to the extension here too instead of rejecting them.
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fileType =
    ALLOWED_TYPES[file.type] ??
    (Object.values(ALLOWED_TYPES).includes(extension) ? extension : undefined);
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." },
      { status: 400 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "That file is over the 4 MB limit. Please upload a smaller file." },
      { status: 413 }
    );
  }

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
      { error: "Couldn't start the upload. Please try again." },
      { status: 500 }
    );
  }

  // Each stage fails with a message written for the user; the raw error
  // (often a JSON payload from an API) goes to the server log instead of
  // into the document list.
  let failure = "Something went wrong while processing this file. Please try again.";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    failure = "Couldn't read this file. It may be damaged or password-protected.";
    const text = await extractText(buffer, fileType);

    if (!text || text.trim().length < 20) {
      failure =
        "Couldn't find any readable text in this file. Scanned PDFs (images of pages) aren't supported.";
      throw new Error("No extractable text");
    }

    const chunks = await chunkText(text);
    if (chunks.length === 0) {
      failure = "Couldn't find any readable text in this file.";
      throw new Error("No usable chunks");
    }

    failure = "The AI service is busy right now. Please try uploading this file again in a minute.";
    const vectors = await embedChunks(chunks);
    failure = "Something went wrong while saving this file. Please try again.";

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

    const { error: readyError } = await admin
      .from("documents")
      .update({ status: "ready", chunk_count: chunks.length })
      .eq("id", doc.id);
    if (readyError) throw readyError;

    return NextResponse.json({ document: { ...doc, status: "ready", chunk_count: chunks.length } });
  } catch (err) {
    console.error(`Upload processing failed for document ${doc.id}:`, err);
    await admin
      .from("documents")
      .update({ status: "failed", error_message: failure })
      .eq("id", doc.id);

    return NextResponse.json({ error: failure }, { status: 500 });
  }
}
