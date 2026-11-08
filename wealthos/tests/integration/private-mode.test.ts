import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { closeDb, db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requestPasswordReset, signIn, signUp } from "@/server/identity/service";
import { completeParutoSignIn, parutoLogoutUrl, safeNextPath, startParutoSignIn } from "@/server/identity/paruto-id";
import { isPrivateMode, isPrivateOwner } from "@/lib/private-mode";
import { makeUser, meta } from "./helpers";

// Paruto ID's /token is stubbed: each test says who Paruto ID vouches for.
const ORIGIN = "https://vio.example.test";
const owner = `owner.${randomUUID().slice(0, 8)}@example.test`;
let identity: Record<string, unknown> = {};
let tokenStatus = 200;
let lastBody: URLSearchParams | null = null;

beforeEach(() => {
  process.env.PARUTO_ID_URL = "https://id.example.test";
  process.env.PARUTO_ID_CLIENT = "viowealth";
  process.env.PARUTO_ID_SECRET = "test-client-secret";
  tokenStatus = 200;
  lastBody = null;
  vi.stubGlobal("fetch", vi.fn(async (url: URL | string, init?: RequestInit) => {
    expect(String(url)).toBe("https://id.example.test/token");
    lastBody = new URLSearchParams(String(init?.body));
    return new Response(JSON.stringify(identity), { status: tokenStatus, headers: { "content-type": "application/json" } });
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ["PARUTO_ID_URL", "PARUTO_ID_CLIENT", "PARUTO_ID_SECRET", "PRIVATE_OWNER_EMAIL"]) delete process.env[k];
});
afterAll(async () => closeDb());

/** Start a sign-in, then come back from Paruto ID with its code and our state. */
function begin(next = "/research") {
  const s = startParutoSignIn(ORIGIN, next)!;
  const loc = new URL(s.location);
  return { cookie: s.cookie.value, state: loc.searchParams.get("state")!, loc };
}
const back = (b: ReturnType<typeof begin>, extra: Partial<{ code: string; state: string; error: string }> = {}) =>
  completeParutoSignIn(ORIGIN, { code: "one-time-code", state: b.state, ...extra }, b.cookie, meta);

describe("Paruto ID sign-in", () => {
  it("sends the browser to Paruto ID with PKCE, the exact callback and a signed state", () => {
    const b = begin("/research/macro");
    expect(b.loc.origin + b.loc.pathname).toBe("https://id.example.test/authorize");
    expect(Object.fromEntries(b.loc.searchParams)).toMatchObject({ client_id: "viowealth", redirect_uri: `${ORIGIN}/api/auth/paruto/callback`, response_type: "code", code_challenge_method: "S256" });
    expect(b.state.length).toBeGreaterThan(16);
    expect(b.cookie).not.toContain(b.state); // the state is inside a signed blob, not the raw cookie value
    process.env.PARUTO_ID_SECRET = "";
    expect(startParutoSignIn(ORIGIN, "/")).toBeNull(); // not configured → no sign-in
  });

  it("signs out of Paruto ID too, returning only to VioWealth's own sign-in page", () => {
    const u = new URL(parutoLogoutUrl(ORIGIN)!);
    expect(u.origin + u.pathname).toBe("https://id.example.test/logout");
    expect(Object.fromEntries(u.searchParams)).toEqual({ client_id: "viowealth", redirect_uri: `${ORIGIN}/sign-in?signin=signed_out` });
    process.env.PARUTO_ID_SECRET = "";
    expect(parutoLogoutUrl(ORIGIN)).toBeNull(); // not set up → plain local sign-out
  });

  it("keeps people on VioWealth's own pages after sign-in", () => {
    expect(safeNextPath("/research?lens=USD")).toBe("/research?lens=USD");
    for (const bad of ["//evil.example", "https://evil.example", "/\\evil", "javascript:alert(1)", 42, undefined]) expect(safeNextPath(bad)).toBe("/dashboard");
  });

  it("refuses a tampered, mismatched or missing state, and a cancelled sign-in", async () => {
    identity = { sub: "s1", email: owner, email_verified: true };
    const b = begin();
    expect(await back(b, { state: "not-the-state" })).toMatchObject({ ok: false, outcome: "expired" });
    expect(await completeParutoSignIn(ORIGIN, { code: "c", state: b.state }, `${b.cookie}x`, meta)).toMatchObject({ ok: false, outcome: "expired" });
    expect(await completeParutoSignIn(ORIGIN, { code: "c", state: b.state }, undefined, meta)).toMatchObject({ ok: false, outcome: "expired" });
    expect(await back(b, { error: "access_denied" })).toMatchObject({ ok: false, outcome: "cancelled" });
    expect(lastBody).toBeNull(); // nothing was exchanged
  });

  it("exchanges the code with the PKCE verifier and refuses unverified emails or a failed exchange", async () => {
    process.env.PRIVATE_OWNER_EMAIL = owner;
    identity = { sub: "s-unverified", email: owner, email_verified: false };
    const b = begin();
    expect(await back(b)).toMatchObject({ ok: false, outcome: "failed" });
    const body = lastBody!;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("client_secret")).toBe("test-client-secret");
    expect(body.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/paruto/callback`);
    expect(createHash("sha256").update(body.get("code_verifier")!).digest("base64url")).toBe(b.loc.searchParams.get("code_challenge"));
    tokenStatus = 400;
    identity = { sub: "s1", email: owner, email_verified: true };
    expect(await back(begin())).toMatchObject({ ok: false, outcome: "failed" });
  });
});

describe("private owner mode", () => {
  it("lets only the owner in, creating the account once and linking it to the Paruto ID", async () => {
    process.env.PRIVATE_OWNER_EMAIL = owner.toUpperCase(); // configured case doesn't matter
    expect(isPrivateMode()).toBe(true);
    identity = { sub: "someone-else", email: "someone.else@example.test", email_verified: true };
    expect(await back(begin())).toMatchObject({ ok: false, outcome: "not_allowed" });

    identity = { sub: "owner-sub", email: ` ${owner.toUpperCase()} `, email_verified: true, name: "Owner" };
    const first = await back(begin("/research/macro"));
    expect(first).toMatchObject({ ok: true, next: "/research/macro", mfaRequired: false });
    const again = await back(begin());
    expect(again.ok).toBe(true);
    const rows = await db().select({ sub: users.parutoIdSub, verified: users.emailVerifiedAt }).from(users).where(eq(users.email, owner));
    expect(rows).toEqual([{ sub: "owner-sub", verified: expect.any(Date) }]);

    identity = { sub: "a-different-paruto-id", email: owner, email_verified: true };
    expect(await back(begin())).toMatchObject({ ok: false, outcome: "linked_elsewhere" });
    expect(isPrivateOwner(owner)).toBe(true);
    expect(isPrivateOwner("someone.else@example.test")).toBe(false);
  });

  it("closes sign-up, password sign-in and password reset", async () => {
    process.env.PRIVATE_OWNER_EMAIL = owner;
    await expect(signUp({ displayName: "X", email: `x.${randomUUID().slice(0, 6)}@example.test`, password: "correct horse battery staple", acceptTerms: true, marketingOptIn: false }, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(signIn({ email: owner, password: "anything at all here" }, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requestPasswordReset({ email: owner }, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("outside private mode", () => {
  it("signs in existing accounts by verified email and links them; new people still use sign-up", async () => {
    expect(isPrivateOwner("anyone@example.test")).toBe(true);
    const existing = await makeUser("Linked");
    identity = { sub: `sub-${randomUUID()}`, email: existing.email, email_verified: true };
    expect(await back(begin())).toMatchObject({ ok: true });
    const [row] = await db().select({ sub: users.parutoIdSub }).from(users).where(eq(users.id, existing.userId));
    expect(row!.sub).toBe(identity.sub);
    identity = { sub: "new-person", email: `new.${randomUUID().slice(0, 6)}@example.test`, email_verified: true };
    expect(await back(begin())).toMatchObject({ ok: false, outcome: "not_allowed" });
  });
});
