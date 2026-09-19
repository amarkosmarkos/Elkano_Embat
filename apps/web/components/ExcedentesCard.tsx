"use client";

import { useState } from "react";
import type { ExcedentesCard as ExcedentesData } from "@/lib/types";
import { fmtEur, fmtEurShort, fmtMonthLong, fmtPct } from "@/lib/format";
import { addMonths, placementsOf, START_MONTH, useOps } from "@/lib/ops";

const HORIZONS = [3, 6, 12] as const;
const STEP = 1000;
const roundStep = (x: number) => Math.round(x / STEP) * STEP;

/** Producto 1, Colocación de excedentes. Importe y plazo editables; «Aprobar» registra un depósito en el almacén local. */
export function ExcedentesCard({
  companyId,
  currency,
  cash,
  data,
  banks,
  hasInvestment,
}: {
  companyId: string;
  currency: string;
  cash: number;
  data: ExcedentesData | null;
  banks: string[];
  hasInvestment: boolean;
}) {
  const { ops, add, remove } = useOps();
  const placed = placementsOf(ops, companyId);
  const placedTotal = placed.reduce((a, p) => a + p.amount, 0);
  const available = cash - placedTotal;

  const [amount, setAmount] = useState(() => roundStep(data?.proposal ?? 0));
  const [horizon, setHorizon] = useState<number>(data?.horizon_months ?? 6);

  const done = placed.length > 0;
  const max = data ? roundStep(data.floor12) : 0;
  const rate = data?.rate ?? 0;
  const yieldYearly = Math.round(amount * rate);
  const yieldPeriod = Math.round((amount * rate * horizon) / 12);
  const bank = banks[0] ?? "Banco principal";

  const approve = () => {
    if (!data || amount <= 0) return;
    add({
      kind: "placement",
      company_id: companyId,
      amount,
      horizon_months: horizon,
      rate,
      bank,
      start_month: START_MONTH,
      maturity_month: addMonths(START_MONTH, horizon),
      yield_yearly: yieldYearly,
    });
  };

  return (
    <section className={`card p-4 flex flex-col gap-3 ${done ? "border-ok bg-ok-bg/30" : ""}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="kicker">Producto 1, Colocación de excedentes</div>
          <h3 className="text-[15px] font-semibold text-ink leading-tight">
            {!data ? "Colocación de excedentes" : done ? "Colocación ejecutada" : `Colocar ${fmtEurShort(amount)} a ${horizon} meses`}
          </h3>
        </div>
        {data && !done && (
          <button
            type="button"
            onClick={approve}
            disabled={amount <= 0}
            className="shrink-0 rounded px-3 py-1.5 text-[12px] font-semibold border bg-navy text-white border-navy hover:bg-navy-700 disabled:opacity-40 transition-colors"
          >
            Aprobar colocación
          </button>
        )}
        {done && <span className="shrink-0 rounded px-3 py-1.5 text-[12px] font-semibold border bg-ok text-white border-ok">Ejecutado ✓</span>}
      </header>

      <div className="flex items-baseline justify-between text-[12px] text-ink-2 border-b border-line pb-2">
        <span>Caja disponible</span>
        <span className="num font-semibold text-ink">
          {fmtEur(available)}
          {placedTotal > 0 && <span className="text-ink-3 font-normal">, {fmtEurShort(placedTotal)} colocados</span>}
        </span>
      </div>

      {!data ? (
        <p className="text-[13px] text-ink-2">Sin excedente colocable: el suelo de caja de los últimos meses no deja margen o la tendencia lo desaconseja.</p>
      ) : done ? (
        <ul className="space-y-2">
          {placed.map((p) => (
            <li key={p.id} className="rounded border border-ok/40 bg-white px-3 py-2 text-[13px]">
              <div className="text-xl font-bold text-ok num leading-tight">+{fmtEur(p.yield_yearly)} / año</div>
              <p className="mt-1 leading-snug text-ink">
                Depósito de <b className="num">{fmtEur(p.amount)}</b> a {p.horizon_months} meses en <b>{p.bank}</b>, vence{" "}
                <b>{fmtMonthLong(p.maturity_month)}</b>, rendimiento estimado <b className="num">{fmtEur(p.yield_yearly)} €/año</b> ({fmtPct(p.rate)}).
              </p>
              <button type="button" onClick={() => remove(p.id)} className="mt-1 text-[12px] text-navy hover:underline">
                Deshacer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="text-2xl font-bold text-navy num leading-tight">+{fmtEur(yieldYearly)} / año</div>

          <div className="space-y-2">
            <label className="block text-[12px]">
              <span className="flex items-center justify-between text-ink-2">
                <span>Importe a colocar</span>
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={max}
                    step={STEP}
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, Math.min(max, roundStep(Number(e.target.value) || 0))))}
                    className="w-32 rounded border border-line px-2 py-0.5 text-right num text-ink focus:outline-none focus:border-navy"
                  />
                  <span className="text-ink-3">{currency === "EUR" ? "€" : currency}</span>
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={max}
                step={STEP}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1 w-full accent-navy"
              />
              <span className="flex justify-between text-[11px] text-ink-3 num">
                <span>0 €</span>
                <button type="button" className="hover:text-navy hover:underline" onClick={() => setAmount(roundStep(data.proposal))}>
                  propuesta {fmtEurShort(data.proposal)}
                </button>
                <span>máx. {fmtEurShort(max)}</span>
              </span>
            </label>

            <div className="flex items-center justify-between text-[12px]">
              <span className="text-ink-2">Plazo</span>
              <div className="inline-flex rounded border border-line overflow-hidden">
                {HORIZONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    className={`px-2.5 py-0.5 font-semibold transition-colors ${horizon === h ? "bg-navy text-white" : "bg-white text-ink-2 hover:bg-navy-100"}`}
                  >
                    {h} m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
            <dt className="text-ink-2">Suelo 6 meses</dt><dd className="num text-right">{fmtEur(data.floor6)}</dd>
            <dt className="text-ink-2">Suelo 12 meses</dt><dd className="num text-right">{fmtEur(data.floor12)}</dd>
            <dt className="text-ink-2">Propuesta del sistema</dt><dd className="num text-right">{fmtEur(data.proposal)}, {data.horizon_months} m</dd>
            <dt className="text-ink-2">Tipo</dt><dd className="num text-right">{fmtPct(rate)}</dd>
            <dt className="text-ink-2">Rendimiento en el plazo</dt><dd className="num text-right font-semibold">{fmtEur(yieldPeriod)}</dd>
            <dt className="text-ink-2">Banco</dt><dd className="text-right truncate" title={bank}>{bank}</dd>
          </dl>

          <div className="text-[12px] text-ink-2 border-t border-line pt-2">
            {data.reason}
            <div className="text-[11px] text-ink-3 mt-1">{hasInvestment ? "Ya tiene producto de inversión contratado." : "Sin producto de inversión: sería su primera colocación."}</div>
          </div>
        </>
      )}
    </section>
  );
}
