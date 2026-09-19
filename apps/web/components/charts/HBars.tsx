import { fmtSigned } from "@/lib/format";

export type HBarRow = { label: string; value: number; hint?: string };

/** Barras horizontales con signo (positivo a la derecha en verde, negativo a la izquierda en rojo). */
export function HBars({ rows, width = 520, rowH = 30, max }: { rows: HBarRow[]; width?: number; rowH?: number; max?: number }) {
  const labelW = 110, padY = 6, valueW = 48;
  // Cada lado reserva sitio para el texto del valor, así nunca pisa la etiqueta
  const plotW = width - labelW - 8;
  const halfMax = plotW / 2 - valueW;
  const M = Math.max(1, max ?? Math.max(...rows.map((r) => Math.abs(r.value))));
  const cx = labelW + plotW / 2;
  const height = rows.length * rowH + padY * 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" role="img">
      <line x1={cx} x2={cx} y1={padY} y2={height - padY} stroke="#94a3b8" strokeWidth={1} />
      {rows.map((r, i) => {
        const y = padY + i * rowH;
        const bw = (Math.abs(r.value) / M) * halfMax;
        const pos = r.value >= 0;
        const color = pos ? "#15803d" : "#b91c1c";
        return (
          <g key={r.label}>
            <title>{`${r.label}: ${fmtSigned(r.value)} pts${r.hint ? `, ${r.hint}` : ""}`}</title>
            <text x={labelW - 10} y={y + rowH / 2 + 4} fontSize={12} fill="#0f172a" textAnchor="end" fontWeight={500}>{r.label}</text>
            <rect x={pos ? cx : cx - bw} y={y + 6} width={Math.max(bw, 1)} height={rowH - 12} fill={color} rx={3} opacity={0.9} />
            <text x={pos ? cx + bw + 6 : cx - bw - 6} y={y + rowH / 2 + 4} fontSize={12} fill={color} textAnchor={pos ? "start" : "end"} fontWeight={600}>{fmtSigned(r.value)}</text>
          </g>
        );
      })}
    </svg>
  );
}
