import { expect, type Page } from "@playwright/test";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

export function ownerPool(): pg.Pool {
  return new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
}

/** Sign up through the UI, confirm the email from the dev outbox, land on the dashboard. */
export async function signUpVerified(page: Page, name: string, email = `${name.toLowerCase().replace(/\W+/g, ".")}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`): Promise<string> {
  // Each browser sign-up comes from its own address (dev trusts no proxy), so the per-IP limit isn't shared.
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}` });
  await page.goto("/sign-up");
  await page.fill("#displayName", name);
  await page.fill("#email", email);
  await page.fill("#password", "end to end test passphrase");
  await page.check("input[name=acceptTerms]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/verify-email");
  const pool = ownerPool();
  const r = await pool.query("select text_body from email_outbox where to_address = $1 order by created_at desc limit 1", [email]);
  await pool.end();
  await page.goto(`/verify-email/confirm?token=${/token=([A-Za-z0-9_-]+)/.exec(r.rows[0].text_body)![1]}`);
  await page.waitForURL("**/dashboard**");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return email;
}

export async function latestEmailTo(email: string, purpose?: string): Promise<string> {
  const pool = ownerPool();
  const r = purpose
    ? await pool.query("select text_body from email_outbox where to_address = $1 and purpose = $2 order by created_at desc limit 1", [email, purpose])
    : await pool.query("select text_body from email_outbox where to_address = $1 order by created_at desc limit 1", [email]);
  await pool.end();
  return r.rows[0]?.text_body ?? "";
}
