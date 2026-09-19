import type { MetricId } from "./score/types";
import { METRICS } from "./score/meta";

export const eur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

/** Los datos sintéticos traen algún importe disparatado (ver pipeline/config.py AMOUNT_OUTLIER_ABS). */
export const sane = (n: number | null | undefined, cap = 5_000_000): number | null => {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.min(Math.max(n, -cap), cap);
};
export const pct = (n: number) => (n * 100).toFixed(0) + "%";

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return `${MONTHS_SHORT[Number(mo) - 1]} ${y.slice(2)}`;
};
export const monthLabelLong = (m: string) => {
  const [y, mo] = m.split("-");
  const name = MONTHS_LONG[Number(mo) - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
};

const scoreFmt = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatScore = (n: number) => scoreFmt.format(n);
export const formatSignedScore = (n: number) => `${n >= 0 ? "+" : "−"}${scoreFmt.format(Math.abs(n))}`;
export const formatCount = (n: number) => new Intl.NumberFormat("es-ES").format(n);

export function fmtDelta(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
}

export function fmtPct(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits).replace(".", ",")} %`;
}

/** Importes compactos en castellano: 1,2 M€ · 340 k€ · 980 € */
export function fmtMoney(v: number | null | undefined, currency = "EUR"): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  const sym = currency === "EUR" ? "€" : currency;
  const f = (n: number, d: number) => n.toFixed(d).replace(".", ",");
  if (abs >= 1e9) return `${sign}${f(abs / 1e9, 2)} B${sym}`;
  if (abs >= 1e6) return `${sign}${f(abs / 1e6, abs >= 1e7 ? 1 : 2)} M${sym}`;
  if (abs >= 1e3) return `${sign}${f(abs / 1e3, 0)} k${sym}`;
  return `${sign}${f(abs, 0)} ${sym}`;
}

export function fmtNum(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

export function fmtMetric(id: MetricId, v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  const m = METRICS[id];
  switch (m.unit) {
    case "days": return `${Math.round(v)} d`;
    case "pct": return `${(v * 100).toFixed(0)} %`;
    case "months": return v >= 24 ? "24+ m" : `${v.toFixed(1).replace(".", ",")} m`;
    case "count": return `${Math.round(v)}`;
    case "x": return `${v.toFixed(2).replace(".", ",")}×`;
    case "ratio": return v.toFixed(2).replace(".", ",");
    case "index": return v.toFixed(2).replace(".", ",");
  }
}
