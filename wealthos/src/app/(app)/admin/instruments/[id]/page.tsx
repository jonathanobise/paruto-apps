import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/server/auth/context";
import { getCatalogueInstrument } from "@/server/admin/catalogue";
import { AppError } from "@/server/platform/errors";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ASSET_CLASSES, ASSET_CLASS_LABELS } from "@/engine";
import { InstrumentForm } from "./form";

export default async function AdminInstrument({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const app = await requireAdminPage();
  const { id } = await params;
  const sp = await searchParams;
  let row: Awaited<ReturnType<typeof getCatalogueInstrument>> | null = null;
  if (id !== "new") {
    try {
      row = await getCatalogueInstrument({ userId: app.session.userId }, id);
    } catch (err) {
      if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
      throw err;
    }
  }
  if (row?.isDemo) notFound();
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/instruments" className="hover:text-text">← Catalogue</Link>} title={row ? row.name : "Add instrument"} />
      {sp.saved ? <Alert tone="success" className="mb-4">Saved and logged.</Alert> : null}
      <Card><CardContent className="pt-5">
        <InstrumentForm id={row?.id ?? null} v={row ? { ...row, verifiedAt: null, createdAt: null, updatedAt: null, facts: null } as unknown as Record<string, string> : {}} facts={(row?.facts ?? {}) as Record<string, unknown>} classes={ASSET_CLASSES.map((c) => [c, ASSET_CLASS_LABELS[c]])} />
      </CardContent></Card>
    </>
  );
}
