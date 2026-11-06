/** Paruto design standard: dark for every visitor regardless of OS; light is opt-in and remembered. */
import { expect, test } from "@playwright/test";
import { signUpVerified } from "./helpers";

test("dark by default even when the OS prefers light; the toggle opts into light and persists", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "light" });
  const page = await ctx.newPage();
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.goto("/");
  expect(await bg()).toBe("rgb(6, 6, 8)");
  await signUpVerified(page, "Theme Tester");
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  expect(await bg()).toBe("rgb(6, 6, 8)");
  await page.getByRole("button", { name: "Switch to light appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await bg()).toBe("rgb(245, 245, 247)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/settings");
  await expect(page.locator("#theme")).toHaveValue("light"); // saved as a preference too
  await page.getByRole("button", { name: "Switch to dark appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await ctx.close();
});
