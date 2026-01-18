import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow connections from Railway's proxy
  experimental: {
    serverActions: {
      allowedOrigins: ["dailybunch.com", "*.railway.app"],
    },
  },
};

export default nextConfig;
