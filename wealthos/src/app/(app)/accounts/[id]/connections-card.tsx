import { featureDecision } from "@/server/compliance/gate";
import { PreRelease } from "@/components/app/research";
import { CONNECTABLE_TYPES, SCOPE_LABELS, listAvailableProviders, listConnections } from "@/server/connections/service";
import type { TenantContext } from "@/server/db/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AdminForm } from "@/components/app/admin-form";
import { formatDate } from "@/lib/format";
import { connectAction, disconnectAction, syncAction } from "./connection-actions";
import { BRAND } from "@/lib/brand";

const day = (x: Date | null) => (x ? formatDate(x.toISOString().slice(0, 10)) : "never");

/** Read-only bank connection for an account (consented, reviewed before import). */
export async function ConnectionsCard({ ctx, jurisdiction, account, canWrite }: { ctx: TenantContext; jurisdiction: string; account: { id: string; type: string; status: string }; canWrite: boolean }) {
  if (!CONNECTABLE_TYPES.has(account.type)) return null;
  const gate = await featureDecision("INSTITUTION_CONNECTIONS", jurisdiction);
  if (!gate.available) return null;
  const [connections, providers] = await Promise.all([listConnections(ctx, account.id), Promise.resolve(listAvailableProviders())]);
  const live = connections.find((c) => c.status === "active" || c.status === "error");
  return (
    <Card className="mt-6">
      <CardHeader><div><CardTitle>Bank connection</CardTitle><CardDescription>Read-only. New transactions arrive as an import preview you review; nothing reaches your records until you import it.</CardDescription></div></CardHeader>
      <CardContent className="flex flex-col gap-4 text-[13px]">
        {gate.status === "pending_review" ? <PreRelease reason={gate.reason} /> : null}
        {live ? (
          <div className="flex flex-col gap-3">
            <p><span className="font-medium">{live.institutionName}</span> {providers.find((p) => p.key === live.provider)?.sandbox ? <Badge tone="demo">Test data</Badge> : null} {live.status === "error" ? <Badge tone="warning">Last sync failed</Badge> : null}</p>
            <p className="text-text-2">Access: {live.scopes.map((s) => SCOPE_LABELS[s as keyof typeof SCOPE_LABELS] ?? s).join(", ")} · consent until {day(live.consentExpiresAt)} · last synced {day(live.lastSyncAt)}{live.lastSyncResult ? ` (${live.lastSyncResult})` : ""}</p>
            {canWrite ? (
              <div className="flex flex-wrap gap-3">
                <AdminForm action={syncAction} submit="Sync now"><input type="hidden" name="connectionId" value={live.id} /><input type="hidden" name="accountId" value={account.id} /></AdminForm>
                <AdminForm action={disconnectAction} submit="Disconnect" variant="secondary"><input type="hidden" name="connectionId" value={live.id} /><input type="hidden" name="accountId" value={account.id} /></AdminForm>
              </div>
            ) : null}
          </div>
        ) : !providers.length ? (
          <Alert tone="info" title="Not connected">No authorised data provider is connected to {BRAND} yet, so accounts can&apos;t be linked. Keep importing statements as CSV.</Alert>
        ) : canWrite && account.status === "open" ? (
          <AdminForm action={connectAction} submit="Give consent and connect">
            <input type="hidden" name="accountId" value={account.id} />
            <label className="flex flex-col gap-1">Provider
              <select name="provider" className="h-9 rounded-[var(--radius-inner)] border border-border bg-surface px-2">{providers.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</select>
            </label>
            <fieldset className="flex flex-col gap-1"><legend className="mb-1">What {BRAND} may read</legend>
              {Object.entries(SCOPE_LABELS).map(([k, v]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" name="scopes" value={k} defaultChecked /> {v}</label>)}
            </fieldset>
            <label className="flex flex-col gap-1">For how long
              <select name="days" defaultValue="90" className="h-9 max-w-40 rounded-[var(--radius-inner)] border border-border bg-surface px-2"><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select>
            </label>
            <ul className="list-disc space-y-1 pl-5 text-text-2">
              <li>Access is read-only: {BRAND} can&apos;t move money or see your bank password.</li>
              <li>The provider&apos;s access token is stored encrypted and deleted when you disconnect or consent ends.</li>
              <li>You can disconnect at any time here.</li>
            </ul>
            <label className="flex items-start gap-2"><input type="checkbox" name="consent" className="mt-0.5" /> <span>I consent to {BRAND} reading the information above from this account through the selected provider for the period chosen.</span></label>
          </AdminForm>
        ) : null}
        {connections.filter((c) => c !== live).length ? <p className="text-[12px] text-text-3">Earlier connections: {connections.filter((c) => c !== live).map((c) => `${c.institutionName} (${c.status}, ${day(c.consentGrantedAt)})`).join("; ")}</p> : null}
      </CardContent>
    </Card>
  );
}
