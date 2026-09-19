import { motion } from "framer-motion";
import { scoreColor } from "@/lib/colors";
import { AnimatedNumber } from "./AnimatedNumber";

interface Props {
  score: number | null;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  glow?: boolean;
  className?: string;
}

/** Compass-style score ring: brass track, ink-coloured progress, big Cinzel number. */
export function ScoreRing({ score, size = 160, stroke = 10, label, sublabel, className }: Props) {
  const r = (size - stroke) / 2 - 4;
  const circ = 2 * Math.PI * r;
  const v = score ?? 0;
  const color = scoreColor(score);
  const fontSize = size * 0.3;
  const ticks = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className ?? ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="relative">
        <circle cx={size / 2} cy={size / 2} r={r + stroke / 2 + 3} fill="none" stroke="#b8891c" strokeWidth={1.2} opacity={0.7} />
        {ticks.map((i) => {
          const a = (i / 36) * Math.PI * 2;
          const r1 = r + stroke / 2 + 1, r2 = r1 + (i % 9 === 0 ? 0 : 0);
          return <line key={i} x1={size / 2 + Math.cos(a) * r1} y1={size / 2 + Math.sin(a) * r1} x2={size / 2 + Math.cos(a) * (r2 + (i % 9 === 0 ? 3 : 1.5))} y2={size / 2 + Math.sin(a) * (r2 + (i % 9 === 0 ? 3 : 1.5))} stroke="#6d4d0e" strokeWidth={i % 9 === 0 ? 1.5 : 0.8} opacity={0.7} />;
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(60,38,14,0.18)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - v / 100) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score == null ? (
          <span className="text-muted" style={{ fontSize }}>—</span>
        ) : (
          <span className="font-caps font-bold leading-none tracking-tight" style={{ fontSize, color }}>
            <AnimatedNumber value={score} digits={0} />
          </span>
        )}
        {label && <span className="font-caps mt-1 text-[9px] uppercase tracking-[0.18em] text-muted">{label}</span>}
        {sublabel && <span className="text-[11px] italic text-faint">{sublabel}</span>}
      </div>
    </div>
  );
}
