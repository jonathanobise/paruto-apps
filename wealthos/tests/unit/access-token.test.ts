import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { verifyAccessToken } from "../../deploy/demo/worker/src/access";

// A local RSA key pair stands in for Cloudflare Access's signing keys.
const TEAM = "https://example-team.cloudflareaccess.com";
const AUD = "aud-tag-123";
let keys: CryptoKeyPair;
let other: CryptoKeyPair;
const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

async function token(claims: Record<string, unknown>, opts: { kid?: string; key?: CryptoKey; alg?: string } = {}) {
  const h = enc({ alg: opts.alg ?? "RS256", kid: opts.kid ?? "k1", typ: "JWT" });
  const p = enc(claims);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", opts.key ?? keys.privateKey, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${Buffer.from(sig).toString("base64url")}`;
}
const now = () => Math.floor(Date.now() / 1000);
const good = () => ({ aud: [AUD], iss: TEAM, email: "Owner@Example.test", exp: now() + 600, nbf: now() - 5 });
const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD };

beforeAll(async () => {
  const params = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };
  keys = (await crypto.subtle.generateKey(params, true, ["sign", "verify"])) as CryptoKeyPair;
  other = (await crypto.subtle.generateKey(params, true, ["sign", "verify"])) as CryptoKeyPair;
  const jwk = { ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: "k1" };
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    expect(url).toBe(`${TEAM}/cdn-cgi/access/certs`);
    return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
  }));
});
afterAll(() => vi.unstubAllGlobals());

describe("Cloudflare Access token verification (the Worker's gate)", () => {
  it("returns the verified, lower-cased email for a valid token", async () => {
    expect(await verifyAccessToken(await token(good()), env)).toBe("owner@example.test");
  });

  it("rejects tokens signed by anyone else, or tampered with", async () => {
    expect(await verifyAccessToken(await token(good(), { key: other.privateKey }), env)).toBeNull();
    const t = await token(good());
    const [h, , s] = t.split(".");
    expect(await verifyAccessToken(`${h}.${enc({ ...good(), email: "attacker@example.test" })}.${s}`, env)).toBeNull();
    expect(await verifyAccessToken(await token(good(), { kid: "unknown" }), env)).toBeNull();
    expect(await verifyAccessToken(await token(good(), { alg: "none" }), env)).toBeNull();
    expect(await verifyAccessToken("not.a.jwt", env)).toBeNull();
    expect(await verifyAccessToken("garbage", env)).toBeNull();
  });

  it("checks audience, issuer and time", async () => {
    expect(await verifyAccessToken(await token({ ...good(), aud: ["another-app"] }), env)).toBeNull();
    expect(await verifyAccessToken(await token({ ...good(), iss: "https://evil.cloudflareaccess.com" }), env)).toBeNull();
    expect(await verifyAccessToken(await token({ ...good(), exp: now() - 120 }), env)).toBeNull();
    expect(await verifyAccessToken(await token({ ...good(), nbf: now() + 600 }), env)).toBeNull();
    expect(await verifyAccessToken(await token({ ...good(), aud: AUD }), env)).toBe("owner@example.test"); // single-string aud
  });
});
