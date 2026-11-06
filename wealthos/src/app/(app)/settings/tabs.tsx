import Link from "next/link";
import { cn } from "@/lib/utils";

export function SettingsTabs({ current }: { current: "general" | "security" | "privacy" | "members" | "billing" }) {
  const tabs = [
    { key: "general", href: "/settings", label: "General" },
    { key: "security", href: "/settings/security", label: "Security" },
    { key: "members", href: "/settings/members", label: "Members" },
    { key: "billing", href: "/settings/billing", label: "Plan & billing" },
    { key: "privacy", href: "/settings/privacy", label: "Privacy & data" },
  ];
  return (
    <nav aria-label="Settings sections" className="glass mb-7 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full p-1">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={t.key === current ? "page" : undefined} className={cn("spring shrink-0 rounded-full px-4 py-1.5 text-sm font-medium", t.key === current ? "bg-brand text-brand-ink" : "text-text-2 hover:text-text")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
