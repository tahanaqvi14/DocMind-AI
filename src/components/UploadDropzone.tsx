"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, Loader2 } from "lucide-react";
import { MAX_UPLOAD_BYTES } from "@/types";

export function UploadDropzone({ onUploaded }: { onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejections: FileRejection[]) => {
      setError(null);
      const errors: string[] = [];

      // Rejected files used to vanish without a word.
      for (const { file, errors: why } of rejections) {
        errors.push(
          why.some((e) => e.code === "file-too-large")
            ? `${file.name} is over the 4 MB limit.`
            : `${file.name} isn't a PDF, DOCX, or TXT file.`
        );
      }

      for (const file of acceptedFiles) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          // A platform error (e.g. a 413 or 504 from the host) is not JSON.
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            errors.push(
              `${file.name}: ${
                data.error ||
                (res.status === 413
                  ? "the file is too large."
                  : res.status === 504
                  ? "processing took too long. Try a smaller file."
                  : "upload failed. Please try again.")
              }`
            );
          }
        } catch {
          errors.push(`${file.name}: network error while uploading. Please try again.`);
        } finally {
          setUploading(false);
        }
        // Refresh after every file, success or failure, so the list shows
        // ready and failed documents alike.
        onUploaded();
      }

      if (errors.length) setError(errors.join(" "));
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
    maxSize: MAX_UPLOAD_BYTES,
    multiple: true,
    disabled: uploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          isDragActive ? "border-highlight bg-highlight/5" : "border-ink-line hover:border-teal"
        } ${uploading ? "cursor-wait opacity-80" : ""}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="animate-spin text-highlight" size={28} />
        ) : (
          <UploadCloud className="text-ink-muted" size={28} />
        )}
        <p className="mt-4 font-medium">
          {uploading
            ? "Processing… this can take a little while"
            : isDragActive
            ? "Drop it here"
            : "Drag & drop, or click to upload"}
        </p>
        <p className="mt-1 text-sm text-ink-muted">PDF, DOCX, or TXT, up to 4 MB each</p>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
