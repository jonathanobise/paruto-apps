/** Cloudflare Access token verification (RS256 against the team's published keys). No Workers-only imports, so it can be tested in Node. */

type Jwk = JsonWebKey & { kid?: string };
let keyCache: { at: number; keys: Jwk[] } | null = null;

async function accessKeys(team: string, refresh = false): Promise<Jwk[]> {
  if (!refresh && keyCache && Date.now() - keyCache.at < 3_600_000) return keyCache.keys;
  const r = await fetch(`${team}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error(`Access certs: HTTP ${r.status}`);
  const body = (await r.json()) as { keys?: Jwk[] };
  keyCache = { at: Date.now(), keys: body.keys ?? [] };
  return keyCache.keys;
}

function b64urlBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
const b64urlJson = (s: string) => JSON.parse(new TextDecoder().decode(b64urlBytes(s))) as Record<string, unknown>;

/** The verified email in a Cloudflare Access token, or null if anything about it is wrong. */
export async function verifyAccessToken(token: string, env: { ACCESS_TEAM_DOMAIN: string; ACCESS_AUD: string }): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts as [string, string, string];
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = b64urlJson(h);
    payload = b64urlJson(p);
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
  let jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN, true)).find((k) => k.kid === header.kid); // keys rotate
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(sig), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;
  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return null;
  if (payload.iss !== env.ACCESS_TEAM_DOMAIN) return null;
  if (typeof payload.exp !== "number" || payload.exp < now - 30) return null;
  if (typeof payload.nbf === "number" && payload.nbf > now + 30) return null;
  return typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
}
