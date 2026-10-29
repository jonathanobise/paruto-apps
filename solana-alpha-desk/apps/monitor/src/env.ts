import { z } from 'zod';
import { RUNTIME_MODES } from '@alpha-desk/shared';

const Env = z.object({
  DATABASE_PATH: z.string().default('data/alpha-desk.sqlite'),
  /** Production: write through the API Worker's signed SQL bridge instead of a local SQLite file. */
  BRIDGE_URL: z.string().url().optional(),
  BRIDGE_SECRET: z.string().min(32).optional(),
  EVIDENCE_DIR: z.string().default('data/evidence'),
  SOLANA_RPC_URL: z.string().url().optional(),
  JUPITER_API_KEY: z.string().optional(),
  HELIUS_API_KEY: z.string().optional(),
  OWNER_EMAIL: z.string().email().default('owner@localhost.localdomain'),
  INITIAL_MODE: z.enum(RUNTIME_MODES).default('DISCOVERY_ONLY'),
  TIMEZONE: z.string().default('UTC'),
  RUN_PIPELINE: z.enum(['true', 'false']).default('true'),
  HEALTH_PORT: z.coerce.number().int().default(8788),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type MonitorEnv = z.infer<typeof Env>;

export function loadEnv(source: Record<string, string | undefined> = process.env): MonitorEnv {
  const env = Env.parse(Object.fromEntries(Object.entries(source).filter(([, v]) => v !== '')));
  if (env.BRIDGE_URL && !env.BRIDGE_SECRET) throw new Error('BRIDGE_SECRET is required with BRIDGE_URL');
  if (env.APP_ENV === 'production' && !env.BRIDGE_URL) throw new Error('production monitor must write to D1 through BRIDGE_URL');
  return env;
}
