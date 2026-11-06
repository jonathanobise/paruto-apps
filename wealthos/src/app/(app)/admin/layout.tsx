import Link from "next/link";
import { requireStaffPage, type StaffRole } from "@/server/auth/context";

const TABS: Array<[string, string, StaffRole[]]> = [
  ["/admin", "Overview", ["admin", "support", "compliance"]],
  ["/admin/users", "Users", ["admin", "support"]],
  ["/admin/orgs", "Organisations", ["admin", "support"]],
  ["/admin/billing", "Billing", ["admin"]],
  ["/admin/support", "Support", ["admin", "support"]],
  ["/admin/ai", "AI usage", ["admin", "compliance"]],
  ["/admin/jobs", "Jobs", ["admin"]],
  ["/admin/audit", "Audit log", ["admin", "compliance"]],
  ["/admin/gates", "Feature gates", ["admin", "compliance"]],
  ["/admin/sources", "Sources", ["admin"]],
  ["/admin/instruments", "Catalogue", ["admin"]],
  ["/admin/imports", "Market data", ["admin"]],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const app = await requireStaffPage();
  return (
    <>
      <nav aria-label="Admin" className="glass mb-7 flex flex-wrap items-center gap-1 rounded-[22px] p-1">
        {TABS.filter(([, , roles]) => roles.includes(app.staffRole)).map(([href, label]) => <Link key={href} href={href} className="spring rounded-full px-3.5 py-1.5 text-sm font-medium text-text-2 hover:bg-surface-2 hover:text-text">{label}</Link>)}
        <span className="ml-auto self-center px-3 text-[12px] text-text-3">Signed in as {app.staffRole === "admin" ? "administrator" : app.staffRole === "support" ? "support agent" : "compliance reviewer"}</span>
      </nav>
      {children}
    </>
  );
}
