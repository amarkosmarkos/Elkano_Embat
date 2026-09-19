"use client";

import { useEffect, useMemo, useState } from "react";
import type { Alert, Severity } from "@/lib/data/portfolio";
import { Card, Empty } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Pill } from "@/components/ui/Pill";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { useOps } from "@/lib/ops";
import { monthLabelLong, formatCount } from "@/lib/format";

const KEY = "xray_resolved";
const SEV: Record<Severity, { label: string; tone: "bad" | "warn" | "accent" }> = { high: { label: "Alta", tone: "bad" }, medium: { label: "Media", tone: "warn" }, info: { label: "Mejora", tone: "accent" } };
const KIND: Record<Alert["kind"], string> = { umbral: "Umbral", regimen: "Régimen", estres: "Alarma S", caida: "Caída", mejora: "Mejora" };

/** Bandeja del monitor: el sistema levanta la mano. "Resuelto" se guarda en el navegador y en Operaciones. */
export default function Bandeja({ alerts, month }: { alerts: Alert[]; month: string }) {
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [showResolved, setShowResolved] = useState(false);
  const [sev, setSev] = useState<"all" | Severity>("all");
  const { add } = useOps();
  useEffect(() => { try { setResolved(new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"))); } catch {} }, []);
  const toggle = (a: Alert) => {
    const next = new Set(resolved);
    if (next.has(a.id)) next.delete(a.id); else { next.add(a.id); add({ kind: "aviso", companyId: a.companyId, company: a.company, title: a.title }); }
    setResolved(next);
    try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch {}
  };
  const list = useMemo(() => alerts.filter((a) => (sev === "all" || a.severity === sev) && (showResolved || !resolved.has(a.id))), [alerts, sev, showResolved, resolved]);
  const n = (s: Severity) => alerts.filter((a) => a.severity === s && !resolved.has(a.id)).length;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon="gauge" label="Avisos" value={formatCount(alerts.length - resolved.size)} sub={monthLabelLong(month)} />
        <Kpi icon="alert" label="Severidad alta" value={formatCount(n("high"))} tone="bad" sub="entra en el 20 % peor · alarma S1/S3/S8 · cae ≥ 15" />
        <Kpi icon="alert" label="Severidad media" value={formatCount(n("medium"))} tone="warn" sub="cambio de régimen · cae ≥ 8 · otras alarmas" />
        <Kpi icon="trend-up" label="Mejoras" value={formatCount(n("info"))} tone="good" sub="sale del 20 % peor · sube ≥ 8" />
      </div>
      <Card
        title="Avisos del mes"
        sub="Solo lo que se mueve de verdad: distingue un mal mes de un deterioro que lleva meses. Cada aviso dice qué señal se movió y desde cuándo."
        right={
          <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
            <div className="flex rounded-lg border border-line bg-panel p-0.5">
              {(["all", "high", "medium", "info"] as const).map((v) => <button key={v} type="button" onClick={() => setSev(v)} className={`rounded-lg px-2.5 py-1 ${sev === v ? "bg-panel-hi text-ink" : "text-ink-mute hover:text-ink-dim"}`}>{v === "all" ? "Todos" : SEV[v].label}</button>)}
            </div>
            <label className="flex items-center gap-1.5 text-ink-mute"><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="accent-accent" />resueltos</label>
          </div>
        }
      >
        {list.length === 0 ? <Empty>Sin avisos con ese filtro.</Empty> : (
          <div className="flex flex-col divide-y divide-line-soft">
            {list.map((a) => {
              const done = resolved.has(a.id);
              return (
                <div key={a.id} className={`grid grid-cols-[76px_minmax(0,1fr)_auto] items-start gap-4 py-3 ${done ? "opacity-45" : ""}`}>
                  <div className="flex flex-col gap-1"><Pill tone={SEV[a.severity].tone}>{SEV[a.severity].label}</Pill><span className="text-[10.5px] text-ink-mute">{KIND[a.kind]}</span></div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2"><span className="text-[13.5px] font-medium text-ink">{a.title}</span><CompanyLink id={a.companyId} name={a.company} className="text-[12px] text-ink-dim" /></div>
                    <div className="mt-0.5 text-[12px] text-ink-dim">{a.message}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`num text-[15px] ${a.delta == null ? "text-ink-mute" : a.delta >= 0 ? "text-good" : "text-bad"}`}>{a.delta == null ? "" : `${a.delta >= 0 ? "+" : "−"}${Math.abs(a.delta).toFixed(1)}`}</span>
                    <button type="button" onClick={() => toggle(a)} className={`rounded-lg border px-3 py-1 text-[11.5px] transition-colors ${done ? "border-line text-ink-mute" : "border-accent/40 text-accent hover:bg-accent/10"}`}>{done ? "Reabrir" : "Resuelto"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
