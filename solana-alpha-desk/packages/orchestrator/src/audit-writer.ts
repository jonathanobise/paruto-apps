import type { Statement } from '@alpha-desk/db';
import { buildAudit, type AuditInput } from '@alpha-desk/ledger';

/** Logger Agent persistence: append-only insert with a gap-free sequence number. */
export async function auditStmt(i: AuditInput): Promise<Statement> {
  const a = await buildAudit(i);
  return {
    sql: `INSERT INTO audit_events (id, seq, category, action, actor, subject_type, subject_id, correlation_id, detail, evidence_ids, checksum, created_at)
          SELECT ?, COALESCE(MAX(seq), 0) + 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM audit_events`,
    params: [
      a.id,
      a.category,
      a.action,
      a.actor,
      a.subject_type,
      a.subject_id,
      a.correlation_id,
      a.detail,
      a.evidence_ids,
      a.checksum,
      a.created_at,
    ],
  };
}

export function alertStmt(
  severity: 'INFO' | 'WARNING' | 'CRITICAL',
  source: string,
  title: string,
  detail: string,
  at: number,
  dedupeKey: string | null = null,
): Statement {
  return {
    sql: `INSERT OR IGNORE INTO system_alerts (id, severity, source, title, detail, dedupe_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    params: [
      `al_${at.toString(16)}${Math.random().toString(16).slice(2, 10)}`,
      severity,
      source,
      title,
      detail.slice(0, 2000),
      dedupeKey,
      at,
    ],
  };
}
