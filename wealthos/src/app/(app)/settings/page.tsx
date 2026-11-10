import { requireApp } from "@/server/auth/context";
import { PageHeader } from "@/components/app/page-header";
import { cookies } from "next/headers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppearanceControl } from "@/components/app/appearance";
import { DEPTH_COOKIE, THEME_COOKIE, isDepth, isTheme } from "@/lib/appearance";
import { SettingsTabs } from "./tabs";
import { PreferencesForm } from "./preferences-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const app = await requireApp();
  const p = app.preferences;
  const jar = await cookies();
  const t = jar.get(THEME_COOKIE)?.value;
  const d = jar.get(DEPTH_COOKIE)?.value;
  const appearance = { theme: isTheme(t) ? t : "dark", depth: isDepth(d) ? d : "night" } as const;
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs current="general" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardContent className="pt-5">
            <PreferencesForm displayName={app.session.user.displayName} baseCurrency={p.baseCurrency} timezone={p.timezone} locale={p.locale} notifyInApp={p.notifications.inApp} notifyEmail={p.notifications.email} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Dark is the default. System follows this device. Changes apply at once and are remembered here.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <AppearanceControl initial={appearance} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
