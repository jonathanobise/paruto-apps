/**
 * Private owner mode (PRIVATE_OWNER_EMAIL set): a deployment for one person. People sign in through
 * Paruto ID (src/server/identity/paruto-id.ts); only the owner's verified email gets a session, and
 * every page and action re-checks it (src/server/auth/context.ts). Sign-up, password sign-in and
 * password reset are closed. See docs/PRIVATE.md.
 */
export function privateOwnerEmail(): string | null {
  const e = process.env.PRIVATE_OWNER_EMAIL?.trim().toLowerCase();
  return e ? e : null;
}

export function isPrivateMode(): boolean {
  return privateOwnerEmail() !== null;
}

/** On a private deployment, whether this account is the owner's (everyone else is refused). */
export function isPrivateOwner(email: string): boolean {
  const owner = privateOwnerEmail();
  return owner === null || email.trim().toLowerCase() === owner;
}
