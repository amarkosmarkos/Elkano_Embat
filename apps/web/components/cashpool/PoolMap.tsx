"use client";

import { useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import type { Decision, Entity, Proposal } from "@/lib/cashpool";
import { FX, GEO, resolveCountry } from "@/lib/fx";
import { eur } from "@/lib/format";
import { band } from "@/lib/score/colors";

const W = 960, H = 470;
const projection = geoNaturalEarth1().scale(165).translate([W / 2, H / 2 + 8]);
const path = geoPath(projection);
const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const LAND = path(feature(topo, topo.objects.countries)) ?? "";
const GRATICULE = path(geoGraticule10()) ?? "";
const SPHERE = path({ type: "Sphere" }) ?? "";
const ROLE_FILL: Record<Entity["role"], string> = { surplus: "var(--color-pos)", deficit: "var(--color-neg)", neutral: "var(--color-ink-mute)", unknown: "var(--color-line)" };
const BAND_STROKE = { good: "#10b981", warn: "#f59e0b", bad: "#ef4444" } as const;
const local = (n: number, cur: string) => `${Math.round(n).toLocaleString("es-ES")} ${cur}`;

type Placed = Entity & { iso: string; inferred: boolean; lon: number; lat: number; countryName: string };

/**
 * Mapa de caja del grupo: una burbuja por filial (área = caja, relleno = sobra/falta, anillo = semáforo del score)
 * situada en la plaza financiera de su país (o de su divisa si el CSV no trae país), y los préstamos internos
 * propuestos como arcos que "circulan". Recuperado de la primera versión del producto, sobre el motor nuevo.
 */
export default function PoolMap({ entities, proposals, decisions, onInspect }: { entities: Entity[]; proposals: Proposal[]; decisions: Record<string, Decision>; onInspect?: (id: string) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<"bilateral" | "fondo">("bilateral");

  const placed = useMemo<Placed[]>(() => entities.map((e) => { const { iso, inferred } = resolveCountry(e.country, e.currency); const g = GEO[iso]; return { ...e, iso, inferred, lon: g?.lon ?? 0, lat: g?.lat ?? 0, countryName: g?.name ?? iso }; }), [entities]);

  // filiales en el mismo país: anillo para que no se pisen; una etiqueta (divisa × n) por clúster
  const { pos, clusters } = useMemo(() => {
    const byIso = new Map<string, Placed[]>();
    for (const e of placed) byIso.set(e.iso, [...(byIso.get(e.iso) ?? []), e]);
    const pos: Record<string, { lon: number; lat: number; x: number; y: number }> = {};
    const clusters: { x: number; y: number; label: string; r: number }[] = [];
    for (const [, list] of byIso) {
      const k = list.length;
      const ringDeg = k === 1 ? 0 : Math.min(7, 2.2 + k * 0.55);
      list.forEach((e, i) => {
        const ang = (i / k) * Math.PI * 2 - Math.PI / 2;
        const lon = e.lon + ringDeg * Math.cos(ang), lat = e.lat + ringDeg * Math.sin(ang) * 0.75;
        const [x, y] = projection([lon, lat]) ?? [0, 0];
        pos[e.companyId] = { lon, lat, x, y };
      });
      const [cx, cy] = projection([list[0].lon, list[0].lat]) ?? [0, 0];
      const [, ty] = projection([list[0].lon, list[0].lat + ringDeg]) ?? [0, 0];
      const curs = Array.from(new Set(list.map((e) => e.currency)));
      clusters.push({ x: cx, y: cy, r: cy - ty, label: k === 1 ? curs[0] : `${curs.join("/")} ×${k}` });
    }
    return { pos, clusters };
  }, [placed]);

  // "fondo común": los arcos convergen en el centro de gravedad del dinero prestable
  const hub = useMemo(() => {
    const s = placed.filter((e) => e.spareEur > 0);
    if (s.length === 0) return null;
    const tot = s.reduce((a, e) => a + e.spareEur, 0);
    const lon = s.reduce((a, e) => a + pos[e.companyId].lon * e.spareEur, 0) / tot;
    const lat = s.reduce((a, e) => a + pos[e.companyId].lat * e.spareEur, 0) / tot;
    const [x, y] = projection([lon, lat]) ?? [0, 0];
    return { lon, lat, x, y };
  }, [placed, pos]);

  const arc = (a: { lon: number; lat: number }, b: { lon: number; lat: number }) => path({ type: "LineString", coordinates: [[a.lon, a.lat], [b.lon, b.lat]] }) ?? "";
  const maxCash = Math.max(1, ...placed.map((e) => Math.abs(e.cashEur ?? 0)));
  const radius = (e: Entity) => 4 + 14 * Math.sqrt(Math.abs(e.cashEur ?? 0) / maxCash);
  const hovered = hover ? placed.find((e) => e.companyId === hover) : null;
  const related = new Set(proposals.filter((p) => p.fromId === hover || p.toId === hover).flatMap((p) => [p.fromId, p.toId]));
  const inferredCount = placed.filter((e) => e.inferred).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Mapa de caja del grupo</h2><p className="text-xs text-ink-dim">Área = caja en euros · azul sobra · naranja falta · anillo = semáforo del score · arcos = préstamos internos propuestos (verde = aprobado)</p></div>
        <div className="inline-flex rounded-[10px] bg-panel-2/50 p-1 text-xs">
          {(["bilateral", "fondo"] as const).map((m) => <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-lg border px-3 py-1.5 font-medium ${mode === m ? "border-line bg-white/[0.045] text-ink" : "border-transparent text-ink-mute hover:text-ink"}`}>{m === "bilateral" ? "Filial a filial" : "Fondo común"}</button>)}
        </div>
      </div>
      <div ref={boxRef} className="relative overflow-hidden rounded-xl border border-line-soft bg-panel-2" onMouseMove={(e) => { const r = boxRef.current?.getBoundingClientRect(); if (r) setTip({ x: e.clientX - r.left, y: e.clientY - r.top }); }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Mapa de caja del grupo por filial y divisa">
          <path d={SPHERE} fill="var(--color-ground)" />
          <path d={GRATICULE} fill="none" stroke="var(--color-line-soft)" strokeWidth={0.4} />
          <path d={LAND} fill="var(--color-panel-hi)" stroke="var(--color-line)" strokeWidth={0.5} />
          {proposals.map((p) => {
            const a = pos[p.fromId], b = pos[p.toId];
            if (!a || !b) return null;
            const ok = decisions[p.id] === "approved";
            const stroke = ok ? "var(--color-good)" : "var(--color-accent)";
            const dim = hover && !related.has(p.fromId) && !related.has(p.toId) ? 0.18 : 1;
            const w = 1 + 2.2 * Math.sqrt(p.amountEur / 250_000);
            if (mode === "fondo" && hub) return <g key={p.id} opacity={dim}><path d={arc(a, hub)} fill="none" stroke={stroke} strokeWidth={w} strokeDasharray="16 4" className="flow" /><path d={arc(hub, b)} fill="none" stroke={stroke} strokeWidth={w} strokeDasharray="16 4" className="flow" /></g>;
            return <path key={p.id} d={arc(a, b)} fill="none" stroke={stroke} strokeWidth={w} strokeDasharray="16 4" opacity={dim} className="flow" />;
          })}
          {mode === "fondo" && hub && proposals.length > 0 && <g><circle cx={hub.x} cy={hub.y} r={9} fill="var(--color-ground)" stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="2 2" /><text x={hub.x} y={hub.y + 3} textAnchor="middle" fontFamily="var(--font-body)" fontSize={7} fill="var(--color-accent)">FCI</text></g>}
          {placed.map((e) => {
            const p = pos[e.companyId];
            const r = radius(e);
            const faded = hover && hover !== e.companyId && !related.has(e.companyId);
            return (
              <g key={e.companyId} opacity={faded ? 0.3 : 1} onMouseEnter={() => setHover(e.companyId)} onMouseLeave={() => setHover(null)} onClick={() => onInspect?.(e.companyId)} style={{ cursor: onInspect ? "pointer" : "default" }}>
                <circle cx={p.x} cy={p.y} r={r + 2.2} fill="none" stroke={e.score == null ? "var(--color-line)" : BAND_STROKE[band(e.score)]} strokeWidth={1.2} opacity={0.9} />
                <circle cx={p.x} cy={p.y} r={r} fill={ROLE_FILL[e.role]} opacity={e.role === "neutral" || e.role === "unknown" ? 0.55 : 0.92} />
              </g>
            );
          })}
          {clusters.map((c) => <text key={c.label + c.x} x={c.x} y={c.y - c.r - 16} textAnchor="middle" fontFamily="var(--font-body)" fontSize={9} fill="var(--color-ink-dim)" pointerEvents="none">{c.label}</text>)}
        </svg>
        {hovered && tip && (
          <div className="pointer-events-none absolute z-10 w-64 rounded-lg border border-line bg-panel-hi/95 p-3 text-xs shadow-[var(--shadow-float)]" style={{ left: Math.min(tip.x + 14, (boxRef.current?.clientWidth ?? 600) - 270), top: tip.y + 14 }}>
            <div className="font-semibold text-ink">{hovered.companyId}</div>
            <div className="text-[11px] text-ink-mute">{hovered.countryName}{hovered.inferred ? " (por divisa)" : ""} · {hovered.currency}</div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <span className="text-ink-mute">caja</span><span className="num text-right text-ink">{hovered.cashLocal !== null ? local(hovered.cashLocal, hovered.currency) : "—"}</span>
              <span className="text-ink-mute">en euros</span><span className="num text-right text-ink">{hovered.cashEur !== null ? eur(Math.round(hovered.cashEur)) : "—"}</span>
              <span className="text-ink-mute">score</span><span className="num text-right" style={{ color: hovered.score == null ? "#a1a1a1" : BAND_STROKE[band(hovered.score)] }}>{hovered.score == null ? "—" : Math.round(hovered.score)}</span>
              <span className="text-ink-mute">estado</span><span className="text-right text-ink">{hovered.role === "surplus" ? `puede prestar ${eur(Math.round(hovered.spareEur))}` : hovered.role === "deficit" ? `le faltan ${eur(Math.round(hovered.needEur))}` : hovered.role === "unknown" ? "sin dato" : "en equilibrio"}</span>
              <span className="text-ink-mute">política</span><span className="text-right text-ink">{hovered.policy}</span>
            </div>
            {FX[hovered.currency]?.source === "reference" && <div className="mt-2 text-[10px] text-warn">tipo de cambio de referencia (no viene en el dataset)</div>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink-mute">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-pos" />sobra (puede prestar)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-neg" />falta (necesita)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ink-mute opacity-60" />en equilibrio</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 bg-accent" />propuesta</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 bg-good" />aprobada</span>
        {inferredCount > 0 && <span className="ml-auto">{inferredCount} filial{inferredCount > 1 ? "es" : ""} situada{inferredCount > 1 ? "s" : ""} por divisa (el CSV solo trae país para 230 de 1.286)</span>}
      </div>
    </section>
  );
}
