import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for pdf-parse which uses Node.js APIs
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],

  // Increase API body size limit for file uploads and ensure pdfjs worker is traced
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  outputFileTracingIncludes: {
    "/*": ["./node_modules/pdfjs-dist/**/*"],
  },
};

export default nextConfig;
