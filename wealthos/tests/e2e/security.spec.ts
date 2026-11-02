/** Security headers and CSP: pages work under a strict nonce-based policy with no violations. */
import { expect, test } from "@playwright/test";
import { signUpVerified } from "./helpers";

test("strict CSP and security headers, no violations on interactive pages", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to (execute|load|apply)/i.test(m.text())) violations.push(m.text());
  });
  page.on("pageerror", (e) => violations.push(`pageerror: ${e.message}`));
  await signUpVerified(page, "Csp Checker");

  const res = await page.goto("/dashboard");
  const h = res!.headers();
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(h["strict-transport-security"]).toBeUndefined(); // only sent over HTTPS
  // Each request gets its own nonce.
  const again = (await page.goto("/dashboard"))!.headers()["content-security-policy"];
  expect(again).not.toBe(h["content-security-policy"]);

  for (const path of ["/net-worth", "/holdings", "/simulator", "/goals/new", "/explore", "/reports", "/settings/billing", "/settings/members", "/support", "/learn/twr-vs-xirr", "/assistant"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  // Interactive client component still works (simulator recalculates in the browser).
  await page.goto("/simulator");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(violations).toEqual([]);

  // Health endpoints and the payment webhook surface.
  const health = await page.request.get("/api/health?deep=1");
  const body = await health.json();
  expect(body).toMatchObject({ db: "ok" });
  expect(body).toHaveProperty("worker");
  const hook = await page.request.post("/api/billing/webhook/paystack", { data: { id: "x" } });
  expect(hook.status()).toBe(404); // no payment provider is registered
});
