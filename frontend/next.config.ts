import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Silence the multi-lockfile workspace root warning
    root: __dirname,
  },
};

export default nextConfig;
