import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // libSQL ships a native SQLite binding for local `file:` databases; keep it
  // outside the bundler so Turbopack never tries to inline the .node binary.
  // Remote Turso URLs (libsql:// / https://) only use the pure-JS hrana client.
  serverExternalPackages: ["@libsql/client", "libsql"],
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
