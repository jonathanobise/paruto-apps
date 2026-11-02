"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowLeftRight, Calculator, Bell, Bot, ChartPie, CreditCard, FileText, Gauge, Landmark, Layers, Menu, Search, Settings, Shield, Star, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const live = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/net-worth", label: "Net worth", icon: TrendingUp },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/holdings", label: "Holdings", icon: Layers },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/model", label: "Target mix", icon: ChartPie },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/simulator", label: "Simulator", icon: Calculator },
  { href: "/stress", label: "Stress tests", icon: Activity },
  { href: "/explore", label: "Explorer", icon: Search },
  { href: "/watchlists", label: "Watchlists", icon: Star },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/assistant", label: "Research assistant", icon: Bot },
];

// Modules on the roadmap. Shown so the product shape is clear, but not clickable until built.
const upcoming = [
  { label: "Reports", icon: FileText, milestone: "M4" },
  { label: "Billing", icon: CreditCard, milestone: "M4" },
];

export function Nav({ onNavigate, isAdmin = false }: { onNavigate?: () => void; isAdmin?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      <ul className="flex flex-col gap-0.5">
        {live.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-accent-soft text-text" : "text-text-2 hover:bg-surface-2 hover:text-text")}
              >
                <Icon className={cn("size-4", active ? "text-accent" : "text-text-3")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div>
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3">Coming next</p>
        <ul className="flex flex-col gap-0.5">
          {upcoming.map(({ label, icon: Icon, milestone }) => (
            <li key={label} className="flex items-center gap-3 px-3 py-1.5 text-sm text-text-3">
              <Icon className="size-4" aria-hidden />
              <span className="flex-1">{label}<span className="sr-only"> (not available yet)</span></span>
              <span className="rounded bg-surface-2 px-1.5 text-[10px] font-semibold">{milestone}</span>
            </li>
          ))}
        </ul>
      </div>
      <ul className="flex flex-col gap-0.5">
        {isAdmin ? (
          <li>
            <Link href="/admin" onClick={onNavigate} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", pathname.startsWith("/admin") ? "bg-accent-soft text-text" : "text-text-2 hover:bg-surface-2")}>
              <Shield className="size-4 text-text-3" aria-hidden /> Admin
            </Link>
          </li>
        ) : null}
        <li>
          <Link href="/settings" onClick={onNavigate} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", pathname.startsWith("/settings") ? "bg-accent-soft text-text" : "text-text-2 hover:bg-surface-2")}>
            <Settings className="size-4 text-text-3" aria-hidden /> Settings
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <details className="group lg:hidden">
      <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg border border-border text-text-2" aria-label="Open menu">
        <Menu className="size-4" aria-hidden />
      </summary>
      <div className="fixed inset-x-0 top-14 z-40 max-h-[calc(100dvh-56px)] overflow-y-auto border-b border-border bg-surface p-4 shadow-lg">
        <Nav isAdmin={isAdmin} />
      </div>
    </details>
  );
}
