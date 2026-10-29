import { z } from 'zod';
import { HttpClient, type HttpClientOptions, type Observed } from './http.ts';

const Summary = z
  .object({
    tokenProgram: z.string().optional(),
    risks: z.array(z.object({ name: z.string(), level: z.string().optional(), description: z.string().optional() }).passthrough()).optional(),
    score: z.number().optional(),
    score_normalised: z.number().optional(),
    lpLockedPct: z.number().optional(),
  })
  .passthrough();
export type RugcheckSummary = z.infer<typeof Summary>;

/**
 * RugCheck token report summary. Used only as a corroborating provider claim and for discrepancy
 * detection; it never replaces an on-chain rule (spec: no single provider's safety score is sufficient).
 */
export class RugCheck {
  private readonly http: HttpClient;
  constructor(opts: Omit<HttpClientOptions, 'provider'> = {}) {
    this.http = new HttpClient({ provider: 'rugcheck', policy: { minIntervalMs: 1_000, maxRetries: 1 }, ...opts });
  }
  summary(mint: string): Promise<Observed<RugcheckSummary>> {
    return this.http.request('/v1/tokens/report/summary', `https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`, {}, (j) =>
      Summary.parse(j),
    );
  }
}
