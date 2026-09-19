/**
 * DERIVED CALCULATIONS — the only place where numbers not present in the pipeline outputs are produced.
 *
 * Every function here is a deterministic transformation of real v3 score fields
 * (score history, dimension contributions c_<dim>, alert, n_stress and the base metrics).
 * Nothing external, nothing random.
 */
import type { CompanyIndex, Dimension } from "./types";
import { DIMENSIONS } from "./types";
import { DIM_LABEL, fmtDelta, fmtMetric } from "./format";

export type Trend = "improving" | "stable" | "deteriorating";
export type Tier = "prime" | "healthy" | "watch" | "risk";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Index of a month in meta.months (−1 if absent). */
export function monthIndex(months: string[], month: string): number {
  return months.indexOf(month);
}

/** Last non-null score at or before idx. */
export function scoreAt(scores: (number | null)[], idx: number): number | null {
  for (let i = idx; i >= 0; i--) if (scores[i] != null) return scores[i];
  return null;
}

/** Number of scored months up to and including idx. */
export function historyLength(scores: (number | null)[], idx: number): number {
  let n = 0;
  for (let i = 0; i <= idx; i++) if (scores[i] != null) n++;
  return n;
}

/** Momentum = score_t − score_{t−3}. Same convention as the pipeline's metric `delta_3m`. */
export function momentum(scores: (number | null)[], idx: number, lag = 3): number | null {
  const now = scores[idx];
  const before = idx - lag >= 0 ? scores[idx - lag] : null;
  if (now == null || before == null) return null;
  return now - before;
}

/** Consecutive months of decline ending at idx. Same idea as the pipeline's `racha`. */
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

/** Std-dev of month-over-month score changes over the last `window` months. */
export function scoreVolatility(scores: (number | null)[], idx: number, window = 12): number | null {
  const diffs: number[] = [];
  for (let i = Math.max(1, idx - window + 1); i <= idx; i++) {
    const a = scores[i], b = scores[i - 1];
    if (a != null && b != null) diffs.push(a - b);
  }
  if (diffs.length < 3) return null;
  const mean = diffs.reduce((s, v) => s + v, 0) / diffs.length;
  const v = diffs.reduce((s, d) => s + (d - mean) ** 2, 0) / diffs.length;
  return Math.sqrt(v);
}

/** Minimum score over the last `window` months (stability floor). */
export function minRecent(scores: (number | null)[], idx: number, window = 6): number | null {
  let m: number | null = null;
  for (let i = Math.max(0, idx - window + 1); i <= idx; i++) {
    const v = scores[i];
    if (v != null && (m == null || v < m)) m = v;
  }
  return m;
}

/** Trend label: mean of last 3 months vs. the 3 before, with the decline streak as a tie-breaker. */
export function trend(scores: (number | null)[], idx: number): Trend {
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

/** Tiers follow the pipeline README semaphore (≥70 green, 40–70 amber, <40 red) with a split at 80. */
export function tier(score: number | null): Tier {
  if (score == null) return "watch";
  if (score >= 80) return "prime";
  if (score >= 70) return "healthy";
  if (score >= 40) return "watch";
  return "risk";
}

export const TIER_LABEL: Record<Tier, string> = { prime: "Prime", healthy: "Healthy", watch: "Watch", risk: "At risk" };

/** Percentile rank of `score` among `all` (0–100, higher = better). */
export function percentile(all: number[], score: number): number {
  if (all.length === 0) return 50;
  let below = 0;
  for (const v of all) if (v < score) below++;
  return (100 * below) / all.length;
}

/** Largest dimension contribution in absolute value = "the why" per the pipeline README. */
export function mainDriver(components: Record<Dimension, number | null>): { dim: Dimension; value: number } | null {
  let best: { dim: Dimension; value: number } | null = null;
  for (const dim of DIMENSIONS) {
    const v = components[dim];
    if (v == null) continue;
    if (!best || Math.abs(v) > Math.abs(best.value)) best = { dim, value: v };
  }
  return best;
}

/** Consecutive months a dimension contribution has fallen, ending at idx. */
export function componentDeclineStreak(series: (number | null)[], idx: number): number {
  let n = 0;
  for (let i = idx; i > 0; i--) {
    const a = series[i], b = series[i - 1];
    if (a == null || b == null || a >= b - 0.05) break;
    n++;
  }
  return n;
}

// ---------------------------------------------------------------------------------------------
// Capital-provider assessment
// ---------------------------------------------------------------------------------------------

export interface ProviderAssessment {
  qualified: boolean;
  /** 0–100 composite of score level, stability, liquidity signals and momentum */
  capacity: number;
  reasons: string[];
  blockers: string[];
}

export function assessProvider(c: CompanyIndex, months: string[], allLatestScores: number[]): ProviderAssessment {
  const idx = months.length - 1;
  const s = c.latest.score;
  const m = c.latest.metrics;
  const mom = momentum(c.scores, idx);
  const vol = scoreVolatility(c.scores, idx);
  const floor = minRecent(c.scores, idx);
  const nStress = c.latest.nStress ?? 0;
  const liq = c.latest.components.liquidez;
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (s >= 75) reasons.push(`Score ${s.toFixed(0)} — top ${Math.max(1, Math.round(100 - percentile(allLatestScores, s)))}% of the network`);
  else blockers.push(`Score ${s.toFixed(0)} below the 75 provider threshold`);
  if (c.latest.alert === 0) reasons.push("Not in the bottom 20% of any recent month");
  else blockers.push("Currently flagged in the bottom 20% of the network");
  if (nStress === 0) reasons.push("No stress flags active (overdraft, missed payroll, lines at limit…)");
  else blockers.push(`${nStress} stress flag${nStress > 1 ? "s" : ""} active`);
  if (c.nScored >= 12) reasons.push(`${c.nScored} months of scored history`);
  else blockers.push(`Only ${c.nScored} months of history (12 required)`);
  if (floor != null && floor >= 60) reasons.push(`Never below ${floor.toFixed(0)} in the last 6 months`);
  else if (floor != null) blockers.push(`Dipped to ${floor.toFixed(0)} within the last 6 months`);
  const liqOk = (liq != null && liq >= -5) || ((m.runway ?? 0) >= 12 && (m.dias_negativo ?? 1) === 0);
  if (liqOk) {
    if (m.runway != null && m.runway >= 24) reasons.push("Runway 24+ months at current burn");
    else if (liq != null && liq >= 0) reasons.push(`Liquidity adds ${fmtDelta(liq)} pts to the score`);
    else reasons.push("Liquidity is not dragging the score");
    if (m.dias_negativo === 0) reasons.push("Zero days in overdraft this month");
  } else blockers.push("Liquidity is the main drag on the score");
  if (mom != null && mom >= 3) reasons.push(`Momentum ${fmtDelta(mom)} pts over 3 months`);
  if (m.retraso_pago != null && m.retraso_pago <= 0) reasons.push("Pays suppliers on or before due date");

  const qualified = blockers.length === 0;

  // capacity index — weights are a product choice, inputs are all score fields
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

// ---------------------------------------------------------------------------------------------
// Financing-receiver assessment: healthy enough to finance × visible need for capital
// ---------------------------------------------------------------------------------------------

export interface ReceiverAssessment {
  eligible: boolean;
  /** 0–100 geometric mean of health and need (both required) */
  fit: number;
  /** 0–100 intensity of financing-need signals */
  need: number;
  /** 0–100 health above the 60 floor */
  health: number;
  needSignals: string[];
  strengths: string[];
  risks: string[];
}

export function assessReceiver(c: CompanyIndex, months: string[]): ReceiverAssessment {
  const idx = months.length - 1;
  const s = c.latest.score;
  const m = c.latest.metrics;
  const nStress = c.latest.nStress ?? 0;
  const strengths: string[] = [];
  const risks: string[] = [];
  const needSignals: string[] = [];

  if (s >= 60) strengths.push(`Score ${s.toFixed(0)} — above the 60 financing floor`);
  else risks.push(`Score ${s.toFixed(0)} below the 60 financing floor`);
  if (c.latest.alert === 0) strengths.push("Not in the bottom 20% of the network");
  else risks.push("Flagged in the bottom 20% of the network");
  if (nStress <= 1) {
    if (nStress === 0) strengths.push("No stress flags active");
  } else risks.push(`${nStress} stress flags active`);
  if (m.retraso_pago != null) {
    if (m.retraso_pago <= 5) strengths.push(m.retraso_pago <= 0 ? "Pays suppliers on time" : `Pays suppliers ${Math.round(m.retraso_pago)} days late at most`);
    else risks.push(`Pays suppliers ${Math.round(m.retraso_pago)} days late`);
  }
  if (m.pct_pago_tarde != null) {
    if (m.pct_pago_tarde <= 0.5) { if (m.pct_pago_tarde <= 0.15) strengths.push(`Only ${Math.round(m.pct_pago_tarde * 100)}% of payables paid late`); }
    else risks.push(`${Math.round(m.pct_pago_tarde * 100)}% of payables paid late`);
  }
  const tr = trend(c.scores, idx);
  if (tr === "improving") strengths.push("Score improving over the last quarter");
  if (tr === "deteriorating") risks.push("Score deteriorating over the last quarter");
  const pago = c.latest.components.pago;
  if (pago != null && pago >= 0) strengths.push(`Payment behaviour adds ${fmtDelta(pago)} pts`);

  let need = 0;
  if (m.runway != null && m.runway < 12) { need += 1; needSignals.push(`Runway ${fmtMetric("runway", m.runway)} at current burn`); }
  if (m.neto_operativo != null && m.neto_operativo < 0) { need += 1; needSignals.push("Operating cash burn this month"); }
  if (m.colchon != null && m.colchon < 0.5) { need += 1; needSignals.push(`Cash cushion ${fmtMetric("colchon", m.colchon)} of monthly outflows`); }
  if (m.pct_dispuesto != null && m.pct_dispuesto > 0.5) { need += 1; needSignals.push(`Credit lines ${Math.round(m.pct_dispuesto * 100)}% drawn`); }
  if (m.credito_disponible != null && m.credito_disponible < 0.5) { need += 0.5; needSignals.push("Little undrawn credit left"); }
  if (m.dso != null && m.dso > 30) { need += 0.5; needSignals.push(`Customers take ${Math.round(m.dso)} days to pay`); }
  if (m.crecimiento_cobros != null && m.crecimiento_cobros > 0.2) { need += 1; needSignals.push(`Collections growing ${Math.round(Math.min(m.crecimiento_cobros, 5) * 100)}% YoY — working capital to fund`); }
  const needIdx = Math.round(100 * clamp01(need / 4));
  const health = Math.round(100 * clamp01((s - 60) / 30));
  const eligible = risks.length === 0 && s >= 60;
  const fit = eligible ? Math.round(100 * Math.sqrt((needIdx / 100) * Math.max(0.15, health / 100))) : 0;
  return { eligible, fit, need: needIdx, health, needSignals, strengths, risks };
}

/** Plain-language reading of a dimension contribution. */
export function describeComponent(dim: Dimension, v: number | null): string {
  if (v == null) return `${DIM_LABEL[dim]}: not measurable (no data)`;
  if (Math.abs(v) < 1) return `${DIM_LABEL[dim]} is neutral`;
  return `${DIM_LABEL[dim]} ${v > 0 ? "adds" : "removes"} ${Math.abs(v).toFixed(1)} pts`;
}
