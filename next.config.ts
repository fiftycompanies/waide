import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.naver.com" },
      { protocol: "https", hostname: "**.pstatic.net" },
      { protocol: "https", hostname: "**.navermaps.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async rewrites() {
    return [
      // 랜딩 페이지 프록시
      {
        source: "/homepage/landing",
        destination: "https://landing-xxx.vercel.app/",
      },
      {
        source: "/homepage/landing/:path*",
        destination: "https://landing-xxx.vercel.app/:path*",
      },
      // 템플릿 프리뷰 프록시
      {
        source: "/homepage/templates/preview/:path*",
        destination: "https://sites-one-nu.vercel.app/templates/:path*",
      },
    ];
  },
};

export default nextConfig;
