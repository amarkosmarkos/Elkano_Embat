/**
 * Cálculos derivados — migrados de apps/marketplace/src/lib/derived.ts. Todo es una función
 * determinista de campos reales del score (historia, contribuciones, alert, n_stress, métricas base).
 */
import type { CompanyIndex, Components, Dimension } from "./types";
import { DIMENSIONS } from "./types";
import { DIM_LABEL } from "./meta";
import { fmtMetric } from "@/lib/format";

export type Trend = "improving" | "stable" | "deteriorating";
export type Tier = "prime" | "healthy" | "watch" | "risk";

export const TREND_LABEL: Record<Trend, string> = { improving: "Mejorando", stable: "Estable", deteriorating: "Deteriorando" };
export const TIER_LABEL: Record<Tier, string> = { prime: "Prime", healthy: "Sana", watch: "Vigilar", risk: "Riesgo" };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function scoreAt(scores: (number | null)[], idx: number): number | null {
  for (let i = idx; i >= 0; i--) if (scores[i] != null) return scores[i];
  return null;
}

export function historyLength(scores: (number | null)[], idx: number): number {
  let n = 0;
  for (let i = 0; i <= idx; i++) if (scores[i] != null) n++;
  return n;
}

/** Momentum = score_t − score_{t−lag} (misma convención que delta_3m del pipeline). */
export function momentum(scores: (number | null)[], idx: number, lag = 3): number | null {
  const now = scores[idx];
  const before = idx - lag >= 0 ? scores[idx - lag] : null;
  if (now == null || before == null) return null;
  return now - before;
}

export function declineStreak(scores: (number | null)[], idx: number): number {
  let n = 0;
  for (let i = idx; i > 0; i--) {
    const a = scores[i], b = scores[i - 1];
    if (a == null || b == null || a >= b) break;
    n++;
  }
  return n;
}

export function riseStreak(scores: (number | null)[], idx: number): number {
  let n = 0;
  for (let i = idx; i > 0; i--) {
    const a = scores[i], b = scores[i - 1];
    if (a == null || b == null || a <= b) break;
    n++;
  }
  return n;
}

export function scoreVolatility(scores: (number | null)[], idx: number, window = 12): number | null {
  const diffs: number[] = [];
  for (let i = Math.max(1, idx - window + 1); i <= idx; i++) {
    const a = scores[i], b = scores[i - 1];
    if (a != null && b != null) diffs.push(a - b);
  }
  if (diffs.length < 3) return null;
  const mean = diffs.reduce((s, v) => s + v, 0) / diffs.length;
  return Math.sqrt(diffs.reduce((s, d) => s + (d - mean) ** 2, 0) / diffs.length);
}

export function minRecent(scores: (number | null)[], idx: number, window = 6): number | null {
  let m: number | null = null;
  for (let i = Math.max(0, idx - window + 1); i <= idx; i++) {
    const v = scores[i];
    if (v != null && (m == null || v < m)) m = v;
  }
  return m;
}

/** Tendencia: media de los 3 últimos meses vs los 3 anteriores, con la racha como desempate. */
export function trend(scores: (number | null)[], idx: number): Trend {
  if (idx < 0 || scores[idx] == null) return "stable";
  const recent: number[] = [], prior: number[] = [];
  for (let i = idx; i > idx - 3 && i >= 0; i--) if (scores[i] != null) recent.push(scores[i]!);
  for (let i = idx - 3; i > idx - 6 && i >= 0; i--) if (scores[i] != null) prior.push(scores[i]!);
  const ds = declineStreak(scores, idx), rs = riseStreak(scores, idx);
  if (ds >= 3 && scores[idx]! - scores[idx - ds]! <= -3) return "deteriorating";
  if (rs >= 3 && scores[idx]! - scores[idx - rs]! >= 3) return "improving";
  if (recent.length === 0 || prior.length === 0) return "stable";
  const d = recent.reduce((s, v) => s + v, 0) / recent.length - prior.reduce((s, v) => s + v, 0) / prior.length;
  if (d >= 3) return "improving";
  if (d <= -3) return "deteriorating";
  return "stable";
}

export function tier(score: number | null): Tier {
  if (score == null) return "watch";
  if (score >= 80) return "prime";
  if (score >= 70) return "healthy";
  if (score >= 40) return "watch";
  return "risk";
}

export function percentile(sortedAsc: number[], score: number): number {
  if (sortedAsc.length === 0) return 50;
  let lo = 0, hi = sortedAsc.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sortedAsc[mid] < score) lo = mid + 1; else hi = mid; }
  return (100 * lo) / sortedAsc.length;
}

/** Mayor contribución en valor absoluto = "el porqué" (README del pipeline). */
export function mainDriver(components: Components): { dim: Dimension; value: number } | null {
  let best: { dim: Dimension; value: number } | null = null;
  for (const dim of DIMENSIONS) {
    const v = components[dim];
    if (v == null) continue;
    if (!best || Math.abs(v) > Math.abs(best.value)) best = { dim, value: v };
  }
  return best;
}

export function componentsAt(c: CompanyIndex, idx: number): Components {
  const out = {} as Components;
  for (const d of DIMENSIONS) out[d] = c.components[d][idx] ?? null;
  return out;
}

export function componentDeclineStreak(series: (number | null)[], idx: number): number {
  let n = 0;
  for (let i = idx; i > 0; i--) {
    const a = series[i], b = series[i - 1];
    if (a == null || b == null || a >= b - 0.05) break;
    n++;
  }
  return n;
}

/** Percentil (0–100) de cada contribución en la red — ejes de la araña. */
export function componentRanks(companies: CompanyIndex[], idx: number): Record<Dimension, number[]> {
  const out = {} as Record<Dimension, number[]>;
  for (const d of DIMENSIONS) out[d] = companies.map((c) => c.components[d][idx]).filter((v): v is number => v != null).sort((a, b) => a - b);
  return out;
}

export function componentPercentiles(components: Components, ranks: Record<Dimension, number[]>): Record<Dimension, number | null> {
  const out = {} as Record<Dimension, number | null>;
  for (const d of DIMENSIONS) {
    const v = components[d];
    out[d] = v == null || ranks[d].length === 0 ? null : Math.round(percentile(ranks[d], v));
  }
  return out;
}

export function profileOverlap(a: Components, b: Components): number {
  let dot = 0, na = 0, nb = 0;
  for (const d of DIMENSIONS) {
    const x = a[d] ?? 0, y = b[d] ?? 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

// --------------------------------------------------------------------------------------------
// Evaluaciones del marketplace (prestamista / receptor), en castellano
// --------------------------------------------------------------------------------------------

export interface ProviderAssessment { qualified: boolean; capacity: number; reasons: string[]; blockers: string[] }

export function assessProvider(c: CompanyIndex, idx: number, allScoresSorted: number[]): ProviderAssessment {
  const s = scoreAt(c.scores, idx) ?? 0;
  const m = c.latest.metrics;
  const mom = momentum(c.scores, idx);
  const vol = scoreVolatility(c.scores, idx);
  const floor = minRecent(c.scores, idx);
  const nStress = c.stress[idx] ?? 0;
  const liq = c.components.liquidez[idx];
  const reasons: string[] = [];
  const blockers: string[] = [];
  if (s >= 75) reasons.push(`Score ${s.toFixed(0)}: top ${Math.max(1, Math.round(100 - percentile(allScoresSorted, s)))} % de la red`);
  else blockers.push(`Score ${s.toFixed(0)}, por debajo del umbral 75 de prestamista`);
  if (c.alerts[idx] !== 1) reasons.push("Fuera del 20 % peor del mes");
  else blockers.push("Está en el 20 % peor de la red este mes");
  if (nStress === 0) reasons.push("Sin alarmas de estrés activas");
  else blockers.push(`${nStress} alarma${nStress > 1 ? "s" : ""} de estrés activa${nStress > 1 ? "s" : ""}`);
  const hist = historyLength(c.scores, idx);
  if (hist >= 12) reasons.push(`${hist} meses de historia puntuada`);
  else blockers.push(`Solo ${hist} meses de historia (se piden 12)`);
  if (floor != null && floor >= 60) reasons.push(`Nunca por debajo de ${floor.toFixed(0)} en 6 meses`);
  else if (floor != null) blockers.push(`Bajó a ${floor.toFixed(0)} en los últimos 6 meses`);
  const liqOk = (liq != null && liq >= -5) || ((m.runway ?? 0) >= 12 && (m.dias_negativo ?? 1) === 0);
  if (liqOk) {
    if (m.runway != null && m.runway >= 24) reasons.push("Runway de 24+ meses al ritmo actual");
    else if (liq != null && liq >= 0) reasons.push(`La liquidez suma ${liq.toFixed(1)} pts al score`);
    else reasons.push("La liquidez no lastra el score");
    if (m.dias_negativo === 0) reasons.push("Cero días en descubierto este mes");
  } else blockers.push("La liquidez es el principal lastre del score");
  if (mom != null && mom >= 3) reasons.push(`Momentum +${mom.toFixed(1)} pts en 3 meses`);
  if (m.retraso_pago != null && m.retraso_pago <= 0) reasons.push("Paga a proveedores en plazo o antes");
  const qualified = blockers.length === 0;
  const scoreNorm = clamp01((s - 60) / 35);
  const stability = clamp01(1 - (vol ?? 4) / 12);
  const liqParts: number[] = [];
  if (m.runway != null) liqParts.push(clamp01(m.runway / 24));
  if (m.colchon != null) liqParts.push(clamp01(m.colchon / 2));
  if (m.dias_negativo != null) liqParts.push(m.dias_negativo === 0 ? 1 : 0);
  if (liq != null) liqParts.push(clamp01((liq + 10) / 20));
  const liqSignal = liqParts.length ? liqParts.reduce((a, b) => a + b, 0) / liqParts.length : 0.5;
  const momNorm = clamp01(((mom ?? 0) + 10) / 20);
  const capacity = Math.round(100 * (0.45 * scoreNorm + 0.2 * stability + 0.2 * liqSignal + 0.15 * momNorm));
  return { qualified, capacity, reasons, blockers };
}

export interface ReceiverAssessment { eligible: boolean; fit: number; need: number; health: number; needSignals: string[]; strengths: string[]; risks: string[] }

export function assessReceiver(c: CompanyIndex, idx: number): ReceiverAssessment {
  const s = scoreAt(c.scores, idx) ?? 0;
  const m = c.latest.metrics;
  const nStress = c.stress[idx] ?? 0;
  const strengths: string[] = [], risks: string[] = [], needSignals: string[] = [];
  if (s >= 60) strengths.push(`Score ${s.toFixed(0)}, por encima del suelo 60 de financiación`);
  else risks.push(`Score ${s.toFixed(0)}, por debajo del suelo 60 de financiación`);
  if (c.alerts[idx] !== 1) strengths.push("Fuera del 20 % peor de la red");
  else risks.push("En el 20 % peor de la red");
  if (nStress <= 1) { if (nStress === 0) strengths.push("Sin alarmas de estrés"); } else risks.push(`${nStress} alarmas de estrés activas`);
  if (m.retraso_pago != null) {
    if (m.retraso_pago <= 5) strengths.push(m.retraso_pago <= 0 ? "Paga a proveedores a tiempo" : `Paga como mucho ${Math.round(m.retraso_pago)} días tarde`);
    else risks.push(`Paga a proveedores ${Math.round(m.retraso_pago)} días tarde`);
  }
  if (m.pct_pago_tarde != null) {
    if (m.pct_pago_tarde <= 0.5) { if (m.pct_pago_tarde <= 0.15) strengths.push(`Solo el ${Math.round(m.pct_pago_tarde * 100)} % de pagos fuera de plazo`); }
    else risks.push(`${Math.round(m.pct_pago_tarde * 100)} % de pagos fuera de plazo`);
  }
  const tr = trend(c.scores, idx);
  if (tr === "improving") strengths.push("Score mejorando en el último trimestre");
  if (tr === "deteriorating") risks.push("Score deteriorándose en el último trimestre");
  const pago = c.components.pago[idx];
  if (pago != null && pago >= 0) strengths.push(`El comportamiento de pago suma ${pago.toFixed(1)} pts`);
  let need = 0;
  if (m.runway != null && m.runway < 12) { need += 1; needSignals.push(`Runway de ${fmtMetric("runway", m.runway)} al ritmo actual`); }
  if (m.neto_operativo != null && m.neto_operativo < 0) { need += 1; needSignals.push("Quema caja operativa este mes"); }
  if (m.colchon != null && m.colchon < 0.5) { need += 1; needSignals.push(`Colchón de ${fmtMetric("colchon", m.colchon)} de salidas mensuales`); }
  if (m.pct_dispuesto != null && m.pct_dispuesto > 0.5) { need += 1; needSignals.push(`Líneas dispuestas al ${Math.round(m.pct_dispuesto * 100)} %`); }
  if (m.credito_disponible != null && m.credito_disponible < 0.5) { need += 0.5; needSignals.push("Poco crédito sin disponer"); }
  if (m.dso != null && m.dso > 30) { need += 0.5; needSignals.push(`Los clientes tardan ${Math.round(m.dso)} días en pagar`); }
  if (m.crecimiento_cobros != null && m.crecimiento_cobros > 0.2) { need += 1; needSignals.push(`Cobros creciendo ${Math.round(Math.min(m.crecimiento_cobros, 5) * 100)} % interanual: circulante que financiar`); }
  const needIdx = Math.round(100 * clamp01(need / 4));
  const health = Math.round(100 * clamp01((s - 60) / 30));
  const eligible = risks.length === 0 && s >= 60;
  const fit = eligible ? Math.round(100 * Math.sqrt((needIdx / 100) * Math.max(0.15, health / 100))) : 0;
  return { eligible, fit, need: needIdx, health, needSignals, strengths, risks };
}

export function describeComponent(dim: Dimension, v: number | null): string {
  if (v == null) return `${DIM_LABEL[dim]}: no medible (sin datos)`;
  if (Math.abs(v) < 1) return `${DIM_LABEL[dim]} es neutra`;
  return `${DIM_LABEL[dim]} ${v > 0 ? "suma" : "resta"} ${Math.abs(v).toFixed(1)} pts`;
}
