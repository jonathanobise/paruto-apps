/** Planning: goals with scenarios, the simulator, stress tests and a user-defined target mix. */
import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const shots = process.env.SCREENSHOT_DIR;

async function signUpVerified(page: Page): Promise<void> {
  const email = `plan.${Date.now()}@example.test`;
  await page.goto("/sign-up");
  await page.fill("#displayName", "Pat Planner");
  await page.fill("#email", email);
  await page.fill("#password", "planning journey passphrase");
  await page.check("input[name=acceptTerms]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/verify-email");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
  const r = await pool.query("select text_body from email_outbox where to_address = $1 order by created_at desc limit 1", [email]);
  await pool.end();
  await page.goto(`/verify-email/confirm?token=${/token=([A-Za-z0-9_-]+)/.exec(r.rows[0].text_body)![1]}`);
  await page.waitForURL("**/dashboard**");
}

test("plan a goal, simulate, stress-test and set a target mix", async ({ page }) => {
  await signUpVerified(page);
  await page.goto("/accounts/new");
  await page.selectOption("#type", "bank");
  await page.fill("#name", "Savings");
  await page.click("button:has-text('Add account')");
  await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);
  await page.goto("/transactions/new");
  await page.selectOption("#type", "deposit");
  await page.fill("#occurredOn", "2026-01-05");
  await page.fill("#amount", "2000000");
  await page.click("button:has-text('Save transaction')");
  await page.waitForURL("**/transactions?saved=1");
  await page.goto("/accounts/new");
  await page.selectOption("#type", "real_estate");
  await page.fill("#name", "Flat");
  await page.fill("#openingValue", "30000000");
  await page.click("button:has-text('Add account')");
  await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);

  // Goal: one scenario is refused
  await page.goto("/goals/new");
  await page.fill("#name", "School fees");
  await page.selectOption("#kind", "education");
  await page.fill("#targetAmount", "8,000,000");
  await page.fill("#targetDate", `${new Date().getUTCFullYear() + 4}-09-01`);
  await page.fill("#monthlyContribution", "100000");
  await page.fill("#inflationPct", "20");
  const labels = page.getByRole("textbox", { name: /Scenario \d name/ });
  const returns = page.getByRole("textbox", { name: /Scenario \d return %/ });
  await labels.nth(0).fill("Cautious");
  await returns.nth(0).fill("12");
  await labels.nth(1).fill("");
  await labels.nth(2).fill("");
  await page.click("button:has-text('Save goal')");
  await expect(page.getByText(/at least two return scenarios/)).toBeVisible();
  // What the user typed survives the validation error.
  await expect(page.locator("#name")).toHaveValue("School fees");
  await expect(returns.nth(0)).toHaveValue("12");
  await labels.nth(1).fill("Middle");
  await returns.nth(1).fill("18");
  await labels.nth(2).fill("Hopeful");
  await returns.nth(2).fill("25");
  await page.click("button:has-text('Save goal')");
  await page.waitForURL(/\/goals\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/Reaches the target in \d of 3 scenarios/)).toBeVisible();
  await expect(page.getByText("Level monthly amount that would reach the target").first()).toBeVisible();
  await expect(page.getByText(/Outcomes are not guaranteed/)).toBeVisible();

  // Simulator recalculates in the browser
  await page.goto("/simulator");
  await expect(page.getByRole("cell", { name: "Middle" })).toBeVisible();
  await page.fill("#s-years", "0");
  await expect(page.getByText(/Enter numbers in every field/)).toBeVisible();
  await page.fill("#s-years", "5");
  await expect(page.getByText(/fees reduce the end value/)).toBeVisible();

  // Stress tests on own holdings
  await page.goto("/stress");
  await expect(page.getByRole("heading", { name: "Property values fall 20%" })).toBeVisible();
  await expect(page.getByText("−₦6,000,000.00").first()).toBeVisible(); // 20% of a ₦30m flat

  // Target mix: weights must total 100
  await page.goto("/model");
  await page.fill("#m-name", "My mix");
  await page.getByRole("textbox", { name: "Nigerian Treasury bills weight" }).fill("70");
  await page.getByRole("textbox", { name: "Global equities weight" }).fill("20");
  await page.click("button:has-text('Save target mix')");
  await expect(page.getByText(/must add up to exactly 100%/)).toBeVisible();
  await page.getByRole("textbox", { name: "Global equities weight" }).fill("30");
  await page.click("button:has-text('Save target mix')");
  await expect(page.getByText("Target mix saved.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /My mix/ })).toBeVisible();
});

test("screenshots of planning screens on the demo portfolio", async ({ page }) => {
  test.skip(!shots, "set SCREENSHOT_DIR to capture");
  await page.goto("/sign-in");
  await page.fill("#email", "demo@wealthos.test");
  await page.fill("#password", "sample-portfolio-2026");
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");
  const demo = (await page.$$eval("#org-switch option", (os) => os.map((o) => ({ v: (o as HTMLOptionElement).value, t: o.textContent ?? "" })))).find((o) => o.t.startsWith("DEMO"));
  if (demo) await page.selectOption("#org-switch", demo.v);
  await page.waitForTimeout(800);
  await page.goto("/stress");
  await page.getByRole("heading", { name: "Combined shock" }).waitFor();
  await page.screenshot({ path: `${shots}/stress.png`, fullPage: true });
  await page.goto("/simulator");
  await page.getByRole("cell", { name: "Middle" }).waitFor();
  await page.screenshot({ path: `${shots}/simulator.png`, fullPage: true });
});
