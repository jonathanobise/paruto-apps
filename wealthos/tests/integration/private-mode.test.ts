import { afterAll, afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { closeDb, db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requestPasswordReset, signIn, signUp } from "@/server/identity/service";
import { startOwnerSession } from "@/server/private/session";
import { OWNER_EMAIL_HEADER, OWNER_PROOF_HEADER, isPrivateMode, verifiedOwner } from "@/lib/private-mode";
import { meta } from "./helpers";

const owner = `owner.${randomUUID().slice(0, 8)}@example.test`;
const secret = "s".repeat(40);
const headers = (email: string, proof: string) => new Headers({ [OWNER_EMAIL_HEADER]: email, [OWNER_PROOF_HEADER]: proof });

function privateOn() {
  process.env.PRIVATE_OWNER_EMAIL = owner.toUpperCase(); // configured case doesn't matter
  process.env.OWNER_PROXY_SECRET = secret;
}
afterEach(() => {
  delete process.env.PRIVATE_OWNER_EMAIL;
  delete process.env.OWNER_PROXY_SECRET;
});
afterAll(async () => closeDb());

describe("private owner mode", () => {
  it("accepts only the Worker's proof for the configured owner", () => {
    expect(isPrivateMode()).toBe(false);
    expect(verifiedOwner(headers(owner, secret))).toBeNull(); // not in private mode
    privateOn();
    expect(isPrivateMode()).toBe(true);
    expect(verifiedOwner(headers(owner, secret))).toBe(owner);
    expect(verifiedOwner(headers(` ${owner.toUpperCase()} `, secret))).toBe(owner);
    expect(verifiedOwner(headers(owner, "s".repeat(39)))).toBeNull();
    expect(verifiedOwner(headers(owner, `${"s".repeat(39)}x`))).toBeNull();
    expect(verifiedOwner(headers("someone.else@example.test", secret))).toBeNull();
    expect(verifiedOwner(new Headers())).toBeNull();
    process.env.OWNER_PROXY_SECRET = "short";
    expect(verifiedOwner(headers(owner, "short"))).toBeNull(); // a weak secret is never trusted
  });

  it("signs the owner in, creating the account once", async () => {
    privateOn();
    await expect(startOwnerSession(headers(owner, "wrong".repeat(8)))).rejects.toMatchObject({ code: "FORBIDDEN" });
    const a = await startOwnerSession(headers(owner, secret));
    const b = await startOwnerSession(headers(owner, secret));
    expect(a.token).not.toBe(b.token);
    const rows = await db().select({ id: users.id, verified: users.emailVerifiedAt }).from(users).where(eq(users.email, owner));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.verified).not.toBeNull();
  });

  it("closes sign-up, password sign-in and password reset", async () => {
    privateOn();
    await expect(signUp({ displayName: "X", email: `x.${randomUUID().slice(0, 6)}@example.test`, password: "correct horse battery staple", acceptTerms: true, marketingOptIn: false }, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(signIn({ email: owner, password: "anything at all here" }, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requestPasswordReset({ email: owner }, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
