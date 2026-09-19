import { scaleLinear } from "d3-scale";

/** Continuous score colour in ink tones that read on parchment: burgundy → rust → gold → olive → sea green. */
const scale = scaleLinear<string>()
  .domain([20, 40, 55, 70, 85, 95])
  .range(["#8b1e2d", "#b5451b", "#b8861a", "#6f8a1e", "#2d6a4f", "#1e5f66"])
  .clamp(true);

export function scoreColor(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return "#9a7f5a";
  return scale(score);
}

export function deltaColor(d: number | null | undefined): string {
  if (d == null) return "var(--muted)";
  if (d > 0.5) return "#2d6a4f";
  if (d < -0.5) return "#8b1e2d";
  return "var(--muted)";
}

export const POS = "#2d6a4f";
export const NEG = "#8b1e2d";
export const GOLD = "#b8891c";

export const DIM_COLOR = {
  pago: "#1e5f66",
  liquidez: "#3b4f8a",
  caja: "#2d6a4f",
  deuda: "#b8861a",
  concentracion: "#8b1e2d",
} as const;
