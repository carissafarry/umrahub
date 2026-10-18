import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets validation builds run beside a dev server in the same checkout without sharing .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
