'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ago, dt, parseJson } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Badge, Button, ErrorBox, KV, Loading, Panel, StateBadge, Tabs, label } from '@/components/ui';

export default function Settings() {
  const [tab, setTab] = useState<'runtime' | 'strategy' | 'security' | 'audit'>('runtime');
  const q = useQuery({ queryKey: ['settings'], queryFn: () => api<Row>('/settings') });
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  return (
    <div className="space-y-5">
      <Tabs
        tabs={[
          { id: 'runtime', label: 'Runtime' },
          { id: 'strategy', label: 'Strategy' },
          { id: 'security', label: 'Security' },
          { id: 'audit', label: 'Audit log' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'runtime' && <Runtime d={q.data} />}
      {tab === 'strategy' && <Strategy d={q.data} />}
      {tab === 'security' && <Security />}
      {tab === 'audit' && <Audit />}
    </div>
  );
}

function Runtime({ d }: { d: Row }) {
  const qc = useQueryClient();
  const rt = d.runtime as Row;
  const [tz, setTz] = useState(rt.timezone);
  const [hour, setHour] = useState(String(rt.report_hour_local));
  const [cap, setCap] = useState(String(rt.api_daily_call_cap));
  const [msg, setMsg] = useState<unknown>(null);
  const input =
    'num rounded-md border border-line-strong bg-ink px-2.5 py-1.5 text-[13px] outline-none focus:border-signal';
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Schedule and budgets">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="label">Timezone (IANA)</span>
            <input className={input} value={tz} onChange={(e) => setTz(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Report hour (local)</span>
            <input
              className={input}
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Daily API call cap</span>
            <input className={input} type="number" value={cap} onChange={(e) => setCap(e.target.value)} />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            tone="primary"
            onClick={async () => {
              setMsg(null);
              try {
                await api('/settings/runtime', {
                  method: 'PUT',
                  body: { timezone: tz, reportHourLocal: Number(hour), apiDailyCallCap: Number(cap) },
                });
                await qc.invalidateQueries();
                setMsg('Saved.');
              } catch (e) {
                setMsg(e);
              }
            }}
          >
            Save
          </Button>
          {typeof msg === 'string' ? (
            <span className="text-xs text-up">{msg}</span>
          ) : (
            <ErrorBox error={msg} />
          )}
        </div>
        <p className="mt-3 text-xs text-fg-3">
          Maximum concurrent positions, daily trade count and daily risk thresholds are part of the versioned
          strategy (Strategy tab).
        </p>
      </Panel>
      <Panel title="Provider integrations" pad={false}>
        <table className="grid-table">
          <tbody>
            {(d.providers as Row[]).map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
                  <Badge tone={p.integration_status === 'OPERATIONAL' ? 'up' : 'warn'}>
                    {label(p.integration_status)}
                  </Badge>
                </td>
                <td className="whitespace-normal text-xs text-fg-3">{p.licence_note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-3 text-xs text-fg-3">
          Credentials are configured as secrets on the server (never in the browser). See
          docs/data-sources.md.
        </p>
      </Panel>
    </div>
  );
}

function Strategy({ d }: { d: Row }) {
  const qc = useQueryClient();
  const [text, setText] = useState(JSON.stringify(d.config, null, 2));
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<unknown>(null);
  useEffect(() => setText(JSON.stringify(d.config, null, 2)), [d.config]);
  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Panel title="Active strategy" right={<span className="num">{d.configVersion}</span>}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="num h-[60vh] w-full rounded-md border border-line-strong bg-ink p-3 text-[12px] leading-relaxed outline-none focus:border-signal"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for the change (recorded)"
            className="min-w-64 flex-1 rounded-md border border-line-strong bg-ink px-3 py-1.5 text-[13px] outline-none focus:border-signal"
          />
          <Button
            tone="primary"
            onClick={async () => {
              setMsg(null);
              try {
                const r = await api<{ configVersion: string }>('/settings/strategy', {
                  method: 'PUT',
                  body: { config: JSON.parse(text), reason },
                });
                await qc.invalidateQueries();
                setMsg(`Activated ${r.configVersion}. Candidates evaluated under the old version expire.`);
              } catch (e) {
                setMsg(e);
              }
            }}
          >
            Validate and activate
          </Button>
        </div>
        <div className="mt-2">
          {typeof msg === 'string' ? (
            <span className="text-xs text-up">{msg}</span>
          ) : (
            <ErrorBox error={msg} />
          )}
        </div>
      </Panel>
      <div className="space-y-5">
        <Panel title="Versions" pad={false}>
          <table className="grid-table">
            <tbody>
              {(d.versions as Row[]).map((v) => (
                <tr key={v.config_version}>
                  <td className="num text-xs">{v.config_version}</td>
                  <td className="text-fg-2">{v.strategy_version}</td>
                  <td className="r num text-fg-3">{ago(v.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Configuration changes" pad={false}>
          <div className="max-h-[40vh] overflow-auto">
            <table className="grid-table">
              <tbody>
                {(d.changes as Row[]).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <StateBadge state={c.scope} />
                    </td>
                    <td
                      className="max-w-[220px] truncate text-xs"
                      title={`${c.previous_value} → ${c.new_value}`}
                    >
                      {c.reason}
                    </td>
                    <td className="text-xs text-fg-3">{c.actor}</td>
                    <td className="r num text-fg-3">{ago(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Security() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Row>('/auth/me') });
  const [enroll, setEnroll] = useState<Row | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<unknown>(null);
  if (!me.data) return <Loading />;
  return (
    <Panel title="Multi-factor authentication">
      <KV
        rows={[
          ['Account', me.data.email],
          [
            'MFA',
            me.data.mfaEnabled ? (
              <Badge key="m" tone="up">
                enabled
              </Badge>
            ) : (
              <Badge key="m" tone="warn">
                not enabled
              </Badge>
            ),
          ],
        ]}
      />
      {!me.data.mfaEnabled && (
        <div className="mt-4 space-y-3 text-[13px]">
          <p className="text-fg-2">
            In production, administrative controls (mode changes, resets, liquidation, strategy changes)
            require MFA.
          </p>
          {!enroll ? (
            <Button
              tone="primary"
              onClick={async () => {
                setErr(null);
                try {
                  setEnroll(await api<Row>('/auth/mfa/enroll', { method: 'POST' }));
                } catch (e) {
                  setErr(e);
                }
              }}
            >
              Set up an authenticator app
            </Button>
          ) : (
            <>
              <p className="text-fg-3">
                Add this secret to your authenticator app (or open the otpauth link on the same device), then
                enter the current code.
              </p>
              <div className="num break-all rounded-md border border-line bg-ink p-3 text-xs">
                {enroll.secret}
              </div>
              <a className="text-xs text-signal underline" href={enroll.otpauth}>
                otpauth link
              </a>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="num w-32 rounded-md border border-line-strong bg-ink px-3 py-1.5 outline-none focus:border-signal"
                />
                <Button
                  tone="primary"
                  onClick={async () => {
                    setErr(null);
                    try {
                      await api('/auth/mfa/verify', { method: 'POST', body: { code } });
                      await qc.invalidateQueries({ queryKey: ['me'] });
                      setEnroll(null);
                    } catch (e) {
                      setErr(e);
                    }
                  }}
                >
                  Verify
                </Button>
              </div>
            </>
          )}
          <ErrorBox error={err} />
        </div>
      )}
    </Panel>
  );
}

function Audit() {
  const [cat, setCat] = useState('');
  const q = useQuery({
    queryKey: ['audit', cat],
    queryFn: () => api<{ rows: Row[] }>(`/audit${cat ? `?category=${cat}` : ''}`),
    refetchInterval: 15_000,
  });
  const cats = [
    '',
    'DISCOVERY',
    'RULE',
    'SCORE',
    'RISK',
    'ORDER',
    'FILL',
    'POSITION',
    'STOP',
    'BREAKER',
    'CONFIG',
    'ADMIN',
    'AUTH',
    'RECONCILIATION',
    'CORRECTION',
    'API_ERROR',
    'AUTOMATION',
    'REPORT',
  ];
  return (
    <Panel
      title="Immutable audit log"
      right={
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-md border border-line-strong bg-ink px-2 py-1 text-xs"
        >
          {cats.map((c) => (
            <option key={c} value={c}>
              {c || 'All categories'}
            </option>
          ))}
        </select>
      }
      pad={false}
    >
      {!q.data ? (
        <div className="p-4">
          <Loading />
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-auto">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Seq</th>
                <th>When</th>
                <th>Category</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Subject</th>
                <th>Detail</th>
                <th>Checksum</th>
              </tr>
            </thead>
            <tbody>
              {q.data.rows.map((a) => (
                <tr key={a.id}>
                  <td className="num text-fg-3">{a.seq}</td>
                  <td className="num text-xs text-fg-3">{dt(a.created_at)}</td>
                  <td>
                    <Badge>{a.category}</Badge>
                  </td>
                  <td className="text-xs">{a.action}</td>
                  <td className="text-xs text-fg-2">{a.actor}</td>
                  <td className="num text-xs text-fg-3">
                    {a.subject_type ? `${a.subject_type}:${String(a.subject_id).slice(-8)}` : ''}
                  </td>
                  <td className="num max-w-[360px] truncate text-[11px] text-fg-3" title={a.detail}>
                    {JSON.stringify(parseJson(a.detail, {}))}
                  </td>
                  <td className="num text-[11px] text-fg-3">{String(a.checksum).slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
