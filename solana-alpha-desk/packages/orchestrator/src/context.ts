import type { VersionedConfig } from '@alpha-desk/config';
import type { SqlDb } from '@alpha-desk/db';
import type { Providers, SolPrice } from '@alpha-desk/providers';
import type { Clock, Logger } from '@alpha-desk/shared';
import type { EvidenceStore } from './evidence-store.ts';

export interface Ctx {
  db: SqlDb;
  providers: Providers;
  solPrice: SolPrice;
  evidenceStore: EvidenceStore;
  clock: Clock;
  log: Logger;
  sleep: (ms: number) => Promise<void>;
  /** Loads the active configuration (cached by the caller). */
  config: () => Promise<VersionedConfig>;
  /** Identifies this process in heartbeats. */
  instanceId: string;
  /** Optional wake-up signal (Cloudflare Queues) sent after work is written to the durable work_items table. */
  notify?: (
    queue: 'filter' | 'analyst' | 'risk' | 'execute' | 'exit',
    delaySeconds?: number,
  ) => Promise<void>;
}
