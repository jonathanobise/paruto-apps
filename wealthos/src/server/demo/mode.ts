import "server-only";
import { AppError } from "@/server/platform/errors";

/**
 * Public demo mode (DEMO_MODE=1): a shared, throwaway deployment of the SAMPLE portfolio.
 * - Sign-up is closed; visitors enter with "Explore the demo" as the shared demo user.
 * - Anything that could lock other visitors out, contact real people or create money owed is
 *   refused (passwords, two-step verification, sessions, invitations, billing, support, erasure).
 * - Nothing identifying visitors is stored: requestMeta() drops IP and user agent.
 * The database is recreated from SAMPLE data whenever the demo container starts.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1";
}

/** The shared demo user (created by `db:seed-demo -- --with-user`). */
export function demoUserEmail(): string {
  return process.env.DEMO_USER_EMAIL ?? "demo@wealthos.test";
}

export function assertNotDemo(what: string): void {
  if (isDemoMode()) throw new AppError("FORBIDDEN", `${what} isn't available in the public demo.`);
}
