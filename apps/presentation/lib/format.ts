import type { Tier, Trend, Severity } from "./types";

const nf0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfPct = new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 1 });

export const fmtInt = (x: number) => nf0.format(x);
export const fmt1 = (x: number) => nf1.format(x);
export const fmt2 = (x: number) => nf2.format(x);
export const fmtEur = (x: number) => `${nf0.format(x)} €`;
export const fmtPct = (x: number) => nfPct.format(x);
export const fmtSigned = (x: number, d = 1) => (x > 0 ? "+" : "") + (d === 1 ? nf1 : nf0).format(x);

/** 1.234.567 € -> "1,2 M€", 812.345 € -> "812 k€" */
export function fmtEurShort(x: number): string {
  const a = Math.abs(x);
  if (a >= 1e6) return `${nf1.format(x / 1e6)} M€`;
  if (a >= 1e3) return `${nf0.format(x / 1e3)} k€`;
  return `${nf0.format(x)} €`;
}

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_ES_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-08" -> "ago 26" */
export function fmtMonth(m: string): string {
  const [y, mm] = m.split("-");
  return `${MONTHS_ES[parseInt(mm, 10) - 1]} ${y.slice(2)}`;
}
/** "2026-08" -> "agosto 2026" */
export function fmtMonthLong(m: string): string {
  const [y, mm] = m.split("-");
  return `${MONTHS_ES_LONG[parseInt(mm, 10) - 1]} ${y}`;
}

export function tierOf(score: number): Tier {
  return score >= 70 ? "verde" : score >= 40 ? "ambar" : "rojo";
}

export const TIER_LABEL: Record<Tier, string> = { verde: "Verde", ambar: "Ámbar", rojo: "Rojo" };
export const TIER_COLOR: Record<Tier, string> = { verde: "#15803d", ambar: "#b45309", rojo: "#b91c1c" };
export const TIER_BG: Record<Tier, string> = { verde: "#dcfce7", ambar: "#fef3c7", rojo: "#fee2e2" };
export const TIER_CLASS: Record<Tier, string> = {
  verde: "bg-ok-bg text-ok",
  ambar: "bg-warn-bg text-warn",
  rojo: "bg-bad-bg text-bad",
};

export const TREND_LABEL: Record<Trend, string> = { mejora: "Mejora", empeora: "Empeora", estable: "Estable" };
export const TREND_ICON: Record<Trend, string> = { mejora: "↗", empeora: "↘", estable: "→" };
export const TREND_CLASS: Record<Trend, string> = { mejora: "text-ok", empeora: "text-bad", estable: "text-ink-2" };

export const SEV_LABEL: Record<Severity, string> = { alta: "Alta", media: "Media", baja: "Baja" };
export const SEV_CLASS: Record<Severity, string> = {
  alta: "bg-bad-bg text-bad border-bad/30",
  media: "bg-warn-bg text-warn border-warn/30",
  baja: "bg-navy-100 text-navy border-navy/20",
};
