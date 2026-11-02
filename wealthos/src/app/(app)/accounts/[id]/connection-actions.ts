"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestMeta, requireAppForAction } from "@/server/auth/context";
import { requireFeature } from "@/server/compliance/gate";
import { connectAccount, revokeConnection, syncConnection } from "@/server/connections/service";
import { toActionError, type ActionResult } from "@/server/platform/errors";

type State = ActionResult<string | undefined> | null;

export async function connectAction(_: State, f: FormData): Promise<State> {
  const accountId = String(f.get("accountId"));
  try {
    const app = await requireAppForAction();
    await requireFeature("INSTITUTION_CONNECTIONS", app.org.jurisdiction);
    if (f.get("consent") !== "on") return { ok: false, code: "VALIDATION", message: "Tick the box to give consent before connecting." };
    // A real provider returns a one-time link code from its consent screen; the sandbox accepts a generated one.
    const linkCode = String(f.get("linkCode") || `sbx-${crypto.randomUUID().slice(0, 8)}`);
    await connectAccount(app.ctx, accountId, { provider: f.get("provider"), linkCode, scopes: f.getAll("scopes").map(String), days: f.get("days"), consent: f.get("consent") === "on" }, await requestMeta());
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/accounts/${accountId}`);
  return { ok: true, data: "Connected. Use “Sync now” to fetch transactions for review." };
}

export async function syncAction(_: State, f: FormData): Promise<State> {
  let batchId: string | null = null;
  try {
    const app = await requireAppForAction();
    await requireFeature("INSTITUTION_CONNECTIONS", app.org.jurisdiction);
    batchId = (await syncConnection(app.ctx, String(f.get("connectionId")))).batchId;
  } catch (err) {
    return toActionError(err);
  }
  if (batchId) redirect(`/transactions/import/${batchId}`);
  revalidatePath(`/accounts/${String(f.get("accountId"))}`);
  return { ok: true, data: "Up to date: nothing new to review." };
}

export async function disconnectAction(_: State, f: FormData): Promise<State> {
  try {
    const app = await requireAppForAction();
    await revokeConnection(app.ctx, String(f.get("connectionId")), await requestMeta());
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/accounts/${String(f.get("accountId"))}`);
  return { ok: true, data: "Disconnected. The provider's access was revoked and its credentials deleted." };
}
