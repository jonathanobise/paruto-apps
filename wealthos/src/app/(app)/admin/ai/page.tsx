import { requireStaffPage } from "@/server/auth/context";
import { aiUsage } from "@/server/admin/console";
import { AI_LIMITS } from "@/server/ai/assistant";
import { getProvider } from "@/server/ai/provider";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "AI usage · Admin" };

export default async function AdminAi() {
  const app = await requireStaffPage(["compliance"]);
  const r = await aiUsage({ userId: app.session.userId });
  const connected = getProvider() !== null;
  return (
    <>
      <PageHeader title="AI usage" description="Metering and flagged turns. Conversation content stays private to each user and is never shown here." />
      {!connected ? <Alert tone="info" className="mb-6" title="Not connected">No AI provider key is configured, so no requests go to a model.</Alert> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>This month by organisation</CardTitle><CardDescription>Budget {AI_LIMITS.orgTokensPerMonth.toLocaleString("en-NG")} tokens per organisation; plan limits on questions apply too.</CardDescription></div></CardHeader>
          <CardContent>{r.usage.length ? <table className="w-full text-[13px]"><thead className="text-left text-text-3"><tr><th className="py-1.5 font-normal">Organisation</th><th className="text-right font-normal">Questions</th><th className="text-right font-normal">Tokens</th><th className="text-right font-normal">Users</th><th className="text-right font-normal">Flagged</th></tr></thead><tbody>{r.usage.map((u) => <tr key={u.org_id} className="border-t border-border"><td className="py-1.5">{u.org_name}</td><td className="num text-right">{u.questions}</td><td className="num text-right">{Number(u.tokens).toLocaleString("en-NG")}</td><td className="num text-right">{u.users}</td><td className="num text-right">{u.flagged_conversations}</td></tr>)}</tbody></table> : <p className="text-sm text-text-3">No usage this month.</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Flagged answers</CardTitle><CardDescription>Answers replaced by the safe answer, model refusals and runaway tool loops: policy flags and tools only.</CardDescription></div></CardHeader>
          <CardContent>{r.flags.length ? <ul className="text-[12.5px]">{r.flags.map((f, i) => <li key={i} className="border-t border-border py-1.5 first:border-0"><span className="font-medium">{f.org_name}</span> · {String(f.flagged_at).slice(0, 16).replace("T", " ")}<span className="mt-0.5 flex flex-wrap gap-1">{f.policy_flags.map((p) => <Badge key={p} tone="warning">{p.slice(0, 40)}</Badge>)}{f.tools.map((t, j) => <Badge key={j}>{t}</Badge>)}</span></li>)}</ul> : <p className="text-sm text-text-3">Nothing flagged.</p>}</CardContent>
        </Card>
      </div>
    </>
  );
}
