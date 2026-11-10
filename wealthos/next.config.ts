import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Node-only packages kept out of the bundler (pdfkit reads its own font metrics at runtime).
  serverExternalPackages: ["pg", "pdfkit"],
  // Report fonts are read from disk at runtime; ship them with standalone/traced builds.
  outputFileTracingIncludes: { "/api/reports/*": ["./src/server/reports/fonts/*"] },
  typedRoutes: false,
  // CSV imports accept files up to 2 MiB (validated again server-side); allow multipart overhead.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // What's live, for the update pill and the connection light (a "__" folder would be private in the app router).
  async rewrites() {
    return [{ source: "/__version", destination: "/api/version" }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must always be re-checked so fixes reach installed apps promptly.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
      { source: "/__version", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
    ];
  },
};

export default config;
