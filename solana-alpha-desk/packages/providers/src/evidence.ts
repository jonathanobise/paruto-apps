import { newId } from '@alpha-desk/shared';
import type { Observed } from './http.ts';

export type Verification = 'ON_CHAIN' | 'PROVIDER_CLAIM' | 'DERIVED';

/** A provider response captured as audit evidence (stored to R2 / disk, indexed in D1). */
export interface EvidenceRecord {
  id: string;
  kind: string;
  provider: string;
  endpoint: string;
  observedAt: number;
  ingestedAt: number;
  slot: number | null;
  sha256: string;
  raw: string;
  verification: Verification;
}

export function toEvidence(o: Observed<unknown>, kind: string, verification: Verification): EvidenceRecord {
  return {
    id: newId('ev', o.provenance.observedAt),
    kind,
    provider: o.provenance.provider,
    endpoint: o.provenance.endpoint,
    observedAt: o.provenance.observedAt,
    ingestedAt: o.provenance.ingestedAt,
    slot: o.provenance.slot ?? null,
    sha256: o.provenance.sha256,
    raw: o.provenance.raw,
    verification,
  };
}

/** Collects evidence while an agent gathers data, returning ids to cite in decisions. */
export class EvidenceCollector {
  readonly records: EvidenceRecord[] = [];
  add(o: Observed<unknown>, kind: string, verification: Verification): string {
    const rec = toEvidence(o, kind, verification);
    this.records.push(rec);
    return rec.id;
  }
}

/** Jupiter answers 400 with these codes when no route exists — a fact about the token, not an outage. */
export function isNoRouteError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /COULD_NOT_FIND_ANY_ROUTE|NO_ROUTES_FOUND|TOKEN_NOT_TRADABLE|ROUTE_PLAN_DOES_NOT_CONSUME_ALL_THE_AMOUNT|No routes found/i.test(msg);
}
