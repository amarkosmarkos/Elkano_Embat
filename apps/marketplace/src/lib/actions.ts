/**
 * ACTION CENTER — recommendations derived from score behaviour, plus a deterministic simulation
 * of what accepting them does to the portfolio composition.
 */
import { DIM_LABEL, fmtDelta, fmtMonth, STRESS_LABEL } from "./format";
import type { MonitorSnapshot, PositionTimeline } from "./monitor";
import { summarize, type PortfolioResult, type Position } from "./portfolio";
import type { NetworkData, StressFlag } from "./types";

export type ActionKind = "pause" | "reduce" | "review" | "monitor" | "increase";

/** An executed action: permanently rescales a position (recorded so it can be undone). */
export interface ExecutedAction { id: string; kind: ActionKind; multiplier: number; month: string; scoreThen: number }

export interface Recommendation {
  id: string;
  kind: ActionKind;
  title: string;
  severity: 0 | 1 | 2 | 3;
  reasons: string[];
  /** multiplier applied to the position weight when the action is simulated */
  multiplier: number;
  timeline: PositionTimeline;
}

export const ACTION_META: Record<ActionKind, { label: string; verb: string; tone: "negative" | "warn" | "neutral" | "positive"; effect: string }> = {
  pause: { label: "Pause additional financing", verb: "Pause", tone: "negative", effect: "Freeze new financing and trim the position by 25%" },
  reduce: { label: "Reduce exposure", verb: "Reduce", tone: "negative", effect: "Cut the position in half, capital back to reserve" },
  review: { label: "Review exposure", verb: "Review", tone: "warn", effect: "Trim the position by 15% pending review" },
  monitor: { label: "Keep monitoring", verb: "Monitor", tone: "neutral", effect: "No change" },
  increase: { label: "Increase exposure", verb: "Increase", tone: "positive", effect: "Grow the position by 25%, up to the exposure cap" },
};

/** Apply executed actions to the base portfolio (weights rescaled, freed capital → reserve). */
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

export function recommend(snapshot: MonitorSnapshot, network: NetworkData): Recommendation[] {
  const byId = new Map(network.companies.map((c) => [c.id, c]));
  const recs: Recommendation[] = snapshot.positions.map((t) => {
    const c = byId.get(t.position.id)!;
    const reasons: string[] = [];
    const from = t.scoreAtAllocation.toFixed(0), to = t.scoreNow.toFixed(0);
    if (Math.abs(t.delta) >= 4) reasons.push(`Overall score ${t.delta < 0 ? "fell" : "improved"} from ${from} to ${to} since allocation (${fmtDelta(t.delta, 1)} pts)`);
    if (t.driver && Math.abs(t.driver.delta) >= 3) reasons.push(`${DIM_LABEL[t.driver.dim]} component ${t.driver.delta < 0 ? "fell" : "rose"} ${Math.abs(t.driver.delta).toFixed(1)} pts`);
    if (t.driver && t.driverStreak >= 2 && t.driver.delta < 0) reasons.push(`${DIM_LABEL[t.driver.dim]} deteriorated for ${t.driverStreak} consecutive periods`);
    if (t.declineStreak >= 2) reasons.push(`Score declined ${t.declineStreak} consecutive months`);
    else if (t.declinesInLast4 >= 3 && t.delta < 0) reasons.push(`Down in ${t.declinesInLast4} of the last 4 months`);
    if (t.riseStreak >= 2 && t.delta > 0) reasons.push(`Score rose ${t.riseStreak} consecutive months`);
    if (t.onsetMonth) reasons.push(`Deterioration started ${fmtMonth(t.onsetMonth, "long")}`);
    if (t.alertNow) reasons.push("Now in the bottom 20% of the network this month");
    const flags = (Object.keys(STRESS_LABEL) as StressFlag[]).filter((f) => c.latest.stress[f] === 1 && snapshot.month === c.latest.month);
    if (t.stressNow > 0) reasons.push(flags.length ? `Stress flags active: ${flags.map((f) => STRESS_LABEL[f]).join(", ")}` : `${t.stressNow} stress flag${t.stressNow > 1 ? "s" : ""} active`);
    if (!t.persistent && t.delta <= -8) reasons.push("Move is recent — could still be a one-month anomaly");
    if (t.persistent && t.delta <= -8) reasons.push("Move is persistent, not a single-month anomaly");

    let kind: ActionKind = "monitor";
    let severity: Recommendation["severity"] = 0;
    let multiplier = 1;
    if (t.delta <= -15 && t.persistent) { kind = "reduce"; severity = 3; multiplier = 0.5; }
    else if ((t.alertNow && t.delta <= -8) || t.delta <= -20) { kind = "pause"; severity = 3; multiplier = 0.75; }
    else if (t.delta <= -8 || t.declineStreak >= 3) { kind = "review"; severity = 2; multiplier = 0.85; }
    else if (t.delta >= 10 && t.scoreNow >= 75 && t.riseStreak >= 2) { kind = "increase"; severity = 1; multiplier = 1.25; }
    else if (t.status === "watch") { kind = "review"; severity = 1; multiplier = 1; }
    if (kind === "monitor" && reasons.length === 0) reasons.push(`Score ${to}, ${t.delta >= 0 ? "" : "−"}${Math.abs(t.delta).toFixed(1)} pts since allocation — within normal range`);
    return { id: t.position.id, kind, title: ACTION_META[kind].label, severity, reasons, multiplier, timeline: t };
  });
  return recs.sort((a, b) => b.severity - a.severity || a.timeline.delta - b.timeline.delta);
}

/** Apply accepted actions: rescale weights, freed capital becomes reserve, increases capped by maxExposure. */
export function simulate(result: PortfolioResult, recs: Recommendation[], accepted: Set<string>, snapshot: MonitorSnapshot): PortfolioResult {
  const byRec = new Map(recs.map((r) => [r.id, r]));
  const nowScore = new Map(snapshot.positions.map((t) => [t.position.id, t.scoreNow]));
  const positions: Position[] = result.positions.map((p) => {
    const r = byRec.get(p.id);
    let w = p.weight;
    if (r && accepted.has(p.id)) w = Math.min(result.config.maxExposure, p.weight * r.multiplier);
    return { ...p, weight: w, amount: Math.round(w * result.config.capital), score: nowScore.get(p.id) ?? p.score };
  });
  const share = positions.reduce((s, p) => s + p.weight, 0);
  return summarize(result.config, positions, result.universe, result.eligible, Math.min(1, share));
}

/** Same portfolio re-valued at the monitor month, without any action (baseline for the simulation). */
export function revalue(result: PortfolioResult, snapshot: MonitorSnapshot): PortfolioResult {
  const nowScore = new Map(snapshot.positions.map((t) => [t.position.id, t.scoreNow]));
  const positions = result.positions.map((p) => ({ ...p, score: nowScore.get(p.id) ?? p.score }));
  const share = positions.reduce((s, p) => s + p.weight, 0);
  return summarize(result.config, positions, result.universe, result.eligible, Math.min(1, share));
}
