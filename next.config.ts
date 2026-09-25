import type { NextConfig } from "next";

// Fully static site: `next build` writes ./out, deployable to any static host.
// NEXT_PUBLIC_BASE_PATH is set by the GitHub Pages workflow ("/silybench-site"); empty for a
// custom domain or local dev.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;
