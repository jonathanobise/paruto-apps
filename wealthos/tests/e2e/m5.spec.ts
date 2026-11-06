/**
 * Milestone 5: phone-sized layouts without sideways scrolling, installable app with an offline
 * page that holds no data, and a consented sandbox bank connection whose transactions are
 * reviewed before import.
 */
import { devices, expect, test } from "@playwright/test";
import { signUpVerified } from "./helpers";

const shots = process.env.E2E_SCREENSHOTS;

test("phone layouts, PWA manifest, service worker and offline page", async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  await signUpVerified(page, "Mobile Tester");
  await page.goto("/accounts/new");
  await page.fill("#name", "Phone bank");
  await page.click("button:has-text('Add account')");
  await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);

  const overflow: string[] = [];
  for (const path of ["/dashboard", "/net-worth", "/accounts", "/holdings", "/transactions", "/transactions/new", "/goals/new", "/simulator", "/explore", "/household", "/reports", "/settings", "/settings/billing", "/settings/members", "/support", "/assistant", "/learn/currency-risk"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // Measured against the screen width: content wider than the screen makes the browser zoom the
    // layout out (innerWidth grows with it), so innerWidth alone can't detect overflow.
    const wide = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth) - screen.width);
    if (wide > 1) overflow.push(`${path} (+${wide}px)`);
    if (shots && ["/dashboard", "/transactions/new", "/settings/billing"].includes(path)) await page.screenshot({ path: `${shots}/mobile${path.replace(/\//g, "-")}.png`, fullPage: true });
  }
  expect(overflow).toEqual([]);

  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "VioWealth", display: "standalone", start_url: "/dashboard" });
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  expect((await page.request.get("/icons/icon-512.png")).headers()["content-type"]).toBe("image/png");

  // Service worker registers (production build) and shows the offline page — which contains no data.
  await page.goto("/dashboard");
  await page.waitForFunction(async () => Boolean(await navigator.serviceWorker?.getRegistration()), null, { timeout: 15_000 });
  await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state);
  await page.reload(); // controlled by the worker from here
  await ctx.setOffline(true);
  await page.goto("/holdings").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await expect(page.getByText("doesn't keep copies of your financial information")).toBeVisible();
  const cached = await page.evaluate(async () => {
    const out: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname);
    return out;
  });
  expect(cached).toEqual(["/offline.html"]);
  await ctx.setOffline(false);
  await ctx.close();
});

test("sandbox bank connection: consent, sync to review, import, disconnect", async ({ page }) => {
  await signUpVerified(page, "Connection Tester");
  await page.goto("/accounts/new");
  await page.fill("#name", "Linked current");
  await page.click("button:has-text('Add account')");
  await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);
  const accountUrl = page.url();

  await expect(page.getByRole("heading", { name: "Bank connection" })).toBeVisible();
  await page.click("button:has-text('Give consent and connect')");
  await expect(page.getByText("Tick the box to give consent")).toBeVisible();
  await page.check("input[name=consent]");
  await page.click("button:has-text('Give consent and connect')");
  await expect(page.getByText(/Access: Account balance, Transactions .* consent until .* last synced never/)).toBeVisible();
  await expect(page.getByText("Test data", { exact: true })).toBeVisible();

  await page.click("button:has-text('Sync now')");
  await page.waitForURL(/\/transactions\/import\/[0-9a-f-]{36}$/);
  await expect(page.getByText("SANDBOX TEST DATA: salary").first()).toBeVisible();
  await page.getByRole("button", { name: /^Import \d+ transactions?/ }).click();
  await expect(page.getByText(/Imported \d+ transactions?/)).toBeVisible();

  await page.goto(accountUrl);
  await page.click("button:has-text('Sync now')");
  await expect(page.getByText("Up to date: nothing new to review.")).toBeVisible();
  await page.click("button:has-text('Disconnect')");
  // The connection is gone: the consent form is back and the old link is listed as revoked.
  await expect(page.getByRole("button", { name: "Give consent and connect" })).toBeVisible();
  await expect(page.getByText(/Earlier connections: Sandbox Bank \(TEST DATA\) \(revoked/)).toBeVisible();
});
