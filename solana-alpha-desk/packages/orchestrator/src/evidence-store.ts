import type { SqlDb, Statement } from '@alpha-desk/db';
import type { EvidenceRecord } from '@alpha-desk/providers';

export interface EvidenceStore {
  readonly kind: 'r2' | 'file' | 'memory' | 'bridge';
  put(key: string, body: string): Promise<void>;
  get(key: string): Promise<string | null>;
}

export class MemoryEvidenceStore implements EvidenceStore {
  readonly kind = 'memory' as const;
  readonly objects = new Map<string, string>();
  async put(key: string, body: string) {
    this.objects.set(key, body);
  }
  async get(key: string) {
    return this.objects.get(key) ?? null;
  }
}

/** Minimal structural type of an R2 bucket binding. */
export interface R2Like {
  put(key: string, value: string, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
}

export class R2EvidenceStore implements EvidenceStore {
  readonly kind = 'r2' as const;
  constructor(private readonly bucket: R2Like) {}
  async put(key: string, body: string) {
    await this.bucket.put(key, body, { httpMetadata: { contentType: 'application/json' } });
  }
  async get(key: string) {
    const o = await this.bucket.get(key);
    return o ? o.text() : null;
  }
}

export function evidenceKey(r: EvidenceRecord): string {
  const d = new Date(r.observedAt).toISOString();
  return `evidence/${d.slice(0, 10)}/${r.kind.toLowerCase()}/${r.sha256}.json`;
}

/**
 * Stores raw payloads in object storage (content-addressed by sha256) and returns the D1 index rows.
 * The index insert uses OR IGNORE so a re-observed identical payload keeps one row.
 */
export async function persistEvidence(store: EvidenceStore, records: EvidenceRecord[]): Promise<Statement[]> {
  const stmts: Statement[] = [];
  for (const r of records) {
    const key = evidenceKey(r);
    await store.put(key, r.raw);
    stmts.push({
      sql: `INSERT OR IGNORE INTO evidence (id, kind, provider_id, endpoint, observed_at, ingested_at, slot, storage_key, sha256, size_bytes, verification)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [r.id, r.kind, r.provider, r.endpoint, r.observedAt, r.ingestedAt, r.slot, key, r.sha256, r.raw.length, r.verification],
    });
  }
  return stmts;
}

/** Evidence ids whose rows were ignored as duplicates map to the surviving row with the same content. */
export async function resolveEvidenceIds(db: SqlDb, records: EvidenceRecord[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const r of records) {
    const row = await db.first<{ id: string }>('SELECT id FROM evidence WHERE sha256 = ? AND kind = ? AND observed_at = ?', [r.sha256, r.kind, r.observedAt]);
    map.set(r.id, row?.id ?? r.id);
  }
  return map;
}
