'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api, setCsrf } from '@/lib/api';
import { ago } from '@/lib/format';
import { Badge, Button, ErrorBox, stateTone, label } from './ui';

const NAV: Array<{ group: string; items: Array<{ href: string; label: string }> }> = [
  {
    group: 'Desk',
    items: [
      { href: '/', label: 'Overview' },
      { href: '/discover/', label: 'Discover' },
      { href: '/opportunities/', label: 'Opportunities' },
      { href: '/token/', label: 'Token Intelligence' },
    ],
  },
  {
    group: 'Trading',
    items: [
      { href: '/paper/', label: 'Paper Trading' },
      { href: '/portfolio/', label: 'Portfolio' },
      { href: '/risk/', label: 'Risk Center' },
      { href: '/journal/', label: 'Journal' },
    ],
  },
  {
    group: 'Insight',
    items: [
      { href: '/analytics/', label: 'Analytics' },
      { href: '/reports/', label: 'Reports' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { href: '/agents/', label: 'Agents' },
      { href: '/health/', label: 'System Health' },
      { href: '/settings/', label: 'Settings' },
    ],
  },
];

interface Me {
  email: string;
  csrfToken: string;
  mfaEnabled: boolean;
  mfaVerified: boolean;
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#141821" stroke="#2a3140" />
      <path
        d="M8 21.5 L13 10.5 L18 21.5"
        fill="none"
        stroke="#8a94ff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 17.5 C19.5 12, 22 12, 24.5 10.5"
        fill="none"
        stroke="#35c48f"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/auth/me'), retry: false });
  useEffect(() => setCsrf(me.data?.csrfToken ?? null), [me.data]);
  if (me.isLoading)
    return <div className="flex min-h-screen items-center justify-center text-fg-3">Loading…</div>;
  if (me.error) return <SignIn />;
  return <Frame me={me.data!}>{children}</Frame>;
}

function Frame({ me, children }: { me: Me; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ['overview'],
    queryFn: () =>
      api<{ mode: string; systemStatus: string; asOf: number; breakers: unknown[] }>('/overview'),
    refetchInterval: 10_000,
  });
  const title =
    NAV.flatMap((g) => g.items).find((i) => (i.href === '/' ? path === '/' : path.startsWith(i.href)))
      ?.label ?? 'Alpha Desk';
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_1fr]">
      <aside
        className={`${open ? 'block' : 'hidden'} fixed inset-0 z-40 overflow-y-auto border-r border-line bg-ink lg:sticky lg:top-0 lg:block lg:h-screen`}
      >
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
          <Mark />
          <div>
            <div className="text-[14px] font-semibold tracking-tight">Alpha Desk</div>
            <div className="text-[11px] text-fg-3">Solana research · paper</div>
          </div>
          <button
            className="ml-auto text-fg-3 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="space-y-5 px-3 pb-6">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="label px-2 pb-1.5">{g.group}</div>
              {g.items.map((i) => {
                const active = i.href === '/' ? path === '/' : path.startsWith(i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center rounded-md px-2 py-1.5 text-[13px] transition ${active ? 'bg-panel-2 text-fg shadow-[inset_2px_0_0_var(--color-signal)]' : 'text-fg-2 hover:bg-panel hover:text-fg'}`}
                  >
                    {i.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-line px-5 py-4 text-[11px] leading-relaxed text-fg-3">
          Paper trading only. No wallet, no signing, no real funds.
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur md:px-6">
          <button
            className="rounded-md border border-line px-2 py-1 text-fg-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <h1 className="truncate text-[15px] font-medium">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge tone="signal">PAPER</Badge>
            {status.data && (
              <>
                <span className="hidden sm:inline-flex">
                  <Badge
                    tone={
                      status.data.mode === 'PAPER_AUTONOMOUS'
                        ? 'up'
                        : status.data.mode === 'EMERGENCY_PAUSED'
                          ? 'down'
                          : 'muted'
                    }
                  >
                    {label(status.data.mode)}
                  </Badge>
                </span>
                <Badge tone={stateTone(status.data.systemStatus)} title={`as of ${ago(status.data.asOf)}`}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${status.data.systemStatus === 'HEALTHY' ? 'bg-up' : status.data.systemStatus === 'PAUSED' || status.data.systemStatus === 'DEGRADED' ? 'bg-warn' : 'bg-down'}`}
                  />
                  {status.data.systemStatus}
                </Badge>
              </>
            )}
            <span className="hidden text-xs text-fg-3 md:inline">{me.email}</span>
            <Button
              tone="ghost"
              small
              onClick={async () => {
                await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
                qc.clear();
                window.location.href = '/';
              }}
            >
              Sign out
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}

function SignIn() {
  const qc = useQueryClient();
  const router = useRouter();
  const status = useQuery({
    queryKey: ['auth-status'],
    queryFn: () => api<{ ownerConfigured: boolean }>('/auth/status'),
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const setup = status.data && !status.data.ownerConfigured;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (setup) await api('/auth/setup', { method: 'POST', body: { setupToken, email, password } });
      const r = await api<Me>('/auth/login', {
        method: 'POST',
        body: { email, password, totp: totp || undefined },
      });
      setCsrf(r.csrfToken);
      await qc.invalidateQueries();
      router.refresh();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  const input =
    'mt-1 w-full rounded-md border border-line-strong bg-ink px-3 py-2 text-[14px] outline-none focus:border-signal';
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <Mark />
          <div>
            <div className="font-semibold">Alpha Desk</div>
            <div className="text-xs text-fg-3">{setup ? 'First-run owner setup' : 'Owner sign-in'}</div>
          </div>
        </div>
        {setup && (
          <label className="mb-3 block">
            <span className="label">Setup token</span>
            <input
              className={input}
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              autoComplete="off"
              required
            />
          </label>
        )}
        <label className="mb-3 block">
          <span className="label">Email</span>
          <input
            className={input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="mb-3 block">
          <span className="label">Password {setup && '(12+ characters)'}</span>
          <input
            className={input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={setup ? 'new-password' : 'current-password'}
            required
            minLength={setup ? 12 : 1}
          />
        </label>
        {!setup && (
          <label className="mb-4 block">
            <span className="label">Authenticator code (if MFA is on)</span>
            <input
              className={`${input} num`}
              inputMode="numeric"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              autoComplete="one-time-code"
              maxLength={6}
            />
          </label>
        )}
        <ErrorBox error={err} />
        <div className="mt-4">
          <Button type="submit" tone="primary" disabled={busy}>
            {busy ? 'Working…' : setup ? 'Create owner and sign in' : 'Sign in'}
          </Button>
        </div>
        <p className="mt-5 text-[11px] leading-relaxed text-fg-3">
          Private paper-trading research desk. Simulated execution only; nothing here can move real funds.
        </p>
      </form>
    </div>
  );
}
