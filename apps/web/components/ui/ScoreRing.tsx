import { scoreColor } from "@/lib/score/colors";

/** Anillo de score: arco proporcional, color por semáforo, cifra en Inter semibold. */
export function ScoreRing({ score, size = 120, stroke = 8, label, sub }: { score: number | null; size?: number; stroke?: number; label?: string; sub?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = score ?? 0;
  const color = scoreColor(score);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} style={{ transition: "stroke-dasharray 700ms cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="num font-semibold leading-none tracking-tight text-ink" style={{ fontSize: size * 0.3 }}>{score == null ? "—" : Math.round(score)}</div>
        {label && <div className="mt-1 text-[11px] font-medium text-ink-mute">{label}</div>}
        {sub && <div className="num mt-0.5 text-[11px] text-ink-mute">{sub}</div>}
      </div>
    </div>
  );
}
