/** Account editing, performance card and closing through the UI. */
import { expect, test } from "@playwright/test";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

test("edit an account, see its performance, and close it once empty", async ({ page }) => {
  const email = `acct.${Date.now()}@example.test`;
  await page.goto("/sign-up");
  await page.fill("#displayName", "Ada Accounts");
  await page.fill("#email", email);
  await page.fill("#password", "accounts journey passphrase");
  await page.check("input[name=acceptTerms]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/verify-email");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
  const r = await pool.query("select text_body from email_outbox where to_address = $1 order by created_at desc limit 1", [email]);
  await pool.end();
  await page.goto(`/verify-email/confirm?token=${/token=([A-Za-z0-9_-]+)/.exec(r.rows[0].text_body)![1]}`);
  await page.waitForURL("**/dashboard**");

  await page.goto("/accounts/new");
  await page.selectOption("#type", "bank");
  await page.fill("#name", "Old bank name");
  await page.click("button:has-text('Add account')");
  await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);
  const accountUrl = page.url();

  // Edit details
  await page.fill("#name", "Joint savings");
  await page.fill("#ownershipPercent", "50");
  await page.click("button:has-text('Save details')");
  await expect(page.getByText("Account details saved.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Joint savings" })).toBeVisible();
  await expect(page.getByText("50% yours")).toBeVisible();

  // Money in, then try to close: refused while cash remains
  await page.goto(`/transactions/new?account=${accountUrl.split("/").pop()}`);
  await page.selectOption("#type", "deposit");
  await page.fill("#occurredOn", "2026-01-05");
  await page.fill("#amount", "200000");
  await page.click("button:has-text('Save transaction')");
  await page.waitForURL("**/transactions?saved=1");
  await page.goto(accountUrl + "?period=ALL");
  await expect(page.getByText("Money in / out")).toBeVisible();
  await page.getByText("Close this account…").click();
  await page.click("button:has-text('Close account')");
  await expect(page.getByText(/Move or withdraw what's left/)).toBeVisible();

  // Withdraw everything, then close
  await page.goto(`/transactions/new?account=${accountUrl.split("/").pop()}`);
  await page.selectOption("#type", "withdrawal");
  await page.fill("#occurredOn", "2026-01-06");
  await page.fill("#amount", "200000");
  await page.click("button:has-text('Save transaction')");
  await page.waitForURL("**/transactions?saved=1");
  await page.goto(accountUrl);
  await page.getByText("Close this account…").click();
  await page.click("button:has-text('Close account')");
  await expect(page.getByText("Account closed. Its history is kept.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Re-open account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Record transaction" })).toHaveCount(0);
});
