import { requireApp } from "@/server/auth/context";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsTabs } from "./tabs";
import { PreferencesForm } from "./preferences-form";

export const metadata = { title: "Settings · WealthOS" };

export default async function SettingsPage() {
  const app = await requireApp();
  const p = app.preferences;
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs current="general" />
      <Card className="max-w-3xl">
        <CardContent className="pt-5">
          <PreferencesForm displayName={app.session.user.displayName} baseCurrency={p.baseCurrency} timezone={p.timezone} locale={p.locale} theme={p.theme} notifyInApp={p.notifications.inApp} notifyEmail={p.notifications.email} />
        </CardContent>
      </Card>
    </>
  );
}
