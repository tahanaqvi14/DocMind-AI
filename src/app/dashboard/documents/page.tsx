"use client";

import { useCallback, useEffect, useState } from "react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { DocumentList } from "@/components/DocumentList";
import type { DocumentRow } from "@/types";

type Loaded = { documents: DocumentRow[] } | { error: string };

async function fetchDocuments(): Promise<Loaded> {
  try {
    const res = await fetch("/api/documents");
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { documents: data.documents ?? [] };
    return { error: data.error || "Couldn't load your documents. Please refresh the page." };
  } catch {
    return { error: "Couldn't load your documents. Check your connection and refresh the page." };
  }
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: Loaded) => {
    if ("documents" in result) {
      setDocuments(result.documents);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => apply(await fetchDocuments()), [apply]);

  useEffect(() => {
    let cancelled = false;
    fetchDocuments().then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // Poll only while something is still processing, so status flips live
  // and polling stops on its own once everything has settled.
  const anyProcessing = documents.some((d) => d.status === "processing");
  useEffect(() => {
    if (!anyProcessing) return;
    const interval = setInterval(refresh, 2500);
    return () => clearInterval(interval);
  }, [anyProcessing, refresh]);

  async function handleDelete(id: string) {
    const previous = documents;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Put it back rather than pretend it is gone.
      setDocuments(previous);
      setError("Couldn't delete that document. Please try again.");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-medium">Documents</h1>
      <p className="mt-1 text-ink-muted">
        Upload the files you want to chat with. Free plan: 3 documents.
      </p>

      <div className="mt-6">
        <UploadDropzone onUploaded={refresh} />
      </div>

      <div className="mt-8">
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        {loading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <DocumentList documents={documents} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
