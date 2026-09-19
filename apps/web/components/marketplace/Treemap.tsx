"use client";

import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from "d3-hierarchy";
import { scoreScale } from "@/lib/score/colors";
import { fmtMoney } from "@/lib/format";

export interface TreemapItem { id: string; name: string; value: number; score: number; sub?: string; dimmed?: boolean }

/** Mapa de la cartera: área = capital, color = score en la asignación. */
export function Treemap({ items, width = 1000, height = 460, onSelect, selected }: { items: TreemapItem[]; width?: number; height?: number; onSelect?: (id: string) => void; selected?: string | null }) {
  type Node = { children?: TreemapItem[] } & Partial<TreemapItem>;
  const root = hierarchy<Node>({ children: items }).sum((d) => (d as TreemapItem).value ?? 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const laid = treemap<Node>().size([width, height]).paddingInner(4).paddingOuter(1).round(true).tile(treemapSquarify)(root);
  const leaves = laid.leaves() as HierarchyRectangularNode<Node>[];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {leaves.map((leaf) => {
        const d = leaf.data as TreemapItem;
        const w = leaf.x1 - leaf.x0, h = leaf.y1 - leaf.y0;
        const c = scoreScale(d.score);
        const isSel = selected === d.id;
        const big = w > 110 && h > 60;
        const charW = big ? 7 : 6;
        const label = d.name.length * charW > w - 16 ? d.name.slice(0, Math.max(3, Math.floor((w - 16) / charW) - 1)) + "…" : d.name;
        return (
          <g key={d.id} style={{ cursor: onSelect ? "pointer" : "default", opacity: d.dimmed ? 0.35 : 1, transition: "opacity 250ms" }} onClick={() => onSelect?.(d.id)}>
            <rect x={leaf.x0} y={leaf.y0} width={w} height={h} rx={6} fill={c} fillOpacity={isSel ? 0.42 : 0.2} stroke={c} strokeOpacity={isSel ? 1 : 0.6} strokeWidth={isSel ? 2 : 1} />
            {w > 46 && h > 30 && <text x={leaf.x0 + 10} y={leaf.y0 + 20} fontSize={big ? 13 : 11} fontWeight={500} fontFamily="var(--font-body)" fill="#fafafa" style={{ pointerEvents: "none" }}>{label}</text>}
            {big && (
              <>
                <text x={leaf.x0 + 10} y={leaf.y0 + 38} fontSize={12} fontFamily="var(--font-body)" fill="#a1a1a1" style={{ pointerEvents: "none" }}>{fmtMoney(d.value)}</text>
                <text x={leaf.x1 - 10} y={leaf.y1 - 10} fontSize={Math.min(26, h / 3)} fontWeight={600} fontFamily="var(--font-body)" textAnchor="end" fill={c} style={{ pointerEvents: "none" }}>{d.score.toFixed(0)}</text>
                {d.sub && <text x={leaf.x0 + 10} y={leaf.y1 - 10} fontSize={11} fontFamily="var(--font-body)" fill="#a1a1a1" style={{ pointerEvents: "none" }}>{d.sub}</text>}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
