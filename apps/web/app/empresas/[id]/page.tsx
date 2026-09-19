import { notFound } from "next/navigation";
import { getCompany, getExplanation, getGroupLatestScores, getLastScore, getRecentAlerts, getScoreSeries } from "@/lib/queries";
import { recommend } from "@/lib/recommend";
import { ScoreNumber, band } from "@/components/ScoreBadge";
import ScoreLine from "@/components/charts/ScoreLine";
import { RecommendationCard } from "@/components/ProductCard";
import { monthLabel } from "@/lib/format";

const BORDER = { good: "border-good", warn: "border-warn", bad: "border-bad" } as const;

export default async function EmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const co = await getCompany(id);
  if (!co) notFound();

  const [series, last, alerts] = await Promise.all([getScoreSeries(id), getLastScore(id), getRecentAlerts(id, 4)]);
  const explanation = last ? await getExplanation(id, last.month) : null;
  const siblings = co.groupId ? await getGroupLatestScores(co.groupId, id) : [];

  const recos = recommend({
    score: last?.score ?? null,
    regime: last?.regime ?? null,
    cashPosition: last?.cashPosition ?? null,
    cDeuda: last?.cDeuda ?? null,
    recentAlerts: alerts.map((a) => ({ severity: a.severity, title: a.title })),
    groupSiblings: siblings.map((s) => ({ companyId: s.companyId, score: s.score, cashPosition: s.cashPosition })),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="font-mono text-[12px] tracking-wide text-ink-mute">{co.groupId ?? ""}</div>
          <h1 className="mt-1 font-mono text-4xl font-bold tracking-tight text-ink">{co.companyId}</h1>
          {explanation && <p className="mt-3 max-w-xl text-ink-dim">{explanation.text}</p>}
        </div>
        <div className={`rounded-2xl border px-5 py-3 text-right shadow-sm ${last ? BORDER[band(last.score)] : "border-line"}`}>
          <ScoreNumber score={last?.score ?? null} />
          <div className="font-mono text-[10px] text-ink-mute">/ 100 · {last ? monthLabel(last.month) : "—"}</div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
          <div className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Evolución del score</div>
          <ScoreLine series={series.map((s) => ({ month: s.month, score: s.score }))} />
        </div>

        <div className="flex flex-col gap-4">
          {alerts.length > 0 && (
            <div className="rounded-2xl border border-line-soft bg-panel-2 p-5">
              <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Alertas recientes</div>
              <div className="flex flex-col gap-2">
                {alerts.map((a) => (
                  <div key={a.key} className="text-xs">
                    <span className={a.severity === "high" ? "text-bad" : "text-ink-dim"}>{a.month} · {a.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {recos.length > 0 && (
        <section className="mt-14">
          <div className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Producto</div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Qué le recomendaría el sistema</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {recos.map((r) => (
              <RecommendationCard key={r.product} r={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
