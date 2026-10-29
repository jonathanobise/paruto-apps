import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { EvidenceStore } from '@alpha-desk/orchestrator';

/** Local evidence store (development, single-host operation). Content-addressed keys; writes are idempotent. */
export class FileEvidenceStore implements EvidenceStore {
  readonly kind = 'file' as const;
  private readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
  }
  private path(key: string): string {
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root)) throw new Error('evidence key escapes the store');
    return p;
  }
  async put(key: string, body: string): Promise<void> {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body, { flag: 'w' });
  }
  async get(key: string): Promise<string | null> {
    try {
      return await readFile(this.path(key), 'utf8');
    } catch {
      return null;
    }
  }
}
