import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      // Loom thumbnails. Routing them through next/image matters here: the
      // originals are animated GIFs up to 5MB each, and a 20-card grid would
      // otherwise pull tens of megabytes. Optimising them yields a single
      // still frame at card width.
      {
        protocol: "https",
        hostname: "cdn.loom.com",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: "Certified Vision Framers Portal",
  },
};

export default nextConfig;
