import { hashObject, newId } from '@alpha-desk/shared';

export const AUDIT_CATEGORIES = [
  'DISCOVERY',
  'RULE',
  'SCORE',
  'RISK',
  'ORDER',
  'FILL',
  'POSITION',
  'STOP',
  'API_ERROR',
  'AUTOMATION',
  'BREAKER',
  'CONFIG',
  'ADMIN',
  'REPORT',
  'RECONCILIATION',
  'CORRECTION',
  'AUTH',
] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export interface AuditInput {
  category: AuditCategory;
  action: string;
  actor: string;
  subjectType?: string | null;
  subjectId?: string | null;
  correlationId?: string | null;
  detail?: Record<string, unknown>;
  evidenceIds?: string[];
  at: number;
}

export interface AuditRow {
  id: string;
  category: AuditCategory;
  action: string;
  actor: string;
  subject_type: string | null;
  subject_id: string | null;
  correlation_id: string | null;
  detail: string;
  evidence_ids: string;
  checksum: string;
  created_at: number;
}

/** Logger Agent: builds an immutable, checksummed audit record. */
export async function buildAudit(i: AuditInput): Promise<AuditRow> {
  const body = {
    id: newId('au', i.at),
    category: i.category,
    action: i.action,
    actor: i.actor,
    subject_type: i.subjectType ?? null,
    subject_id: i.subjectId ?? null,
    correlation_id: i.correlationId ?? null,
    detail: JSON.stringify(i.detail ?? {}, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    evidence_ids: JSON.stringify(i.evidenceIds ?? []),
    created_at: i.at,
  };
  return { ...body, checksum: await hashObject(body) };
}

/** Recomputes a stored row's checksum; false means the row was altered outside the application. */
export async function verifyAudit(row: AuditRow): Promise<boolean> {
  const { checksum, ...body } = row;
  const pick = {
    id: body.id,
    category: body.category,
    action: body.action,
    actor: body.actor,
    subject_type: body.subject_type,
    subject_id: body.subject_id,
    correlation_id: body.correlation_id,
    detail: body.detail,
    evidence_ids: body.evidence_ids,
    created_at: body.created_at,
  };
  return (await hashObject(pick)) === checksum;
}
