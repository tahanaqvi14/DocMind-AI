"use client";

import { useState } from "react";
import { FileText, Loader2, CheckCircle2, XCircle, Trash2, Check, X } from "lucide-react";
import type { DocumentRow } from "@/types";

const STATUS_META = {
  processing: { icon: Loader2, label: "Processing", color: "text-highlight", spin: true },
  ready: { icon: CheckCircle2, label: "Ready", color: "text-teal", spin: false },
  failed: { icon: XCircle, label: "Failed", color: "text-danger", spin: false },
};

export function DocumentList({
  documents,
  onDelete,
}: {
  documents: DocumentRow[];
  onDelete: (id: string) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-line p-10 text-center text-sm text-ink-muted">
        No documents yet. Upload one above to get started.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-ink-line/60 rounded-2xl border border-ink-line bg-ink-soft/30">
      {documents.map((doc) => {
        const meta = STATUS_META[doc.status];
        const Icon = meta.icon;
        const confirming = confirmingId === doc.id;

        return (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-ink-line/10"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-line/40 text-ink-muted">
                <FileText size={16} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.file_name}</p>
                <p className="text-xs text-ink-muted">
                  {doc.status === "ready"
                    ? `${doc.chunk_count} chunks`
                    : doc.status === "failed"
                    ? doc.error_message ?? "Something went wrong"
                    : "Chunking & embedding…"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <span className={`hidden items-center gap-1.5 text-xs sm:flex ${meta.color}`}>
                <Icon size={14} className={meta.spin ? "animate-spin" : ""} />
                {meta.label}
              </span>

              {confirming ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onDelete(doc.id);
                      setConfirmingId(null);
                    }}
                    className="flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/25"
                  >
                    <Check size={12} /> Delete
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="rounded-full p-1 text-ink-muted transition-colors hover:text-ink-text"
                    aria-label="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(doc.id)}
                  className="text-ink-muted transition-colors hover:text-danger"
                  aria-label={`Delete ${doc.file_name}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
