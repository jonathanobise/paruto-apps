import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { unreadCount } from "@/server/alerts/service";
import { requireApp } from "@/server/auth/context";
import { Logo } from "@/components/app/logo";
import { MobileNav, Nav } from "@/components/app/nav";
import { AutoSubmitSelect } from "@/components/app/auto-submit-select";
import { signOutAction } from "../(auth)/actions";
import { setCurrencyAction, switchOrgAction } from "./shell-actions";
import { DISCLOSURES } from "@/server/compliance/features";
import { SUPPORTED_CURRENCIES } from "@/engine";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const app = await requireApp();
  const unread = await unreadCount(app.ctx);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr] print:block">
      <aside className="sticky top-0 hidden print:hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-border bg-surface px-3 py-5 lg:flex">
        <Link href="/dashboard" className="px-3">
          <Logo />
        </Link>
        <Nav isAdmin={app.session.user.platformRole === "admin"} />
        <p className="mt-auto px-3 text-[11px] leading-relaxed text-text-3">{DISCLOSURES.non_custodial}</p>
      </aside>
      <div className="min-w-0">
        <header className="print:hidden sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur sm:px-6">
          <MobileNav isAdmin={app.session.user.platformRole === "admin"} />
          <Link href="/dashboard" className="lg:hidden">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <form action={switchOrgAction}>
              <label htmlFor="org-switch" className="sr-only">
                Portfolio
              </label>
              <AutoSubmitSelect id="org-switch" name="orgId" defaultValue={app.org.id} className="h-9 max-w-28 rounded-lg border border-border bg-surface px-2 text-sm sm:max-w-52">
                {app.orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.isDemo ? `DEMO · ${o.name}` : o.name}
                  </option>
                ))}
              </AutoSubmitSelect>
              <noscript>
                <button className="ml-1 text-sm">Switch</button>
              </noscript>
            </form>
            <form action={setCurrencyAction}>
              <label htmlFor="ccy-switch" className="sr-only">
                Display currency
              </label>
              <AutoSubmitSelect id="ccy-switch" name="currency" defaultValue={app.baseCurrency} className="num h-9 rounded-lg border border-border bg-surface px-2 text-sm">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </AutoSubmitSelect>
            </form>
            <Link href="/notifications" className="relative flex size-9 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
              <Bell className="size-4" aria-hidden />
              {unread ? <span className="num absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-white">{unread > 99 ? "99+" : unread}</span> : null}
            </Link>
            <span className="hidden text-sm text-text-2 md:inline">{app.session.user.displayName}</span>
            <form action={signOutAction}>
              <button className="flex size-9 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text" aria-label="Sign out" title="Sign out">
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
          </div>
        </header>
        {app.org.isDemo ? (
          <div className="border-b border-demo/30 bg-demo-soft px-4 py-2 text-[13px] text-text sm:px-6" role="note">
            <strong className="font-semibold text-demo">DEMO PORTFOLIO</strong> · {DISCLOSURES.demo_data}
          </div>
        ) : null}
        <main id="main" className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
