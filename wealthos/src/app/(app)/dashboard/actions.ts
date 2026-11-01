"use server";

import { redirect } from "next/navigation";
import { requireAppForAction } from "@/server/auth/context";
import { createDemoPortfolio } from "@/server/demo/service";
import { setActiveOrg } from "@/server/identity/sessions";

export async function createDemoAction(): Promise<void> {
  const app = await requireAppForAction();
  if (app.orgs.some((o) => o.isDemo)) redirect("/dashboard");
  const orgId = await createDemoPortfolio(app.session.userId);
  await setActiveOrg(app.session.id, orgId);
  redirect("/dashboard");
}
