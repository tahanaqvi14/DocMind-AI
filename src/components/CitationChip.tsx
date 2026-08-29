"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import type { Citation } from "@/types";

export function CitationChip({ citation, index }: { citation: Citation; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-ink-line bg-ink px-3 py-1 font-mono text-xs text-highlight transition-colors hover:border-highlight"
      >
        <FileText size={12} />
        [{index + 1}] {citation.file_name}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-72 rounded-xl border border-ink-line bg-ink-soft p-4 shadow-xl">
          <p className="font-mono text-[11px] text-teal">
            {citation.file_name} · passage {citation.chunk_index + 1}
          </p>
          <p className="mt-2 text-sm text-ink-muted">&ldquo;{citation.snippet}&rdquo;</p>
          <p className="mt-2 text-[11px] text-ink-muted">
            {Math.round(citation.similarity * 100)}% match
          </p>
        </div>
      )}
    </div>
  );
}
