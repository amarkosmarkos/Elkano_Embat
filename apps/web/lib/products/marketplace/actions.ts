/** CENTRO DE ACCIONES — recomendaciones derivadas del comportamiento del score y simulación determinista de ejecutarlas (portado de apps/marketplace). */
import { DIM_LABEL, STRESS } from "@/lib/score/meta";
import { STRESS_FLAGS, type StressFlag } from "@/lib/score/types";
import { fmtDelta, monthLabelLong } from "@/lib/format";
import type { MonitorSnapshot, PositionTimeline } from "./monitor";
import { summarize, type Network, type PortfolioResult, type Position } from "./portfolio";

export type ActionKind = "pause" | "reduce" | "review" | "monitor" | "increase";

export interface ExecutedAction { id: string; kind: ActionKind; multiplier: number; month: string; scoreThen: number }

export interface Recommendation { id: string; kind: ActionKind; title: string; severity: 0 | 1 | 2 | 3; reasons: string[]; multiplier: number; timeline: PositionTimeline }

export const ACTION_META: Record<ActionKind, { label: string; verb: string; tone: "bad" | "warn" | "neutral" | "good"; effect: string }> = {
  pause: { label: "Pausar financiación adicional", verb: "Pausar", tone: "bad", effect: "Congela nueva financiación y recorta la posición un 25 %" },
  reduce: { label: "Reducir exposición", verb: "Reducir", tone: "bad", effect: "Divide la posición a la mitad; el capital vuelve a reserva" },
  review: { label: "Revisar exposición", verb: "Revisar", tone: "warn", effect: "Recorta la posición un 15 % mientras se revisa" },
  monitor: { label: "Seguir monitorizando", verb: "Monitorizar", tone: "neutral", effect: "Sin cambios" },
  increase: { label: "Aumentar exposición", verb: "Aumentar", tone: "good", effect: "Crece la posición un 25 %, hasta el tope de exposición" },
};

export function applyActions(result: PortfolioResult, executed: ExecutedAction[]): PortfolioResult {
  if (executed.length === 0) return result;
  const mult = new Map<string, number>();
  for (const a of executed) mult.set(a.id, (mult.get(a.id) ?? 1) * a.multiplier);
  const positions: Position[] = result.positions.map((p) => {
    const m = mult.get(p.id);
    if (m == null) return p;
    const w = Math.min(result.config.maxExposure, p.weight * m);
    return { ...p, weight: w, amount: Math.round(w * result.config.capital) };
  });
  const share = positions.reduce((s, p) => s + p.weight, 0);
  return summarize(result.config, positions, result.universe, result.eligible, Math.min(1, share), result.excludedRelated);
}

export function recommend(snapshot: MonitorSnapshot, network: Network): Recommendation[] {
  const byId = new Map(network.companies.map((c) => [c.id, c]));
  const idx = network.months.indexOf(snapshot.month);
  const recs: Recommendation[] = snapshot.positions.map((t) => {
    const c = byId.get(t.position.id)!;
    const reasons: string[] = [];
    const from = t.scoreAtAllocation.toFixed(0), to = t.scoreNow.toFixed(0);
    if (Math.abs(t.delta) >= 4) reasons.push(`El score ${t.delta < 0 ? "cae" : "sube"} de ${from} a ${to} desde la asignación (${fmtDelta(t.delta, 1)} pts)`);
    if (t.driver && Math.abs(t.driver.delta) >= 3) reasons.push(`La dimensión ${DIM_LABEL[t.driver.dim].toLowerCase()} ${t.driver.delta < 0 ? "resta" : "suma"} ${Math.abs(t.driver.delta).toFixed(1)} pts`);
    if (t.driver && t.driverStreak >= 2 && t.driver.delta < 0) reasons.push(`${DIM_LABEL[t.driver.dim]} lleva ${t.driverStreak} periodos seguidos a peor`);
    if (t.declineStreak >= 2) reasons.push(`Score en caída ${t.declineStreak} meses seguidos`);
    else if (t.declinesInLast4 >= 3 && t.delta < 0) reasons.push(`Baja en ${t.declinesInLast4} de los últimos 4 meses`);
    if (t.riseStreak >= 2 && t.delta > 0) reasons.push(`Score al alza ${t.riseStreak} meses seguidos`);
    if (t.onsetMonth) reasons.push(`El deterioro empezó en ${monthLabelLong(t.onsetMonth).toLowerCase()}`);
    if (t.alertNow) reasons.push("Este mes está en el 20 % peor de la red");
    const flags = idx >= 0 ? STRESS_FLAGS.filter((f: StressFlag) => c.latest.month === snapshot.month && c.latest.stress[f] === 1) : [];
    if (t.stressNow > 0) reasons.push(flags.length ? `Alarmas activas: ${flags.map((f) => STRESS[f].label).join(", ")}` : `${t.stressNow} alarma${t.stressNow > 1 ? "s" : ""} de estrés activa${t.stressNow > 1 ? "s" : ""}`);
    if (!t.persistent && t.delta <= -8) reasons.push("Movimiento reciente: aún podría ser un mes puntual");
    if (t.persistent && t.delta <= -8) reasons.push("Movimiento persistente, no un mes puntual");
    let kind: ActionKind = "monitor";
    let severity: Recommendation["severity"] = 0;
    let multiplier = 1;
    if (t.delta <= -15 && t.persistent) { kind = "reduce"; severity = 3; multiplier = 0.5; }
    else if ((t.alertNow && t.delta <= -8) || t.delta <= -20) { kind = "pause"; severity = 3; multiplier = 0.75; }
    else if (t.delta <= -8 || t.declineStreak >= 3) { kind = "review"; severity = 2; multiplier = 0.85; }
    else if (t.delta >= 10 && t.scoreNow >= 75 && t.riseStreak >= 2) { kind = "increase"; severity = 1; multiplier = 1.25; }
    else if (t.status === "watch") { kind = "review"; severity = 1; multiplier = 1; }
    if (kind === "monitor" && reasons.length === 0) reasons.push(`Score ${to}, ${fmtDelta(t.delta, 1)} pts desde la asignación: dentro del rango normal`);
    return { id: t.position.id, kind, title: ACTION_META[kind].label, severity, reasons, multiplier, timeline: t };
  });
  return recs.sort((a, b) => b.severity - a.severity || a.timeline.delta - b.timeline.delta);
}

/** La misma cartera revalorada en el mes del monitor, sin acciones (base de la simulación). */
export function revalue(result: PortfolioResult, snapshot: MonitorSnapshot): PortfolioResult {
  const nowScore = new Map(snapshot.positions.map((t) => [t.position.id, t.scoreNow]));
  const positions = result.positions.map((p) => ({ ...p, score: nowScore.get(p.id) ?? p.score }));
  const share = positions.reduce((s, p) => s + p.weight, 0);
  return summarize(result.config, positions, result.universe, result.eligible, Math.min(1, share), result.excludedRelated);
}
