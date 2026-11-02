import Link from "next/link";
import { requireAdminPage } from "@/server/auth/context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const tabs = [
    ["/admin", "Overview"],
    ["/admin/sources", "Sources"],
    ["/admin/instruments", "Catalogue"],
    ["/admin/imports", "Market data imports"],
  ];
  return (
    <>
      <nav aria-label="Admin" className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {tabs.map(([href, label]) => <Link key={href} href={href!} className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-text-2 hover:text-text">{label}</Link>)}
      </nav>
      {children}
    </>
  );
}
