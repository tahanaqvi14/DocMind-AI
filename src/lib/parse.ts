import mammoth from "mammoth";

/** Extracts plain text from an uploaded file buffer based on its type. */
export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  if (fileType === "application/pdf" || fileType === "pdf") {
    // On serverless platforms (Vercel), pdfjs-dist (used internally by
    // pdf-parse) reaches for browser globals like DOMMatrix the instant its
    // module evaluates. Importing pdf-parse/worker FIRST sets up a native
    // canvas polyfill (via @napi-rs/canvas) before that happens — import
    // order here is load-bearing, not stylistic. See:
    // https://www.buildwithmatija.com/blog/process-pdfs-on-vercel-serverless-guide
    const { CanvasFactory } = await import("pdf-parse/worker");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer), CanvasFactory });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (fileType === "text/plain" || fileType === "txt") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}
