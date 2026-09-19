"use client";

import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Pill } from "@/components/ui/Pill";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { useOps } from "@/lib/ops";
import type { Excedente } from "@/lib/products/tesoreria";
import { eur, fmtMoney, formatCount, monthLabelLong } from "@/lib/format";
import { TREND_LABEL } from "@/lib/score/derived";

export default function ExcedentesList({ items, month }: { items: Excedente[]; month: string }) {
  const { ops, add } = useOps();
  const total = items.reduce((s, e) => s + e.amount, 0);
  const floor = items.reduce((s, e) => s + e.floor12, 0);
  const done = (id: string) => ops.some((o) => o.id === id);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Empresas con propuesta" value={formatCount(items.length)} sub={monthLabelLong(month)} />
        <Kpi label="Suelo de caja de 12 meses" value={fmtMoney(floor)} sub="lo que nunca ha bajado" />
        <Kpi label="Colocable hoy" value={fmtMoney(total)} tone="accent" sub="según el score y su dirección" />
        <Kpi label="Rendimiento al 2,5 %" value={fmtMoney(total * 0.025)} tone="good" sub="al año, que hoy nadie gana" />
      </div>
      <Card title="Propuestas de colocación" sub="Importe = suelo de 12 meses × factor (Prime 80 % · Sana 60 % · ≥ 55 35 %; ×0,5 si cae o tiene alarma). Plazo: 12 m si mejora, 3 m si cae, 6 m si estable.">
        <div className="grid grid-cols-[minmax(0,1.6fr)_60px_100px_110px_110px_70px_110px_130px] gap-3 border-b border-line-soft pb-2 text-[12px] font-medium text-ink-mute">
          <span>Empresa</span><span className="text-right">Score</span><span>Régimen</span><span className="text-right">Suelo 12 m</span><span className="text-right">Propuesta</span><span className="text-right">Plazo</span><span className="text-right">Rend./año</span><span />
        </div>
        <div className="divide-y divide-line-soft">
          {items.slice(0, 80).map((e) => {
            const id = `colocacion-${e.companyId}-${month}`;
            return (
              <div key={e.companyId} className="grid grid-cols-[minmax(0,1.6fr)_60px_100px_110px_110px_70px_110px_130px] items-center gap-3 py-2.5 text-[12.5px]">
                <div className="min-w-0"><CompanyLink id={e.companyId} name={e.name} /><div className="truncate text-[10.5px] text-ink-mute" title={e.reason}>{e.product} · {e.reason}</div></div>
                <span className="num text-right text-ink">{e.score.toFixed(0)}</span>
                <Pill tone={e.trend === "improving" ? "good" : e.trend === "deteriorating" ? "bad" : "neutral"}>{TREND_LABEL[e.trend]}</Pill>
                <span className="num text-right text-ink-dim">{fmtMoney(e.floor12)}</span>
                <span className="num text-right text-[14px] text-ink">{fmtMoney(e.amount)}</span>
                <span className="num text-right text-ink-dim">{e.months} m</span>
                <span className="num text-right text-good">{eur(e.yieldYear)}</span>
                <button type="button" disabled={done(id)} onClick={() => add({ id, kind: "colocacion", companyId: e.companyId, company: e.name, amount: e.amount, months: e.months, rate: 2.5, yieldYear: e.yieldYear, product: e.product })} className="rounded-lg border border-accent/40 px-3 py-1 text-[11.5px] text-accent hover:bg-accent/10 disabled:border-line disabled:text-ink-mute">{done(id) ? "Ejecutada" : "Aprobar"}</button>
              </div>
            );
          })}
        </div>
        {items.length > 80 && <p className="mt-3 text-[11.5px] text-ink-mute">Mostrando las 80 mayores de {items.length}.</p>}
      </Card>
    </div>
  );
}
