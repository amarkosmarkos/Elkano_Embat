"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtEur, fmtEurShort, fmtInt, fmtMonthLong, fmtPct } from "@/lib/format";
import { KIND_LABEL, totalsOf, useOps, type Op } from "@/lib/ops";
import { Card, CompanyLink, Kpi } from "@/components/ui";

const dt = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : dt.format(d);
};

function Detail({ op }: { op: Op }) {
  if (op.kind === "placement")
    return (
      <>
        Depósito a {op.horizon_months} meses en <b>{op.bank}</b> al {fmtPct(op.rate)}, {fmtMonthLong(op.start_month)} → {fmtMonthLong(op.maturity_month)}, rendimiento{" "}
        <b className="num text-ok">+{fmtEur(op.yield_yearly)}/año</b>
      </>
    );
  if (op.kind === "pooling")
    return (
      <>
        <CompanyLink id={op.from} /> → <CompanyLink id={op.to} /> al {fmtPct(op.rate_internal)} interno
      </>
    );
  return <>{op.alert_title}</>;
}

const KIND_CLASS: Record<Op["kind"], string> = {
  placement: "bg-navy-100 text-navy",
  pooling: "bg-ok-bg text-ok",
  alert_resolved: "bg-warn-bg text-warn",
};

/** Tabla de operaciones (más recientes primero), totales y botón «Vaciar» con confirmación en línea. */
export function OpsTable() {
  const { ops, hydrated, remove, clear } = useOps();
  const [confirm, setConfirm] = useState(false);
  const list = [...ops].reverse();
  const t = totalsOf(ops);

  return (
    <>
      <div className="grid grid-cols-5 gap-3">
        <Kpi label="Colocado" value={fmtEurShort(t.placed)} hint="en depósitos" />
        <Kpi label="Neteado" value={fmtEurShort(t.netted)} hint="movido dentro de grupos" />
        <Kpi label="Rendimiento anual" value={fmtEur(Math.round(t.yieldYearly))} hint="de las colocaciones" accent="text-ok" />
        <Kpi label="Ahorro anual" value={fmtEur(Math.round(t.savingYearly))} hint="del pooling (5 %)" accent="text-ok" />
        <Kpi label="Avisos resueltos" value={fmtInt(t.resolved)} hint="cerrados en el monitor" accent={t.resolved > 0 ? "text-warn" : "text-ink-2"} />
      </div>

      <Card
        className="mt-4 overflow-hidden"
        kicker="Registro"
        title={`${fmtInt(ops.length)} ${ops.length === 1 ? "operación" : "operaciones"}`}
        right={
          ops.length > 0 && (
            confirm ? (
              <span className="inline-flex items-center gap-2 text-[12px]">
                <span className="text-ink-2">¿Vaciar el registro?</span>
                <button type="button" onClick={() => { clear(); setConfirm(false); }} className="rounded border bg-bad text-white border-bad px-2.5 py-1 font-semibold">Sí, vaciar</button>
                <button type="button" onClick={() => setConfirm(false)} className="rounded border border-line px-2.5 py-1 text-ink-2 hover:bg-surface">No</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="rounded border border-bad/40 text-bad hover:bg-bad hover:text-white px-3 py-1.5 text-[12px] font-semibold transition-colors">
                Vaciar
              </button>
            )
          )
        }
      >
        {list.length === 0 ? (
          <p className="text-[13px] text-ink-2">
            {hydrated ? (
              <>
                Todavía no hay operaciones. Aprueba una colocación en la <Link href="/empresa/COMP_0054/" className="text-navy hover:underline">ficha de empresa</Link>, un movimiento en el{" "}
                <Link href="/grupo/GROUP_0067/" className="text-navy hover:underline">grupo</Link> o resuelve un aviso en el <Link href="/monitor/" className="text-navy hover:underline">monitor</Link>.
              </>
            ) : (
              "Cargando…"
            )}
          </p>
        ) : (
          <table className="tbl w-full">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Empresa / grupo</th>
                <th className="text-right">Importe</th>
                <th>Detalle</th>
                <th>Fecha</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((op) => (
                <tr key={op.id}>
                  <td>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_CLASS[op.kind]}`}>{KIND_LABEL[op.kind]}</span>
                  </td>
                  <td>
                    {op.kind === "pooling" ? (
                      <Link href={`/grupo/${op.group_id}/`} className="font-mono text-[12px] text-navy hover:underline font-semibold">{op.group_id}</Link>
                    ) : (
                      <CompanyLink id={op.company_id} className="font-semibold" />
                    )}
                  </td>
                  <td className="text-right num font-semibold">{op.kind === "alert_resolved" ? <span className="text-ink-3">-</span> : fmtEur(op.amount)}</td>
                  <td className="wrap text-ink-2 max-w-[520px]"><Detail op={op} /></td>
                  <td className="num text-ink-2">{fmtDate(op.created_at)}</td>
                  <td className="text-right">
                    <button type="button" onClick={() => remove(op.id)} className="text-[11px] text-navy hover:underline">Deshacer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
