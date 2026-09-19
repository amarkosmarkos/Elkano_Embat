import type { Dimension, MetricId, StressFlag } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtMonth(m: string, style: "short" | "long" = "short"): string {
  const [y, mo] = m.split("-");
  const name = MONTHS[Number(mo) - 1] ?? mo;
  return style === "short" ? `${name} ${y.slice(2)}` : `${name} ${y}`;
}

export function fmtScore(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

export function fmtDelta(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${s}${Math.abs(v).toFixed(digits)}`;
}

export function fmtPct(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtMoney(v: number, currency = "EUR"): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B ${currency === "EUR" ? "€" : currency}`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(abs >= 1e7 ? 1 : 2)}M ${currency === "EUR" ? "€" : currency}`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k ${currency === "EUR" ? "€" : currency}`;
  return `${sign}${abs.toFixed(0)} ${currency === "EUR" ? "€" : currency}`;
}

export function fmtCompact(v: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

export const DIM_LABEL: Record<Dimension, string> = {
  pago: "Payment behaviour",
  liquidez: "Liquidity",
  caja: "Cash generation",
  deuda: "Debt",
  concentracion: "Concentration",
};

export const DIM_SHORT: Record<Dimension, string> = {
  pago: "Payment",
  liquidez: "Liquidity",
  caja: "Cash",
  deuda: "Debt",
  concentracion: "Concentration",
};

export const DIM_DESC: Record<Dimension, string> = {
  pago: "Days late to suppliers, share of late payments, missed payroll/tax, DSO, overdue receivables, returned collections.",
  liquidez: "Cash cushion vs. outflows, runway in months, days with negative balance, undrawn credit.",
  caja: "Operating net cash, 3/6-month trend, volatility, collections/payments ratio, YoY collections growth.",
  deuda: "Drawn share of credit lines, debt service vs. cash, financial cost, debt over collections.",
  concentracion: "Top-5 customer share, Herfindahl index, counterparty portfolio rating, active customers.",
};

export interface MetricMeta {
  label: string;
  unit: "days" | "pct" | "ratio" | "months" | "count" | "x" | "index" | "flag";
  higherIsBetter: boolean;
  dim: Dimension;
  hint: string;
}

export const METRIC_META: Record<MetricId, MetricMeta> = {
  retraso_pago: { label: "Days late to suppliers", unit: "days", higherIsBetter: false, dim: "pago", hint: "median payment_date − due_date on payables paid this month" },
  pct_pago_tarde: { label: "Late payments", unit: "pct", higherIsBetter: false, dim: "pago", hint: "share of payables paid after due date" },
  falta_regular: { label: "Missed payroll / SS / tax", unit: "count", higherIsBetter: false, dim: "pago", hint: "regular obligations missing this month" },
  dso: { label: "DSO", unit: "days", higherIsBetter: false, dim: "pago", hint: "median days customers take to pay" },
  pct_cobro_vencido: { label: "Overdue receivables", unit: "x", higherIsBetter: false, dim: "pago", hint: "overdue pending / last-90-day issued" },
  devoluciones: { label: "Returned collections", unit: "count", higherIsBetter: false, dim: "pago", hint: "direct debits returned unpaid" },
  colchon: { label: "Cash cushion", unit: "x", higherIsBetter: true, dim: "liquidez", hint: "minimum balance of the month / monthly outflows" },
  runway: { label: "Runway", unit: "months", higherIsBetter: true, dim: "liquidez", hint: "months of cash at current burn (capped at 24)" },
  dias_negativo: { label: "Days in overdraft", unit: "days", higherIsBetter: false, dim: "liquidez", hint: "days of the month with negative balance" },
  credito_disponible: { label: "Undrawn credit", unit: "x", higherIsBetter: true, dim: "liquidez", hint: "available credit lines / monthly outflows" },
  neto_operativo: { label: "Operating net cash", unit: "x", higherIsBetter: true, dim: "caja", hint: "inflows − outflows excl. financing, normalised" },
  tendencia_3m: { label: "Cash trend 3m", unit: "index", higherIsBetter: true, dim: "caja", hint: "slope of net cash over 3 months" },
  tendencia_6m: { label: "Cash trend 6m", unit: "index", higherIsBetter: true, dim: "caja", hint: "slope of net cash over 6 months" },
  volatilidad: { label: "Cash volatility", unit: "ratio", higherIsBetter: false, dim: "caja", hint: "std / mean |net| over 12 months" },
  ratio_cobros_pagos: { label: "Collections / payments", unit: "x", higherIsBetter: true, dim: "caja", hint: "customer inflows over supplier outflows" },
  crecimiento_cobros: { label: "Collections growth YoY", unit: "pct", higherIsBetter: true, dim: "caja", hint: "collections vs. same month last year" },
  pct_dispuesto: { label: "Credit lines drawn", unit: "pct", higherIsBetter: false, dim: "deuda", hint: "outstanding / granted on revolving facilities" },
  servicio_deuda: { label: "Debt service / cash", unit: "x", higherIsBetter: false, dim: "deuda", hint: "monthly instalments over 6-month operating cash" },
  coste_financiero: { label: "Financial cost", unit: "pct", higherIsBetter: false, dim: "deuda", hint: "interest + fees over monthly outflows" },
  deuda_cobros: { label: "Debt / collections", unit: "x", higherIsBetter: false, dim: "deuda", hint: "outstanding debt over 12-month collections" },
  top5_clientes: { label: "Top-5 customers", unit: "pct", higherIsBetter: false, dim: "concentracion", hint: "share of invoicing to the 5 largest customers" },
  hhi: { label: "Customer HHI", unit: "index", higherIsBetter: false, dim: "concentracion", hint: "1 = single customer, < 0.1 = diversified" },
  rating_cartera: { label: "Counterparty rating", unit: "days", higherIsBetter: false, dim: "concentracion", hint: "how late this company's customers pay everyone (bureau)" },
  clientes_activos: { label: "Active customers", unit: "count", higherIsBetter: true, dim: "concentracion", hint: "customers invoiced this month" },
};

/** Why a metric can be null in the pipeline output: the data it needs is not connected for that company. */
export const METRIC_NEEDS: Record<MetricId, string> = {
  retraso_pago: "needs payables paid this month (ERP invoices)",
  pct_pago_tarde: "needs payables paid this month (ERP invoices)",
  falta_regular: "needs bank transactions",
  dso: "needs receivables collected this month (ERP invoices)",
  pct_cobro_vencido: "needs issued invoices in the last 90 days",
  devoluciones: "needs bank transactions",
  colchon: "needs a checking account with movements this month",
  runway: "needs balances and outflows",
  dias_negativo: "needs daily balances",
  credito_disponible: "needs revolving lines (credit line, confirming, factoring)",
  neto_operativo: "needs bank transactions this month",
  tendencia_3m: "needs 3 months of net cash",
  tendencia_6m: "needs 6 months of net cash",
  volatilidad: "needs 12 months of net cash",
  ratio_cobros_pagos: "needs categorised collections and payments",
  crecimiento_cobros: "needs collections in the same month a year ago",
  pct_dispuesto: "needs revolving lines (credit line, confirming, factoring)",
  servicio_deuda: "needs a loan amortisation schedule (87 products in the dataset)",
  coste_financiero: "needs bank transactions this month",
  deuda_cobros: "needs debt products and 12 months of collections",
  top5_clientes: "needs issued invoices (ERP)",
  hhi: "needs issued invoices (ERP)",
  rating_cartera: "needs issued invoices to shared counterparties",
  clientes_activos: "needs issued invoices this month (ERP)",
};

export function fmtMetric(id: MetricId, v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  const m = METRIC_META[id];
  switch (m.unit) {
    case "days": return `${Math.round(v)} d`;
    case "pct": return `${(v * 100).toFixed(0)}%`;
    case "months": return v >= 24 ? "24+ mo" : `${v.toFixed(1)} mo`;
    case "count": return `${Math.round(v)}`;
    case "x": return `${v.toFixed(2)}×`;
    case "ratio": return v.toFixed(2);
    case "index": return v.toFixed(2);
    case "flag": return v ? "yes" : "no";
  }
}

export const STRESS_LABEL: Record<StressFlag, string> = {
  S1_descubierto: "Overdraft 5+ days",
  S2_coste_disparado: "Financial cost spike",
  S3_falta_regular: "Missed payroll / SS / tax",
  S4_lineas_limite: "Credit lines ≥ 90%",
  S5_cobros_vencidos: "Overdue receivables > 30%",
  S6_paga_tarde_peor: "Paying later each month",
  S7_devoluciones: "Returned collections 2 months",
  S8_caja_negativa: "Negative cash 3 months",
};

/** Parse the pipeline's Spanish explanation ("bajó 31.1 pts: liquidez") into structured parts. */
export function parseExplanation(e: string | null | undefined): { delta: number; dim: Dimension } | null {
  if (!e) return null;
  const m = /^(subió|bajó) ([\d.]+) pts: (\w+)$/.exec(e.trim());
  if (!m) return null;
  const d = Number(m[2]) * (m[1] === "bajó" ? -1 : 1);
  return { delta: d, dim: m[3] as Dimension };
}

/** Parse v2's metric explanation ("bajó 2.4 pts: colchon 1.93 → 0.85"). */
export function parseExplanationV2(e: string | null | undefined): { delta: number; metric: MetricId; from: number; to: number } | null {
  if (!e) return null;
  const m = /^(subió|bajó) ([\d.]+) pts: (\w+) ([-\d.]+) → ([-\d.]+)$/.exec(e.trim());
  if (!m) return null;
  return { delta: Number(m[2]) * (m[1] === "bajó" ? -1 : 1), metric: m[3] as MetricId, from: Number(m[4]), to: Number(m[5]) };
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
