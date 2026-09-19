import type { Dimension } from "./types";

export type Tone = "neutral" | "good" | "warn" | "bad" | "accent";

export const C = {
  good: "#10b981",
  warn: "#f59e0b",
  bad: "#ef4444",
  accent: "#e5e5e5",
  accent2: "#3b82f6",
  ink: "#fafafa",
  dim: "#d4d4d4",
  mute: "#a1a1a1",
  line: "rgba(255,255,255,0.13)",
  lineSoft: "rgba(255,255,255,0.07)",
};

export const DIM_COLOR: Record<Dimension, string> = {
  pago: "#f59e0b",
  liquidez: "#3b82f6",
  caja: "#10b981",
  deuda: "#ef4444",
  concentracion: "#a855f7",
};

/** Semáforo del README: ≥70 verde · 40–70 ámbar · <40 rojo. */
export function band(score: number | null | undefined): "good" | "warn" | "bad" {
  if (score == null) return "warn";
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

export function scoreColor(score: number | null | undefined): string {
  return C[band(score)];
}

/** Escala continua rojo → ámbar → verde (para heatmaps y scatter). */
export function scoreScale(score: number | null | undefined): string {
  if (score == null) return "rgba(255,255,255,0.18)";
  const s = Math.max(0, Math.min(100, score));
  const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
    `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  const red: [number, number, number] = [230, 106, 127];
  const amber: [number, number, number] = [227, 170, 82];
  const green: [number, number, number] = [16, 185, 129];
  if (s <= 40) return mix(red, amber, s / 40);
  if (s <= 70) return mix(amber, green, (s - 40) / 30);
  return mix(green, [61, 214, 165], (s - 70) / 30);
}

export const TIER_TONE = { prime: "good", healthy: "good", watch: "warn", risk: "bad" } as const;
