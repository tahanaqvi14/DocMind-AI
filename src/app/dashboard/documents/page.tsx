"use client";

import { useCallback, useEffect, useState } from "react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { DocumentList } from "@/components/DocumentList";
import type { DocumentRow } from "@/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = await res.json();
    if (res.ok) setDocuments(data.documents);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!cancelled && res.ok) setDocuments(data.documents);
      if (!cancelled) setLoading(false);
    }
    load();

    // Poll while any document is still processing, so status flips live.
    const interval = setInterval(() => {
      setDocuments((current) => {
        if (current.some((d) => d.status === "processing")) refresh();
        return current;
      });
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refresh]);

  async function handleDelete(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
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
        {loading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <DocumentList documents={documents} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
