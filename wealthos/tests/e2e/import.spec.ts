/**
 * CSV import through the real UI: upload → preview with errors and an unknown type word →
 * map the word → import → see the transactions → roll back.
 */
import { expect, test } from "@playwright/test";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

async function verifiedUser(page: import("@playwright/test").Page): Promise<void> {
  const email = `import.${Date.now()}@example.test`;
  // Each browser sign-up comes from its own address (dev trusts no proxy), so the per-IP limit isn't shared.
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}` });
  await page.goto("/sign-up");
  await page.fill("#displayName", "Tunde Import");
  await page.fill("#email", email);
  await page.fill("#password", "another long passphrase here");
  await page.check("input[name=acceptTerms]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/verify-email");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_OWNER_URL });
  const r = await pool.query("select text_body from email_outbox where to_address = $1 order by created_at desc limit 1", [email]);
  await pool.end();
  await page.goto(`/verify-email/confirm?token=${/token=([A-Za-z0-9_-]+)/.exec(r.rows[0].text_body)![1]}`);
  await page.waitForURL("**/dashboard**");
}

const CSV = [
  "Trade Date,Action,Ticker,Qty,Unit Price,Commission,Amount,Narration,Reference",
  "02/01/2026,Lodgement,,,,,\"500,000.00\",Funding,E2E-1",
  "05/01/2026,PURCH-EQ,GTCO,1000,45.50,341.25,,Contract note,E2E-2",
  "06/01/2026,Sale,GTCO,5000,50,0,,Too many units,E2E-3",
  "31/02/2026,Lodgement,,,,,100,Bad date,E2E-4",
].join("\n");

test("import a broker CSV, fix the mapping, commit and roll back", async ({ page }) => {
  await verifiedUser(page);
  await page.goto("/accounts/new");
  await page.selectOption("#type", "brokerage");
  await page.fill("#name", "Import broker");
  await page.click("button:has-text('Add account')");
  await page.waitForURL(/\/accounts\/[0-9a-f-]{36}$/);
  await page.getByRole("link", { name: "Import CSV" }).click();
  await page.waitForURL("**/transactions/import?account=*");

  await page.setInputFiles("#file", { name: "broker-statement.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
  await page.click("button:has-text('Upload and preview')");
  await page.waitForURL(/\/transactions\/import\/[0-9a-f-]{36}$/);

  // Nothing imported yet; errors are explained per row.
  await expect(page.getByText("“PURCH-EQ” isn't recognised")).toBeVisible();
  await expect(page.getByText(/not a real date/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Import 1 transaction" })).toBeVisible();

  // Teach it the institution's word for a purchase and save the layout.
  await page.selectOption("[id='alias_PURCH-EQ']", "buy");
  await page.fill("#saveAs", "E2E Securities");
  await page.click("button:has-text('Update preview')");
  await expect(page.getByText("Preview updated and mapping saved.")).toBeVisible();
  // The sale of 5,000 units is now checked against the ledger (only 1,000 would be held).
  await expect(page.getByText(/negative holding/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Import 2 transactions" })).toBeVisible();

  await page.getByRole("button", { name: "Import 2 transactions" }).click();
  await page.waitForURL("**?done=1");
  await expect(page.getByText("Imported 2 transactions")).toBeVisible();

  await page.goto("/transactions");
  await expect(page.getByRole("row", { name: /Purchase.*Imported/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Deposit.*Imported/ })).toBeVisible();

  // Re-uploading the same file is flagged.
  await page.goto("/transactions/import");
  await page.setInputFiles("#file", { name: "broker-statement.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
  await page.click("button:has-text('Upload and preview')");
  await expect(page.getByText("This exact file has been imported before")).toBeVisible();
  await page.getByRole("button", { name: "Discard this preview" }).click();
  await page.waitForURL("**/transactions/import");

  // Roll back the committed import.
  await page.getByRole("link", { name: /broker-statement\.csv.*Imported/ }).click();
  await page.getByText("Roll back this import…").click();
  await page.fill("#reason", "Testing rollback");
  await page.click("button:has-text('Roll back import')");
  await page.waitForURL("**?rolledBack=1");
  await expect(page.getByText(/Every imported transaction now has a matching reversal/)).toBeVisible();
  await page.goto("/transactions");
  await expect(page.getByRole("row", { name: /Purchase.*Reversed/ })).toBeVisible();
});
