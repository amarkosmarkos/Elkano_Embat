import { fmtEurShort, tierOf, TIER_COLOR } from "@/lib/format";
import type { PoolingProposal } from "@/lib/types";

type Node = { id: string; score: number; cash: number };

/**
 * Flujo de propuestas de cash pooling: donantes a la izquierda, receptores a la derecha,
 * una cinta por propuesta con grosor proporcional al importe.
 */
export function FlowChart({ nodes, proposals, width = 640 }: { nodes: Node[]; proposals: PoolingProposal[]; width?: number }) {
  const donors = [...new Set(proposals.map((p) => p.from))];
  const takers = [...new Set(proposals.map((p) => p.to))];
  const rowH = 44;
  const rows = Math.max(donors.length, takers.length, 1);
  const height = rows * rowH + 40;
  const boxW = 132, boxH = 30;
  const xL = 10, xR = width - boxW - 10;
  const yOf = (i: number, total: number) => 20 + (rows * rowH - total * rowH) / 2 + i * rowH;
  const maxAmt = Math.max(1, ...proposals.map((p) => p.amount));
  const byId = (id: string) => nodes.find((n) => n.id === id);

  if (!proposals.length) {
    return <div className="text-[13px] text-ink-2 py-6 text-center">Sin propuestas de pooling para este grupo.</div>;
  }

  const Box = ({ id, x, y }: { id: string; x: number; y: number }) => {
    const n = byId(id);
    const tier = n ? tierOf(n.score) : "ambar";
    return (
      <g>
        <rect x={x} y={y} width={boxW} height={boxH} rx={6} fill="#fff" stroke={TIER_COLOR[tier]} strokeWidth={1.5} />
        <circle cx={x + 12} cy={y + boxH / 2} r={4} fill={TIER_COLOR[tier]} />
        <text x={x + 22} y={y + boxH / 2 + 4} fontSize={11} fontFamily="ui-monospace, monospace" fill="#0f172a" fontWeight={600}>{id}</text>
        {n && <text x={x + boxW - 8} y={y + boxH / 2 + 4} fontSize={11} fill="#475569" textAnchor="end">{n.score}</text>}
      </g>
    );
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" role="img" aria-label="Flujo de propuestas de pooling">
      <text x={xL} y={12} fontSize={10} fill="#94a3b8" fontWeight={600}>APORTAN</text>
      <text x={xR + boxW} y={12} fontSize={10} fill="#94a3b8" fontWeight={600} textAnchor="end">RECIBEN</text>
      {proposals.map((p, i) => {
        const di = donors.indexOf(p.from), ti = takers.indexOf(p.to);
        const y1 = yOf(di, donors.length) + boxH / 2, y2 = yOf(ti, takers.length) + boxH / 2;
        const x1 = xL + boxW, x2 = xR;
        const sw = 2 + (p.amount / maxAmt) * 14;
        const mx = (x1 + x2) / 2;
        return (
          <g key={i}>
            <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke="#0b1f3a" strokeWidth={sw} opacity={0.25} strokeLinecap="round">
              <title>{`${p.from} → ${p.to}: ${fmtEurShort(p.amount)} (límite ${fmtEurShort(p.limit)}), ${p.reason}`}</title>
            </path>
            <rect x={mx - 34} y={(y1 + y2) / 2 - 9} width={68} height={18} rx={9} fill="#0b1f3a" />
            <text x={mx} y={(y1 + y2) / 2 + 4} fontSize={11} fill="#fff" textAnchor="middle" fontWeight={600}>{fmtEurShort(p.amount)}</text>
          </g>
        );
      })}
      {donors.map((id, i) => <Box key={id} id={id} x={xL} y={yOf(i, donors.length)} />)}
      {takers.map((id, i) => <Box key={id} id={id} x={xR} y={yOf(i, takers.length)} />)}
    </svg>
  );
}
