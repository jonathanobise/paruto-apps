/**
 * The client's IP address for rate limits and security logs.
 *
 * X-Forwarded-For is client-controlled except for the entries appended by proxies we run. With
 * `trustedHops` proxies in front of the app, each appending the address it received a request
 * from, the client's address is the entry `trustedHops` from the right; anything to its left was
 * supplied by the client and is ignored. A platform header that the edge always overwrites (e.g.
 * Cloudflare's CF-Connecting-IP) can be named instead.
 */
export function clientIp(get: (name: string) => string | null, opts: { trustedHeader?: string | null; trustedHops: number }): string | null {
  const valid = (v: string | null | undefined) => {
    const s = v?.trim();
    return s && s.length <= 45 && /^[0-9a-fA-F:.]+$/.test(s) ? s : null;
  };
  if (opts.trustedHeader) return valid(get(opts.trustedHeader));
  const parts = (get("x-forwarded-for") ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return valid(get("x-real-ip"));
  // trustedHops = 0: no proxy; Next.js fills the header with the socket address when the client
  // didn't send one (development and tests only — production requires a configured proxy).
  const i = parts.length - Math.max(1, opts.trustedHops);
  return i >= 0 ? valid(parts[i]) : null;
}
