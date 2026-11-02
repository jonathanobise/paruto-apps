import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApp } from "@/server/auth/context";
import { featureDecision } from "@/server/compliance/gate";
import { DISCLOSURES } from "@/server/compliance/features";
import { ARTICLES, getArticle } from "@/content/learn";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle((await params).slug);
  return { title: a ? `${a.title} · WealthOS` : "Learn · WealthOS" };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const app = await requireApp();
  const gate = await featureDecision("EDUCATION", app.org.jurisdiction);
  if (!gate.available) return <Alert tone="info" title="Not available yet">{gate.reason}</Alert>;
  const a = getArticle((await params).slug);
  if (!a) notFound();
  return (
    <article className="mx-auto max-w-[68ch]">
      <p className="text-[13px]"><Link href="/learn" className="text-text-3 hover:text-text">← Learn</Link></p>
      <h1 className="font-display mt-3 text-[30px] leading-tight font-semibold text-text">{a.title}</h1>
      <p className="mt-2 text-[15px] text-text-2">{a.summary}</p>
      <p className="mt-2 text-[12px] text-text-3">{a.minutes} min read · reviewed {formatDate(a.reviewedOn)}</p>
      <div className="mt-6 flex flex-col gap-4 text-[15px] leading-relaxed text-text">
        {a.body.map((b, i) => {
          switch (b.kind) {
            case "p":
              return <p key={i}>{b.text}</p>;
            case "h":
              return <h2 key={i} className="mt-3 text-[18px] font-semibold">{b.text}</h2>;
            case "list":
              return <ul key={i} className="list-disc space-y-1.5 pl-5">{b.items.map((x, j) => <li key={j}>{x}</li>)}</ul>;
            case "formula":
              return (
                <figure key={i} className="rounded-lg bg-surface-2 px-4 py-3">
                  <code className="num text-[14px]">{b.text}</code>
                  {b.caption ? <figcaption className="mt-1 text-[12px] text-text-3">{b.caption}</figcaption> : null}
                </figure>
              );
            case "example":
              return (
                <figure key={i} className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3">
                  <figcaption className="text-[13px] font-medium text-text-2">Worked example: {b.title}</figcaption>
                  <table className="mt-2 w-full text-[14px]">
                    <tbody>
                      {b.rows.map(([k, v]) => (
                        <tr key={k} className="border-t border-border first:border-0">
                          <th scope="row" className="py-1.5 pr-3 text-left font-normal text-text-2">{k}</th>
                          <td className="num py-1.5 text-right whitespace-nowrap">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {b.note ? <p className="mt-2 text-[12px] text-text-3">{b.note}</p> : null}
                </figure>
              );
          }
        })}
      </div>
      {a.related.length ? (
        <nav aria-label="Related" className="mt-8 border-t border-border pt-4">
          <p className="text-[13px] font-medium text-text-2">Related</p>
          <ul className="mt-2 space-y-1 text-[14px]">
            {a.related.map((s) => {
              const r = getArticle(s)!;
              return <li key={s}><Link href={`/learn/${s}`} className="text-accent hover:underline">{r.title}</Link></li>;
            })}
          </ul>
        </nav>
      ) : null}
      <p className="mt-8 text-[12px] text-text-3">General education, not personal advice. {DISCLOSURES.not_advice}</p>
    </article>
  );
}
