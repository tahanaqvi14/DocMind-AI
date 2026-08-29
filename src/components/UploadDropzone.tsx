"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2 } from "lucide-react";

export function UploadDropzone({ onUploaded }: { onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      for (const file of acceptedFiles) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Upload failed");
          } else {
            onUploaded();
          }
        } catch {
          setError("Network error while uploading. Please try again.");
        } finally {
          setUploading(false);
        }
      }
    },
    [onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    multiple: true,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          isDragActive ? "border-highlight bg-highlight/5" : "border-ink-line hover:border-teal"
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="animate-spin text-highlight" size={28} />
        ) : (
          <UploadCloud className="text-ink-muted" size={28} />
        )}
        <p className="mt-4 font-medium">
          {isDragActive ? "Drop it here" : "Drag & drop, or click to upload"}
        </p>
        <p className="mt-1 text-sm text-ink-muted">PDF, DOCX, or TXT — up to a few MB each</p>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
