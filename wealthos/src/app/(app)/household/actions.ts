"use server";

import { revalidatePath } from "next/cache";
import { requireAppForAction } from "@/server/auth/context";
import { requireFeature } from "@/server/compliance/gate";
import { setAccountOwners } from "@/server/household/service";
import { toActionError, type ActionResult } from "@/server/platform/errors";

type State = ActionResult<string | undefined> | null;

export async function ownersAction(_: State, f: FormData): Promise<State> {
  try {
    const app = await requireAppForAction();
    await requireFeature("HOUSEHOLD_PLANNING", app.org.jurisdiction);
    const shares = f.getAll("userId").map((u, i) => ({ userId: String(u), percent: String(f.getAll("percent")[i] ?? "").trim() || "0" }));
    await setAccountOwners(app.ctx, String(f.get("accountId")), shares);
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/household");
  return { ok: true, data: "Saved." };
}
