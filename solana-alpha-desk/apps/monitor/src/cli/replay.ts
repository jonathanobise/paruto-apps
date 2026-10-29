import { runReplayStudy } from '@alpha-desk/orchestrator';
import { buildContext } from '../context.ts';
import { loadEnv } from '../env.ts';

/** pnpm replay [--days 7] [--mode RECORDED|MARKET_RULES_ONLY] [--walk 4] — replays recorded data with the active strategy. */
const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1]! : d;
};
const env = loadEnv();
const { ctx } = await buildContext(env);
const end = Date.now();
const start = end - Number(arg('days', '7')) * 86_400_000;
const walk = Number(arg('walk', '0'));
const r = await runReplayStudy(ctx, {
  start,
  end,
  filterMode: arg('mode', 'RECORDED') as 'RECORDED' | 'MARKET_RULES_ONLY',
  folds: walk ? 'walk' : 'split',
  walkWindows: walk || 4,
  actor: 'cli',
});
const row = (name: string, x: typeof r.whole) => ({
  fold: name,
  observations: x.observations,
  ...x.decisions,
  trades: x.metrics.trades,
  winRate: x.metrics.winRatePct,
  expectancy: x.metrics.expectancyUsd,
  net: x.metrics.netPnlUsd,
  maxDD: x.metrics.maxDrawdownPct,
});
console.table([row('whole period', r.whole), ...r.folds.map((f) => row(f.name, f.result))]);
for (const n of r.whole.notes) console.log(`note: ${n}`);
process.exit(0);
