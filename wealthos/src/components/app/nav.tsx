"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowLeftRight, LifeBuoy, Users, BookOpen, Calculator, Bell, Bot, ChartPie, FileText, Gauge, Globe, Landmark, Layers, Menu, Search, Settings, Shield, Star, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const live = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/net-worth", label: "Net worth", icon: TrendingUp },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/holdings", label: "Holdings", icon: Layers },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/model", label: "Target mix", icon: ChartPie },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/household", label: "Household", icon: Users },
  { href: "/simulator", label: "Simulator", icon: Calculator },
  { href: "/stress", label: "Stress tests", icon: Activity },
  { href: "/explore", label: "Explorer", icon: Search },
  { href: "/watchlists", label: "Watchlists", icon: Star },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/assistant", label: "Research assistant", icon: Bot },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/learn", label: "Learn", icon: BookOpen },
];

// Modules on the roadmap. Shown so the product shape is clear, but not clickable until built.
const upcoming: Array<{ label: string; icon: typeof FileText; milestone: string }> = [];

/** Capsule nav items; the active one is lifted (Paruto standard). */
const item = (active: boolean) => cn("flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200", active ? "bg-text/10 text-text shadow-[inset_0_1px_0_var(--hi)]" : "text-text-2 hover:bg-text/5 hover:text-text");

/** `researchHref`: where "Markets" leads, or null to hide it (research not available here yet). */
export function Nav({ onNavigate, isAdmin = false, researchHref = null }: { onNavigate?: () => void; isAdmin?: boolean; researchHref?: string | null }) {
  const pathname = usePathname();
  const items = researchHref ? live.flatMap((x) => (x.href === "/explore" ? [{ href: researchHref, label: "Markets", icon: Globe }, x] : [x])) : live;
  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      <ul className="flex flex-col gap-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`) || (label === "Markets" && pathname.startsWith("/research"));
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={item(active)}
              >
                <Icon className={cn("size-4", active ? "text-accent" : "text-text-3")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      {upcoming.length ? <div>
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3">Coming next</p>
        <ul className="flex flex-col gap-0.5">
          {upcoming.map(({ label, icon: Icon, milestone }) => (
            <li key={label} className="flex items-center gap-3 px-3 py-1.5 text-sm text-text-3">
              <Icon className="size-4" aria-hidden />
              <span className="flex-1">{label}<span className="sr-only"> (not available yet)</span></span>
              <span className="rounded-full bg-surface-2 px-2 text-[10px] font-semibold">{milestone}</span>
            </li>
          ))}
        </ul>
      </div> : null}
      <ul className="flex flex-col gap-0.5">
        {isAdmin ? (
          <li>
            <Link href="/admin" onClick={onNavigate} className={item(pathname.startsWith("/admin"))}>
              <Shield className="size-4 text-text-3" aria-hidden /> Admin
            </Link>
          </li>
        ) : null}
        <li>
          <Link href="/settings" onClick={onNavigate} className={item(pathname.startsWith("/settings"))}>
            <Settings className="size-4 text-text-3" aria-hidden /> Settings
          </Link>
        </li>
        <li>
          <Link href="/support" onClick={onNavigate} className={item(pathname.startsWith("/support"))}>
            <LifeBuoy className="size-4 text-text-3" aria-hidden /> Help
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function MobileNav({ isAdmin = false, researchHref = null, footer }: { isAdmin?: boolean; researchHref?: string | null; footer?: React.ReactNode }) {
  return (
    <details className="group lg:hidden">
      <summary className="spring flex size-9 cursor-pointer list-none items-center justify-center rounded-full text-text-2 hover:bg-text/10" aria-label="Open menu">
        <Menu className="size-4" aria-hidden />
      </summary>
      {/* Anchored under the glass bar (a backdrop-filter parent is the containing block, so not fixed);
          near-opaque so the menu stays readable over content. */}
      <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 max-h-[calc(100dvh-96px)] overflow-y-auto rounded-[28px] border border-[var(--glass-rim)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-3 shadow-[var(--glass-shadow)] backdrop-blur-xl">
        <Nav isAdmin={isAdmin} researchHref={researchHref} />
        {footer ? <div className="mt-4 border-t border-border pt-3 sm:hidden">{footer}</div> : null}
      </div>
    </details>
  );
}
