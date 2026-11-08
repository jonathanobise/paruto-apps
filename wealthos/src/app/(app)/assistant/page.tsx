import Link from "next/link";
import { PreRelease } from "@/components/app/research";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { AI_LIMITS, getConversation, hasAiConsent, listConversations } from "@/server/ai/assistant";
import { getProvider } from "@/server/ai/provider";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AskForm } from "./forms";
import { consentAction, deleteConversationAction } from "./actions";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Research assistant" };

const SUGGESTIONS = ["What is the difference between a T-bill's discount rate and its true yield?", "Compare the money market funds in the catalogue", "How has my portfolio performed this year?", "If I save ₦100,000 a month for 10 years, what could it grow to at 8% and 14%?"];

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const app = await requireApp();
  const gate = await featureDecision("AI_RESEARCH_ASSISTANT", app.org.jurisdiction);
  if (!gate.available) return (<><PageHeader title="Research assistant" /><Alert tone="info" title="Not available yet">{gate.reason}</Alert></>);
  const { c } = await searchParams;
  const connected = getProvider() !== null;
  const [consent, conversations] = await Promise.all([hasAiConsent(app.session.userId), listConversations(app.ctx)]);
  const current = c && /^[0-9a-f-]{36}$/i.test(c) ? await getConversation(app.ctx, c).catch(() => null) : null;

  return (
    <>
      <PageHeader title="Research assistant" description={`Ask about investment products, financial concepts or your own recorded finances. Answers are grounded in ${BRAND} data and calculations, with sources and dates.`} />
      {gate.status === "pending_review" ? <PreRelease reason={gate.reason} /> : null}
      {!connected ? (
        <Alert tone="info" className="mb-4" title="Not connected">
          This server has no AI provider credentials, so the assistant can&apos;t answer yet. Nothing you type here is sent anywhere. (Operators: set <code>ANTHROPIC_API_KEY</code>; see docs/DEPLOYMENT.md.)
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="flex flex-col gap-3">
          <Button asChild variant="secondary" size="sm"><Link href="/assistant">New conversation</Link></Button>
          {conversations.length ? (
            <nav aria-label="Conversations">
              <ul className="flex flex-col gap-1">
                {conversations.map((x) => (
                  <li key={x.id}>
                    <Link href={`/assistant?c=${x.id}`} className={cn("block truncate rounded-[var(--radius-inner)] px-3 py-2 text-sm", x.id === current?.conversation.id ? "bg-accent-soft text-text" : "text-text-2 hover:bg-surface-2")} aria-current={x.id === current?.conversation.id ? "page" : undefined}>
                      {x.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : <p className="px-1 text-[13px] text-text-3">No conversations yet.</p>}
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader className="flex-wrap">
              <div className="min-w-0">
                <CardTitle>Access to your records</CardTitle>
                <CardDescription>
                  {consent
                    ? "On: the assistant can read your accounts, holdings and transactions to answer questions about them."
                    : "Off: the assistant answers general and catalogue questions only and cannot see your records."}
                </CardDescription>
              </div>
              <form action={consentAction}>
                <input type="hidden" name="granted" value={consent ? "false" : "true"} />
                <Button type="submit" size="sm" variant={consent ? "secondary" : "primary"}>{consent ? "Turn off" : "Allow access"}</Button>
              </form>
            </CardHeader>
            <CardContent>
              <details className="text-[13px] text-text-2">
                <summary className="cursor-pointer text-text">What is shared, and with whom</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Your questions, and the data the assistant looks up to answer them, are sent to Anthropic (a US-based AI provider) to generate the answer. With access off, no account, holding or transaction data is sent.</li>
                  <li>Email addresses, phone numbers and account or card numbers in your questions are masked before sending and storing.</li>
                  <li>{BRAND} keeps your conversations (questions, answers, which lookups ran and the sources cited) so you can return to them; it does not keep the looked-up data. You can delete any conversation, and turning access off takes effect immediately.</li>
                  <li>You can ask up to {AI_LIMITS.messagesPerDay} questions a day.</li>
                </ul>
              </details>
            </CardContent>
          </Card>

          {current ? (
            <section aria-label="Conversation" className="flex flex-col gap-3">
              {current.messages.map((m, i) => (
                <article key={m.id} id={i === current.messages.length - 1 ? "latest" : undefined} className={cn("rounded-[var(--radius-card)] border px-4 py-3", m.role === "user" ? "ml-auto max-w-[85%] border-transparent bg-accent-soft" : "border-border bg-surface")}>
                  <p className="sr-only">{m.role === "user" ? "You asked" : "Assistant"}</p>
                  <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.content}</div>
                  {m.role === "assistant" ? (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-2 text-[12px] text-text-3">
                      {m.sources.length ? (
                        <div>
                          <p className="font-medium text-text-2">Sources</p>
                          <ul className="mt-1 space-y-0.5">
                            {m.sources.map((s) => (
                              <li key={s.id}>
                                {s.url ? <a href={s.url} className="underline" rel="noopener noreferrer" target="_blank">{s.label}</a> : s.label}
                                {s.asOf ? <span> · as of {formatDate(s.asOf)}</span> : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : m.toolCalls.some((t) => t.ok) ? <p>The lookups returned no dated sources.</p> : <p>No {BRAND} data was looked up for this answer; treat it as general explanation.</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {m.toolCalls.map((t, j) => <Badge key={j} tone={t.ok ? "neutral" : "warning"}>{t.name.replace(/_/g, " ")}{t.ok ? "" : " (not run)"}</Badge>)}
                        {m.policyFlags.some((f) => f.startsWith("output:")) ? <Badge tone="warning">Replaced by a safe answer</Badge> : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
              <form action={deleteConversationAction} className="self-end">
                <input type="hidden" name="id" value={current.conversation.id} />
                <Button type="submit" size="sm" variant="ghost">Delete conversation</Button>
              </form>
            </section>
          ) : null}

          <Card>
            <CardContent className="pt-5">
              <AskForm key={current?.conversation.id ?? "new"} conversationId={current?.conversation.id} disabled={!connected} suggestions={current ? [] : SUGGESTIONS} />
            </CardContent>
          </Card>
          <p className="text-[12px] text-text-3">{DISCLOSURES.ai_limits} {DISCLOSURES.not_advice}</p>
        </div>
      </div>
    </>
  );
}
