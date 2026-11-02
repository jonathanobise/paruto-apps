/** Alerts: create a goal-milestone alert, check now, see notifications and the bell count, mark read. */
import { expect, test } from "@playwright/test";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

test("goal milestone alert produces in-app notifications once", async ({ page }) => {
  const email = `alerts.${Date.now()}@example.test`;
  await page.goto("/sign-up");
  await page.fill("#displayName", "Ada Alerts");
  await page.fill("#email", email);
  await page.fill("#password", "alerts journey passphrase");
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
  await page.fill("#name", "Savings");
  await page.click("button:has-text('Add account')");
  await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);
  await page.goto("/transactions/new");
  await page.fill("#amount", "600000");
  await page.click("button:has-text('Save transaction')");
  await page.waitForURL("**/transactions?saved=1");

  await page.goto("/goals/new");
  await page.fill("#name", "Rainy day");
  await page.fill("#targetAmount", "1000000");
  await page.selectOption("#targetIsReal", "nominal");
  await page.fill("#targetDate", `${new Date().getUTCFullYear() + 1}-12-31`);
  await page.fill("#inflationPct", "15");
  const returns = page.getByRole("textbox", { name: /Scenario \d return %/ });
  await returns.nth(0).fill("5");
  await returns.nth(1).fill("10");
  await returns.nth(2).fill("15");
  await page.click("button:has-text('Save goal')");
  await page.waitForURL(/\/goals\/[0-9a-f-]{36}$/);

  await page.goto("/alerts");
  await page.selectOption("#kind", "goal_progress");
  // Ongoing kinds default to "keep watching" (one-shot would stop after the first milestone).
  await expect(page.locator("input[name=repeat]")).toBeChecked();
  await page.click("button:has-text('Create alert')");
  await expect(page.getByText("Alert created.")).toBeVisible();
  await page.click("button:has-text('Check now')");
  await expect(page.getByText("2 new notifications.")).toBeVisible(); // 25% and 50% of ₦1m reached by ₦600k
  await page.click("button:has-text('Check now')");
  await expect(page.getByText(/nothing new/)).toBeVisible();

  await page.goto("/notifications");
  await expect(page.getByRole("link", { name: "Notifications, 2 unread" })).toBeVisible();
  await expect(page.getByText("Rainy day: 50% of the way there")).toBeVisible();
  await page.click("button:has-text('Mark all as read')");
  await expect(page.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();
});
