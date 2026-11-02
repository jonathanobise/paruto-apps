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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
