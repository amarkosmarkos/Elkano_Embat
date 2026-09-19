"use client";

import { useState } from "react";
import type { AlertCard, CompanySummary, Severity } from "@/lib/types";
import { fmtEurShort, fmtInt } from "@/lib/format";
import { useOps, type AlertResolvedOp } from "@/lib/ops";
import { Card, CompanyLink, Delta, Kpi, ScorePill, SeverityBadge, TrendTag } from "@/components/ui";

export type MonitorRow = { c: CompanySummary; severity: Severity; why: string; cards: AlertCard[] };

const GROUPS: { sev: Severity; title: string; hint: string }[] = [
  { sev: "alta", title: "Severidad alta", hint: "alarma activa y score en rojo: llamar hoy" },
  { sev: "media", title: "Severidad media", hint: "alarma activa: revisar esta semana" },
  { sev: "baja", title: "Severidad baja", hint: "empieza a torcerse: vigilar" },
];

/** Lista del monitor: KPIs y tablas por severidad. «Resuelto» oculta la fila y registra la operación; «mostrar resueltos» las vuelve a enseñar. */
export function MonitorList({ rows }: { rows: MonitorRow[] }) {
  const { ops, add, remove } = useOps();
  const [showResolved, setShowResolved] = useState(false);

  const resolvedBy = new Map<string, AlertResolvedOp>();
  for (const o of ops) if (o.kind === "alert_resolved" && !resolvedBy.has(o.company_id)) resolvedBy.set(o.company_id, o);
  const isResolved = (id: string) => resolvedBy.has(id);
  const open = rows.filter((r) => !isResolved(r.c.id));
  const nResolved = rows.length - open.length;
  const nCards = open.reduce((a, r) => a + r.cards.length, 0);

  const resolve = (r: MonitorRow) =>
    add({ kind: "alert_resolved", company_id: r.c.id, alert_title: r.cards[0]?.title ?? r.why });
  const reopen = (id: string) => {
    const o = resolvedBy.get(id);
    if (o) remove(o.id);
  };

  return (
    <>
      <div className="grid grid-cols-5 gap-3">
        <Kpi label="Severidad alta" value={fmtInt(open.filter((r) => r.severity === "alta").length)} accent="text-bad" hint="alarma + rojo" />
        <Kpi label="Severidad media" value={fmtInt(open.filter((r) => r.severity === "media").length)} accent="text-warn" hint="alarma activa" />
        <Kpi label="Severidad baja" value={fmtInt(open.filter((r) => r.severity === "baja").length)} hint="empeorando sin alarma" />
        <Kpi label="Avisos concretos" value={fmtInt(nCards)} hint="cuotas, proveedores, cobros, caja…" />
        <Kpi label="Resueltos" value={fmtInt(nResolved)} accent={nResolved > 0 ? "text-ok" : "text-ink-2"} hint="marcados en esta sesión" />
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 text-[12px]">
        <label className="inline-flex items-center gap-1.5 text-ink-2 cursor-pointer select-none">
          <input type="checkbox" className="accent-navy" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          mostrar resueltos{nResolved > 0 ? ` (${fmtInt(nResolved)})` : ""}
        </label>
      </div>

      <div className="mt-2 space-y-4">
        {GROUPS.map((g) => {
          const rs = rows.filter((r) => r.severity === g.sev && (showResolved || !isResolved(r.c.id)));
          const nOpen = open.filter((r) => r.severity === g.sev).length;
          return (
            <Card key={g.sev} kicker={g.hint} title={`${g.title} · ${fmtInt(nOpen)}`} right={<SeverityBadge severity={g.sev} />}>
              {rs.length === 0 ? (
                <p className="text-[13px] text-ink-2">{nOpen === 0 && rows.some((r) => r.severity === g.sev) ? "Todo resuelto en este nivel." : "Ninguna empresa en este nivel."}</p>
              ) : (
                <table className="tbl w-full">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th className="text-right">Score</th>
                      <th className="text-right">Δ 3 m</th>
                      <th>Tendencia</th>
                      <th>Motivo</th>
                      <th>Avisos del monitor</th>
                      <th className="text-right">Caja</th>
                      <th className="text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rs.map((r) => {
                      const { c, why, cards } = r;
                      const done = isResolved(c.id);
                      return (
                        <tr key={c.id} className={done ? "opacity-50" : ""}>
                          <td><CompanyLink id={c.id} className="font-semibold" /><div className="text-[11px] text-ink-3">{c.group_id ?? "sin grupo"}</div></td>
                          <td className="text-right"><ScorePill score={c.score} tier={c.tier} /></td>
                          <td className="text-right"><Delta value={c.delta3} suffix="" /></td>
                          <td><TrendTag trend={c.trend} /></td>
                          <td className="wrap text-ink-2 max-w-[220px]">{why}<div className="text-[11px] text-ink-3 truncate" title={c.explanation}>{c.explanation}</div></td>
                          <td className="wrap">
                            {cards.length === 0 ? (
                              <span className="text-ink-3">—</span>
                            ) : (
                              <ul className="space-y-0.5">
                                {cards.map((a, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.severity === "alta" ? "bg-bad" : a.severity === "media" ? "bg-warn" : "bg-navy"}`} />
                                    <span className="text-[12px]">{a.title}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className={`text-right num ${c.cash < 0 ? "text-bad" : ""}`}>{fmtEurShort(c.cash)}</td>
                          <td className="text-right">
                            {done ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="rounded border bg-ok text-white border-ok px-2 py-0.5 text-[11px] font-semibold">Resuelto ✓</span>
                                <button type="button" onClick={() => reopen(c.id)} className="text-[11px] text-navy hover:underline">Reabrir</button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => resolve(r)}
                                className="rounded border border-navy text-navy hover:bg-navy hover:text-white px-2 py-0.5 text-[11px] font-semibold transition-colors"
                              >
                                Resuelto
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
