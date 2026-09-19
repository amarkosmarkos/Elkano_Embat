import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { getBundle, metricRows } from "@/lib/data/company";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import { Delta, Pill } from "@/components/ui/Pill";
import { DIMENSIONS } from "@/lib/score/types";
import { DIM_LABEL, DIM_QUESTION, METRICS, METRICS_BY_DIM } from "@/lib/score/meta";
import { DIM_COLOR } from "@/lib/score/colors";
import { fmtMetric, monthLabelLong } from "@/lib/format";

export default async function MetricasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const b = await getBundle(id, idx);
  if (!b) notFound();
  const rows = new Map(metricRows(b).map((r) => [r.id, r]));
  const comps = b.c.components;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-ink-dim">Las 24 métricas en {monthLabelLong(month)}, con su trayectoria (Δ a 3 y 12 meses y racha de meses empeorando) recalculada sobre la serie de 24 meses del pipeline. El Gini es el poder predictivo univariante medido a 6 meses; la cobertura, qué parte de la red tiene el dato.</p>
      {DIMENSIONS.map((dim) => {
        const cv = comps[dim][idx];
        return (
          <Card key={dim} title={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: DIM_COLOR[dim] }} />{DIM_LABEL[dim]} · {DIM_QUESTION[dim]}</span>} right={<Pill mono tone={cv == null ? "neutral" : cv >= 0 ? "good" : "bad"}>{cv == null ? "n/d" : `${cv >= 0 ? "+" : "−"}${Math.abs(cv).toFixed(1)} pts`}</Pill>}>
            <div className="grid grid-cols-[60px_minmax(0,1.6fr)_140px_90px_80px_80px_56px_70px] gap-3 border-b border-line-soft pb-2 text-[12px] font-medium text-ink-mute">
              <span>Id</span><span>Métrica</span><span>24 meses</span><span className="text-right">Valor</span><span className="text-right">Δ 3m</span><span className="text-right">Δ 12m</span><span className="text-right">Racha</span><span className="text-right">Gini</span>
            </div>
            <div className="divide-y divide-line-soft">
              {METRICS_BY_DIM[dim].map((mid) => {
                const r = rows.get(mid)!;
                const m = METRICS[mid];
                const dg = m.unit === "pct" || m.unit === "x" || m.unit === "ratio" || m.unit === "index" ? 2 : 0;
                return (
                  <div key={mid} className="grid grid-cols-[60px_minmax(0,1.6fr)_140px_90px_80px_80px_56px_70px] items-center gap-3 py-2.5 text-[12.5px]">
                    <span className="num text-[11px] text-accent">{m.code}</span>
                    <div className="min-w-0">
                      <div className="text-ink">{m.label} <span className="text-[10px] text-ink-mute">· {m.higherIsBetter ? "más = mejor" : "menos = mejor"}</span></div>
                      <div className="mt-0.5 truncate text-[11px] text-ink-mute" title={m.formula}>{r.value == null ? `n/d — ${m.needs}` : m.desc}</div>
                    </div>
                    <Sparkline values={r.series} width={140} height={26} color={m.higherIsBetter ? "#10b981" : "#f59e0b"} marker={b.mi >= 0 ? b.mi : undefined} />
                    <span className="num text-right text-[14px] text-ink">{fmtMetric(mid, r.value)}</span>
                    <span className="text-right text-[12px]"><Delta v={r.delta3} digits={dg} /></span>
                    <span className="text-right text-[12px]"><Delta v={r.delta12} digits={dg} /></span>
                    <span className={`num text-right ${r.streak >= 3 ? "text-bad" : r.streak > 0 ? "text-warn" : "text-ink-mute"}`}>{r.streak}</span>
                    <span className="num text-right text-[11.5px] text-ink-dim" title={r.coverage == null ? "" : `cobertura ${Math.round(r.coverage * 100)} %`}>{r.gini == null ? "—" : Math.abs(r.gini).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
