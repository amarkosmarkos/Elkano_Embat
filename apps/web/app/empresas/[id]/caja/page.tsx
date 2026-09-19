import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { fmtMoney, fmtPct, monthLabel, monthLabelLong, sane } from "@/lib/format";
import type { Signals } from "@/lib/score/types";

export default async function CajaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const { month } = await currentMonth(store.months);
  const c = store.byId.get(id);
  if (!c) notFound();
  const months = store.signalMonths.filter((m) => m <= store.meta.asOf);
  const sig = (m: string) => store.signals.get(`${id}|${m}`) ?? null;
  const series = (k: keyof Signals, cap?: number) => months.map((m) => { const v = sig(m)?.[k]; return v == null ? null : cap ? sane(v, cap) : v; });
  const now = sig(month);
  const marker = months.indexOf(month);
  const cash = series("cash_position", 5e6), net = series("net_cash_flow", 5e6);
  const cur = c.currency ?? "EUR";
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-ink-dim">Señales de tesorería del contrato de datos (<span className="num">data/scores.json</span>): valores crudos por mes, en {cur}. No son el score: son lo que el financiero mira en Embat cada mañana, aquí junto al score para que se lea con él.</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Posición de caja" value={fmtMoney(sane(now?.cash_position, 5e6), cur)} tone={(now?.cash_position ?? 0) < 0 ? "bad" : "neutral"} sub={monthLabelLong(month)} />
        <Kpi label="Flujo neto del mes" value={fmtMoney(sane(now?.net_cash_flow, 5e6), cur)} tone={(now?.net_cash_flow ?? 0) < 0 ? "bad" : "good"} sub="entradas − salidas" />
        <Kpi label="Runway" value={now?.runway_months == null ? "—" : `${now.runway_months.toFixed(1)} m`} tone={now?.runway_months != null && now.runway_months < 6 ? "warn" : "neutral"} sub="caja / salidas netas 3 m" />
        <Kpi label="DSO · DPO" value={`${now?.dso_days == null ? "—" : Math.round(now.dso_days)} · ${now?.dpo_days == null ? "—" : Math.round(now.dpo_days)}`} sub="días cobro · días pago" />
        <Kpi label="Líneas dispuestas" value={fmtPct(now?.debt_utilization)} tone={(now?.debt_utilization ?? 0) > 0.9 ? "bad" : "neutral"} sub="outstanding / granted" />
        <Kpi label="Servicio de deuda" value={fmtPct(now?.debt_service_ratio)} tone={(now?.debt_service_ratio ?? 0) > 0.25 ? "warn" : "neutral"} sub="cuotas + intereses / entradas" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Posición de caja" sub={`saldo de cuentas corrientes a fin de mes · ${cur}`}>
          <LineChart months={months} series={[{ id: "cash", label: "Caja", color: "#e5e5e5", values: cash, area: true }]} marker={marker} fmt={(v) => fmtMoney(v, cur)} legend={false} refLines={[{ v: 0, color: "rgba(239,68,68,0.6)" }]} />
        </Card>
        <Card title="Flujo neto mensual" sub="entradas menos salidas · el color dice el signo">
          <BarChart categories={months.map(monthLabel)} labelEvery={3} series={[{ id: "net", label: "Neto", color: "#3b82f6", values: net }]} fmt={(v) => fmtMoney(v, cur)} yMin={Math.min(0, ...net.filter((v): v is number => v != null))} />
        </Card>
        <Card title="Plazos de cobro y pago" sub="DSO (días que tardan en pagarte) frente a DPO (días que tardas en pagar)">
          <LineChart months={months} series={[{ id: "dso", label: "DSO", color: "#ef4444", values: series("dso_days") }, { id: "dpo", label: "DPO", color: "#10b981", values: series("dpo_days") }]} marker={marker} yMin={0} fmt={(v) => `${v} d`} />
        </Card>
        <Card title="Deuda y runway" sub="líneas dispuestas (%) y meses de vida al ritmo actual">
          <LineChart months={months} series={[{ id: "util", label: "% dispuesto", color: "#f87171", values: series("debt_utilization").map((v) => (v == null ? null : v * 100)) }, { id: "run", label: "Runway (m)", color: "#3b82f6", values: series("runway_months").map((v) => (v == null ? null : Math.min(36, v))) }]} marker={marker} yMin={0} />
        </Card>
      </div>
    </div>
  );
}
