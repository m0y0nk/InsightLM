import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for pdf-parse which uses Node.js APIs
  serverExternalPackages: ["pdf-parse"],

  // Increase API body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
