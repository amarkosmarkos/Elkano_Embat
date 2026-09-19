export function band(score: number | null | undefined): "good" | "warn" | "bad" {
  if (score == null) return "warn";
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

const COLOR: Record<string, string> = { good: "text-good", warn: "text-warn", bad: "text-bad" };
const BORDER: Record<string, string> = { good: "border-good text-good", warn: "border-warn text-warn", bad: "border-bad text-bad" };

/** Número grande, coloreado por semáforo (≥70 verde · 40-70 ámbar · <40 rojo). */
export function ScoreNumber({ score, size = "text-4xl" }: { score: number | null; size?: string }) {
  return <span className={`font-mono font-semibold ${size} ${COLOR[band(score)]}`}>{score ?? "—"}</span>;
}

export function ScoreChip({ score }: { score: number | null }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-wide ${BORDER[band(score)]}`}>
      {score ?? "—"} / 100
    </span>
  );
}
