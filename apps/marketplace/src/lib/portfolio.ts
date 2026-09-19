/**
 * PORTFOLIO CONSTRUCTION — deterministic allocator over the score dataset.
 *
 * Inputs: the network index (score history, alerts, stress counts, groups) and a config.
 * No randomness. Uses only information available at the allocation month (no look-ahead).
 */
import type { CompanyIndex, NetworkData } from "./types";
import { historyLength, momentum, scoreVolatility, tier, type Tier } from "./derived";

export type RiskTolerance = "conservative" | "balanced" | "growth";

export interface PortfolioConfig {
  capital: number;
  risk: RiskTolerance;
  /** max share of capital in a single company (0–1) */
  maxExposure: number;
  minScore: number;
  /** max positions per business group */
  maxPerGroup: number;
  targetPositions: number;
  /** allocation month (YYYY-MM) — only scores ≤ this month are used */
  asOf: string;
}

export interface Position {
  id: string;
  name: string;
  group: string | null;
  weight: number;
  amount: number;
  score: number;
  momentum: number | null;
  volatility: number | null;
  rank: number;
  rankScore: number;
  tier: Tier;
}

export interface PortfolioResult {
  config: PortfolioConfig;
  positions: Position[];
  allocated: number;
  reserve: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  /** Σ w·(100 − score)/100 — score is literally 100 − P(stress event in 3–6 months) */
  expectedStress: number;
  hhi: number;
  effectiveN: number;
  topWeight: number;
  groups: number;
  universe: number;
  eligible: number;
  tiers: Record<Tier, number>;
  histogram: { from: number; to: number; count: number; weight: number }[];
}

export const RISK_PRESETS: Record<RiskTolerance, { label: string; blurb: string; wScore: number; wMomentum: number; wStability: number; maxStress: number; gamma: number }> = {
  conservative: { label: "Conservative", blurb: "Highest scores, lowest volatility, no stress flags.", wScore: 0.6, wMomentum: 0.1, wStability: 0.3, maxStress: 0, gamma: 2.5 },
  balanced: { label: "Balanced", blurb: "Score first, rewards momentum and stability equally.", wScore: 0.5, wMomentum: 0.25, wStability: 0.25, maxStress: 1, gamma: 2.0 },
  growth: { label: "Growth", blurb: "Tilts to rising scores; accepts one active stress flag.", wScore: 0.35, wMomentum: 0.45, wStability: 0.2, maxStress: 1, gamma: 1.5 },
};

export const DEFAULT_CONFIG: PortfolioConfig = {
  capital: 25_000_000,
  risk: "balanced",
  maxExposure: 0.1,
  minScore: 72,
  maxPerGroup: 1,
  targetPositions: 18,
  asOf: "2026-02",
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

interface Candidate { c: CompanyIndex; score: number; mom: number | null; vol: number | null; rankScore: number }

export function buildPortfolio(network: NetworkData, config: PortfolioConfig): PortfolioResult {
  const months = network.meta.months;
  const idx = months.indexOf(config.asOf);
  if (idx < 0) throw new Error(`asOf ${config.asOf} not in dataset`);
  const preset = RISK_PRESETS[config.risk];

  // 1. universe: scored at asOf, not alerted, within stress tolerance, ≥ 6 months of history
  let universe = 0;
  const cands: Candidate[] = [];
  for (const c of network.companies) {
    const s = c.scores[idx];
    if (s == null) continue;
    universe++;
    if (c.alerts[idx] === 1) continue;
    if ((c.stress[idx] ?? 0) > preset.maxStress) continue;
    if (historyLength(c.scores, idx) < 6) continue;
    if (s < config.minScore) continue;
    const mom = momentum(c.scores, idx);
    const vol = scoreVolatility(c.scores, idx);
    const scoreNorm = clamp01((s - config.minScore) / Math.max(1, 100 - config.minScore));
    const momNorm = clamp01(((mom ?? 0) + 10) / 20);
    const stab = clamp01(1 - (vol ?? 5) / 12);
    const rankScore = preset.wScore * scoreNorm + preset.wMomentum * momNorm + preset.wStability * stab;
    cands.push({ c, score: s, mom, vol, rankScore });
  }
  // deterministic order: rank score desc, then score desc, then id
  cands.sort((a, b) => b.rankScore - a.rankScore || b.score - a.score || a.c.id.localeCompare(b.c.id));

  // 2. selection with group diversification
  const perGroup = new Map<string, number>();
  const chosen: Candidate[] = [];
  const minNeeded = Math.ceil(1 / config.maxExposure); // positions required to place all capital under the cap
  const target = Math.max(config.targetPositions, minNeeded);
  for (const cand of cands) {
    if (chosen.length >= target) break;
    const g = cand.c.group ?? cand.c.id;
    const n = perGroup.get(g) ?? 0;
    if (n >= config.maxPerGroup) continue;
    perGroup.set(g, n + 1);
    chosen.push(cand);
  }

  // 3. weights ∝ (rank score rescaled to [0.35, 1])^gamma, capped at maxExposure with iterative redistribution
  const rMin = Math.min(...chosen.map((x) => x.rankScore)), rMax = Math.max(...chosen.map((x) => x.rankScore));
  const raw = chosen.map((x) => Math.pow(0.35 + 0.65 * (rMax > rMin ? (x.rankScore - rMin) / (rMax - rMin) : 1), preset.gamma));
  const rawSum = raw.reduce((a, b) => a + b, 0);
  let weights = raw.map((r) => r / rawSum);
  const capped = new Set<number>(); // once a position hits the cap it stays there (water-filling)
  for (let iter = 0; iter < 50; iter++) {
    weights.forEach((w, i) => { if (w > config.maxExposure + 1e-9) capped.add(i); });
    const freeIdx = weights.map((_, i) => i).filter((i) => !capped.has(i));
    const room = 1 - capped.size * config.maxExposure;
    const freeRaw = freeIdx.reduce((s, i) => s + raw[i], 0);
    if (freeIdx.length === 0 || room <= 0) { weights = weights.map(() => config.maxExposure); break; }
    const next = weights.map((_, i) => (capped.has(i) ? config.maxExposure : (raw[i] / freeRaw) * room));
    const stable = next.every((w) => w <= config.maxExposure + 1e-9);
    weights = next;
    if (stable) break;
  }
  const total = weights.reduce((a, b) => a + b, 0);
  const allocatedShare = Math.min(1, total);

  const positions: Position[] = chosen.map((x, i) => ({
    id: x.c.id,
    name: x.c.name,
    group: x.c.group,
    weight: weights[i],
    amount: Math.round(weights[i] * config.capital),
    score: x.score,
    momentum: x.mom,
    volatility: x.vol,
    rank: i + 1,
    rankScore: x.rankScore,
    tier: tier(x.score),
  }));

  return summarize(config, positions, universe, cands.length, allocatedShare);
}

/** Portfolio metrics from a set of positions (also used after simulating actions). */
export function summarize(config: PortfolioConfig, positions: Position[], universe: number, eligible: number, allocatedShare?: number): PortfolioResult {
  const wSum = positions.reduce((s, p) => s + p.weight, 0);
  const share = allocatedShare ?? wSum;
  const norm = wSum > 0 ? 1 / wSum : 0;
  const avgScore = positions.reduce((s, p) => s + p.weight * norm * p.score, 0);
  const expectedStress = positions.reduce((s, p) => s + p.weight * norm * (100 - p.score), 0) / 100;
  const hhi = positions.reduce((s, p) => s + (p.weight * norm) ** 2, 0);
  const tiers: Record<Tier, number> = { prime: 0, healthy: 0, watch: 0, risk: 0 };
  for (const p of positions) tiers[tier(p.score)] += p.weight * norm;
  const histogram: PortfolioResult["histogram"] = [];
  for (let from = 40; from < 100; from += 5) {
    const inBin = positions.filter((p) => p.score >= from && p.score < from + 5);
    histogram.push({ from, to: from + 5, count: inBin.length, weight: inBin.reduce((s, p) => s + p.weight * norm, 0) });
  }
  return {
    config,
    positions,
    allocated: Math.round(share * config.capital),
    reserve: Math.round((1 - share) * config.capital),
    avgScore,
    minScore: positions.length ? Math.min(...positions.map((p) => p.score)) : 0,
    maxScore: positions.length ? Math.max(...positions.map((p) => p.score)) : 0,
    expectedStress,
    hhi,
    effectiveN: hhi > 0 ? 1 / hhi : 0,
    topWeight: positions.length ? Math.max(...positions.map((p) => p.weight * norm)) : 0,
    groups: new Set(positions.map((p) => p.group ?? p.id)).size,
    universe,
    eligible,
    tiers,
    histogram,
  };
}

export function riskLabel(avgScore: number): { label: string; tone: "positive" | "warn" | "negative" } {
  if (avgScore >= 80) return { label: "Low", tone: "positive" };
  if (avgScore >= 72) return { label: "Moderate", tone: "warn" };
  return { label: "Elevated", tone: "negative" };
}
