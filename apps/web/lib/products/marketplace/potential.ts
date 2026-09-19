/** POTENCIAL DEL MERCADO — cuánto podrían prestar todas las empresas cualificadas, cuánta financiación necesitan las candidatas y qué se llevaría Embat si se casara todo. */
import { PRICING, price, type CalibrationRow } from "./pricing";
import type { Assessed } from "./assess";
import type { Network } from "./portfolio";

export const POTENTIAL_TERM = 6 as const;
/** Línea de circulante de referencia por candidata: un mes de salidas (caja real / colchón), entre 50 k€ y 5 M€. */
export const NEED_MIN = 50_000, NEED_MAX = 5_000_000;

export interface Potential {
  lenders: number; lendersWithCash: number; supply: number;
  borrowers: number; demand: number; withData: number;
  /** min(oferta, demanda): lo que realmente se podría casar */
  matched: number;
  avgRate: number; grossInterest: number; embatFee: number; lenderNet: number;
}

/** Financiación que necesita una candidata: un mes de salidas de caja (caja real ÷ colchón en meses). null si no hay dato. */
export function needAmount(a: Assessed, idx: number): number | null {
  const cash = a.c.cash?.[idx];
  const col = a.c.latest.metrics.colchon;
  if (cash == null || col == null || col <= 0 || cash <= 0) return null;
  return Math.min(NEED_MAX, Math.max(NEED_MIN, Math.round(cash / col / 10_000) * 10_000));
}

export const isCandidate = (a: Assessed) => a.receiver.eligible && a.receiver.need >= 25;

export function marketPotential(network: Network, assessed: Assessed[]): Potential {
  const idx = network.months.length - 1;
  const cal: CalibrationRow[] = network.calibration;
  let lenders = 0, lendersWithCash = 0, supply = 0;
  for (const a of assessed) if (a.provider.qualified) { lenders++; if (a.provider.deployable) { lendersWithCash++; supply += a.provider.deployable; } }
  let borrowers = 0, demand = 0, withData = 0, gross = 0, net = 0, rateW = 0;
  for (const a of assessed) {
    if (!isCandidate(a)) continue;
    borrowers++;
    const n = needAmount(a, idx);
    if (n != null) withData++;
    const amt = n ?? NEED_MIN;
    const p = price(amt, a.c.latest.score, POTENTIAL_TERM, cal);
    demand += amt; gross += p.grossInterest; net += p.lenderNet; rateW += p.rate * amt;
  }
  const matched = Math.min(supply, demand);
  const scale = demand > 0 ? matched / demand : 0;
  return { lenders, lendersWithCash, supply, borrowers, demand, withData, matched, avgRate: demand > 0 ? rateW / demand : 0, grossInterest: gross * scale, embatFee: gross * scale * PRICING.embatShare, lenderNet: net * scale };
}
