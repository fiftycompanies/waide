import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.naver.com" },
      { protocol: "https", hostname: "**.pstatic.net" },
      { protocol: "https", hostname: "**.navermaps.com" },
    ],
  },
};

export default nextConfig;
