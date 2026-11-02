"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/server/auth/context";
import { commitMarketImport, createSource, discardMarketImport, previewMarketImport, saveCatalogueInstrument, type MarketImportKind } from "@/server/admin/catalogue";
import { LIMITS } from "@/server/imports/csv";
import { AppError, toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

export async function createSourceAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAdminForAction();
    await createSource({ userId: app.session.userId }, Object.fromEntries(form.entries()));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/admin/sources");
  return { ok: true, data: "Source added." };
}

export async function saveInstrumentAction(_: FormState, form: FormData): Promise<FormState> {
  let id: string;
  try {
    const app = await requireAdminForAction();
    const existing = String(form.get("id") ?? "");
    const risks = String(form.get("riskFactors") ?? "").split("\n").map((r) => r.trim()).filter(Boolean);
    const facts = {
      summary: form.get("summary"), objective: form.get("objective"), ongoingChargePct: form.get("ongoingChargePct"), entryFeePct: form.get("entryFeePct"), exitFeePct: form.get("exitFeePct"), otherFees: form.get("otherFees"),
      minimumInvestment: form.get("minimumInvestment"), minimumInvestmentCurrency: form.get("minimumInvestmentCurrency"), liquidity: form.get("liquidity"), distributionPolicy: form.get("distributionPolicy"), benchmark: form.get("benchmark"),
      domicile: form.get("domicile"), listingVenue: form.get("listingVenue"), taxNotes: form.get("taxNotes"), riskFactors: risks,
    };
    id = await saveCatalogueInstrument({ userId: app.session.userId }, existing || null, {
      name: form.get("name"), symbol: form.get("symbol"), issuer: form.get("issuer"), assetClass: form.get("assetClass"), country: form.get("country"), region: form.get("region"), currency: form.get("currency"),
      pricingModel: form.get("pricingModel"), staleAfterDays: form.get("staleAfterDays"), maturityDate: form.get("maturityDate"), officialUrl: form.get("officialUrl"), isin: form.get("isin"),
      facts: Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, typeof v === "string" ? v : v ?? undefined])), factsSourceUrl: form.get("factsSourceUrl"), factsAsOf: form.get("factsAsOf"), verify: form.get("verify") === "on",
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/admin/instruments");
  redirect(`/admin/instruments/${id}?saved=1`);
}

export async function uploadMarketDataAction(_: FormState, form: FormData): Promise<FormState> {
  let id: string;
  try {
    const app = await requireAdminForAction();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "Choose a CSV file.");
    if (file.size > LIMITS.maxBytes) throw new AppError("VALIDATION", "The file is larger than 2 MB.");
    id = await previewMarketImport({ userId: app.session.userId }, { kind: String(form.get("kind")) as MarketImportKind, sourceId: String(form.get("sourceId")), fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()), dateFormat: String(form.get("dateFormat") ?? "auto") as "auto" });
  } catch (err) {
    return toActionError(err);
  }
  redirect(`/admin/imports/${id}`);
}

export async function commitMarketDataAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAdminForAction();
    await commitMarketImport({ userId: app.session.userId }, String(form.get("id")));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/admin/imports");
  redirect(`/admin/imports/${String(form.get("id"))}`);
}

export async function discardMarketDataAction(form: FormData): Promise<void> {
  const app = await requireAdminForAction();
  await discardMarketImport({ userId: app.session.userId }, String(form.get("id")));
  redirect("/admin/imports");
}
