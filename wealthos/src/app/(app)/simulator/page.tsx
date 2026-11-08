import { requireApp } from "@/server/auth/context";
import { PreRelease } from "@/components/app/research";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Simulator } from "./simulator";

export const metadata = { title: "Simulator" };

export default async function SimulatorPage() {
  const app = await requireApp();
  const gate = await featureDecision("GOAL_PROJECTIONS", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Simulator" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  return (
    <>
      <PageHeader title="Scenario simulator" description="Try 'what if' numbers. Three return scenarios run side by side so no single figure stands alone. Nothing here is saved." />
      {gate.status === "pending_review" ? <PreRelease reason={gate.reason} /> : null}
      <Card><CardContent className="pt-5"><Simulator currency={app.baseCurrency} /></CardContent></Card>
      <p className="mt-4 text-[12px] text-text-3">{DISCLOSURES.hypothetical} {DISCLOSURES.not_advice}</p>
    </>
  );
}
