import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { emailOutbox } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/** Development-only view of emails captured by the outbox transport. Never available in production. */
export default async function Outbox() {
  if (process.env.NODE_ENV === "production" || process.env.EMAIL_TRANSPORT !== "outbox") notFound();
  const rows = await db().select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(30);
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold">Development outbox</h1>
      <p className="mt-2 text-sm text-text-2">Emails are stored here instead of being sent (EMAIL_TRANSPORT=outbox). Not available in production.</p>
      <ul className="mt-6 flex flex-col gap-4">
        {rows.map((m) => (
          <li key={m.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[13px] text-text-3">To {m.toAddress} · {m.createdAt.toISOString()}</p>
            <p className="font-medium">{m.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap text-[13px] text-text-2">{m.textBody.split(/(https?:\/\/\S+)/).map((part, i) => (/^https?:\/\//.test(part) ? <a key={i} href={part} className="text-accent underline">{part}</a> : part))}</pre>
          </li>
        ))}
      </ul>
    </main>
  );
}
