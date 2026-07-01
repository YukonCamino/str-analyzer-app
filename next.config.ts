import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'photos.zillowstatic.com' },
      { protocol: 'https', hostname: '*.zillowstatic.com' },
    ],
  },
};

export default nextConfig;
