/**
 * Install the SAMPLE catalogue (synthetic prices and FX, clearly labelled) and, optionally, a
 * development login with a demo portfolio.
 *
 *   npm run db:seed-demo                 # catalogue + SAMPLE market data only
 *   npm run db:seed-demo -- --with-user  # also demo@wealthos.test with a DEMO portfolio
 *
 * Refuses to run against NODE_ENV=production. Never seeds real-looking unlabelled data.
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production.");

const { DEMO_INSTRUMENTS, SAMPLE_SOURCE, sampleFxSeries, samplePriceSeries } = await import("../src/server/demo/data");

const ownerUrl = process.env.DATABASE_OWNER_URL;
if (!ownerUrl) throw new Error("DATABASE_OWNER_URL is required");
const pool = new pg.Pool({ connectionString: ownerUrl, max: 2 });
const today = new Date().toISOString().slice(0, 10);

try {
  const src = await pool.query(
    `insert into market_data_sources (key, name, kind, license_note, default_freshness_days) values ($1,$2,$3,$4,5)
     on conflict (key) do update set name = excluded.name returning id`,
    [SAMPLE_SOURCE.key, SAMPLE_SOURCE.name, SAMPLE_SOURCE.kind, SAMPLE_SOURCE.licenseNote],
  );
  const sourceId: string = src.rows[0].id;
  let priceRows = 0;
  for (const inst of DEMO_INSTRUMENTS) {
    const existing = await pool.query("select id from instruments where symbol = $1 and is_demo and org_id is null", [inst.symbol]);
    const id: string =
      existing.rows[0]?.id ??
      (
        await pool.query(
          `insert into instruments (symbol, name, issuer, asset_class, country, region, currency, pricing_model, stale_after_days, face_value_per_unit, maturity_date, verification_state, is_demo)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'unverified',true) returning id`,
          [inst.symbol, inst.name, inst.issuer, inst.assetClass, inst.country, inst.region, inst.currency, inst.pricingModel, inst.staleAfterDays, inst.faceValuePerUnit ?? null, inst.maturityDate ?? null],
        )
      ).rows[0].id;
    const series = samplePriceSeries(inst, today);
    for (let i = 0; i < series.length; i += 500) {
      const chunk = series.slice(i, i + 500);
      const values = chunk.map((_, j) => `($1,$2,$${j * 2 + 3},$${j * 2 + 4},$${chunk.length * 2 + 3},'${inst.pricingModel === "nav" ? "nav" : "close"}','synthetic')`).join(",");
      await pool.query(
        `insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state) values ${values} on conflict do nothing`,
        [id, sourceId, ...chunk.flatMap((p) => [p.date, p.price]), inst.currency],
      );
      priceRows += chunk.length;
    }
  }
  const fx = sampleFxSeries(today);
  for (let i = 0; i < fx.length; i += 500) {
    const chunk = fx.slice(i, i + 500);
    const values = chunk.map((_, j) => `($${j * 4 + 1},$${j * 4 + 2},$${j * 4 + 3},$${j * 4 + 4},'${sourceId}','sample','synthetic')`).join(",");
    await pool.query(`insert into fx_rates (base, quote, rate, observed_on, source_id, methodology, verification_state) values ${values} on conflict do nothing`, chunk.flatMap((r) => [r.base, r.quote, r.rate, r.date]));
  }
  console.log(`SAMPLE catalogue installed: ${DEMO_INSTRUMENTS.length} instruments, ${priceRows} synthetic prices, ${fx.length} synthetic FX rates.`);
} finally {
  await pool.end();
}

if (process.argv.includes("--with-user")) {
  const { signUp } = await import("../src/server/identity/service");
  const { createDemoPortfolio } = await import("../src/server/demo/service");
  const { db, closeDb } = await import("../src/server/db/client");
  const { users } = await import("../src/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const email = "demo@wealthos.test";
  const password = process.env.DEMO_PASSWORD ?? "sample-portfolio-2026";
  const [existing] = await db().select().from(users).where(eq(users.email, email));
  if (existing) {
    console.log(`${email} already exists; leaving it unchanged.`);
  } else {
    await signUp({ displayName: "Demo Founder", email, password, acceptTerms: true }, { ip: "127.0.0.1", userAgent: "seed" });
    const [u] = await db().select().from(users).where(eq(users.email, email));
    await db().update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, u!.id));
    await createDemoPortfolio(u!.id);
    console.log(`Created ${email} / ${password} (development only) with a DEMO portfolio.`);
  }
  await closeDb();
}
