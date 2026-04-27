import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow WebSocket HMR connections from local network IP (e.g. testing on mobile)
  allowedDevOrigins: ["192.168.137.1", "localhost"],
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
