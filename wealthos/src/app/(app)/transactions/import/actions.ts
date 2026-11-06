"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAppForAction } from "@/server/auth/context";
import { commitImport, discardImport, previewImport, remapImport, rollbackImport, saveMapping } from "@/server/imports/service";
import { IMPORT_FIELDS, LIMITS, type ImportField } from "@/server/imports/csv";
import { AppError, toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

export async function uploadAction(_: FormState, form: FormData): Promise<FormState> {
  let id: string;
  try {
    const app = await requireAppForAction();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "Choose a CSV file to upload.", { fieldErrors: { file: ["Choose a file"] } });
    if (file.size > LIMITS.maxBytes) throw new AppError("VALIDATION", "The file is larger than 2 MB. Split it into smaller files.", { fieldErrors: { file: ["Max 2 MB"] } });
    const mappingId = String(form.get("mappingId") ?? "");
    const dateFormat = String(form.get("dateFormat") ?? "DD/MM/YYYY") as "DD/MM/YYYY";
    id = await previewImport(app.ctx, { accountId: String(form.get("accountId") ?? ""), fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()), dateFormat, ...(mappingId ? { mappingId } : {}) });
  } catch (err) {
    return toActionError(err);
  }
  redirect(`/transactions/import/${id}`);
}

function mappingFromForm(form: FormData) {
  const columns: Partial<Record<ImportField, string>> = {};
  for (const f of Object.keys(IMPORT_FIELDS) as ImportField[]) {
    const v = String(form.get(`col_${f}`) ?? "");
    if (v) columns[f] = v;
  }
  const typeAliases: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("alias_") && typeof v === "string" && v) typeAliases[k.slice(6)] = v;
  }
  return { columns, dateFormat: String(form.get("dateFormat") ?? "DD/MM/YYYY"), typeAliases };
}

export async function remapAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const app = await requireAppForAction();
    await remapImport(app.ctx, String(form.get("batchId")), mappingFromForm(form));
    const name = String(form.get("saveAs") ?? "").trim();
    if (name) await saveMapping(app.ctx, name, mappingFromForm(form));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/transactions/import/${String(form.get("batchId"))}`);
  return { ok: true, data: form.get("saveAs") ? "Preview updated and mapping saved." : "Preview updated." };
}

export async function commitAction(_: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get("batchId"));
  try {
    const app = await requireAppForAction();
    await commitImport(app.ctx, id, { includeDuplicates: form.get("includeDuplicates") === "on" });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect(`/transactions/import/${id}?done=1`);
}

export async function discardAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await discardImport(app.ctx, String(form.get("batchId")));
  redirect("/transactions/import");
}

export async function rollbackAction(_: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get("batchId"));
  try {
    const app = await requireAppForAction();
    await rollbackImport(app.ctx, id, String(form.get("reason") ?? ""));
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect(`/transactions/import/${id}?rolledBack=1`);
}
