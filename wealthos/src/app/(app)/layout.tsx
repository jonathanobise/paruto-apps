import Link from "next/link";
import { Bell, LogOut, Moon, Sun } from "lucide-react";
import { cookies } from "next/headers";
import { unreadCount } from "@/server/alerts/service";
import { THEME_COOKIE, requireApp } from "@/server/auth/context";
import { Logo } from "@/components/app/logo";
import { MobileNav, Nav } from "@/components/app/nav";
import { AutoSubmitSelect } from "@/components/app/auto-submit-select";
import { signOutAction } from "../(auth)/actions";
import { setCurrencyAction, setThemeAction, switchOrgAction } from "./shell-actions";
import { DISCLOSURES } from "@/server/compliance/features";
import { SUPPORTED_CURRENCIES } from "@/engine";
import { BRAND } from "@/lib/brand";
import { isDemoMode } from "@/server/demo/mode";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const app = await requireApp();
  const unread = await unreadCount(app.ctx);
  const light = app.preferences.theme === "light" || (await cookies()).get(THEME_COOKIE)?.value === "light";
  const isStaff = app.session.user.platformRole !== "user";
  const iconBtn = "spring flex size-9 items-center justify-center rounded-full text-text-2 hover:bg-text/10 hover:text-text";
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr] print:block">
      {/* Floating Liquid Glass navigation panel */}
      <aside className="glass sticky top-3 m-3 mr-0 hidden h-[calc(100dvh-24px)] flex-col gap-6 overflow-y-auto rounded-[28px] px-3 py-5 lg:flex print:hidden">
        <Link href="/dashboard" className="spring w-fit px-3">
          <Logo />
        </Link>
        <Nav isAdmin={isStaff} />
        <p className="mt-auto px-3 text-[11px] leading-relaxed text-text-3">{DISCLOSURES.non_custodial}</p>
      </aside>
      <div className="min-w-0">
        {/* Floating Liquid Glass top bar */}
        <header className="glass sticky top-3 z-30 mx-3 mt-3 flex h-14 items-center gap-2 rounded-full pl-2 pr-2 sm:gap-3 sm:pl-3 print:hidden">
          <MobileNav
            isAdmin={isStaff}
            footer={
              <form action={signOutAction}>
                <button className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm font-medium text-text-2 hover:bg-text/10">
                  <LogOut className="size-4 text-text-3" aria-hidden /> Sign out
                </button>
              </form>
            }
          />
          <Link href="/dashboard" className="spring lg:hidden" aria-label={`${BRAND} home`}>
            <Logo compact />
          </Link>
          <p className="hidden pl-2 text-[13px] text-text-3 lg:block">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: app.preferences.timezone || "Africa/Lagos" }).format(new Date())}
          </p>
          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-1.5">
            <form action={switchOrgAction}>
              <label htmlFor="org-switch" className="sr-only">
                Portfolio
              </label>
              <AutoSubmitSelect id="org-switch" name="orgId" defaultValue={app.org.id} className="h-9 w-24 min-w-0 cursor-pointer rounded-full border border-border bg-text/5 px-3 text-sm text-text hover:bg-text/10 sm:w-auto sm:max-w-52">
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
              <AutoSubmitSelect id="ccy-switch" name="currency" defaultValue={app.baseCurrency} className="num h-9 cursor-pointer rounded-full border border-border bg-text/5 px-3 text-sm text-text hover:bg-text/10">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </AutoSubmitSelect>
            </form>
            <form action={setThemeAction} className="hidden sm:block">
              <input type="hidden" name="theme" value={light ? "dark" : "light"} />
              <button className={iconBtn} aria-label={light ? "Switch to dark appearance" : "Switch to light appearance"} title={light ? "Dark appearance" : "Light appearance"}>
                {light ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
              </button>
            </form>
            <Link href="/notifications" className={`relative ${iconBtn}`} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
              <Bell className="size-4" aria-hidden />
              {unread ? <span className="num absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-brand-ink">{unread > 99 ? "99+" : unread}</span> : null}
            </Link>
            <span className="hidden px-1 text-sm text-text-2 md:inline">{app.session.user.displayName}</span>
            <form action={signOutAction} className="hidden sm:block">
              <button className={iconBtn} aria-label="Sign out" title="Sign out">
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
          </div>
        </header>
        {isDemoMode() ? (
          <div className="mx-3 mt-3 rounded-[18px] bg-warning-soft px-4 py-2 text-[13px] text-text sm:rounded-full sm:px-5" role="note">
            <strong className="font-semibold text-warning">PUBLIC DEMO</strong> · Everyone shares this demo and it resets automatically. Please don&apos;t enter real information.
          </div>
        ) : null}
        {app.org.isDemo ? (
          <div className="mx-3 mt-3 rounded-[18px] bg-demo-soft px-4 py-2 text-[13px] text-text sm:rounded-full sm:px-5" role="note">
            <strong className="font-semibold text-demo">DEMO PORTFOLIO</strong> · {DISCLOSURES.demo_data}
          </div>
        ) : null}
        <main id="main" className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
