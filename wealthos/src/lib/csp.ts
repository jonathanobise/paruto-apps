/**
 * Content Security Policy. Scripts: nonce + strict-dynamic (Next.js applies the nonce to its own
 * scripts). Styles allow inline attributes because charts and progress bars set style="…";
 * style injection can't run code. Nothing third-party is loaded.
 */
export function buildCsp(nonce: string, opts: { dev: boolean; https: boolean }): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${opts.dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(opts.https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export const HSTS = "max-age=63072000; includeSubDomains";
