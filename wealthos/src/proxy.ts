import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, HSTS } from "@/lib/csp";

/**
 * Runs before every page and route: a fresh CSP nonce per request, HSTS when served over HTTPS,
 * and a request id (kept from a trusted edge if present) for log correlation.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const https = (process.env.APP_ORIGIN ?? "").startsWith("https://");
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV === "development", https });
  const incoming = request.headers.get("x-request-id");
  const requestId = incoming && /^[A-Za-z0-9._-]{8,80}$/.test(incoming) ? incoming : crypto.randomUUID();

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("x-request-id", requestId);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-request-id", requestId);
  if (https) response.headers.set("Strict-Transport-Security", HSTS);
  return response;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico).*)", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] }],
};
