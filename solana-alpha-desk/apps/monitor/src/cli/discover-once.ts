import { drainQueue, runDiscoveryCycle, refreshCandidateSnapshots } from '@alpha-desk/orchestrator';
import { buildContext } from '../context.ts';
import { loadEnv } from '../env.ts';

/** One real discovery cycle followed by Filter (and Analyst, if anything is approved), printing the funnel. */
const env = loadEnv();
const { ctx, metrics } = await buildContext(env);
const r = await runDiscoveryCycle(ctx);
console.log('discovery', { ...r, errors: r.errors.slice(0, 5) });
let n = 0;
while ((n = await drainQueue(ctx, 'filter', 3)) > 0) console.log('filtered', n);
await refreshCandidateSnapshots(ctx);
await drainQueue(ctx, 'analyst', 10);
await metrics.flush(ctx.db, {});
const funnel = await ctx.db.all<{ state: string; n: number }>('SELECT state, COUNT(*) AS n FROM candidate_discoveries GROUP BY state ORDER BY n DESC');
console.table(funnel);
const rules = await ctx.db.all(`SELECT rule_id, outcome, COUNT(*) AS n FROM security_rule_results GROUP BY rule_id, outcome ORDER BY rule_id, outcome`);
console.table(rules);
process.exit(0);
