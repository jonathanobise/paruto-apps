/**
 * Plans, shared spaces and reports: plan limits shown, free trial, invitation by email accepted by
 * a second user, plan request → invoice with bank-transfer details, PDF/CSV statements.
 */
import { expect, test } from "@playwright/test";
import { latestEmailTo, signUpVerified } from "./helpers";

test("trial, shared space with an invited member, invoice and reports", async ({ page, browser }) => {
  const ownerEmail = await signUpVerified(page, "Plan Owner");

  // Create a household space; Free can't invite.
  await page.goto("/settings/members");
  await page.fill("#space-name", "Okoro household");
  await page.selectOption("#space-kind", "household");
  await page.click("button:has-text('Create shared space')");
  await expect(page.getByText("Shared space created and opened")).toBeVisible();
  const memberEmail = `plan.member.${Date.now()}@example.test`;
  await page.fill("#invite-email", memberEmail);
  await page.click("button:has-text('Send invitation')");
  await expect(page.getByText(/Free allows 1 member/)).toBeVisible();
  await expect(page.locator("#invite-email")).toHaveValue(memberEmail); // input kept after the error

  // Start a Wealth Plus trial for the space.
  await page.goto("/settings/billing");
  await expect(page.getByRole("heading", { name: "Free", exact: true }).or(page.getByText("is on")).first()).toBeVisible();
  await page.getByRole("button", { name: /Start 14-day free trial/ }).first().click();
  await expect(page.getByText("Your free trial has started")).toBeVisible();
  await expect(page.getByText("Free trial", { exact: true })).toBeVisible();

  // Invite works now.
  await page.goto("/settings/members");
  await page.fill("#invite-email", memberEmail);
  await page.selectOption("#invite-role", "viewer");
  await page.click("button:has-text('Send invitation')");
  await expect(page.getByText("Invitation sent")).toBeVisible();
  await expect(page.getByText(`${memberEmail} · Viewer`)).toBeVisible();

  // The invited person signs up with that address and accepts.
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await signUpVerified(p2, "Plan Member", memberEmail);
  const link = /(http\S+\/invite\?token=[A-Za-z0-9_-]+)/.exec(await latestEmailTo(memberEmail, "invitation"))![1]!;
  await p2.goto(new URL(link).pathname + new URL(link).search);
  await expect(p2.getByRole("heading", { name: "Join “Okoro household”" })).toBeVisible();
  await p2.click("button:has-text('Accept and open')");
  await p2.waitForURL("**/dashboard**");
  await p2.goto("/settings/members");
  await expect(p2.getByText("Members of “Okoro household”")).toBeVisible();
  await expect(p2.getByText("Only owners and admins can invite")).toHaveCount(0);
  await p2.goto("/settings/billing");
  await expect(p2.getByText("Only owners and admins of “Okoro household” can change its plan")).toBeVisible();
  await ctx2.close();

  // Owner pays for Plus: invoice with bank-transfer instructions (not set up in this environment).
  await page.goto("/settings/billing");
  await page.getByRole("button", { name: "Pay to keep it after the trial" }).click();
  await page.waitForURL(/\/settings\/billing\/invoices\/[0-9a-f-]{36}\?new=1/);
  await expect(page.getByText("Invoice issued")).toBeVisible();
  await expect(page.getByText("₦4,500.00").first()).toBeVisible();
  await expect(page.getByText(/Payment details haven.t been set up yet/)).toBeVisible();
  await page.click("button:has-text('Withdraw request')");
  await expect(page.getByText("The unpaid request was withdrawn")).toBeVisible();

  // Reports: CSV on every plan; PDF included with Plus (trial).
  await page.goto("/reports");
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download CSV" }).click()]);
  expect(csv.suggestedFilename()).toMatch(/^wealthos-statement-1y-.*\.csv$/);
  const pdfResponse = await page.request.get("/api/reports/statement.pdf?period=1Y&currency=NGN");
  expect(pdfResponse.status()).toBe(200);
  expect((await pdfResponse.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect(ownerEmail).toContain("@");
});
