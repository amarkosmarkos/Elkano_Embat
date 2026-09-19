import type { Tone } from "@/lib/score/colors";

const CLS: Record<Tone, string> = {
  neutral: "border-line text-ink",
  good: "border-good/30 bg-good-dim text-good",
  warn: "border-warn/30 bg-warn-dim text-warn",
  bad: "border-bad/30 bg-bad-dim text-bad",
  accent: "border-transparent bg-ink text-panel",
};

/** Badge shadcn: 12px/500, radio 8px, borde fino. */
export function Pill({ tone = "neutral", children, mono, className = "" }: { tone?: Tone; children: React.ReactNode; mono?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-0.5 text-[12px] font-medium ${mono ? "num" : ""} ${CLS[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Delta({ v, digits = 1, suffix = "" }: { v: number | null | undefined; digits?: number; suffix?: string }) {
  if (v == null || Number.isNaN(v)) return <span className="num text-ink-mute">—</span>;
  const tone = v > 0.05 ? "text-good" : v < -0.05 ? "text-bad" : "text-ink-mute";
  return (
    <span className={`num ${tone}`}>
      {v > 0 ? "+" : v < 0 ? "−" : ""}
      {Math.abs(v).toFixed(digits)}
      {suffix}
    </span>
  );
}
