import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanies, getCompany, getCompanyDetail } from "@/lib/data";
import { DIMS, DIM_LABEL, type Contrib } from "@/lib/types";
import {
  fmt1, fmtEur, fmtEurShort, fmtInt, fmtMonth, fmtMonthLong, fmtPct, fmtSigned,
  TIER_BG, TIER_COLOR, TIER_LABEL, TREND_LABEL,
} from "@/lib/format";
import { LineChart } from "@/components/charts/LineChart";
import { HBars } from "@/components/charts/HBars";
import { Card, CompanyLink, Delta, ScorePill, SeverityBadge, TierBadge, TrendTag } from "@/components/ui";
import { ExcedentesCard } from "@/components/ExcedentesCard";
import { PoolingCard } from "@/components/PoolingCard";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCompanies().map((c) => ({ id: c.id }));
}

export default async function EmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getCompany(id);
  const d = getCompanyDetail(id);
  if (!s || !d) notFound();

  const months = d.months.map((m) => m.m);
  const last = d.months[d.months.length - 1];
  const idx3 = Math.max(0, d.months.length - 4);
  const prev3 = d.months[idx3];
  const alertIdx = d.months.map((m, i) => (m.alert ? i : -1)).filter((i) => i >= 0);
  const eventMonths = new Set(d.events.filter((e) => e.event === 1).map((e) => e.m));
  const cureMonths = new Set(d.events.filter((e) => e.cure === 1).map((e) => e.m));
  const eventIdx = months.map((m, i) => (eventMonths.has(m) ? i : -1)).filter((i) => i >= 0);
  const cureIdx = months.map((m, i) => (cureMonths.has(m) ? i : -1)).filter((i) => i >= 0);

  const contribRows = DIMS.map((k) => ({ label: DIM_LABEL[k], value: last.c[k] }));
  const moves = DIMS.map((k) => ({ key: k, label: DIM_LABEL[k], now: last.c[k], then: prev3.c[k], delta: last.c[k] - prev3.c[k] }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const maxAbs = Math.max(1, ...DIMS.map((k: keyof Contrib) => Math.abs(last.c[k])), ...moves.map((m) => Math.abs(m.delta)));

  const bands = [
    { from: 70, to: 100, color: "#dcfce7" },
    { from: 40, to: 70, color: "#fef3c7" },
    { from: 0, to: 40, color: "#fee2e2" },
  ];
  const ex = d.cards.excedentes;
  const po = d.cards.pooling;
  const alertas = [...d.cards.alertas].sort((a, b) => ({ alta: 0, media: 1, baja: 2 })[a.severity] - ({ alta: 0, media: 1, baja: 2 })[b.severity]);

  return (
    <>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="kicker">Paso 3 de 6 · Ficha de empresa</div>
          <h1 className="text-2xl font-bold text-navy font-mono leading-tight">{s.id}</h1>
          <div className="text-[12px] text-ink-2 mt-1 flex items-center gap-3">
            <span>{s.country} · {s.currency}</span>
            <span>
              Grupo {s.group_id ? <Link href={`/grupo/${s.group_id}/`} className="font-mono text-navy hover:underline">{s.group_id}</Link> : "—"} ({s.group_size} {s.group_size === 1 ? "empresa" : "empresas"})
            </span>
            <span>Observada desde {fmtMonthLong(s.first_month)}</span>
            <span>{d.products.n_bank} {d.products.n_bank === 1 ? "banco" : "bancos"}: {d.products.banks.join(", ")}</span>
          </div>
        </div>
        <Link href="/score/" className="text-[12px] text-navy hover:underline">← Volver a la tabla</Link>
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-4 items-stretch">
        <div className="card p-4 flex flex-col justify-between" style={{ background: TIER_BG[s.tier] }}>
          <div>
            <div className="kicker" style={{ color: TIER_COLOR[s.tier] }}>Score · {fmtMonthLong(last.m)}</div>
            <div className="text-[72px] font-bold num leading-none mt-1" style={{ color: TIER_COLOR[s.tier] }}>{fmt1(s.score)}</div>
            <div className="mt-2 flex items-center gap-2">
              <TierBadge tier={s.tier} />
              <TrendTag trend={s.trend} />
              {s.alert === 1 && <span className="text-[11px] font-semibold text-bad bg-white/70 rounded px-1.5 py-0.5">● En alerta</span>}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
            <div className="bg-white/70 rounded p-2">
              <div className="kicker">3 meses</div>
              <Delta value={s.delta3} size="lg" />
              <div className="text-ink-3">desde {fmt1(s.score_3m)}</div>
            </div>
            <div className="bg-white/70 rounded p-2">
              <div className="kicker">6 meses</div>
              <Delta value={s.delta6} size="lg" />
              <div className="text-ink-3">desde {fmt1(s.score_6m)}</div>
            </div>
          </div>
          <p className="mt-3 text-[14px] font-medium text-ink leading-snug">«{s.explanation}»</p>
        </div>

        <Card kicker="Trayectoria" title="Score mes a mes" right={<span className="text-[11px] text-ink-2">Bandas: {TIER_LABEL.verde} ≥ 70 · {TIER_LABEL.ambar} 40–70 · {TIER_LABEL.rojo} &lt; 40</span>}>
          <LineChart
            months={months}
            series={[{ key: "score", label: "Score", values: d.months.map((m) => m.score), color: "#0b1f3a" }]}
            width={880}
            height={230}
            yMin={0}
            yMax={100}
            bands={bands}
            markIdx={alertIdx}
            shadeIdx={eventIdx}
            cureIdx={cureIdx}
          />
        </Card>
      </div>

      {/* Por qué / qué se movió / cuándo se vio venir */}
      <div className={`mt-4 grid gap-4 ${d.anticipation ? "grid-cols-[1fr_1fr_320px]" : "grid-cols-2"}`}>
        <Card kicker="Desglose" title="Por qué saca este número" right={<span className="text-[11px] text-ink-2">puntos sobre 50 · {fmtMonth(last.m)}</span>}>
          <HBars rows={contribRows} width={440} max={maxAbs} />
          <p className="text-[12px] text-ink-2 mt-2">
            Las cinco dimensiones suman {fmtSigned(DIMS.reduce((a, k) => a + last.c[k], 0))} pts sobre una base de 50. Positivo empuja el score hacia arriba; negativo lo tira hacia abajo.
          </p>
        </Card>

        <Card kicker="Qué se movió" title={`${fmtMonth(prev3.m)} → ${fmtMonth(last.m)}`}>
          <ul className="divide-y divide-line">
            {moves.map((m, i) => (
              <li key={m.key} className={`flex items-center justify-between py-1.5 text-[13px] ${i === 0 ? "font-semibold" : ""}`}>
                <span>{m.label}</span>
                <span className="flex items-center gap-3">
                  <span className="text-ink-3 num text-[12px]">{fmtSigned(m.then)} → {fmtSigned(m.now)}</span>
                  <span className="w-16 text-right"><Delta value={m.delta} suffix="" /></span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded bg-navy-100 px-3 py-2 text-[13px] text-navy">
            <span className="kicker text-navy/70 mr-2">v2</span>{d.explanation_v2}
          </div>
        </Card>

        {d.anticipation && (
          <Card kicker="Cuándo se vio venir" title="Anticipación">
            <div className="text-[56px] font-bold text-navy num leading-none">{d.anticipation.lead_months}<span className="text-xl font-semibold text-ink-2 ml-1">{d.anticipation.lead_months === 1 ? "mes" : "meses"}</span></div>
            <p className="text-[13px] text-ink-2 mt-2 leading-snug">
              La primera alerta saltó en <b className="text-ink">{fmtMonthLong(d.anticipation.first_alert_month)}</b>; el primer evento (impago o descubierto) llegó en <b className="text-ink">{fmtMonthLong(d.anticipation.first_event_month)}</b>.
            </p>
            <ul className="mt-3 text-[12px] text-ink-2 space-y-1">
              {d.events.map((e) => (
                <li key={e.m} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${e.cure ? "bg-ok" : "bg-bad"}`} />
                  <span className="font-medium text-ink">{fmtMonth(e.m)}</span>
                  {e.cure ? "cura" : ["D1", "D2", "D3", "D4"].filter((k) => e[k as "D1"]).join(" ") || "evento"}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Series operativas */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card kicker="Liquidez" title="Saldo fin de mes y saldo mínimo">
          <LineChart
            months={months}
            width={380}
            height={170}
            zero
            format={(v) => fmtEurShort(v)}
            series={[
              { key: "eom", label: "Saldo fin de mes", values: d.months.map((m) => m.balance_eom), color: "#0b1f3a" },
              { key: "min", label: "Saldo mínimo", values: d.months.map((m) => m.balance_min), color: "#b45309", dashed: true },
            ]}
          />
          <div className="text-[12px] text-ink-2 mt-1">Runway: <b className="text-ink">{fmt1(last.runway)} meses</b> · Servicio de deuda: <b className="text-ink">{fmtPct(last.servicio_deuda)}</b> de los pagos</div>
        </Card>
        <Card kicker="Caja" title="Cobros y pagos">
          <LineChart
            months={months}
            width={380}
            height={170}
            zero
            format={(v) => fmtEurShort(v)}
            series={[
              { key: "in", label: "Cobros", values: d.months.map((m) => m.inflow), color: "#15803d" },
              { key: "out", label: "Pagos", values: d.months.map((m) => m.outflow), color: "#b91c1c" },
            ]}
          />
          <div className="text-[12px] text-ink-2 mt-1">Neto {fmtMonth(last.m)}: <b className={last.net < 0 ? "text-bad" : "text-ink"}>{fmtEur(last.net)}</b> · Devoluciones: <b className="text-ink">{fmtInt(last.devoluciones)}</b></div>
        </Card>
        <Card kicker="Plazos" title="Días de pago (DPO) y de cobro (DSO)">
          <LineChart
            months={months}
            width={380}
            height={170}
            format={(v) => `${Math.round(v)} d`}
            series={[
              { key: "dpo", label: "DPO (paga a)", values: d.months.map((m) => m.dpo), color: "#0b1f3a" },
              { key: "dso", label: "DSO (cobra a)", values: d.months.map((m) => m.dso), color: "#7c3aed" },
            ]}
          />
          <div className="text-[12px] text-ink-2 mt-1">Retraso a proveedores: <b className="text-ink">{fmt1(last.retraso_pago)} d</b> · Cobros vencidos: <b className={last.overdue_share > 0.3 ? "text-bad" : "text-ink"}>{fmtPct(last.overdue_share)}</b></div>
        </Card>
      </div>

      {/* Productos */}
      <div className="mt-8 mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-navy">Qué haría el sistema</h2>
        <span className="text-[12px] text-ink-2">Tres productos que salen del mismo score: colocar excedentes, netear dentro del grupo y avisar antes de que duela</span>
      </div>
      <div className="grid grid-cols-3 gap-4 items-start">
        <ExcedentesCard
          companyId={s.id}
          currency={s.currency}
          cash={last.balance_eom}
          data={ex}
          banks={d.products.banks}
          hasInvestment={d.products.has_investment}
        />

        <PoolingCard
          groupId={po?.group_id ?? null}
          members={po?.members ?? []}
          proposals={po?.proposals ?? []}
          savingYearly={po?.saving_yearly ?? 0}
          highlightId={s.id}
          emptyText={s.group_size > 1 ? "El grupo no tiene saldo neteable suficiente." : "Empresa sin grupo: no hay con quién netear."}
        />

        <section className="card p-4">
          <div className="kicker">Producto 3 · Monitor</div>
          <h3 className="text-[15px] font-semibold text-ink leading-tight">
            {alertas.length ? `${alertas.length} ${alertas.length === 1 ? "aviso" : "avisos"} este mes` : "Sin avisos este mes"}
          </h3>
          <ul className="mt-3 space-y-2">
            {alertas.map((a, i) => (
              <li key={i} className={`rounded border-l-4 pl-3 pr-2 py-2 bg-surface ${a.severity === "alta" ? "border-bad" : a.severity === "media" ? "border-warn" : "border-navy"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-ink">{a.title}</span>
                  <SeverityBadge severity={a.severity} />
                </div>
                <p className="text-[12px] text-ink-2 mt-1 leading-snug">{a.text}</p>
                <div className="text-[11px] text-ink-3 mt-1">{a.type} · {fmtMonth(a.month)}{a.months_ahead > 0 ? ` · avisa con ${a.months_ahead} ${a.months_ahead === 1 ? "mes" : "meses"}` : " · ahora"}</div>
              </li>
            ))}
            {alertas.length === 0 && <li className="text-[13px] text-ink-2">Nada que levante a un tesorero de la silla.</li>}
          </ul>
        </section>
      </div>

      {/* Productos bancarios */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card kicker="Bancos y deuda" title="Con quién trabaja" className="col-span-3">
          <div className="grid grid-cols-4 gap-4 text-[13px]">
            <div>
              <div className="kicker">Bancos</div>
              <div className="mt-1">{d.products.banks.join(" · ")}</div>
            </div>
            <div>
              <div className="kicker">Productos de deuda</div>
              <div className="mt-1">{d.products.n_debt} {d.products.has_investment ? "· con producto de inversión" : "· sin inversión"}</div>
            </div>
            <div className="col-span-2">
              <div className="kicker">Líneas de crédito</div>
              {d.products.credit_lines.length === 0 ? (
                <div className="mt-1 text-ink-2">Sin líneas de crédito.</div>
              ) : (
                <ul className="mt-1 space-y-1">
                  {d.products.credit_lines.map((l, i) => {
                    const u = l.granted ? l.drawn / l.granted : 0;
                    return (
                      <li key={i} className="flex items-center gap-3">
                        <span className="w-36">{l.bank}</span>
                        <span className="flex-1 h-2 rounded bg-line overflow-hidden"><span className={`block h-full ${u > 0.9 ? "bg-bad" : u > 0.7 ? "bg-warn" : "bg-navy"}`} style={{ width: `${Math.min(100, u * 100)}%` }} /></span>
                        <span className="num w-44 text-right text-ink-2">{fmtEurShort(l.drawn)} de {fmtEurShort(l.granted)} ({Math.round(u * 100)} %)</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>
      <div className="mt-4 text-[12px] text-ink-2">
        Estado actual: <ScorePill score={s.score} tier={s.tier} /> · {TREND_LABEL[s.trend]} · caja {fmtEur(s.cash)} · {s.has_debt ? "con deuda" : "sin deuda"}
      </div>
    </>
  );
}
