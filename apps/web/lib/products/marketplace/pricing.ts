/**
 * ECONOMÍA DE UNA OPERACIÓN — todo sale del score y de su calibración medida (report_v3 · calibration_h6).
 *
 *  score = 100 − P(evento de impago en 3–6 meses). La calibración da, por decil de score, la tasa de evento
 *  observada a 1, 3 y 6 meses. De ahí: probabilidad de impago a un plazo, pérdida esperada, tipo exigido,
 *  rendimiento neto del prestamista y comisión de Embat. Sin números inventados: cada parámetro está aquí arriba.
 */
export interface CalibrationRow { decile: number; score_min: number; score_max: number; event_h1: number; event_h3: number; event_h6: number }

export type Term = 3 | 6 | 12;
export const TERMS: Term[] = [3, 6, 12];

export const PRICING = {
  /** tipo base sin riesgo (depósito / fondo monetario), anual */
  baseRate: 0.025,
  /**
   * pérdida dado el evento. El evento del score es ESTRÉS observable (descubierto ≥ 5 días, factura recibida 90 días
   * sin pagar, falta de nómina/impuestos, comisiones disparadas), no una quiebra: la mayoría se cura y se cobra
   * tarde. Se asume que se pierde el 10 % del importe cuando ocurre (retraso + coste de recobro + una fracción
   * de impagos definitivos). Con la LGD bancaria del 45 % no habría ninguna operación rentable: sería otro evento.
   */
  lgd: 0.1,
  /** margen sobre base y pérdida esperada por banda de score, anual: es lo que remunera al prestamista y a Embat */
  margin: { prime: 0.03, healthy: 0.04, watch: 0.06, risk: 0.08 } as Record<"prime" | "healthy" | "watch" | "risk", number>,
  /** comisión de Embat: parte del interés bruto */
  embatShare: 0.2,
};

/** Probabilidad de evento en los próximos `term` meses para un score, interpolando la calibración medida. */
export function pdFor(score: number, term: Term, cal: CalibrationRow[]): number {
  if (cal.length === 0) return Math.max(0.01, (100 - score) / 100);
  // decil por rango de score (los bordes vienen del informe); fuera de rango, el extremo
  const row = cal.find((r) => score >= r.score_min && score <= r.score_max) ?? (score < cal[0].score_min ? cal[0] : cal[cal.length - 1]);
  // suavizado dentro del decil: mezcla con el vecino según la posición del score en el tramo
  const i = cal.indexOf(row);
  const t = (score - row.score_min) / Math.max(1e-9, row.score_max - row.score_min);
  const nb = t > 0.5 ? cal[Math.min(cal.length - 1, i + 1)] : cal[Math.max(0, i - 1)];
  const w = Math.abs(t - 0.5);
  const mix = (k: "event_h1" | "event_h3" | "event_h6") => row[k] * (1 - w) + nb[k] * w;
  const h3 = mix("event_h3"), h6 = mix("event_h6");
  if (term === 3) return h3;
  if (term === 6) return h6;
  // 12 meses: dos ventanas de 6 independientes
  return 1 - (1 - h6) ** 2;
}

export function bandOf(score: number): "prime" | "healthy" | "watch" | "risk" {
  return score >= 80 ? "prime" : score >= 70 ? "healthy" : score >= 40 ? "watch" : "risk";
}

export interface Pricing {
  score: number;
  term: Term;
  /** P(impago) en el plazo */
  pd: number;
  /** P(impago) anualizada */
  pdAnnual: number;
  /** tipo anual que paga la receptora */
  rate: number;
  /** interés bruto en euros durante el plazo */
  grossInterest: number;
  expectedLoss: number;
  embatFee: number;
  /** lo que le queda al prestamista tras pérdida esperada y comisión */
  lenderNet: number;
  /** rendimiento neto anualizado del prestamista */
  netYield: number;
}

/** Precio de una posición: tipo = base + PD anual × LGD + margen por banda. Todo lo demás se deriva. */
export function price(amount: number, score: number, term: Term, cal: CalibrationRow[]): Pricing {
  const pd = pdFor(score, term, cal);
  const pdAnnual = 1 - (1 - pd) ** (12 / term);
  const rate = PRICING.baseRate + pdAnnual * PRICING.lgd + PRICING.margin[bandOf(score)];
  const grossInterest = amount * rate * (term / 12);
  const expectedLoss = amount * pd * PRICING.lgd;
  const embatFee = grossInterest * PRICING.embatShare;
  const lenderNet = grossInterest - embatFee - expectedLoss;
  const netYield = amount > 0 ? (lenderNet / amount) * (12 / term) : 0;
  return { score, term, pd, pdAnnual, rate, grossInterest, expectedLoss, embatFee, lenderNet, netYield };
}

export interface Economics {
  amount: number;
  term: Term;
  grossInterest: number;
  expectedLoss: number;
  embatFee: number;
  lenderNet: number;
  /** rendimiento neto anual del prestamista */
  netYield: number;
  /** tipo medio ponderado que pagan las receptoras */
  avgRate: number;
  /** PD media ponderada en el plazo */
  avgPd: number;
  /** pérdida esperada / capital */
  lossRate: number;
  /** cuántas veces cubre el neto la pérdida esperada (≥ 2 sano, < 1 no compensa) */
  coverage: number;
  /** 0–100: atractivo de la operación para el prestamista */
  attractiveness: number;
}

/** Economía agregada de un conjunto de posiciones ya valoradas. */
export function economics(items: { amount: number; pricing: Pricing }[], term: Term): Economics {
  const amount = items.reduce((s, p) => s + p.amount, 0);
  const sum = (k: keyof Pricing) => items.reduce((s, p) => s + (p.pricing[k] as number), 0);
  const grossInterest = sum("grossInterest"), expectedLoss = sum("expectedLoss"), embatFee = sum("embatFee"), lenderNet = sum("lenderNet");
  const w = (k: "rate" | "pd") => (amount > 0 ? items.reduce((s, p) => s + p.amount * p.pricing[k], 0) / amount : 0);
  const netYield = amount > 0 ? (lenderNet / amount) * (12 / term) : 0;
  const lossRate = amount > 0 ? expectedLoss / amount : 0;
  const coverage = expectedLoss > 0 ? lenderNet / expectedLoss : lenderNet > 0 ? 9 : 0;
  // atractivo: rendimiento neto frente al tipo base (0 → nada mejor que un depósito; 100 → +4 pts) corregido por cobertura
  const excess = Math.max(0, netYield - PRICING.baseRate);
  const attractiveness = Math.round(100 * Math.min(1, excess / 0.04) * Math.min(1, Math.max(0.2, coverage / 2)));
  return { amount, term, grossInterest, expectedLoss, embatFee, lenderNet, netYield, avgRate: w("rate"), avgPd: w("pd"), lossRate, coverage, attractiveness };
}
