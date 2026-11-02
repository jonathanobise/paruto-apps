import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdminPage } from "@/server/auth/context";
import { listCatalogue } from "@/server/admin/catalogue";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "@/components/app/research";
import { formatDate } from "@/lib/format";
import { ASSET_CLASS_LABELS } from "@/engine";

export const metadata = { title: "Catalogue · Admin" };

export default async function AdminInstruments() {
  const app = await requireAdminPage();
  const rows = await listCatalogue({ userId: app.session.userId });
  return (
    <>
      <PageHeader title="Catalogue" description="Global instruments visible to every user. Mark an instrument verified only after checking its identity and facts against the cited official source." actions={<Button asChild><Link href="/admin/instruments/new"><Plus aria-hidden /> Add instrument</Link></Button>} />
      <Card className="overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-2 text-left text-text-3"><tr><th className="px-4 py-2.5 font-medium">Instrument</th><th className="px-4 py-2.5 font-medium">Type</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Facts as of</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2.5">{r.isDemo ? <span>{r.name}</span> : <Link href={`/admin/instruments/${r.id}`} className="font-medium hover:text-accent">{r.name}</Link>}<p className="text-text-3">{[r.symbol, r.currency].filter(Boolean).join(" · ")}</p></td>
                <td className="px-4 py-2.5 text-text-2">{ASSET_CLASS_LABELS[r.assetClass as keyof typeof ASSET_CLASS_LABELS]}</td>
                <td className="px-4 py-2.5"><VerificationBadge state={r.isDemo ? "synthetic" : r.verificationState} /></td>
                <td className="px-4 py-2.5 text-text-2">{formatDate(r.factsAsOf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
