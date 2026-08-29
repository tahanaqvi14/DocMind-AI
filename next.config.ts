import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) dynamically resolves its worker file at
  // runtime. Letting Next.js bundle it breaks that resolution and throws
  // "Setting up fake worker failed: Cannot find module '...pdf.worker.mjs'".
  // Marking it external keeps it as a normal node_modules require instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
