import type { SqlDb } from '@alpha-desk/db';
import type { CreditBudget } from '@alpha-desk/providers';
import type { Clock } from '@alpha-desk/shared';

const utcDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/**
 * Daily credit budget in the database, shared by every Worker and process. A call reserves its credits
 * atomically before it is made; once the day's cap (runtime_state.helius_daily_credit_cap) would be
 * exceeded the reservation is refused. The day is the UTC date.
 */
export class CreditLedger implements CreditBudget {
  constructor(
    private readonly db: SqlDb,
    private readonly clock: Clock,
  ) {}

  async reserve(provider: string, credits: number): Promise<boolean> {
    const now = this.clock.now();
    const day = utcDay(now);
    const cap = '(SELECT helius_daily_credit_cap FROM runtime_state WHERE id = 1)';
    const row = await this.db.first<{ credits: number }>(
      `INSERT INTO credit_usage (provider_id, day, credits, calls, updated_at)
       SELECT ?, ?, ?, 1, ? WHERE ? <= ${cap}
       ON CONFLICT (provider_id, day) DO UPDATE SET credits = credits + excluded.credits, calls = calls + 1,
         updated_at = excluded.updated_at
       WHERE credit_usage.credits + excluded.credits <= ${cap}
       RETURNING credits`,
      [provider, day, credits, now, credits],
    );
    if (row) return true;
    await this.db.run(
      `INSERT INTO credit_usage (provider_id, day, credits, calls, refused, updated_at) VALUES (?, ?, 0, 0, 1, ?)
       ON CONFLICT (provider_id, day) DO UPDATE SET refused = refused + 1, updated_at = excluded.updated_at`,
      [provider, day, now],
    );
    return false;
  }
}

/** Today's (UTC) usage for a provider against the cap. */
export async function creditUsageToday(
  db: SqlDb,
  now: number,
  provider = 'helius',
): Promise<{ day: string; credits: number; calls: number; refused: number; cap: number }> {
  const day = utcDay(now);
  const u = await db.first<{ credits: number; calls: number; refused: number }>(
    'SELECT credits, calls, refused FROM credit_usage WHERE provider_id = ? AND day = ?',
    [provider, day],
  );
  const rt = await db.first<{ cap: number }>(
    'SELECT helius_daily_credit_cap AS cap FROM runtime_state WHERE id = 1',
  );
  return {
    day,
    credits: Number(u?.credits ?? 0),
    calls: Number(u?.calls ?? 0),
    refused: Number(u?.refused ?? 0),
    cap: Number(rt?.cap ?? 0),
  };
}
