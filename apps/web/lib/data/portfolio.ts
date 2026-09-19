import type { Store } from "./store";
import { getAllDetails } from "./store";
import { DIMENSIONS, STRESS_FLAGS, type Components, type Dimension, type StressFlag } from "@/lib/score/types";
import { componentsAt, mainDriver, momentum, scoreAt, tier, trend, type Tier, type Trend } from "@/lib/score/derived";
import { DIM_LABEL, STRESS } from "@/lib/score/meta";

export interface Row {
  id: string;
  name: string;
  group: string | null;
  score: number;
  prev1: number | null;
  d1: number | null;
  d3: number | null;
  d6: number | null;
  tier: Tier;
  trend: Trend;
  alert: boolean;
  nStress: number;
  driver: { dim: Dimension; value: number } | null;
  components: Components;
  history: number;
  erp: boolean;
  debt: boolean;
}

/** Foto de la cartera en el mes `idx`: una fila por empresa con score ese mes. */
export function rowsAt(store: Store, idx: number): Row[] {
  const out: Row[] = [];
  for (const c of store.companies) {
    const s = c.scores[idx];
    if (s == null) continue;
    const p1 = idx > 0 ? c.scores[idx - 1] : null;
    const p6 = idx >= 6 ? c.scores[idx - 6] : null;
    const comps = componentsAt(c, idx);
    let history = 0;
    for (let i = 0; i <= idx; i++) if (c.scores[i] != null) history++;
    out.push({
      id: c.id, name: c.name, group: c.group, score: s, prev1: p1,
      d1: p1 == null ? null : s - p1, d3: momentum(c.scores, idx), d6: p6 == null ? null : s - p6,
      tier: tier(s), trend: trend(c.scores, idx), alert: c.alerts[idx] === 1, nStress: c.stress[idx] ?? 0,
      driver: mainDriver(comps), components: comps, history, erp: !!c.erp, debt: false,
    });
  }
  return out;
}

export interface Kpis {
  n: number; mean: number; median: number; p20: number; p80: number;
  nGreen: number; nAmber: number; nRed: number; nAlert: number; nImproving: number; nDeteriorating: number; nStress: number;
  meanPrev: number | null; meanD6: number | null;
}

export function kpisAt(store: Store, idx: number, rows = rowsAt(store, idx)): Kpis {
  const sorted = rows.map((r) => r.score).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))] ?? 0;
  const mean = sorted.reduce((s, v) => s + v, 0) / (sorted.length || 1);
  const prev = idx > 0 ? rowsAt(store, idx - 1) : [];
  const meanPrev = prev.length ? prev.reduce((s, r) => s + r.score, 0) / prev.length : null;
  const d6 = rows.filter((r) => r.d6 != null);
  return {
    n: rows.length, mean, median: q(0.5), p20: q(0.2), p80: q(0.8),
    nGreen: rows.filter((r) => r.score >= 70).length,
    nAmber: rows.filter((r) => r.score >= 40 && r.score < 70).length,
    nRed: rows.filter((r) => r.score < 40).length,
    nAlert: rows.filter((r) => r.alert).length,
    nImproving: rows.filter((r) => r.trend === "improving").length,
    nDeteriorating: rows.filter((r) => r.trend === "deteriorating").length,
    nStress: rows.filter((r) => r.nStress > 0).length,
    meanPrev, meanD6: d6.length ? d6.reduce((s, r) => s + (r.d6 as number), 0) / d6.length : null,
  };
}

export function kpisSeries(store: Store): Kpis[] {
  return store.months.map((_, i) => kpisAt(store, i));
}

export type Severity = "high" | "medium" | "info";
export interface Alert {
  id: string;
  companyId: string;
  company: string;
  group: string | null;
  month: string;
  kind: "umbral" | "regimen" | "estres" | "caida" | "mejora";
  severity: Severity;
  title: string;
  message: string;
  score: number;
  delta: number | null;
}

/**
 * Bandeja del monitor: lo que "se ha movido de verdad" en el mes `idx`, derivado solo del score
 * (entrada en el 20 % peor, alarma S nueva, cambio de régimen, caída sostenida, mejora).
 */
export async function alertsAt(store: Store, idx: number): Promise<Alert[]> {
  if (idx <= 0) return [];
  const details = await getAllDetails();
  const month = store.months[idx];
  const out: Alert[] = [];
  for (const c of store.companies) {
    const s = c.scores[idx];
    if (s == null) continue;
    const p = c.scores[idx - 1];
    const d1 = p == null ? null : s - p;
    const d3 = momentum(c.scores, idx);
    const now = componentsAt(c, idx);
    const prev3 = idx >= 3 ? componentsAt(c, idx - 3) : null;
    let driver: Dimension | null = null, driverD = 0;
    if (prev3) for (const d of DIMENSIONS) { const a = now[d], b = prev3[d]; if (a != null && b != null && a - b < driverD) { driverD = a - b; driver = d; } }
    const tNow = trend(c.scores, idx), tPrev = trend(c.scores, idx - 1);
    const base = { companyId: c.id, company: c.name, group: c.group, month, score: s };

    if (c.alerts[idx] === 1 && c.alerts[idx - 1] === 0) {
      out.push({ ...base, id: `${c.id}-${month}-umbral`, kind: "umbral", severity: "high", title: "Entra en el 20 % peor de la red", message: `Score ${s.toFixed(0)}${d1 != null ? ` (${d1 >= 0 ? "+" : "−"}${Math.abs(d1).toFixed(1)} este mes)` : ""}${driver ? ` · lastre: ${DIM_LABEL[driver].toLowerCase()}` : ""}`, delta: d1 });
    }
    const det = details.get(c.id);
    if (det) {
      const mi = det.metricMonths.indexOf(month);
      if (mi > 0) {
        const newFlags = STRESS_FLAGS.filter((f) => det.stress[f][mi] === 1 && det.stress[f][mi - 1] !== 1);
        if (newFlags.length) {
          out.push({ ...base, id: `${c.id}-${month}-estres`, kind: "estres", severity: newFlags.some((f) => f === "S3_falta_regular" || f === "S1_descubierto" || f === "S8_caja_negativa") ? "high" : "medium", title: `Nueva alarma: ${newFlags.map((f: StressFlag) => STRESS[f].label).join(", ")}`, message: newFlags.map((f) => `${STRESS[f].code} · ${STRESS[f].rule}`).join(" · "), delta: d1 });
        }
      }
    }
    if (tNow === "deteriorating" && tPrev !== "deteriorating") {
      out.push({ ...base, id: `${c.id}-${month}-regimen`, kind: "regimen", severity: "medium", title: `Cambio de régimen: de ${tPrev === "improving" ? "mejora" : "estable"} a deterioro`, message: `Tres meses seguidos a peor${d3 != null ? ` · ${d3 >= 0 ? "+" : "−"}${Math.abs(d3).toFixed(1)} pts en 3 meses` : ""}${driver ? ` · ${DIM_LABEL[driver].toLowerCase()} ${driverD.toFixed(1)}` : ""}`, delta: d3 });
    }
    if (d3 != null && d3 <= -8 && !(c.alerts[idx] === 1 && c.alerts[idx - 1] === 0)) {
      out.push({ ...base, id: `${c.id}-${month}-caida`, kind: "caida", severity: d3 <= -15 ? "high" : "medium", title: `Cae ${Math.abs(d3).toFixed(0)} pts en 3 meses`, message: `${driver ? `Motivo: ${DIM_LABEL[driver].toLowerCase()} (${driverD.toFixed(1)} pts)` : "Sin una dimensión dominante"} · score ${s.toFixed(0)}`, delta: d3 });
    }
    if ((c.alerts[idx] === 0 && c.alerts[idx - 1] === 1) || (d3 != null && d3 >= 8 && tNow === "improving")) {
      out.push({ ...base, id: `${c.id}-${month}-mejora`, kind: "mejora", severity: "info", title: c.alerts[idx - 1] === 1 && c.alerts[idx] === 0 ? "Sale del 20 % peor" : `Mejora ${d3?.toFixed(0)} pts en 3 meses`, message: `Score ${s.toFixed(0)} · tendencia ${tNow === "improving" ? "al alza" : "estable"}`, delta: d3 ?? d1 });
    }
  }
  const rank: Record<Severity, number> = { high: 0, medium: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
}

export interface GroupRow { id: string; n: number; scored: number; mean: number | null; min: number | null; max: number | null; nAlert: number; nStress: number; members: Row[] }

export function groupsAt(store: Store, idx: number, rows = rowsAt(store, idx)): GroupRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: GroupRow[] = [];
  for (const [gid, ids] of store.groups) {
    const members = ids.map((i) => byId.get(i)).filter((r): r is Row => !!r);
    const sc = members.map((m) => m.score);
    out.push({ id: gid, n: ids.length, scored: members.length, mean: sc.length ? sc.reduce((s, v) => s + v, 0) / sc.length : null, min: sc.length ? Math.min(...sc) : null, max: sc.length ? Math.max(...sc) : null, nAlert: members.filter((m) => m.alert).length, nStress: members.filter((m) => m.nStress > 0).length, members });
  }
  return out;
}
