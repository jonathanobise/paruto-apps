'use client';

import { useState, type ReactNode } from 'react';

export function Panel({
  title,
  right,
  children,
  className = '',
  pad = true,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={`panel min-w-0 ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[13px] font-medium tracking-wide text-fg">{title}</h2>
          <div className="flex items-center gap-2 text-xs text-fg-3">{right}</div>
        </header>
      )}
      <div className={pad ? 'p-4' : 'overflow-x-auto'}>{children}</div>
    </section>
  );
}

/** Every metric states what it is: an actual observation, a paper result, an estimate, or unavailable. */
export type Provenance = 'ACTUAL' | 'PAPER' | 'ESTIMATE' | 'UNAVAILABLE';
const PROV_STYLE: Record<Provenance, string> = {
  ACTUAL: 'text-info border-info/30 bg-info-dim',
  PAPER: 'text-signal border-signal/30 bg-signal-dim/60',
  ESTIMATE: 'text-warn border-warn/30 bg-warn-dim',
  UNAVAILABLE: 'text-fg-3 border-line-strong bg-panel-2',
};
export function Prov({ kind }: { kind: Provenance }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-px text-[9.5px] font-medium tracking-[0.08em] ${PROV_STYLE[kind]}`}
    >
      {kind}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  prov,
  toneClass = '',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  prov?: Provenance;
  toneClass?: string;
}) {
  return (
    <div className="panel flex min-w-0 flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="label leading-tight">{label}</span>
        {prov && (
          <span className="shrink-0">
            <Prov kind={prov} />
          </span>
        )}
      </div>
      <div className={`num truncate text-[22px] font-medium leading-none ${toneClass}`}>{value}</div>
      {sub && <div className="num truncate text-xs text-fg-3">{sub}</div>}
    </div>
  );
}

type Tone = 'up' | 'down' | 'warn' | 'info' | 'signal' | 'muted';
const TONE: Record<Tone, string> = {
  up: 'text-up bg-up-dim border-up/25',
  down: 'text-down bg-down-dim border-down/25',
  warn: 'text-warn bg-warn-dim border-warn/25',
  info: 'text-info bg-info-dim border-info/25',
  signal: 'text-signal bg-signal-dim/60 border-signal/25',
  muted: 'text-fg-2 bg-panel-2 border-line-strong',
};
export function Badge({
  tone = 'muted',
  children,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export function stateTone(state: string | null | undefined): Tone {
  if (!state) return 'muted';
  if (/REJECTED|ERROR|FAILED|FAIL$|TRIPPED|CRITICAL|UNAVAILABLE/.test(state)) return 'down';
  if (/UNVERIFIED|PAUSED|EXPIRED|PENDING|DEGRADED|WARNING|STALE|PARTIAL|INSUFFICIENT/.test(state))
    return 'warn';
  if (/APPROVED|AUTHORIZED|FILLED|OPEN|PASS|HEALTHY|VERIFIED|CLOSED/.test(state))
    return state === 'POSITION_CLOSED' || state === 'CLOSED' ? 'info' : 'up';
  if (/DISCOVERED|NOT_REQUIRED|INFO/.test(state)) return 'info';
  return 'muted';
}
export const label = (s: string | null | undefined) => (s ?? '—').replaceAll('_', ' ');
export function StateBadge({ state }: { state: string | null | undefined }) {
  return <Badge tone={stateTone(state)}>{label(state)}</Badge>;
}

export function Button({
  children,
  onClick,
  tone = 'default',
  disabled,
  type = 'button',
  small,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
  small?: boolean;
}) {
  const t = {
    default: 'bg-panel-3 text-fg border-line-strong hover:bg-line-strong',
    primary: 'bg-signal text-ink border-signal hover:brightness-110',
    danger: 'bg-down-dim text-down border-down/40 hover:bg-down/20',
    ghost: 'bg-transparent text-fg-2 border-transparent hover:text-fg hover:bg-panel-2',
  }[tone];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-[13px]'} ${t}`}
    >
      {children}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-24 items-center justify-center px-4 py-8 text-center text-[13px] text-fg-3">
      {children}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="rounded-md border border-down/30 bg-down-dim px-3 py-2 text-[13px] text-down">
      {error instanceof Error ? error.message : String(error)}
    </div>
  );
}

export function Loading() {
  return <div className="h-24 animate-pulse rounded-md bg-panel-2/60" />;
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: T; label: string }>;
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-panel p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] transition ${value === t.id ? 'bg-panel-3 text-fg' : 'text-fg-3 hover:text-fg-2'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Typed-confirmation dialog for consequential owner actions. */
export function Confirm({
  title,
  body,
  phrase,
  onConfirm,
  trigger,
  tone = 'danger',
  needReason = true,
}: {
  title: string;
  body: ReactNode;
  phrase?: string;
  onConfirm: (reason: string, typed: string) => Promise<void>;
  trigger: (open: () => void) => ReactNode;
  tone?: 'danger' | 'primary';
  needReason?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const ready = (!phrase || typed === phrase) && (!needReason || reason.trim().length >= 10);
  return (
    <>
      {trigger(() => setOpen(true))}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="panel w-full max-w-md p-5">
            <h3 className="text-base font-medium">{title}</h3>
            <div className="mt-2 text-[13px] leading-relaxed text-fg-2">{body}</div>
            {needReason && (
              <label className="mt-4 block">
                <span className="label">Reason (recorded in the audit log)</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-line-strong bg-ink px-3 py-2 text-[13px] outline-none focus:border-signal"
                />
              </label>
            )}
            {phrase && (
              <label className="mt-3 block">
                <span className="label">
                  Type <span className="num text-fg">{phrase}</span> to confirm
                </span>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="num mt-1 w-full rounded-md border border-line-strong bg-ink px-3 py-2 text-[13px] outline-none focus:border-signal"
                />
              </label>
            )}
            <div className="mt-3">
              <ErrorBox error={err} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button tone="ghost" onClick={() => (setOpen(false), setErr(null))}>
                Cancel
              </Button>
              <Button
                tone={tone}
                disabled={!ready || busy}
                onClick={async () => {
                  setBusy(true);
                  setErr(null);
                  try {
                    await onConfirm(reason, typed);
                    setOpen(false);
                    setTyped('');
                    setReason('');
                  } catch (e) {
                    setErr(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Working…' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function KV({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 gap-y-2 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-fg-3">{k}</dt>
          <dd className="num min-w-0 truncate text-right text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Addr({ value, href }: { value: string | null | undefined; href?: string }) {
  if (!value) return <span className="text-fg-3">—</span>;
  const short = `${value.slice(0, 4)}…${value.slice(-4)}`;
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="num text-fg-2 underline decoration-line-strong underline-offset-2 hover:text-signal"
      title={value}
    >
      {short}
    </a>
  ) : (
    <span className="num text-fg-2" title={value}>
      {short}
    </span>
  );
}

export function Bar({
  value,
  max,
  tone = 'signal',
}: {
  value: number;
  max: number;
  tone?: 'signal' | 'up' | 'down' | 'warn';
}) {
  const w = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const c = { signal: 'bg-signal', up: 'bg-up', down: 'bg-down', warn: 'bg-warn' }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-3">
      <div className={`h-full rounded-full ${c}`} style={{ width: `${w}%` }} />
    </div>
  );
}
