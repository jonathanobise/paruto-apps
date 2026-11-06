"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestMeta, requireAppForAction } from "@/server/auth/context";
import { requireFeature } from "@/server/compliance/gate";
import { askAssistant, deleteConversation, setAiConsent } from "@/server/ai/assistant";
import { getProvider } from "@/server/ai/provider";
import { AppError, toActionError, type ActionResult } from "@/server/platform/errors";

export type FormState = ActionResult<string | undefined> | null;

export async function askAction(_: FormState, form: FormData): Promise<FormState> {
  let conversationId: string;
  try {
    const app = await requireAppForAction();
    await requireFeature("AI_RESEARCH_ASSISTANT", app.org.jurisdiction);
    const provider = getProvider();
    if (!provider) throw new AppError("FEATURE_UNAVAILABLE", "The assistant isn't connected to an AI provider on this server.");
    const r = await askAssistant(app.ctx, { conversationId: String(form.get("conversationId") ?? "") || null, message: String(form.get("message") ?? ""), baseCurrency: app.baseCurrency }, provider);
    conversationId = r.conversationId;
  } catch (err) {
    if (!(err instanceof AppError)) {
      console.error("[wealthos] assistant error", err);
      return { ok: false, code: "FEATURE_UNAVAILABLE", message: "The assistant couldn't answer just now. Please try again in a minute." };
    }
    return toActionError(err);
  }
  revalidatePath("/assistant");
  redirect(`/assistant?c=${conversationId}#latest`);
}

export async function consentAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await setAiConsent(app.session.userId, form.get("granted") === "true", await requestMeta());
  revalidatePath("/assistant");
}

export async function deleteConversationAction(form: FormData): Promise<void> {
  const app = await requireAppForAction();
  await deleteConversation(app.ctx, String(form.get("id")));
  redirect("/assistant");
}
