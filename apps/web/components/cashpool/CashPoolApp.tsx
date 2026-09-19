"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { counterfactual, snapshot, type Entity, type EntityBase, type MonthRow, type Proposal, type Snapshot } from "@/lib/cashpool";
import { FX } from "@/lib/fx";
import { eur, monthLabel } from "@/lib/format";
import { band } from "@/lib/score/colors";

type Decision = "ok" | "no";
type Group = { group_id: string; n: number; n_cur: number; curs: string };
type Row = { companyId: string; month: string; score: number; regime: string | null; cashLocal: number | null };
type ScreenId = "mapa" | "cronologia" | "bandeja" | "impacto" | "metodo";

const ROLE_FILL = { surplus: "var(--color-pos)", deficit: "var(--color-neg)", neutral: "var(--color-ink-mute)" } as const;
const BAND_STROKE = { good: "#2f9e6e", warn: "#b8890f", bad: "#d6455a" } as const;
const local = (n: number, cur: string) => `${Math.round(n).toLocaleString("es-ES")} ${cur}`;

const SCREENS: { id: ScreenId; num: string; label: string }[] = [
  { id: "mapa", num: "01", label: "Mapa" },
  { id: "cronologia", num: "02", label: "Cronología" },
  { id: "bandeja", num: "03", label: "Bandeja" },
  { id: "impacto", num: "04", label: "Impacto" },
  { id: "metodo", num: "05", label: "Método" },
];

/**
 * Producto de cash-pooling como app propia: cabecera con grupo + KPIs siempre visible, y cinco
 * pantallas que se enseñan una a una (pestañas) en vez de apiladas en scroll. El estado (mes,
 * aprobaciones, modo) vive aquí arriba y sobrevive al cambiar de pantalla.
 */
export default function CashPoolApp({ groupId, base, rows, groups }: { groupId: string; base: EntityBase[]; rows: Row[]; groups: Group[] }) {
  const router = useRouter();
  const months = useMemo(() => Array.from(new Set(rows.map((r) => r.month))).sort(), [rows]);
  const snaps = useMemo<Snapshot[]>(() => {
    const byMonth = new Map<string, Map<string, MonthRow>>();
    for (const r of rows) {
      if (!byMonth.has(r.month)) byMonth.set(r.month, new Map());
      byMonth.get(r.month)!.set(r.companyId, r);
    }
    return months.map((m) => snapshot(m, base, byMonth.get(m) ?? new Map()));
  }, [rows, months, base]);

  // arranca en el último mes con el grupo completo: en los meses finales algunas filiales ya no tienen dato
  const [idx, setIdx] = useState(() => {
    const counts = snaps.map((s) => s.entities.length);
    const full = Math.max(0, ...counts);
    return Math.max(0, counts.lastIndexOf(full));
  });
  const [playing, setPlaying] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [mode, setMode] = useState<"bilateral" | "fondo">("bilateral");
  const [hover, setHover] = useState<string | null>(null);
  const [screen, setScreen] = useState<ScreenId>("mapa");

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1 >= months.length ? (setPlaying(false), i) : i + 1)), 650);
    return () => clearInterval(t);
  }, [playing, months.length]);
  useEffect(() => {
    setIdx(0);
    setDecisions({});
    setScreen("mapa");
  }, [groupId]);

  const cur = snaps[idx];
  const cf = useMemo(() => counterfactual(snaps), [snaps]);

  if (!cur) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-sm text-ink-mute">Este grupo no tiene serie de scores.</p>
        <Link href="/productos" className="font-mono text-xs text-accent">← volver a productos</Link>
      </div>
    );
  }

  const active = cur.proposals.filter((p) => decisions[p.id] !== "no");
  const approvedEur = cur.proposals.filter((p) => decisions[p.id] === "ok").reduce((s, p) => s + p.amountEur, 0);
  const pending = cur.proposals.filter((p) => !decisions[p.id]).length;
  const byId = Object.fromEntries(cur.entities.map((e) => [e.companyId, e]));
  const inferredCount = cur.entities.filter((e) => e.countryInferred).length;

  return (
    <div className="flex min-h-[calc(100dvh-57px)] flex-col">
      {/* ---------------- cabecera persistente: volver + grupo + KPIs ---------------- */}
      <div className="border-b border-line-soft bg-panel-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/productos" className="font-mono text-xs text-ink-mute hover:text-accent">← productos</Link>
            <div className="hidden h-8 w-px bg-line sm:block" />
            <div>
              <div className="font-display text-lg font-extrabold leading-none">Cash pooling automático</div>
              <div className="font-mono text-[10px] text-ink-mute">producto 02 · reto X-Ray</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
            <label className="flex items-center gap-2 font-mono text-[11px] text-ink-mute">
              grupo
              <select
                id="group-select"
                value={groupId}
                onChange={(e) => router.push(`/productos/cash-pooling?group=${e.target.value}`)}
                className="rounded-sm border border-line bg-panel px-2.5 py-1.5 font-mono text-xs text-ink"
              >
                {groups.map((g) => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.group_id} · {g.n} filiales · {g.n_cur} divisa{g.n_cur > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
            <Kpi n={eur(cur.totals.cashEur)} l="caja en EUR" />
            <Kpi n={String(cur.totals.nCurrencies)} l="divisas" />
            <Kpi n={eur(cur.totals.surplusEur)} l="prestable" color="text-pos" />
            <Kpi n={eur(cur.totals.deficitEur)} l="falta" color="text-neg" />
          </div>
        </div>
        {/* ---------------- pestañas: las cinco pantallas ---------------- */}
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScreen(s.id)}
              className={`flex shrink-0 items-baseline gap-2 rounded-sm border px-3.5 py-2 font-mono text-xs transition-colors ${
                screen === s.id ? "border-accent bg-panel text-accent" : "border-transparent text-ink-mute hover:border-line hover:text-ink"
              }`}
            >
              <span className="text-[10px] opacity-70">{s.num}</span>
              {s.label}
              {s.id === "bandeja" && pending > 0 && (
                <span className="rounded-full bg-bad px-1.5 py-0.5 text-[9px] font-semibold text-white">{pending}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- pantalla activa ---------------- */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6">
        {screen === "mapa" && (
          <div className="flex flex-col gap-4">
            <WorldMap entities={cur.entities} proposals={active} decisions={decisions} mode={mode} hover={hover} setHover={setHover} />
            <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10.5px] text-ink-mute">
              <div className="flex flex-wrap gap-4">
                <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-pos" />sobra</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-neg" />falta</span>
                <span>tamaño = caja en EUR · anillo = score</span>
                <span>── misma divisa (sin coste) · ┄┄ cruce de divisa (spread FX)</span>
                {inferredCount > 0 && (
                  <span title="El CSV solo trae país para 230 de 1.286 empresas; el resto se sitúa por su divisa.">
                    · {inferredCount} sin país en el dato, situadas por divisa
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {(["bilateral", "fondo"] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={`rounded-sm border px-2.5 py-1 ${mode === m ? "border-accent text-accent" : "border-line text-ink-mute"}`}>
                    {m === "fondo" ? "fondo común" : "bilateral"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {screen === "cronologia" && <Timeline snaps={snaps} idx={idx} setIdx={setIdx} playing={playing} setPlaying={setPlaying} />}

        {screen === "bandeja" && (
          <div className="rounded-sm border border-line bg-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5">
              <div>
                <div className="font-display text-lg font-bold">Bandeja · {monthLabel(cur.month)}</div>
                <div className="text-xs text-ink-mute">
                  {pending} pendiente{pending === 1 ? "" : "s"} · {eur(approvedEur)} aprobados este mes
                  {cur.proposals.length > 0 && ` · ahorro anual si se aprueba todo: ${eur(cur.proposals.reduce((s, p) => s + p.savingEurYear, 0))}`}
                </div>
              </div>
              {pending > 0 && (
                <button
                  onClick={() => setDecisions((d) => ({ ...d, ...Object.fromEntries(cur.proposals.map((p) => [p.id, "ok" as Decision])) }))}
                  className="rounded-sm bg-accent px-4 py-2 font-mono text-xs font-medium text-[#03181f]"
                >
                  aprobar todas
                </button>
              )}
            </div>
            <div className="divide-y divide-line-soft">
              {cur.proposals.map((p) => (
                <ProposalRow key={p.id} p={p} from={byId[p.fromId]} to={byId[p.toId]} decision={decisions[p.id]} onDecide={(d) => setDecisions((x) => ({ ...x, [p.id]: d }))} onHover={setHover} />
              ))}
              {cur.proposals.length === 0 && <div className="p-6 text-sm text-ink-mute">Este mes ninguna filial necesita cobertura — o ninguna puede darla.</div>}
            </div>
          </div>
        )}

        {screen === "impacto" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-line bg-line-soft md:grid-cols-4">
              <div className="bg-panel p-6 md:col-span-2">
                <div className="font-mono text-[11px] uppercase tracking-widest text-ink-mute">Lo que cuesta no hacerlo · {cf.months} meses</div>
                <div className="mt-2 font-mono text-5xl font-semibold text-accent">{eur(cf.netSavingEur)}</div>
                <p className="mt-3 text-sm text-ink-dim">
                  Intereses que las filiales en déficit habrían pagado a bancos externos, menos lo que pagarían al fondo del
                  grupo y menos el coste de cruzar divisa. Estimación con tipos de mercado orientativos y el tipo interno
                  fijado por score.
                </p>
              </div>
              <Cell n={eur(cf.bankInterestEur)} l="intereses en banco" color="text-neg" />
              <Cell n={eur(cf.poolInterestEur + cf.fxCostEur)} l={`en el pool (incl. ${eur(cf.fxCostEur)} de FX)`} color="text-pos" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {RULES.map((r) => (
                <div key={r.t} className="rounded-sm border border-line bg-panel p-5">
                  <div className="font-display text-base font-bold">{r.t}</div>
                  <p className="mt-2 text-sm text-ink-dim">{r.d}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === "metodo" && (
          <div className="flex flex-col gap-10">
            <div className="max-w-2xl">
              <p className="text-ink-dim">
                Un grupo con filiales en varios países acumula caja en unas mientras otras disponen de pólizas o entran
                en descubierto — y paga al banco por dinero que ya es suyo. Es lo que resuelve el{" "}
                <b className="text-ink">Fondo Central Intercooperativo de Mondragón</b> desde hace décadas: cada
                cooperativa aporta a un fondo común y quien lo necesita saca de ahí en vez de pedir fuera. Aquí es lo
                mismo, pero automático, mes a mes, y con el score fijando cuánto puede recibir cada filial y a qué tipo.
                Y con una cosa que Mondragón no tenía que resolver: <b className="text-ink">las divisas</b>. Mover
                libras a libras es gratis; mover pesos a euros cuesta spread. El sistema prefiere siempre el corredor
                libre.
              </p>
            </div>
            <div>
              <div className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ink-mute">Cómo decide</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {RULES.map((r) => (
                  <div key={r.t} className="rounded-sm border border-line bg-panel p-5">
                    <div className="font-display text-base font-bold">{r.t}</div>
                    <p className="mt-2 text-sm text-ink-dim">{r.d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ink-mute">Backlog · siguiente iteración</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {IDEAS.map((idea) => (
                  <div key={idea.t} className="rounded-sm border border-dashed border-line p-5">
                    <div className="font-display text-base font-bold">{idea.t}</div>
                    <p className="mt-2 text-sm text-ink-dim">{idea.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const RULES = [
  { t: "Quién sobra, quién falta", d: "Todo a euros (cash_position viene en divisa local). Falta: caja negativa, o score < 55 con menos de 25 k€. Sobra: más de 100 k€ con score ≥ 60 — y solo presta la mitad de lo que le sobra por encima de dos colchones." },
  { t: "El tipo lo pone el score", d: "Interno: del 2 % (score 90) al 6 % (score 40). Lo que le cobraría un banco: interno + 2,5 puntos + prima por cada punto de score bajo 65. La diferencia es el ahorro." },
  { t: "Corredor libre primero", d: "Para cada filial en déficit se busca antes una hermana con la misma divisa (coste FX cero). Si no hay, la de más caja, y se descuenta el spread: 0,4 % entre divisas G10, 1,2 % si hay una emergente." },
];

const IDEAS = [
  { t: "Simulador \"qué pasaría si\"", d: "Bajarle 10 puntos al score de una filial con un slider y ver el límite del pool encogerse en vivo — el score como palanca, no como informe." },
  { t: "Devengo y asiento en los dos ERP", d: "Ledger de intereses acumulados por cada préstamo interno y el apunte contable que se generaría en cada lado. Es la parte aburrida y es la que lo hace vendible." },
  { t: "Modo \"aviso, no permiso\"", d: "Traspasos pequeños entre dos filiales en verde: se ejecutan solos y solo se notifican. El gestor revisa lo que importa, no las 40 triviales." },
  { t: "Cobertura de divisa agrupada", d: "Si tres filiales en pesos necesitan euros el mismo mes, un solo cruce grande en vez de tres pequeños: menos spread. El mapa ya lo insinúa; falta que lo proponga." },
];

/* =============================================================== mapa */
type WorldTopo = Topology<{ countries: GeometryCollection }>;
const W = 960, H = 470;
const projection = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" });
const path = geoPath(projection);
const LAND = path(feature(world as unknown as WorldTopo, (world as unknown as WorldTopo).objects.countries)) ?? "";
const GRATICULE = path(geoGraticule10()) ?? "";
const SPHERE = path({ type: "Sphere" }) ?? "";

function WorldMap({ entities, proposals, decisions, mode, hover, setHover }: {
  entities: Entity[]; proposals: Proposal[]; decisions: Record<string, Decision>; mode: "bilateral" | "fondo"; hover: string | null; setHover: (id: string | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  // filiales en el mismo país: se reparten en un anillo para que no se pisen y los arcos no midan cero.
  // El clúster lleva UNA etiqueta (divisa × n) en vez de una por punto.
  const { pos, clusters } = useMemo(() => {
    const byIso = new Map<string, Entity[]>();
    for (const e of entities) byIso.set(e.iso, [...(byIso.get(e.iso) ?? []), e]);
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
      const activeList = list.filter((e) => e.role !== "neutral");
      if (activeList.length > 0) {
        const [cx, cy] = projection([list[0].lon, list[0].lat]) ?? [0, 0];
        const [, ty] = projection([list[0].lon, list[0].lat + ringDeg]) ?? [0, 0];
        const curs = Array.from(new Set(list.map((e) => e.currency)));
        clusters.push({ x: cx, y: cy, r: cy - ty, label: k === 1 ? curs[0] : `${curs.join("/")} ×${k}` });
      }
    }
    return { pos, clusters };
  }, [entities]);

  // "fondo común": los arcos convergen en el centro de gravedad del dinero prestable
  const hub = useMemo(() => {
    const s = entities.filter((e) => e.role === "surplus");
    if (s.length === 0) return null;
    const tot = s.reduce((a, e) => a + e.spareEur, 0);
    const lon = s.reduce((a, e) => a + pos[e.companyId].lon * e.spareEur, 0) / tot;
    const lat = s.reduce((a, e) => a + pos[e.companyId].lat * e.spareEur, 0) / tot;
    const [x, y] = projection([lon, lat]) ?? [0, 0];
    return { lon, lat, x, y };
  }, [entities, pos]);

  const arc = (a: { lon: number; lat: number }, b: { lon: number; lat: number }) =>
    path({ type: "LineString", coordinates: [[a.lon, a.lat], [b.lon, b.lat]] }) ?? "";
  const maxCash = Math.max(1, ...entities.map((e) => Math.abs(e.cashEur ?? 0)));
  const radius = (e: Entity) => 4 + 14 * Math.sqrt(Math.abs(e.cashEur ?? 0) / maxCash);
  const hovered = hover ? entities.find((e) => e.companyId === hover) : null;
  const related = new Set(proposals.filter((p) => p.fromId === hover || p.toId === hover).flatMap((p) => [p.fromId, p.toId]));

  return (
    <div ref={boxRef} className="relative overflow-hidden rounded-sm border border-line bg-panel-2" onMouseMove={(e) => { const r = boxRef.current?.getBoundingClientRect(); if (r) setTip({ x: e.clientX - r.left, y: e.clientY - r.top }); }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Mapa de caja del grupo por filial y divisa">
        <path d={SPHERE} fill="var(--color-ground)" />
        <path d={GRATICULE} fill="none" stroke="var(--color-line-soft)" strokeWidth={0.4} />
        <path d={LAND} fill="var(--color-panel-hi)" stroke="var(--color-line)" strokeWidth={0.5} />

        {proposals.map((p) => {
          const a = pos[p.fromId], b = pos[p.toId];
          if (!a || !b) return null;
          const ok = decisions[p.id] === "ok";
          const stroke = ok ? "var(--color-good)" : "var(--color-accent)";
          const dim = hover && !related.has(p.fromId) && !related.has(p.toId) ? 0.18 : 1;
          // misma divisa: trazo casi continuo · cruce de divisa: punteado claro. Ambos "circulan" (.flow)
          const dash = { strokeDasharray: p.sameCurrency ? "16 4" : "4 5" };
          const w = 1 + 2.2 * Math.sqrt(p.amountEur / 250_000);
          if (mode === "fondo" && hub) {
            return (
              <g key={p.id} opacity={dim}>
                <path d={arc(a, hub)} fill="none" stroke={stroke} strokeWidth={w} style={dash} className="flow" />
                <path d={arc(hub, b)} fill="none" stroke={stroke} strokeWidth={w} style={dash} className="flow" />
              </g>
            );
          }
          return <path key={p.id} d={arc(a, b)} fill="none" stroke={stroke} strokeWidth={w} style={dash} opacity={dim} className="flow" />;
        })}

        {mode === "fondo" && hub && proposals.length > 0 && (
          <g>
            <circle cx={hub.x} cy={hub.y} r={9} fill="var(--color-ground)" stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="2 2" />
            <text x={hub.x} y={hub.y + 3} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={7} fill="var(--color-accent)">FCI</text>
          </g>
        )}

        {entities.map((e) => {
          const p = pos[e.companyId];
          const r = radius(e);
          const faded = hover && hover !== e.companyId && !related.has(e.companyId);
          return (
            <g key={e.companyId} opacity={faded ? 0.3 : 1} onMouseEnter={() => setHover(e.companyId)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
              <circle cx={p.x} cy={p.y} r={r + 2.2} fill="none" stroke={BAND_STROKE[band(e.score)]} strokeWidth={1.2} opacity={0.9} />
              <circle cx={p.x} cy={p.y} r={r} fill={ROLE_FILL[e.role]} opacity={e.role === "neutral" ? 0.55 : 0.92} />
            </g>
          );
        })}

        {clusters.map((c) => (
          <text key={c.label + c.x} x={c.x} y={c.y - c.r - 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={8.5} fill="var(--color-ink-dim)" pointerEvents="none">
            {c.label}
          </text>
        ))}
      </svg>

      {hovered && tip && (
        <div className="pointer-events-none absolute z-10 w-64 rounded-sm border border-line bg-ground/95 p-3 text-xs shadow-lg" style={{ left: Math.min(tip.x + 14, (boxRef.current?.clientWidth ?? 600) - 270), top: tip.y + 14 }}>
          <div className="font-semibold">{hovered.displayName}</div>
          <div className="font-mono text-[10.5px] text-ink-mute">{hovered.companyId} · {hovered.countryName}{hovered.countryInferred ? " (por divisa)" : ""}</div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="text-ink-mute">caja</span><span className="font-mono text-right">{hovered.cashLocal !== null ? local(hovered.cashLocal, hovered.currency) : "—"}</span>
            <span className="text-ink-mute">en euros</span><span className="font-mono text-right">{hovered.cashEur !== null ? eur(hovered.cashEur) : "—"}</span>
            <span className="text-ink-mute">score</span><span className="font-mono text-right" style={{ color: BAND_STROKE[band(hovered.score)] }}>{hovered.score}</span>
            <span className="text-ink-mute">estado</span><span className="text-right">{hovered.role === "surplus" ? `puede prestar ${eur(hovered.spareEur)}` : hovered.role === "deficit" ? `le faltan ${eur(hovered.needEur)}` : "en equilibrio"}</span>
          </div>
          {FX[hovered.currency]?.source === "reference" && <div className="mt-2 text-[10px] text-warn">tipo de cambio de referencia (no viene en el dataset)</div>}
        </div>
      )}
    </div>
  );
}

/* =============================================================== línea temporal */
function Timeline({ snaps, idx, setIdx, playing, setPlaying }: { snaps: Snapshot[]; idx: number; setIdx: (i: number) => void; playing: boolean; setPlaying: (p: boolean) => void }) {
  const W = 960, H = 140;
  const max = Math.max(1, ...snaps.map((s) => Math.max(s.totals.surplusEur, s.totals.deficitEur)));
  const x = (i: number) => (i / Math.max(1, snaps.length - 1)) * W;
  const line = (key: "surplusEur" | "deficitEur") => snaps.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${(H - (s.totals[key] / max) * (H - 6)).toFixed(1)}`).join(" ");
  const s = snaps[idx];
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-sm border border-line bg-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setPlaying(!playing)} className="flex h-10 w-10 items-center justify-center rounded-sm border border-line text-sm text-ink hover:border-accent" aria-label={playing ? "pausar" : "reproducir"}>
              {playing ? "❚❚" : "▶"}
            </button>
            <div>
              <div className="font-display text-2xl font-bold">{monthLabel(snaps[idx].month)}</div>
              <div className="font-mono text-[10.5px] text-ink-mute">mes {idx + 1} de {snaps.length} · el pool se recalcula cada mes con el score de ese mes</div>
            </div>
          </div>
          <div className="flex gap-5 font-mono text-[10.5px] text-ink-mute">
            <span><i className="mr-1 inline-block h-[2px] w-4 bg-pos align-middle" />prestable</span>
            <span><i className="mr-1 inline-block h-[2px] w-4 bg-neg align-middle" />falta</span>
          </div>
        </div>
        <div className="relative mt-5">
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" preserveAspectRatio="none" aria-hidden>
            <path d={line("surplusEur")} fill="none" stroke="var(--color-pos)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <path d={line("deficitEur")} fill="none" stroke="var(--color-neg)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <line x1={x(idx)} x2={x(idx)} y1={0} y2={H} stroke="var(--color-accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </svg>
          <input id="month-slider" type="range" min={0} max={snaps.length - 1} value={idx} onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }} className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" aria-label="Mes" />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-mute">
          <span>{monthLabel(snaps[0].month)}</span>
          <span>{monthLabel(snaps[snaps.length - 1].month)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi n={String(s.totals.nSurplus)} l="filiales con excedente este mes" color="text-pos" />
        <Kpi n={String(s.totals.nDeficit)} l="filiales con déficit este mes" color="text-neg" />
        <Kpi n={eur(s.totals.cashEur)} l="caja total del grupo" />
        <Kpi n={String(s.proposals.length)} l="propuestas generadas" />
      </div>
    </div>
  );
}

/* =============================================================== bandeja */
function ProposalRow({ p, from, to, decision, onDecide, onHover }: { p: Proposal; from?: Entity; to?: Entity; decision?: Decision; onDecide: (d: Decision) => void; onHover: (id: string | null) => void }) {
  if (!from || !to) return null;
  const urg = p.urgency === "alta" ? "border-bad text-bad" : p.urgency === "media" ? "border-warn text-warn" : "border-line text-ink-mute";
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 p-5 ${decision ? "opacity-55" : ""}`} onMouseEnter={() => onHover(to.companyId)} onMouseLeave={() => onHover(null)}>
      <div className="min-w-[280px] flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{from.displayName}</span>
          <span className="font-mono text-[10px] text-ink-mute">{from.currency}</span>
          <span className="text-ink-mute">→</span>
          <span className="font-semibold">{to.displayName}</span>
          <span className="font-mono text-[10px] text-ink-mute">{to.currency}</span>
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${urg}`}>{p.urgency}</span>
          {!p.sameCurrency && <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-ink-mute">cruce de divisa · {eur(p.fxCostEur)} FX</span>}
        </div>
        <div className="mt-1 font-mono text-[11px] text-ink-mute">
          {to.displayName} tiene {to.cashEur !== null ? eur(to.cashEur) : "—"} y score {to.score} · en banco pagaría {p.bankRate}% · en el pool {p.internalRate}%
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="text-right">
          <div className="font-mono text-lg font-semibold text-accent">{eur(p.amountEur)}</div>
          {/* si la divisa de destino ya es EUR, el importe de arriba es el mismo número: no repetir */}
          {!p.sameCurrency ? (
            <div className="font-mono text-[10px] text-ink-mute">{local(p.amountFromLocal, from.currency)} → {local(p.amountToLocal, to.currency)}</div>
          ) : to.currency !== "EUR" ? (
            <div className="font-mono text-[10px] text-ink-mute">{local(p.amountToLocal, to.currency)}</div>
          ) : null}
          <div className="font-mono text-[10px] text-good">ahorra {eur(p.savingEurYear)}/año vs banco</div>
        </div>
        {decision ? (
          <span className={`font-mono text-xs ${decision === "ok" ? "text-good" : "text-bad"}`}>{decision === "ok" ? "aprobada" : "rechazada"}</span>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => onDecide("ok")} className="rounded-sm border border-good px-3 py-1.5 font-mono text-xs text-good">aprobar</button>
            <button onClick={() => onDecide("no")} className="rounded-sm border border-line px-3 py-1.5 font-mono text-xs text-ink-mute">rechazar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ n, l, color = "text-accent" }: { n: string; l: string; color?: string }) {
  return (
    <div>
      <div className={`font-mono text-xl font-semibold ${color}`}>{n}</div>
      <div className="text-[11px] text-ink-mute">{l}</div>
    </div>
  );
}
function Cell({ n, l, color }: { n: string; l: string; color: string }) {
  return (
    <div className="bg-panel p-5">
      <div className={`font-mono text-2xl font-semibold ${color}`}>{n}</div>
      <div className="mt-1 text-[11px] text-ink-mute">{l}</div>
    </div>
  );
}
