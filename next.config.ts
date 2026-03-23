import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.transloadit.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      // You can add other hostnames here as needed.
    ],
  },
};

export default nextConfig;
