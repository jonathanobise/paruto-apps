import Link from "next/link";
import { cookies } from "next/headers";
import { unreadCount } from "@/server/alerts/service";
import { requireApp } from "@/server/auth/context";
import { DEPTH_COOKIE, THEME_COOKIE, isDepth, isTheme } from "@/lib/appearance";
import { MenuFoot, Sidebar } from "@/components/app/sidebar";
import { ConnectionLight } from "@/components/pwa/connection";
import { BellButton, BellSheet } from "@/components/updates/bell";
import { VersionCapsule } from "@/components/updates/version-capsule";
import { Logo } from "@/components/app/logo";
import { MobileNav, Nav } from "@/components/app/nav";
import { AutoSubmitSelect } from "@/components/app/auto-submit-select";
import { signOutAction } from "../(auth)/actions";
import { setCurrencyAction, switchOrgAction } from "./shell-actions";
import { DISCLOSURES } from "@/server/compliance/features";
import { SUPPORTED_CURRENCIES } from "@/engine";
import { BRAND } from "@/lib/brand";
import { isDemoMode } from "@/server/demo/mode";
import { isPrivateMode } from "@/lib/private-mode";
import { researchAvailability } from "@/server/research/availability";
import { getMarketSnapshot } from "@/server/research/snapshot";
import { MarketTicker } from "@/components/app/market-band";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const app = await requireApp();
  const unread = await unreadCount(app.ctx);
  const jar = await cookies();
  const themeRaw = jar.get(THEME_COOKIE)?.value;
  const depthRaw = jar.get(DEPTH_COOKIE)?.value;
  const appearance = { theme: isTheme(themeRaw) ? themeRaw : "dark", depth: isDepth(depthRaw) ? depthRaw : "night" } as const;
  const isStaff = app.session.user.platformRole !== "user";
  const research = await researchAvailability(app.org.jurisdiction);
  const snapshot = research.research ? await getMarketSnapshot(app.ctx) : null;
  const user = { name: app.session.user.displayName, email: app.session.user.email };
  const timezone = app.preferences.timezone || "Africa/Lagos";
  return (
    <div className="vio-shell min-h-dvh print:block">
      {/* Floating Liquid Glass sidebar, collapsible to an icon rail */}
      <Sidebar nav={<Nav isAdmin={isStaff} researchHref={research.href} />} unread={unread} user={user} appearance={appearance} signOut={signOutAction} disclosure={DISCLOSURES.non_custodial} />
      <div className="min-w-0">
        {/* Floating Liquid Glass top bar */}
        <header className="glass sticky top-3 z-30 mx-3 mt-3 flex h-14 items-center gap-2 rounded-full pl-2 pr-2 sm:gap-3 sm:pl-3 print:hidden">
          <MobileNav isAdmin={isStaff} researchHref={research.href} footer={<MenuFoot user={user} appearance={appearance} signOut={signOutAction} />} />
          <Link href="/dashboard" className="spring flex items-center gap-1.5 lg:hidden" aria-label={`${BRAND} home`}>
            <Logo compact />
          </Link>
          <ConnectionLight className="lg:hidden" />
          <p className="hidden pl-2 text-[13px] text-text-3 lg:block">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(new Date())}
          </p>
          {snapshot ? <MarketTicker snapshot={snapshot} /> : null}
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
            <BellButton unread={unread} className="lg:hidden" />
          </div>
        </header>
        {isDemoMode() ? (
          <div className="mx-3 mt-3 rounded-[18px] bg-warning-soft px-4 py-2 text-[13px] text-text sm:rounded-full sm:px-5" role="note">
            <strong className="font-semibold text-warning">PUBLIC DEMO</strong> · Everyone shares this demo and it resets automatically. Please don&apos;t enter real information.
          </div>
        ) : null}
        {isPrivateMode() ? (
          <div className="mx-3 mt-3 rounded-[18px] bg-info-soft px-4 py-2 text-[13px] text-text sm:rounded-full sm:px-5" role="note">
            <strong className="font-semibold">PRIVATE</strong> · Only you can reach this site. Research data is loaded at each deploy; anything you enter in your portfolio isn&apos;t saved (the database is rebuilt at each deploy and after 20 idle minutes).
          </div>
        ) : null}
        {app.org.isDemo ? (
          <div className="mx-3 mt-3 rounded-[18px] bg-demo-soft px-4 py-2 text-[13px] text-text sm:rounded-full sm:px-5" role="note">
            <strong className="font-semibold text-demo">DEMO PORTFOLIO</strong> · {DISCLOSURES.demo_data}
          </div>
        ) : null}
        {/* Full width (paruto-standards: pages use the whole window), padding growing with the screen. */}
        <main id="main" className="w-full px-4 py-8 sm:px-6 lg:px-[clamp(1.5rem,2.6vw,3.5rem)] lg:py-10">
          {children}
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-3 px-4 pb-8 sm:px-6 lg:px-[clamp(1.5rem,2.6vw,3.5rem)] print:hidden">
          <VersionCapsule />
          <p className="text-[12px] text-text-3">
            <Link href="/whats-new" className="hover:text-text-2">What&apos;s new</Link> · <Link href="/support" className="hover:text-text-2">Help</Link> · <Link href="/legal/privacy" className="hover:text-text-2">Privacy</Link>
          </p>
        </footer>
      </div>
      <BellSheet timezone={timezone} />
    </div>
  );
}
