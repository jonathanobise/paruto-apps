import { timingSafeEqual } from "node:crypto";

/**
 * Private owner mode (PRIVATE_OWNER_EMAIL set): a single-owner deployment behind Cloudflare
 * Access. The Worker in front verifies the Access token (signature, audience, issuer, expiry and
 * the owner's email) and only then forwards the request with two headers: the verified email and
 * a shared secret (OWNER_PROXY_SECRET) proving it came through the Worker. Every request without
 * both is refused (src/proxy.ts), and the app has no other way in: sign-up and password sign-in
 * are closed. See docs/PRIVATE.md.
 */
export const OWNER_EMAIL_HEADER = "x-vio-owner-email";
export const OWNER_PROOF_HEADER = "x-vio-owner-proof";

export function privateOwnerEmail(): string | null {
  const e = process.env.PRIVATE_OWNER_EMAIL?.trim().toLowerCase();
  return e ? e : null;
}

export function isPrivateMode(): boolean {
  return privateOwnerEmail() !== null;
}

/** The owner's email when the request carries the Worker's proof for the configured owner; else null. */
export function verifiedOwner(headers: Headers): string | null {
  const owner = privateOwnerEmail();
  const secret = process.env.OWNER_PROXY_SECRET ?? "";
  if (!owner || secret.length < 32) return null;
  const proof = headers.get(OWNER_PROOF_HEADER) ?? "";
  const a = Buffer.from(proof);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return (headers.get(OWNER_EMAIL_HEADER) ?? "").trim().toLowerCase() === owner ? owner : null;
}
