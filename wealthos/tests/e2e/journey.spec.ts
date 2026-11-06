/**
 * Core user journey through the real UI against a running app and database:
 * sign up → confirm email → add account → deposit → add instrument → purchase → dividend →
 * dashboard shows the right numbers → reverse a transaction → export CSV → sign out.
 */
import { expect, test } from "@playwright/test";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

async function latestToken(email: string): Promise<string> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
  try {
    const r = await pool.query("select text_body from email_outbox where to_address = $1 and purpose = 'email_verification' order by created_at desc limit 1", [email]);
    return /token=([A-Za-z0-9_-]+)/.exec(r.rows[0].text_body)![1]!;
  } finally {
    await pool.end();
  }
}

test("a new user records investments and sees a correct dashboard", async ({ page }) => {
  const email = `e2e.${Date.now()}@example.test`;
  // Each browser sign-up comes from its own address (dev trusts no proxy), so the per-IP limit isn't shared.
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}` });
  await page.goto("/sign-up");
  await page.fill("#displayName", "Ngozi Test");
  await page.fill("#email", email);
  await page.fill("#password", "a sufficiently long passphrase");
  await page.check("input[name=acceptTerms]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/verify-email");
  await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();

  // App pages are blocked until the email is confirmed.
  await page.goto("/dashboard");
  await page.waitForURL("**/verify-email");

  await page.goto(`/verify-email/confirm?token=${await latestToken(email)}`);
  await page.waitForURL("**/dashboard?welcome=1");
  await expect(page.getByText("Add your first account")).toBeVisible();

  // Account
  await page.goto("/accounts/new");
  await page.selectOption("#type", "brokerage");
  await page.fill("#name", "My broker");
  await page.click("button:has-text('Add account')");
  await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);

  // Deposit ₦1,000,000
  await page.goto("/transactions/new");
  await page.selectOption("#type", "deposit");
  await page.fill("#occurredOn", "2026-01-05");
  await page.fill("#amount", "1,000,000");
  await page.click("button:has-text('Save transaction')");
  await page.waitForURL("**/transactions?saved=1");

  // Private instrument (no price feed → valued at cost and flagged)
  await page.goto("/transactions/new");
  await page.fill("#i-name", "E2E Unlisted Fund");
  await page.selectOption("#i-class", "equity_fund");
  await page.selectOption("#i-pricing", "manual");
  await page.click("button:has-text('Add instrument')");
  await expect(page.getByText("Added “E2E Unlisted Fund”")).toBeVisible();

  // Purchase 1,000 units @ ₦500 + ₦2,500 fees = ₦502,500
  await page.reload();
  await page.selectOption("#type", "buy");
  await page.fill("#occurredOn", "2026-01-06");
  const opt = await page.locator("#instrumentId option", { hasText: "E2E Unlisted Fund" }).getAttribute("value");
  await page.selectOption("#instrumentId", opt!);
  await page.fill("#quantity", "1000");
  await page.fill("#price", "500");
  await page.fill("#fees", "2500");
  await page.click("button:has-text('Save transaction')");
  await page.waitForURL("**/transactions?saved=1");

  // Selling more than held is rejected with an explanation
  await page.goto("/transactions/new");
  await page.selectOption("#type", "sell");
  await page.fill("#occurredOn", "2026-01-07");
  await page.selectOption("#instrumentId", opt!);
  await page.fill("#quantity", "5000");
  await page.fill("#price", "500");
  await page.click("button:has-text('Save transaction')");
  await expect(page.getByText(/negative holding/)).toBeVisible();

  // Dividend ₦20,000 gross, ₦2,000 withholding tax
  await page.goto("/transactions/new");
  await page.selectOption("#type", "dividend");
  await page.fill("#occurredOn", "2026-03-01");
  await page.selectOption("#instrumentId", opt!);
  await page.fill("#grossAmount", "20000");
  await page.fill("#withholdingTax", "2000");
  await page.click("button:has-text('Save transaction')");
  await page.waitForURL("**/transactions?saved=1");

  // Dashboard: invested 502,500 (at cost), cash 1,000,000 − 502,500 + 18,000 = 515,500, net worth 1,018,000
  await page.goto("/dashboard?period=ALL");
  await expect(page.getByText("Your wealth today")).toBeVisible();
  const stats = page.locator("dl").first();
  await expect(stats).toContainText("₦1,018,000");
  await expect(stats).toContainText("₦502,500");
  await expect(stats).toContainText("₦515,500");
  await expect(page.getByText(/Valued at cost/).first()).toBeVisible();
  // Contributions are not profit. The holding is unpriced, so it is shown at cost basis (which
  // capitalises the ₦2,500 fee); the gain is therefore the net dividend: 20,000 − 2,000 tax = 18,000.
  await expect(page.getByRole("row", { name: /Investment gain/ })).toContainText("₦18,000");
  await expect(page.getByRole("row", { name: /Net contributions/ })).toContainText("₦0");

  // Reverse the dividend; history keeps it, marked reversed
  await page.goto("/transactions");
  const row = page.getByRole("row", { name: /Dividend/ });
  await row.getByText("Reverse…").click();
  await row.getByPlaceholder(/Why\?/).fill("Entered in error");
  await row.getByRole("button", { name: "Reverse entry" }).click();
  await page.waitForURL("**/transactions?reversed=1");
  await expect(page.getByText(/Reversed\. The original entry stays/)).toBeVisible();
  await expect(page.getByRole("row", { name: /Dividend.*Reversed/ })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.locator("dl").first()).toContainText("₦1,000,000");

  // CSV export
  const csv = await page.request.get("/api/export/transactions.csv");
  expect(csv.status()).toBe(200);
  const body = await csv.text();
  expect(body.split("\r\n")[0]).toBe("id,date,type,description,account,instrument,quantity,price,amount,currency,source,reversed_by,reverses,recorded_at");
  expect(body).toContain('"dividend"');
  expect(body).toContain('"reversal"');

  // Sign out ends access
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/sign-in");
  expect((await page.request.get("/api/export/transactions.csv")).status()).toBe(401);
});

test("protected pages and APIs require a session", async ({ page }) => {
  await page.goto("/holdings");
  await page.waitForURL("**/sign-in");
  expect((await page.request.get("/api/export/account")).status()).toBe(401);
});
