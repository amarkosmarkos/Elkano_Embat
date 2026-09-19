"use client";

import Link from "next/link";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { Card, Empty } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Btn } from "./ui";
import { fmtMoney, monthLabel } from "@/lib/format";

const pct = (v: number) => `${(v * 100).toFixed(2).replace(".", ",")} %`;

/** Operaciones cerradas: la lista y el acceso a la monitorización de cada una. */
export default function DealsList() {
  const { deals, effectiveOf, removeDeal, setActiveDeal, network } = useMarketplace();
  const total = deals.reduce((s, d) => s + d.result.economics.amount, 0);
  const net = deals.reduce((s, d) => s + d.result.economics.lenderNet, 0);
  const fee = deals.reduce((s, d) => s + d.result.economics.embatFee, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[["Operaciones cerradas", String(deals.length)], ["Capital prestado", fmtMoney(total)], ["Rendimiento neto esperado", fmtMoney(net)], ["Comisiones de Embat", fmtMoney(fee)]].map(([l, v]) => <div key={l} className="card px-5 py-4"><div className="text-[13px] text-ink-mute">{l}</div><div className="num mt-1 text-[22px] font-semibold text-ink">{v}</div></div>)}
      </div>
      <Card title="Operaciones" sub="cada operación se vigila por separado; entra en su monitor para ver riesgo y beneficio recalculados con los scores de cada mes">
        {deals.length === 0 ? <Empty>Todavía no hay operaciones cerradas. Completa el flujo (prestamista → receptores → estructurar → economía) y cierra la primera.</Empty> : (
          <div className="divide-y divide-line-soft">
            {deals.map((d) => {
              const eff = effectiveOf(d);
              const e0 = d.result.economics, e1 = eff.economics;
              const lastMonth = network?.months[network.months.length - 1];
              return (
                <div key={d.id} className="grid grid-cols-1 items-center gap-3 py-3 md:grid-cols-[minmax(0,1.4fr)_110px_100px_100px_100px_auto]">
                  <div className="min-w-0"><div className="truncate text-[14px] font-semibold text-ink">{d.lenderName} → {d.result.positions.length} receptoras</div><div className="num text-[12px] text-ink-mute">{d.id} · cerrada {new Date(d.closedAt).toLocaleDateString("es-ES")} · asignación {monthLabel(d.result.config.asOf)} · {d.result.config.term} m · {d.result.config.risk}</div></div>
                  <div><div className="text-[11px] text-ink-mute">Capital</div><div className="num text-[14px] font-medium text-ink">{fmtMoney(e0.amount)}</div></div>
                  <div><div className="text-[11px] text-ink-mute">Neto esperado</div><div className="num text-[14px] font-medium text-good">{fmtMoney(e0.lenderNet)}</div></div>
                  <div><div className="text-[11px] text-ink-mute">Rendimiento</div><div className="num text-[14px] font-medium text-ink">{pct(e0.netYield)}</div></div>
                  <div><div className="text-[11px] text-ink-mute">Acciones</div><div className="flex items-center gap-1.5">{d.executed.length > 0 ? <Pill tone="warn">{d.executed.length}</Pill> : <Pill>0</Pill>}{Math.abs(e1.amount - e0.amount) > 1 && <span className="num text-[11px] text-ink-mute">{fmtMoney(e1.amount)}</span>}</div></div>
                  <div className="flex items-center gap-2"><Link href={`/productos/marketplace/monitor?deal=${d.id}`} onClick={() => setActiveDeal(d.id)} className="rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-panel hover:bg-ink/90">Monitorizar{lastMonth ? ` · ${monthLabel(d.monitorMonth ?? d.result.config.asOf)}` : ""}</Link><Btn size="sm" variant="ghost" onClick={() => removeDeal(d.id)}>Eliminar</Btn></div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
