import { Download } from "lucide-react";
import { requireApp } from "@/server/auth/context";
import { currentConsents } from "@/server/identity/preferences";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsTabs } from "../tabs";
import { EraseForm } from "./erase-form";
import { marketingConsentAction } from "../actions";
import { formatDate } from "@/lib/format";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Privacy & data" };

const LABELS: Record<string, string> = { terms: "Terms of Use", privacy: "Privacy Notice", marketing_email: "Product news by email" };

export default async function PrivacyPage() {
  const app = await requireApp();
  const consents = await currentConsents(app.session.userId);
  const marketing = consents.marketing_email?.granted ?? false;
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs current="privacy" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Your data</CardTitle><CardDescription>Download everything {BRAND} holds about you, in a documented JSON format.</CardDescription></div></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="secondary"><a href="/api/export/account"><Download aria-hidden /> Download all data (JSON)</a></Button>
            <Button asChild variant="ghost"><a href="/api/export/transactions.csv">Transactions (CSV)</a></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Consents</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-[13px]">
              {Object.entries(LABELS).map(([k, label]) => (
                <li key={k} className="flex items-center justify-between gap-3 py-2.5">
                  <span>{label}<span className="block text-text-3">{consents[k] ? `${consents[k]!.granted ? "Given" : "Declined"} · v${consents[k]!.version} · ${formatDate(consents[k]!.recordedAt.toISOString())}` : "Not recorded"}</span></span>
                  {k === "marketing_email" ? (
                    <form action={marketingConsentAction}>
                      <input type="hidden" name="granted" value={String(!marketing)} />
                      <Button size="sm" variant="secondary">{marketing ? "Withdraw" : "Opt in"}</Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Delete account</CardTitle></CardHeader>
          <CardContent><EraseForm /></CardContent>
        </Card>
      </div>
    </>
  );
}
