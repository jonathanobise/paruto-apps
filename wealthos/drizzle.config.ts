import { defineConfig } from "drizzle-kit";

// Migrations are generated from src/server/db/schema and applied by scripts/migrate.ts
// with the OWNER role. The application connects with a separate, non-owner role so that
// row-level security policies apply to it.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_OWNER_URL ?? "postgres://wealthos_owner:wealthos_owner_dev@localhost:5432/wealthos_dev" },
  strict: true,
  verbose: true,
});
