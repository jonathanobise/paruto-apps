/**
 * Research assistant UI against the scripted TEST provider (AI_PROVIDER=test, staging only):
 * consent toggle, ask → tool lookup → labelled answer with lookups listed, conversation list, delete.
 */
import { expect, test } from "@playwright/test";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

test("read a Learn article, ask the assistant, see the lookups it ran, manage consent and delete the conversation", async ({ page }) => {
  const email = `assistant.${Date.now()}@example.test`;
  await page.goto("/sign-up");
  await page.fill("#displayName", "Ada Assistant");
  await page.fill("#email", email);
  await page.fill("#password", "assistant journey passphrase");
  await page.check("input[name=acceptTerms]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/verify-email");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
  const r = await pool.query("select text_body from email_outbox where to_address = $1 order by created_at desc limit 1", [email]);
  await page.goto(`/verify-email/confirm?token=${/token=([A-Za-z0-9_-]+)/.exec(r.rows[0].text_body)![1]}`);
  await page.waitForURL("**/dashboard**");

  // Education: index → article with a worked example and related links.
  await page.getByRole("link", { name: "Learn" }).first().click();
  await page.waitForURL("**/learn");
  await page.getByRole("link", { name: /Treasury bill yields/ }).click();
  await page.waitForURL("**/learn/treasury-bill-yields");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/discount rate, true yield/);
  await expect(page.getByRole("row", { name: /Price paid/ }).first()).toContainText("₦820,493.15");
  await page.screenshot({ path: "test-results/screens/learn-article.png", fullPage: true });
  await page.getByRole("navigation", { name: "Related" }).getByRole("link").first().click();
  await page.waitForURL("**/learn/money-market-fund-yields");

  await page.getByRole("link", { name: "Research assistant" }).first().click();
  await page.waitForURL("**/assistant");
  await expect(page.getByText("Pre-release feature")).toBeVisible();
  await expect(page.getByText("Not connected")).toHaveCount(0);
  await expect(page.getByText(/Off: the assistant answers general/)).toBeVisible();

  await page.getByRole("button", { name: "Allow access" }).click();
  await expect(page.getByText(/On: the assistant can read your accounts/)).toBeVisible();
  const consent = await pool.query("select c.granted from consent_records c join users u on u.id = c.user_id where u.email = $1 and c.consent_key = 'ai_data_processing' order by c.recorded_at desc limit 1", [email]);
  expect(consent.rows[0].granted).toBe(true);

  await page.fill("#message", "Tell me about treasury bills; my email is ada@example.com");
  await page.getByRole("button", { name: "Ask" }).click();
  await page.waitForURL(/\/assistant\?c=[0-9a-f-]{36}/);
  await expect(page.getByText("[TEST PROVIDER]")).toBeVisible();
  await expect(page.getByText("search instruments")).toBeVisible();
  // The stored question is redacted.
  await expect(page.getByText("ada@example.com")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Conversations" }).getByRole("link")).toHaveCount(1);

  // Follow-up in the same conversation.
  await page.fill("#message", "And bonds");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText("[TEST PROVIDER]")).toHaveCount(2);
  await expect(page.getByRole("navigation", { name: "Conversations" }).getByRole("link")).toHaveCount(1);

  await page.screenshot({ path: "test-results/screens/assistant.png", fullPage: true });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({ path: "test-results/screens/assistant-dark.png", fullPage: true });
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("button", { name: "Delete conversation" }).click();
  await page.waitForURL(/\/assistant$/);
  await expect(page.getByText("No conversations yet.")).toBeVisible();

  await page.getByRole("button", { name: "Turn off" }).click();
  await expect(page.getByText(/Off: the assistant answers general/)).toBeVisible();
  await pool.end();
});
