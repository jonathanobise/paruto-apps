/**
 * Research flow: an administrator (with two-step verification) registers a source, adds and
 * verifies an instrument and imports prices and rates; a user then finds, watches and compares it.
 * Instruments here are fictional test fixtures.
 */
import { expect, test, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const shots = process.env.SCREENSHOT_DIR;
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function totp(secret: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, "")) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const mac = createHmac("sha1", key).update(msg).digest();
  const o = mac[mac.length - 1]! & 15;
  return String((((mac[o]! & 127) << 24) | (mac[o + 1]! << 16) | (mac[o + 2]! << 8) | mac[o + 3]!) % 1e6).padStart(6, "0");
}

async function signUpVerified(page: Page, name: string): Promise<string> {
  const email = `${name.toLowerCase()}.${Date.now()}@example.test`;
  await page.goto("/sign-up");
  await page.fill("#displayName", name);
  await page.fill("#email", email);
  await page.fill("#password", "research journey passphrase");
  await page.check("input[name=acceptTerms]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/verify-email");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
  const r = await pool.query("select text_body from email_outbox where to_address = $1 order by created_at desc limit 1", [email]);
  await pool.end();
  await page.goto(`/verify-email/confirm?token=${/token=([A-Za-z0-9_-]+)/.exec(r.rows[0].text_body)![1]}`);
  await page.waitForURL("**/dashboard**");
  return email;
}

test("admin publishes verified data; a user researches, watches and compares", async ({ page, browser }) => {
  const suffix = String(Date.now()).slice(-6);
  const sym = `E2E${suffix}`;
  const sym2 = `E2B${suffix}`;
  // --- Admin with two-step verification
  const adminEmail = await signUpVerified(page, "Admin");
  await page.goto("/settings/security");
  await page.click("button:has-text('Set up two-step verification')");
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  await page.fill("#code", totp(secret));
  await page.click("button:has-text('Turn on')");
  await expect(page.getByText("Two-step verification is on")).toBeVisible();
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
  await pool.query("update users set platform_role = 'admin' where email = $1", [adminEmail]);
  await pool.end();

  await page.goto("/admin/sources");
  await page.fill("#key", `e2e-src-${suffix}`);
  await page.fill("#name", `E2E Publisher ${suffix}`);
  await page.fill("#url", "https://example.test/e2e");
  await page.fill("#licenseNote", "Fictional test publisher used by automated tests only.");
  await page.click("button:has-text('Add source')");
  await expect(page.getByText("Source added.")).toBeVisible();

  for (const [s, name, cls, pricing] of [[sym, "E2E Fictional Money Fund", "money_market", "nav"], [sym2, "E2E Fictional Bill", "treasury_bill", "discount_accrual"]] as const) {
    await page.goto("/admin/instruments/new");
    await page.fill("#name", name);
    await page.fill("#symbol", s);
    await page.selectOption("#assetClass", cls);
    await page.selectOption("#pricingModel", pricing);
    if (pricing === "discount_accrual") await page.fill("#maturityDate", "2027-10-29");
    if (s === sym) {
      await page.fill("#summary", "Fictional fund for automated testing.");
      await page.fill("#ongoingChargePct", "1.25");
      await page.fill("#riskFactors", "Interest-rate risk\nManager risk");
      await page.fill("#factsSourceUrl", "https://example.test/e2e/factsheet.pdf");
      await page.fill("#factsAsOf", today);
      await page.check("input[name=verify]");
    }
    await page.click("button:has-text('Save instrument')");
    await expect(page.getByText("Saved and logged.")).toBeVisible();
  }

  const upload = async (kind: string, csv: string) => {
    await page.goto("/admin/imports");
    await page.selectOption("#kind", kind);
    await page.selectOption("#sourceId", { label: `E2E Publisher ${suffix}` });
    await page.setInputFiles("#file", { name: `${kind}.csv`, mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.click("button:has-text('Upload and preview')");
    await page.waitForURL(/\/admin\/imports\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: /Import \d+ verified rows/ }).click();
    await expect(page.getByText(/Imported \d+ rows as verified data/)).toBeVisible();
  };
  const navs = Array.from({ length: 60 }, (_, i) => `${sym},${daysAgo(59 - i)},${(100 + i * 0.05).toFixed(4)},NGN,nav`);
  await upload("prices", ["symbol,date,price,currency,methodology", ...navs].join("\n"));
  await upload("rates", ["symbol,as_of,methodology,rate_percent,tenor_days,basis,source_url", `${sym},${today},money_market_yield,17.5,,7-day annualised,`, `${sym2},${today},discount_rate,18,364,ACT/365,https://example.test/e2e/auction`].join("\n"));

  // --- Ordinary user
  const ctx = await browser.newContext();
  const u = await ctx.newPage();
  await signUpVerified(u, "Researcher");
  await u.goto(`/explore?q=${sym}`);
  await expect(u.getByRole("link", { name: "E2E Fictional Money Fund" })).toBeVisible();
  await expect(u.getByText("Fund yield as published by manager").first()).toBeVisible();
  if (shots) await u.screenshot({ path: `${shots}/explore.png`, fullPage: true });
  await u.getByRole("link", { name: "E2E Fictional Money Fund" }).click();
  await expect(u.getByText("Ongoing charge (% a year)")).toBeVisible();
  await expect(u.getByText("Manager risk")).toBeVisible();
  await expect(u.getByText("official source")).toBeVisible();
  await u.getByRole("button", { name: "Watch" }).click();
  await expect(u.getByRole("button", { name: "Watching" })).toBeVisible();
  if (shots) await u.screenshot({ path: `${shots}/instrument.png`, fullPage: true });

  await u.getByRole("link", { name: "Compare" }).click();
  await u.selectOption("#add", { label: `${sym2} · E2E Fictional Bill` });
  await u.click("button:has-text('Add')");
  await u.waitForURL(/compare\?ids=.+,.+/);
  await expect(u.getByText(/derived from the 364-day discount rate/).first()).toBeVisible();
  await expect(u.getByText("21.94%").first()).toBeVisible(); // true yield of an 18% 364-day discount rate
  if (shots) await u.screenshot({ path: `${shots}/compare.png`, fullPage: true });
  await u.fill("#cmp-name", "MMF vs bill");
  await u.click("button:has-text('Save')");
  await expect(u.getByText("Comparison saved to Watchlists.")).toBeVisible();

  await u.goto("/watchlists");
  await expect(u.getByRole("link", { name: "E2E Fictional Money Fund" })).toBeVisible();
  await expect(u.getByText("MMF vs bill")).toBeVisible();
  // Ordinary users can't reach the admin console (streamed responses keep a 200 status, so check content).
  await u.goto("/admin");
  await expect(u.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(u.getByText("Administration")).toHaveCount(0);
  await expect(u.getByRole("link", { name: "Admin" })).toHaveCount(0);
  await ctx.close();
});
