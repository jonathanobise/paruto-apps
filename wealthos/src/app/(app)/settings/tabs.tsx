import Link from "next/link";
import { cn } from "@/lib/utils";

export function SettingsTabs({ current }: { current: "general" | "security" | "privacy" }) {
  const tabs = [
    { key: "general", href: "/settings", label: "General" },
    { key: "security", href: "/settings/security", label: "Security" },
    { key: "privacy", href: "/settings/privacy", label: "Privacy & data" },
  ];
  return (
    <nav aria-label="Settings sections" className="mb-6 flex gap-1 border-b border-border">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={t.key === current ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", t.key === current ? "border-accent text-text" : "border-transparent text-text-3 hover:text-text")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
