import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { getBundle } from "@/lib/data/company";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { StressGrid } from "@/components/charts/StressGrid";
import { STRESS_FLAGS } from "@/lib/score/types";
import { STRESS, EVENT_RULES } from "@/lib/score/meta";
import { monthLabel, monthLabelLong } from "@/lib/format";

export default async function AlarmasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const b = await getBundle(id, idx);
  if (!b) notFound();
  const { d, events, mi } = b;
  const active = mi >= 0 ? STRESS_FLAGS.filter((f) => d.stress[f][mi] === 1) : [];
  const evNow = events.find((e) => e.month === month);
  const evFuture = events.filter((e) => e.month > month && e.event === 1).slice(0, 6);
  const nEventMonths = events.filter((e) => e.event === 1).length;
  const firstEvent = events.find((e) => e.event === 1)?.month;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Alarmas activas" value={active.length} tone={active.length > 0 ? "warn" : "good"} sub={monthLabelLong(month)} />
        <Kpi label="Meses con alarma (24 m)" value={d.nStress.filter((n) => (n ?? 0) > 0).length} sub="de la serie completa" />
        <Kpi label="Evento este mes" value={evNow ? (evNow.event === 1 ? "Sí" : "No") : "—"} tone={evNow?.event === 1 ? "bad" : "good"} sub={evNow ? ["D1", "D2", "D3", "D4"].filter((k) => evNow[k as "D1"] === 1).join(" · ") || "ninguna regla" : "sin etiqueta"} />
        <Kpi label="Meses en evento (total)" value={nEventMonths} tone={nEventMonths > 0 ? "bad" : "good"} sub={firstEvent ? `primero: ${monthLabel(firstEvent)}` : "nunca en evento"} />
      </div>
      <Card title="Alarmas de estrés y eventos, mes a mes" sub="Arriba, las 8 señales S (ámbar) que penalizan el score. Abajo, las 4 reglas del evento de impago (rojo): la verdad contra la que se valida. El evento se mide siempre en los meses siguientes.">
        <StressGrid months={d.metricMonths} stress={d.stress} events={events} marker={month} />
      </Card>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Qué está encendido ahora" sub={active.length ? "y por qué es un acontecimiento, no solo una métrica" : "nada: ninguna de las 8 señales se cumple este mes"}>
          <div className="flex flex-col divide-y divide-line-soft">
            {active.map((f) => (
              <div key={f} className="py-3">
                <div className="flex items-center gap-2 text-[13.5px] text-ink"><span className="num text-[11px] text-warn">{STRESS[f].code}</span>{STRESS[f].label}</div>
                <div className="num mt-1 text-[11.5px] text-ink-dim">{STRESS[f].rule}</div>
                <div className="mt-0.5 text-[12px] text-ink-mute">{STRESS[f].why}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Qué pasó después" sub="eventos de impago (events_v1) posteriores al mes observado: es lo que el score de hoy intenta anticipar">
          {evFuture.length === 0 ? <p className="text-[12.5px] text-ink-mute">Sin eventos en los meses siguientes (o sin datos posteriores).</p> : (
            <div className="flex flex-col divide-y divide-line-soft">
              {evFuture.map((e) => (
                <div key={e.month} className="flex items-center justify-between py-2.5 text-[12.5px]">
                  <span className="num text-ink">{monthLabelLong(e.month)}</span>
                  <span className="flex gap-1.5">{EVENT_RULES.filter((r) => e[r.id as "D1"] === 1).map((r) => <span key={r.id} className="rounded-md bg-bad-dim px-2 py-0.5 text-[11px] text-bad" title={r.rule}>{r.id} · {r.label}</span>)}{e.cure === 1 && <span className="rounded-md bg-good-dim px-2 py-0.5 text-[11px] text-good">cura</span>}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
