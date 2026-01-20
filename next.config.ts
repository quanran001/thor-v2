import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  poweredByHeader: false, // 🚨 隐藏 Next.js 身份，防止定向扫描
  experimental: {
    reactCompiler: true,
  },
  async headers() { // 🛡️ 添加安全响应头
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG || "sop-alchemist-org",
  project: process.env.SENTRY_PROJECT || "sop-alchemist",
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
