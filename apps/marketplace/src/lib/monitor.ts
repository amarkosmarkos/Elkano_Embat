/**
 * CONTINUOUS MONITORING — replays the real score history of the portfolio after the allocation month.
 * Every figure is derived from scores / dimension contributions / alerts / stress counts.
 */
import type { Dimension, NetworkData } from "./types";
import { DIMENSIONS } from "./types";
import { componentDeclineStreak, declineStreak, riseStreak } from "./derived";
import type { PortfolioResult, Position } from "./portfolio";

export type PositionStatus = "deteriorating" | "improving" | "watch" | "stable";

export interface PositionTimeline {
  position: Position;
  /** scores from allocation month to current month (inclusive) */
  window: (number | null)[];
  windowMonths: string[];
  scoreAtAllocation: number;
  scoreNow: number;
  delta: number;
  deltaPrev: number | null;
  declineStreak: number;
  riseStreak: number;
  declinesInLast4: number;
  alertNow: boolean;
  stressNow: number;
  status: PositionStatus;
  /** true when the move is sustained, not a single-month anomaly */
  persistent: boolean;
  onsetMonth: string | null;
  componentDeltas: Record<Dimension, number | null>;
  driver: { dim: Dimension; delta: number } | null;
  driverStreak: number;
  meaningful: boolean;
}

export interface MonitorSnapshot {
  month: string;
  monthIdx: number;
  positions: PositionTimeline[];
  avgAtAllocation: number;
  avgNow: number;
  expectedStressNow: number;
  weightedDelta: number;
  nDeteriorating: number;
  nImproving: number;
  nWatch: number;
  nAlerts: number;
  exposureDeteriorating: number;
}

export function monitorSnapshot(network: NetworkData, result: PortfolioResult, month: string): MonitorSnapshot {
  const months = network.meta.months;
  const startIdx = months.indexOf(result.config.asOf);
  const idx = months.indexOf(month);
  const byId = new Map(network.companies.map((c) => [c.id, c]));
  const wSum = result.positions.reduce((s, p) => s + p.weight, 0) || 1;

  const positions: PositionTimeline[] = result.positions.map((p) => {
    const c = byId.get(p.id)!;
    const window = c.scores.slice(startIdx, idx + 1);
    const windowMonths = months.slice(startIdx, idx + 1);
    const scoreAtAllocation = c.scores[startIdx] ?? p.score;
    let scoreNow = scoreAtAllocation;
    for (let i = idx; i >= startIdx; i--) if (c.scores[i] != null) { scoreNow = c.scores[i]!; break; }
    const prev = idx - 1 >= startIdx ? c.scores[idx - 1] : null;
    const delta = scoreNow - scoreAtAllocation;
    const dStreak = declineStreak(c.scores, idx);
    const rStreak = riseStreak(c.scores, idx);
    let declinesInLast4 = 0;
    for (let i = idx; i > idx - 4 && i > startIdx; i--) {
      const a = c.scores[i], b = c.scores[i - 1];
      if (a != null && b != null && a < b) declinesInLast4++;
    }
    const alertNow = c.alerts[idx] === 1;
    const stressNow = c.stress[idx] ?? 0;

    // onset: first month after allocation where the drawdown from the running peak exceeds 5 pts
    let onsetMonth: string | null = null;
    if (delta <= -8) {
      let peak = scoreAtAllocation;
      for (let i = startIdx + 1; i <= idx; i++) {
        const v = c.scores[i];
        if (v == null) continue;
        if (peak - v > 5 && onsetMonth == null) onsetMonth = months[i];
        if (v > peak) { peak = v; onsetMonth = null; }
      }
    }
    const componentDeltas = {} as Record<Dimension, number | null>;
    let driver: PositionTimeline["driver"] = null;
    for (const dim of DIMENSIONS) {
      const a = c.components[dim][startIdx], b = c.components[dim][idx];
      const d = a != null && b != null ? b - a : null;
      componentDeltas[dim] = d;
      if (d != null && (!driver || Math.abs(d) > Math.abs(driver.delta))) driver = { dim, delta: d };
    }
    const driverStreak = driver ? componentDeclineStreak(c.components[driver.dim], idx) : 0;
    const persistent = delta <= -8 ? dStreak >= 3 || declinesInLast4 >= 3 : delta >= 8 ? rStreak >= 2 : false;
    const monthsElapsed = idx - startIdx;
    let status: PositionStatus = "stable";
    if (delta <= -8 && (persistent || monthsElapsed <= 2 || alertNow || delta <= -15)) status = "deteriorating";
    else if (delta >= 8) status = "improving";
    else if (alertNow || (dStreak >= 2 && delta <= -4) || delta <= -8) status = "watch";
    const meaningful = status !== "stable" || Math.abs(delta) >= 8 || dStreak >= 3;
    return {
      position: p, window, windowMonths, scoreAtAllocation, scoreNow, delta, deltaPrev: prev != null ? scoreNow - prev : null,
      declineStreak: dStreak, riseStreak: rStreak, declinesInLast4, alertNow, stressNow, status, persistent, onsetMonth,
      componentDeltas, driver, driverStreak, meaningful,
    };
  });

  const avgAtAllocation = positions.reduce((s, t) => s + (t.position.weight / wSum) * t.scoreAtAllocation, 0);
  const avgNow = positions.reduce((s, t) => s + (t.position.weight / wSum) * t.scoreNow, 0);
  const expectedStressNow = positions.reduce((s, t) => s + (t.position.weight / wSum) * (100 - t.scoreNow), 0) / 100;
  return {
    month, monthIdx: idx, positions, avgAtAllocation, avgNow, expectedStressNow,
    weightedDelta: avgNow - avgAtAllocation,
    nDeteriorating: positions.filter((t) => t.status === "deteriorating").length,
    nImproving: positions.filter((t) => t.status === "improving").length,
    nWatch: positions.filter((t) => t.status === "watch").length,
    nAlerts: positions.filter((t) => t.alertNow).length,
    exposureDeteriorating: positions.filter((t) => t.status === "deteriorating").reduce((s, t) => s + t.position.weight / wSum, 0),
  };
}

/** Portfolio weighted-average score for every month from allocation to the end of the dataset. */
export function portfolioTrajectory(network: NetworkData, result: PortfolioResult): { month: string; avg: number; stress: number }[] {
  const months = network.meta.months;
  const startIdx = months.indexOf(result.config.asOf);
  const byId = new Map(network.companies.map((c) => [c.id, c]));
  const wSum = result.positions.reduce((s, p) => s + p.weight, 0) || 1;
  const out: { month: string; avg: number; stress: number }[] = [];
  for (let i = startIdx; i < months.length; i++) {
    let avg = 0, stress = 0;
    for (const p of result.positions) {
      const c = byId.get(p.id)!;
      let s = p.score;
      for (let k = i; k >= startIdx; k--) if (c.scores[k] != null) { s = c.scores[k]!; break; }
      avg += (p.weight / wSum) * s;
      stress += (p.weight / wSum) * (100 - s);
    }
    out.push({ month: months[i], avg, stress: stress / 100 });
  }
  return out;
}
