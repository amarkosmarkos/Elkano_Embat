import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { cuota, type Cuota } from "@/lib/products/tesoreria";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Pill } from "@/components/ui/Pill";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { fmtMoney, fmtPct, formatCount, monthLabelLong } from "@/lib/format";
import { TREND_LABEL } from "@/lib/score/derived";

export default async function CuotasPage() {
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const all = store.companies.map((c) => cuota(store, c, idx)).filter((x): x is Cuota => !!x);
  const rank = { alta: 0, media: 1, ok: 2 };
  const items = all.filter((c) => c.level !== "ok").sort((a, b) => rank[a.level] - rank[b.level] || a.score - b.score);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Con cuotas este mes" value={formatCount(all.length)} sub={monthLabelLong(month)} />
        <Kpi label="Tensión alta" value={formatCount(all.filter((c) => c.level === "alta").length)} tone="bad" sub="runway < 3 m · servicio > 50 % · caja negativa" />
        <Kpi label="Tensión media" value={formatCount(all.filter((c) => c.level === "media").length)} tone="warn" sub="runway < 6 m · servicio > 25 %" />
        <Kpi label="Cubiertas" value={formatCount(all.filter((c) => c.level === "ok").length)} tone="good" />
      </div>
      <Card title="Alerta de cuotas" sub="Suma lo que viene (cuotas, intereses) y lo compara con la caja prevista. Si el score es alto, el aviso es tranquilo; si es bajo y cayendo, salta meses antes y propone mover caja del grupo o renegociar.">
        <div className="grid grid-cols-[minmax(0,1.5fr)_60px_100px_90px_90px_100px_minmax(0,1.6fr)] gap-3 border-b border-line-soft pb-2 text-[12px] font-medium text-ink-mute">
          <span>Empresa</span><span className="text-right">Score</span><span>Régimen</span><span className="text-right">Servicio</span><span className="text-right">Runway</span><span className="text-right">Caja</span><span>Recomendación</span>
        </div>
        <div className="divide-y divide-line-soft">
          {items.slice(0, 100).map((c) => (
            <div key={c.companyId} className="grid grid-cols-[minmax(0,1.5fr)_60px_100px_90px_90px_100px_minmax(0,1.6fr)] items-center gap-3 py-2.5 text-[12.5px]">
              <div className="flex items-center gap-2"><Pill tone={c.level === "alta" ? "bad" : "warn"}>{c.level}</Pill><CompanyLink id={c.companyId} name={c.name} /></div>
              <span className="num text-right text-ink">{c.score.toFixed(0)}</span>
              <Pill tone={c.trend === "improving" ? "good" : c.trend === "deteriorating" ? "bad" : "neutral"}>{TREND_LABEL[c.trend]}</Pill>
              <span className="num text-right text-ink-dim">{fmtPct(c.debtService)}</span>
              <span className={`num text-right ${c.runway != null && c.runway < 3 ? "text-bad" : "text-ink-dim"}`}>{c.runway == null ? "—" : `${c.runway.toFixed(1)} m`}</span>
              <span className={`num text-right ${(c.cash ?? 0) < 0 ? "text-bad" : "text-ink-dim"}`}>{fmtMoney(c.cash)}</span>
              <span className="text-[12px] text-ink-dim">{c.advice}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
