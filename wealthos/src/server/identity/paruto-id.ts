import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, withUser } from "@/server/db/client";
import { userPreferences, users } from "@/server/db/schema";
import { hashPassword } from "./crypto";
import { createSession } from "./sessions";
import { recordSecurityEvent, type RequestMeta } from "@/server/audit/audit";
import { env } from "@/server/platform/env";
import { isPrivateMode, privateOwnerEmail } from "@/lib/private-mode";

/**
 * Sign-in through Paruto ID (id.paruto.com), the shared passwordless sign-in for every Paruto app
 * (paruto-standards/PARUTO-ID.md): a passkey or a 6-digit email code there, no password here. The
 * browser goes to Paruto ID with a PKCE challenge and comes back with a one-time code; this server
 * exchanges it, with VioWealth's secret, for a verified email, then finds the person (or, where this
 * deployment allows, creates them) and opens an ordinary VioWealth session.
 *   PARUTO_ID_URL    https://id.paruto.com
 *   PARUTO_ID_CLIENT this copy's name in Paruto ID's allow-list (viowealth)
 *   PARUTO_ID_SECRET this copy's secret (production and development differ)
 */

export const PARUTO_COOKIE = "wos_paruto";
export const PARUTO_PATH = "/api/auth/paruto";
const STATE_MS = 15 * 60_000;

export type ParutoOutcome = "cancelled" | "expired" | "failed" | "not_allowed" | "unavailable" | "linked_elsewhere";
interface Pending {
  state: string;
  verifier: string;
  next: string;
  exp: number;
}
export interface ParutoIdentity {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string | null;
}

function config() {
  const url = process.env.PARUTO_ID_URL;
  const client = process.env.PARUTO_ID_CLIENT;
  const secret = process.env.PARUTO_ID_SECRET;
  return url && client && secret ? { url, client, secret } : null;
}
export const parutoReady = () => config() !== null;

/**
 * Where to send the browser after VioWealth's own session has ended, so Paruto ID's single sign-on
 * ends too and "Continue with Paruto ID" asks again. Paruto ID's /logout returns only to an address on
 * this app's registered origin. Null when Paruto ID isn't set up here.
 */
export function parutoLogoutUrl(origin: string): string | null {
  const c = config();
  if (!c) return null;
  const url = new URL("/logout", c.url);
  url.search = new URLSearchParams({ client_id: c.client, redirect_uri: `${origin}/sign-in?signin=signed_out` }).toString();
  return url.toString();
}

const b64url = (b: Buffer) => b.toString("base64url");
const sameString = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
/** Only VioWealth's own pages: a path, never another site (no "//", no backslash, no scheme). */
export const safeNextPath = (next: unknown) => (typeof next === "string" && /^\/(?![/\\])[\w\-./?=&%#]*$/.test(next) && next.length <= 300 ? next : "/dashboard");

/** The state cookie is signed (HMAC-SHA256 with a key derived from the app's encryption key), never trusted unsigned. */
function stateKey(): Buffer {
  return createHmac("sha256", Buffer.from(env().APP_ENCRYPTION_KEY, "base64")).update("paruto-id-state-v1").digest();
}
function seal(p: Pending): string {
  const body = b64url(Buffer.from(JSON.stringify(p)));
  return `${body}.${b64url(createHmac("sha256", stateKey()).update(body).digest())}`;
}
function unseal(raw: string | undefined): Pending | null {
  if (!raw) return null;
  const [body, mac] = raw.split(".");
  if (!body || !mac || !sameString(mac, b64url(createHmac("sha256", stateKey()).update(body).digest()))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Pending;
    return typeof p.state === "string" && typeof p.verifier === "string" && typeof p.exp === "number" ? p : null;
  } catch {
    return null;
  }
}

/** Where to send the browser, and the cookie to set (HttpOnly, SameSite=Lax so it survives the redirect back). */
export function startParutoSignIn(origin: string, next: unknown): { location: string; cookie: { value: string; maxAge: number } } | null {
  const c = config();
  if (!c) return null;
  const pending: Pending = { state: b64url(randomBytes(16)), verifier: b64url(randomBytes(48)), next: safeNextPath(next), exp: Date.now() + STATE_MS };
  const challenge = b64url(createHash("sha256").update(pending.verifier).digest());
  const url = new URL("/authorize", c.url);
  url.search = new URLSearchParams({
    client_id: c.client,
    redirect_uri: `${origin}${PARUTO_PATH}/callback`,
    response_type: "code",
    state: pending.state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return { location: url.toString(), cookie: { value: seal(pending), maxAge: STATE_MS / 1000 } };
}

/**
 * Paruto ID sent the browser back. Checks the state, exchanges the code server-side, and signs the
 * person in by verified email. On a private deployment only the owner may come in.
 */
export async function completeParutoSignIn(
  origin: string,
  query: { code?: string | null; state?: string | null; error?: string | null },
  cookie: string | undefined,
  meta: RequestMeta,
): Promise<{ ok: true; session: { token: string; expiresAt: Date }; next: string; mfaRequired: boolean } | { ok: false; outcome: ParutoOutcome }> {
  const c = config();
  if (!c) return { ok: false, outcome: "unavailable" };
  const pending = unseal(cookie);
  if (query.error) return { ok: false, outcome: "cancelled" };
  if (!pending || pending.exp < Date.now() || !query.code || !query.state || !sameString(query.state, pending.state)) return { ok: false, outcome: "expired" };

  let who: ParutoIdentity;
  try {
    const res = await fetch(new URL("/token", c.url), {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: query.code,
        code_verifier: pending.verifier,
        client_id: c.client,
        client_secret: c.secret,
        redirect_uri: `${origin}${PARUTO_PATH}/callback`,
      }),
    });
    if (!res.ok) {
      console.error("[paruto-id] exchange failed", res.status);
      return { ok: false, outcome: "failed" };
    }
    who = (await res.json()) as ParutoIdentity;
  } catch (e) {
    console.error("[paruto-id] unreachable", String(e).slice(0, 200));
    return { ok: false, outcome: "failed" };
  }
  if (!who.email || who.email_verified !== true) return { ok: false, outcome: "failed" };
  const email = who.email.trim().toLowerCase();

  const owner = privateOwnerEmail();
  if (isPrivateMode() && email !== owner) return { ok: false, outcome: "not_allowed" };

  const [found] = await db()
    .select({ id: users.id, sub: users.parutoIdSub, verified: users.emailVerifiedAt, mfa: users.mfaEnabledAt })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);
  let user = found ?? null;
  if (user?.sub && who.sub && user.sub !== who.sub) return { ok: false, outcome: "linked_elsewhere" };
  if (!user) {
    // New accounts through Paruto ID: the owner of a private deployment. Elsewhere, people still create
    // accounts through sign-up until the public sign-up moves to Paruto ID too (docs/DECISIONS.md ADR-031).
    if (!isPrivateMode()) return { ok: false, outcome: "not_allowed" };
    const passwordHash = await hashPassword(randomBytes(32).toString("base64url")); // unusable: password sign-in is closed here
    const [created] = await db()
      .insert(users)
      .values({ email, displayName: (who.name?.trim() || email.split("@")[0]!).slice(0, 100), passwordHash, emailVerifiedAt: new Date(), parutoIdSub: who.sub ?? null })
      .returning({ id: users.id });
    await db().insert(userPreferences).values({ userId: created!.id });
    await withUser(created!.id, (tx) => tx.execute(sql`select app_create_organization(${created!.id}::uuid, ${"Personal"}, 'personal'::org_kind, false)`));
    user = { id: created!.id, sub: who.sub ?? null, verified: new Date(), mfa: null };
  } else if (!user.sub || !user.verified) {
    await db().update(users).set({ ...(user.sub ? {} : { parutoIdSub: who.sub ?? null }), ...(user.verified ? {} : { emailVerifiedAt: new Date() }), updatedAt: new Date() }).where(eq(users.id, user.id));
  }
  await recordSecurityEvent(user.id, "signin.paruto_id", meta);
  // Paruto ID is the sign-in; an account that also enrolled VioWealth's own two-step code still needs it.
  const mfaRequired = Boolean(user.mfa);
  const session = await createSession(user.id, { mfaSatisfied: !mfaRequired, ...meta });
  return { ok: true, session, next: pending.next, mfaRequired };
}
