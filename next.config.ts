import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  redirects: async () => [
    // /news retired in favor of unified /blog routes (plan 260929-2254).
    { source: "/news", destination: "/blog", permanent: true },
    { source: "/news/:slug", destination: "/blog/:slug", permanent: true },
    { source: "/:locale/news", destination: "/:locale/blog", permanent: true },
    {
      source: "/:locale/news/:slug",
      destination: "/:locale/blog/:slug",
      permanent: true,
    },
  ],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
  },
};

export default withNextIntl(nextConfig);
