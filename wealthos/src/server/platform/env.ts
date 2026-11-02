import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  APP_ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes, base64-encoded"),
  APP_ORIGIN: z.string().url().default("http://localhost:3100"),
  EMAIL_TRANSPORT: z.enum(["outbox", "console"]).default("outbox"),
  SCRYPT_LOG_N: z.coerce.number().int().min(12).max(20).default(17),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /**
   * Deployment environment, independent of the build mode. Only "production" is customer-facing:
   * features awaiting compliance review are blocked there and visible elsewhere (e.g. staging,
   * which runs a production build). Defaults to NODE_ENV.
   */
  APP_ENV: z.enum(["development", "test", "staging", "production"]).optional(),
});

export type Env = Omit<z.infer<typeof schema>, "APP_ENV"> & { APP_ENV: "development" | "test" | "staging" | "production" };

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.EMAIL_TRANSPORT === "outbox") {
    // The outbox transport is for development only; production needs a real provider adapter.
    console.warn("[wealthos] EMAIL_TRANSPORT=outbox in production: emails are stored, not delivered.");
  }
  cached = { ...parsed.data, APP_ENV: parsed.data.APP_ENV ?? parsed.data.NODE_ENV };
  return cached;
}
