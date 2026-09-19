/**
 * CONSTRUCCIÓN DE CARTERA — asignador determinista sobre el dataset del score (portado de apps/marketplace).
 * Solo usa información disponible en el mes de asignación (sin mirar el futuro). Nada aleatorio.
 */
import type { CompanyIndex, Dimension } from "@/lib/score/types";
import { DIMENSIONS } from "@/lib/score/types";
import { historyLength, momentum, profileOverlap, scoreVolatility, tier, type Tier } from "@/lib/score/derived";
import { economics, price, type CalibrationRow, type Economics, type Pricing, type Term } from "./pricing";

export interface Network { months: string[]; asOf: string; companies: CompanyIndex[]; calibration: CalibrationRow[] }

export type RiskTolerance = "conservative" | "balanced" | "growth";

export interface PortfolioConfig {
  capital: number;
  risk: RiskTolerance;
  /** peso máximo de una empresa (0–1) */
  maxExposure: number;
  minScore: number;
  maxPerGroup: number;
  targetPositions: number;
  /** mes de asignación (YYYY-MM): solo se usan scores ≤ ese mes */
  asOf: string;
  /** la empresa que despliega el capital: se excluye con su grupo y fija la penalización por solapamiento */
  lenderId: string | null;
  /** plazo de las operaciones (meses): cambia la PD, el tipo y el rendimiento */
  term: Term;
  /** rentabilidad neta anual objetivo del prestamista (0–1): filtra receptoras que no la alcanzan */
  targetReturn: number;
  /** importe mínimo por operación (EUR): con poco capital salen menos posiciones */
  ticket: number;
  /** PD máxima admitida en el plazo (0–1): la fija el perfil de riesgo */
  maxPd: number;
}

export interface Position {
  id: string; name: string; group: string | null; weight: number; amount: number; score: number;
  momentum: number | null; volatility: number | null; rank: number; rankScore: number; tier: Tier; overlap: number | null;
  pricing: Pricing;
}

export interface PortfolioResult {
  config: PortfolioConfig;
  positions: Position[];
  allocated: number;
  reserve: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  /** Σ w·(100 − score)/100: el score es literalmente 100 − P(evento en 3–6 meses) */
  expectedStress: number;
  hhi: number;
  effectiveN: number;
  topWeight: number;
  groups: number;
  universe: number;
  eligible: number;
  tiers: Record<Tier, number>;
  histogram: { from: number; to: number; count: number; weight: number }[];
  avgOverlap: number | null;
  excludedRelated: number;
  economics: Economics;
  /** por qué se descartaron candidatas (para que los filtros se vean) */
  funnel: { scored: number; related: number; alerted: number; stressed: number; history: number; belowScore: number; abovePd: number; belowReturn: number; eligible: number };
}

/**
 * Perfiles de riesgo: cada uno fija el suelo de score, la PD máxima admitida, las alarmas toleradas y cómo se
 * pondera el ranking (score, momentum, estabilidad, rendimiento neto). Más riesgo ⇒ receptoras con peor score,
 * más tipo exigido y más rendimiento esperado, a cambio de más pérdida esperada.
 */
export const RISK_PRESETS: Record<RiskTolerance, { label: string; blurb: string; wScore: number; wMomentum: number; wStability: number; wReturn: number; maxStress: number; gamma: number; minScore: number; maxPd: number; maxExposure: number }> = {
  conservative: { label: "Conservador", blurb: "Score ≥ 78, PD ≤ 30 % en el plazo, sin alarmas. Menos rendimiento y menos pérdida esperada.", wScore: 0.5, wMomentum: 0.1, wStability: 0.3, wReturn: 0.1, maxStress: 0, gamma: 2.5, minScore: 78, maxPd: 0.3, maxExposure: 0.08 },
  balanced: { label: "Equilibrado", blurb: "Score ≥ 70, PD ≤ 45 %, una alarma tolerada. Equilibrio entre rendimiento y pérdida esperada.", wScore: 0.3, wMomentum: 0.15, wStability: 0.2, wReturn: 0.35, maxStress: 1, gamma: 2.0, minScore: 70, maxPd: 0.45, maxExposure: 0.1 },
  growth: { label: "Rendimiento", blurb: "Score ≥ 62, PD ≤ 60 %, una alarma tolerada. Busca el tipo alto: más rendimiento y más pérdida esperada.", wScore: 0.05, wMomentum: 0.15, wStability: 0.1, wReturn: 0.7, maxStress: 1, gamma: 1.5, minScore: 62, maxPd: 0.6, maxExposure: 0.15 },
};

export const DEFAULT_CONFIG: PortfolioConfig = { capital: 25_000_000, risk: "balanced", maxExposure: 0.1, minScore: 70, maxPerGroup: 1, targetPositions: 18, asOf: "2026-02", lenderId: null, term: 6, targetReturn: 0.025, ticket: 50_000, maxPd: 0.45 };

/** Aplicar un perfil de riesgo: fija suelo de score, PD máxima y exposición (el usuario puede afinarlos después). */
export function applyRisk(config: PortfolioConfig, risk: RiskTolerance): PortfolioConfig {
  const p = RISK_PRESETS[risk];
  return { ...config, risk, minScore: p.minScore, maxPd: p.maxPd, maxExposure: p.maxExposure };
}

/** Cuánto baja el rango de un candidato por solaparse con el perfil del prestamista (0,3 → un solapamiento perfecto pierde el 30 %). */
export const OVERLAP_PENALTY = 0.3;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

interface Candidate { c: CompanyIndex; score: number; mom: number | null; vol: number | null; rankScore: number; overlap: number | null; pricing: Pricing }

export function componentsAt(c: CompanyIndex, idx: number): Record<Dimension, number | null> {
  const out = {} as Record<Dimension, number | null>;
  for (const d of DIMENSIONS) out[d] = c.components[d][idx] ?? null;
  return out;
}

export function buildPortfolio(network: Network, config: PortfolioConfig): PortfolioResult {
  const idx = network.months.indexOf(config.asOf);
  if (idx < 0) throw new Error(`asOf ${config.asOf} no está en el dataset`);
  const preset = RISK_PRESETS[config.risk];
  const lender = config.lenderId ? network.companies.find((c) => c.id === config.lenderId) ?? null : null;
  const lenderProfile = lender ? componentsAt(lender, idx) : null;

  // 1. universo: con score en asOf, ni el prestamista ni su grupo, sin alerta, estrés tolerado, ≥ 6 meses de historia,
  //    score ≥ suelo, PD en el plazo ≤ máxima del perfil y rendimiento neto ≥ objetivo
  const funnel = { scored: 0, related: 0, alerted: 0, stressed: 0, history: 0, belowScore: 0, abovePd: 0, belowReturn: 0, eligible: 0 };
  let universe = 0, excludedRelated = 0;
  const cands: Candidate[] = [];
  const unit = 100_000; // importe de referencia para valorar la candidata (los ratios no dependen del importe)
  for (const c of network.companies) {
    const s = c.scores[idx];
    if (s == null) continue;
    universe++; funnel.scored++;
    if (lender && (c.id === lender.id || (lender.group != null && c.group === lender.group))) { excludedRelated++; funnel.related++; continue; }
    if (c.alerts[idx] === 1) { funnel.alerted++; continue; }
    if ((c.stress[idx] ?? 0) > preset.maxStress) { funnel.stressed++; continue; }
    if (historyLength(c.scores, idx) < 6) { funnel.history++; continue; }
    if (s < config.minScore) { funnel.belowScore++; continue; }
    const pricing = price(unit, s, config.term, network.calibration);
    if (pricing.pd > config.maxPd) { funnel.abovePd++; continue; }
    if (pricing.netYield < config.targetReturn) { funnel.belowReturn++; continue; }
    funnel.eligible++;
    const mom = momentum(c.scores, idx);
    const vol = scoreVolatility(c.scores, idx);
    const scoreNorm = clamp01((s - config.minScore) / Math.max(1, 100 - config.minScore));
    const momNorm = clamp01(((mom ?? 0) + 10) / 20);
    const stab = clamp01(1 - (vol ?? 5) / 12);
    const retNorm = clamp01((pricing.netYield - config.targetReturn) / 0.03);
    const overlap = lenderProfile ? profileOverlap(lenderProfile, componentsAt(c, idx)) : null;
    const base = preset.wScore * scoreNorm + preset.wMomentum * momNorm + preset.wStability * stab + preset.wReturn * retNorm;
    const rankScore = base * (1 - OVERLAP_PENALTY * clamp01(overlap ?? 0));
    cands.push({ c, score: s, mom, vol, rankScore, overlap, pricing });
  }
  cands.sort((a, b) => b.rankScore - a.rankScore || b.score - a.score || a.c.id.localeCompare(b.c.id));

  // 2. selección con diversificación por grupo; el capital y el ticket mínimo limitan cuántas posiciones caben
  const perGroup = new Map<string, number>();
  const chosen: Candidate[] = [];
  const minNeeded = Math.ceil(1 / config.maxExposure);
  const affordable = Math.max(1, Math.floor(config.capital / Math.max(1, config.ticket)));
  const target = Math.min(affordable, Math.max(config.targetPositions, minNeeded));
  for (const cand of cands) {
    if (chosen.length >= target) break;
    const g = cand.c.group ?? cand.c.id;
    const n = perGroup.get(g) ?? 0;
    if (n >= config.maxPerGroup) continue;
    perGroup.set(g, n + 1);
    chosen.push(cand);
  }
  if (chosen.length === 0) return summarize(config, [], universe, cands.length, 0, excludedRelated, funnel);

  // 3. pesos ∝ (rango reescalado a [0,35, 1])^gamma, con tope maxExposure y redistribución iterativa
  const rMin = Math.min(...chosen.map((x) => x.rankScore)), rMax = Math.max(...chosen.map((x) => x.rankScore));
  const raw = chosen.map((x) => Math.pow(0.35 + 0.65 * (rMax > rMin ? (x.rankScore - rMin) / (rMax - rMin) : 1), preset.gamma));
  const rawSum = raw.reduce((a, b) => a + b, 0);
  let weights = raw.map((r) => r / rawSum);
  const capped = new Set<number>();
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
  const positions: Position[] = chosen.map((x, i) => {
    const amount = Math.round(weights[i] * config.capital);
    return {
      id: x.c.id, name: x.c.name, group: x.c.group, weight: weights[i], amount,
      score: x.score, momentum: x.mom, volatility: x.vol, rank: i + 1, rankScore: x.rankScore, tier: tier(x.score), overlap: x.overlap,
      pricing: price(amount, x.score, config.term, network.calibration),
    };
  });
  return summarize(config, positions, universe, cands.length, Math.min(1, total), excludedRelated, funnel);
}

const EMPTY_FUNNEL: PortfolioResult["funnel"] = { scored: 0, related: 0, alerted: 0, stressed: 0, history: 0, belowScore: 0, abovePd: 0, belowReturn: 0, eligible: 0 };

/** Revalorar las posiciones con su importe actual (tras acciones) manteniendo el score con el que se valoran. */
export function reprice(positions: Position[], config: PortfolioConfig, cal: CalibrationRow[], scoreOf?: (p: Position) => number): Position[] {
  return positions.map((p) => ({ ...p, pricing: price(p.amount, scoreOf ? scoreOf(p) : p.score, config.term, cal) }));
}

export function summarize(config: PortfolioConfig, positions: Position[], universe: number, eligible: number, allocatedShare?: number, excludedRelated = 0, funnel: PortfolioResult["funnel"] = EMPTY_FUNNEL): PortfolioResult {
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
  const withOverlap = positions.filter((p) => p.overlap != null);
  const avgOverlap = withOverlap.length ? withOverlap.reduce((s, p) => s + p.weight * norm * (p.overlap ?? 0), 0) : null;
  return {
    config, positions, avgOverlap, excludedRelated, funnel,
    economics: economics(positions.map((p) => ({ amount: p.amount, pricing: p.pricing })), config.term),
    allocated: Math.round(share * config.capital), reserve: Math.round((1 - share) * config.capital),
    avgScore, minScore: positions.length ? Math.min(...positions.map((p) => p.score)) : 0, maxScore: positions.length ? Math.max(...positions.map((p) => p.score)) : 0,
    expectedStress, hhi, effectiveN: hhi > 0 ? 1 / hhi : 0, topWeight: positions.length ? Math.max(...positions.map((p) => p.weight * norm)) : 0,
    groups: new Set(positions.map((p) => p.group ?? p.id)).size, universe, eligible, tiers, histogram,
  };
}

export function riskLabel(avgScore: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (avgScore >= 80) return { label: "Bajo", tone: "good" };
  if (avgScore >= 72) return { label: "Moderado", tone: "warn" };
  return { label: "Elevado", tone: "bad" };
}
