import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from "d3-hierarchy";
import { AnimatePresence, motion } from "framer-motion";
import { scoreColor } from "@/lib/colors";
import { fmtMoney } from "@/lib/format";

export interface TreemapItem { id: string; name: string; value: number; score: number; sub?: string; dimmed?: boolean; mark?: boolean }

interface Props {
  items: TreemapItem[];
  width: number;
  height: number;
  onSelect?: (id: string) => void;
  selected?: string | null;
  currency?: string;
}

/** Treasure map: tile area = capital, ink colour = score. */
export function Treemap({ items, width, height, onSelect, selected, currency = "EUR" }: Props) {
  type Node = { children?: TreemapItem[] } & Partial<TreemapItem>;
  const root = hierarchy<Node>({ children: items })
    .sum((d) => (d as TreemapItem).value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const laid = treemap<Node>().size([width, height]).paddingInner(5).paddingOuter(1).round(true).tile(treemapSquarify)(root);
  const leaves = laid.leaves() as HierarchyRectangularNode<Node>[];
  return (
    <svg width={width} height={height}>
      <AnimatePresence>
        {leaves.map((leaf) => {
          const d = leaf.data as TreemapItem;
          const w = leaf.x1 - leaf.x0, h = leaf.y1 - leaf.y0;
          const c = scoreColor(d.score);
          const isSel = selected === d.id;
          const big = w > 96 && h > 58;
          const charW = big ? 7.2 : 6.2;
          const label = d.name.length * charW > w - 16 ? d.name.slice(0, Math.max(3, Math.floor((w - 16) / charW) - 1)) + "…" : d.name;
          return (
            <motion.g key={d.id} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: d.dimmed ? 0.35 : 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }} style={{ transformOrigin: `${leaf.x0 + w / 2}px ${leaf.y0 + h / 2}px`, cursor: onSelect ? "pointer" : "default" }}
              onClick={() => onSelect?.(d.id)}>
              <motion.rect x={leaf.x0} y={leaf.y0} width={w} height={h} rx={3} fill={c} fillOpacity={isSel ? 0.4 : 0.2} stroke={c} strokeOpacity={isSel ? 1 : 0.7} strokeWidth={isSel ? 2 : 1}
                whileHover={{ fillOpacity: 0.34 }} transition={{ duration: 0.25 }} />
              <rect x={leaf.x0 + 3} y={leaf.y0 + 3} width={Math.max(0, w - 6)} height={Math.max(0, h - 6)} rx={2} fill="none" stroke={c} strokeOpacity={0.35} strokeDasharray="2 3" />
              {w > 46 && h > 30 && (
                <text x={leaf.x0 + 9} y={leaf.y0 + 19} fontSize={big ? 13 : 11} fontFamily="var(--font-serif)" fill="#2a1b0e" style={{ pointerEvents: "none" }}>{label}</text>
              )}
              {d.mark && big && (
                <g transform={`translate(${leaf.x0 + w / 2} ${leaf.y0 + h / 2})`} opacity={0.75} style={{ pointerEvents: "none" }}>
                  <line x1={-11} y1={-11} x2={11} y2={11} stroke="#8b1e2d" strokeWidth={4} strokeLinecap="round" />
                  <line x1={-11} y1={11} x2={11} y2={-11} stroke="#8b1e2d" strokeWidth={4} strokeLinecap="round" />
                  <circle r={18} fill="none" stroke="#8b1e2d" strokeWidth={1} strokeDasharray="3 3" />
                </g>
              )}
              {big && (
                <>
                  <text x={leaf.x0 + 9} y={leaf.y0 + 35} fontSize={11} fontFamily="var(--font-caps)" fill="#6d5233" style={{ pointerEvents: "none" }}>{fmtMoney(d.value, currency)}</text>
                  <text x={leaf.x1 - 9} y={leaf.y1 - 9} fontSize={Math.min(26, h / 3)} fontWeight={700} fontFamily="var(--font-caps)" textAnchor="end" fill={c} style={{ pointerEvents: "none" }}>{d.score.toFixed(0)}</text>
                  {d.sub && <text x={leaf.x0 + 9} y={leaf.y1 - 9} fontSize={10} fontFamily="var(--font-caps)" fill="#9a7f5a" style={{ pointerEvents: "none" }}>{d.sub}</text>}
                </>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
}
