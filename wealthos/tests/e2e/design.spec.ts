/** Paruto design standard: dark for every visitor regardless of OS; Light and System are opt-in, remembered, and Dark has depths. */
import { expect, test } from "@playwright/test";
import { signUpVerified } from "./helpers";

test("dark by default even when the OS prefers light; the sidebar's appearance control switches and persists", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  await page.goto("/");
  expect(await bg()).toBe("rgb(6, 6, 8)");
  await signUpVerified(page, "Theme Tester");
  const sidebar = page.getByRole("complementary", { name: "Sidebar" });
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");

  await sidebar.getByRole("radio", { name: "Graphite" }).click();
  expect(await bg()).toBe("rgb(24, 24, 29)");
  await sidebar.getByRole("radio", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await bg()).toBe("rgb(245, 245, 247)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // System follows the device (light here), before first paint.
  await sidebar.getByRole("radio", { name: "System" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await sidebar.getByRole("radio", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bg()).toBe("rgb(24, 24, 29)"); // the chosen depth is kept
  await ctx.close();
});

test("the version is shown and /__version is never cached", async ({ page, request }) => {
  const res = await request.get("/__version");
  expect(res.headers()["cache-control"]).toContain("no-store");
  expect(await res.json()).toHaveProperty("build");
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: /VioWealth .*About this version/ })).toBeVisible();
});
