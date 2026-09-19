"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { Card } from "@/components/ui/Card";
import { BubbleMap } from "./BubbleMap";
import { Bins } from "./Bins";
import { LenderCard } from "./LenderCard";
import CompanyViewer from "./CompanyViewer";
import { Btn, Pager, Seg, Skeleton, Slider } from "./ui";
import { scoreColor } from "@/lib/score/colors";
import type { Trend } from "@/lib/score/derived";
import { fmtMoney, monthLabelLong } from "@/lib/format";

type SortKey = "deployable" | "capacity" | "score" | "momentum";
const PER_PAGE = 6;

/** Paso 1 · quién está en posición de prestar. Seleccionar una empresa la abre en el visor de la derecha. */
export default function Lenders({ initialLender }: { initialLender: string | null }) {
  const { network, error, assessed, lenderId, setLender, openCompany, setOpenCompany } = useMarketplace();
  const router = useRouter();
  const [view, setView] = useState<"map" | "cards">("map");
  const [minScore, setMinScore] = useState(0);
  const [trendFilter, setTrendFilter] = useState<"all" | Trend>("all");
  const [onlyQualified, setOnlyQualified] = useState(true);
  const [sort, setSort] = useState<SortKey>("deployable");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => { if (initialLender) setLender(initialLender); }, [initialLender, setLender]);
  // el visor arranca con el prestamista elegido, si lo hay
  useEffect(() => { if (!openCompany && lenderId) setOpenCompany(lenderId); }, [openCompany, lenderId, setOpenCompany]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = assessed.filter((a) => a.c.latest.score >= minScore && (trendFilter === "all" || a.trend === trendFilter) && (!onlyQualified || a.provider.qualified) && (!needle || a.c.name.toLowerCase().includes(needle) || a.c.id.toLowerCase().includes(needle)));
    list.sort((x, y) => sort === "score" ? y.c.latest.score - x.c.latest.score : sort === "momentum" ? (y.momentum ?? -99) - (x.momentum ?? -99) : sort === "deployable" ? (y.provider.deployable ?? -1) - (x.provider.deployable ?? -1) || y.provider.capacity - x.provider.capacity : y.provider.capacity - x.provider.capacity || y.c.latest.score - x.c.latest.score);
    return list;
  }, [assessed, minScore, trendFilter, onlyQualified, q, sort]);
  useEffect(() => { setPage(0); }, [filtered.length, view]);
  const nQualified = useMemo(() => assessed.filter((a) => a.provider.qualified).length, [assessed]);
  const totalDeployable = useMemo(() => assessed.filter((a) => a.provider.qualified).reduce((s, a) => s + (a.provider.deployable ?? 0), 0), [assessed]);
  const bins = useMemo(() => { const out = [] as { from: number; to: number; value: number }[]; for (let f = 0; f < 100; f += 5) out.push({ from: f, to: f + 5, value: assessed.filter((a) => a.c.latest.score >= f && a.c.latest.score < f + 5 + (f === 95 ? 1 : 0)).length }); return out; }, [assessed]);
  const bubbles = useMemo(() => {
    const visible = new Set(filtered.map((a) => a.c.id));
    const deps = assessed.map((a) => a.provider.deployable ?? 0).filter((v) => v > 0).sort((x, y) => x - y);
    const ref = deps[Math.floor(deps.length * 0.95)] || 1;
    return assessed.map((a) => { const d = a.provider.deployable ?? 0; return { id: a.c.id, name: a.c.name, score: a.c.latest.score, momentum: a.momentum ?? 0, size: Math.min(100, 100 * Math.sqrt(d / ref)), sizeText: fmtMoney(d), qualified: a.provider.qualified, alert: a.c.latest.alert === 1, dimmed: !visible.has(a.c.id) }; });
  }, [assessed, filtered]);
  const lender = useMemo(() => assessed.find((a) => a.c.id === lenderId) ?? null, [assessed, lenderId]);

  if (error) return <Card><p className="text-bad">No se pudo cargar el dataset del score: {error}</p></Card>;
  const pageItems = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_400px]">
      <aside className="flex flex-col gap-4">
        <Card title="Prestamistas cualificados" sub={network ? monthLabelLong(network.asOf) : "cargando…"}>
          {!network ? <Skeleton className="h-24" /> : (
            <>
              <div className="flex items-end justify-between"><div className="num text-[30px] font-semibold leading-none text-ink">{nQualified}<span className="text-[14px] text-ink-mute"> / {network.companies.length}</span></div><div className="text-right text-[12px] text-ink-mute">desplegable<br /><span className="num text-ink">{fmtMoney(totalDeployable)}</span></div></div>
              <div className="mt-3"><Bins bins={bins} height={40} highlight={(b) => b.from >= 75} fmt={(v) => `${v} empresas`} /></div>
              <p className="mt-3 text-[12px] text-ink-mute">Cualifica con score ≥ 75, sin alerta ni alarmas, un año de historia, suelo ≥ 60, liquidez que no lastre y <span className="text-ink">tesorería desplegable ≥ 100 k€</span> (50 % del suelo de caja real de 12 meses).</p>
            </>
          )}
        </Card>
        <Card title="Filtros">
          <div className="space-y-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa o id…" className="h-9 w-full rounded-lg border border-line bg-ground px-3 text-[13px] text-ink outline-none placeholder:text-ink-mute focus:ring-2 focus:ring-white/20" />
            <Slider label="Score mínimo" value={minScore} min={0} max={90} step={5} onChange={setMinScore} />
            <div><div className="mb-1.5 text-[13px] text-ink-mute">Tendencia</div><Seg className="w-full" value={trendFilter} onChange={setTrendFilter} options={[{ value: "all", label: "Todas" }, { value: "improving", label: "Sube" }, { value: "stable", label: "Estable" }, { value: "deteriorating", label: "Cae" }]} /></div>
            <div><div className="mb-1.5 text-[13px] text-ink-mute">Orden</div><Seg className="w-full" value={sort} onChange={setSort} options={[{ value: "deployable", label: "Tesorería" }, { value: "capacity", label: "Capacidad" }, { value: "score", label: "Score" }]} /></div>
            <label className="flex items-center gap-2 text-[13px] text-ink-mute"><input type="checkbox" className="accent-white" checked={onlyQualified} onChange={(e) => setOnlyQualified(e.target.checked)} />Solo cualificadas<span className="num ml-auto text-[12px]">{filtered.length}</span></label>
          </div>
        </Card>
        {lender && (
          <div className="card p-4 ring-1 ring-ink/40">
            <div className="text-[12px] text-ink-mute">Prestamista elegido</div>
            <div className="mt-1 flex items-center justify-between gap-2"><button type="button" onClick={() => setOpenCompany(lender.c.id)} className="truncate text-left text-[15px] font-semibold text-ink hover:underline">{lender.c.name}</button><span className="num text-[22px] font-semibold" style={{ color: scoreColor(lender.c.latest.score) }}>{lender.c.latest.score.toFixed(0)}</span></div>
            <div className="num text-[12px] text-ink-mute">desplegable {fmtMoney(lender.provider.deployable ?? 0)}</div>
            <Btn className="mt-3 w-full" onClick={() => router.push("/productos/marketplace/receptores")}>Paso 2 · Receptores →</Btn>
          </div>
        )}
      </aside>
      <Card
        title={view === "cards" ? `${filtered.length} empresas` : "Toda la red"}
        sub={view === "cards" ? "pincha una tarjeta para verla en el visor" : "x = score · y = momentum · área = tesorería desplegable real · anillo = cualificada · pincha una burbuja para verla en el visor"}
        right={<div className="flex items-center gap-2">{view === "cards" && <Pager page={page} pageSize={PER_PAGE} total={filtered.length} onChange={setPage} />}<Seg value={view} onChange={setView} options={[{ value: "map", label: "Mapa" }, { value: "cards", label: "Tarjetas" }]} /></div>}
      >
        {!network ? <Skeleton className="h-[420px]" /> : view === "cards" ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {pageItems.map((a) => <LenderCard key={a.c.id} a={a} selected={a.c.id === lenderId} viewing={a.c.id === openCompany} onLend={() => setLender(a.c.id)} onOpen={() => setOpenCompany(a.c.id)} />)}
            {pageItems.length === 0 && <div className="col-span-full py-10 text-center text-[13px] text-ink-mute">Ninguna empresa cumple esos filtros.</div>}
          </div>
        ) : <BubbleMap data={bubbles} onSelect={(id) => setOpenCompany(id)} selected={openCompany} sizeLabel="Desplegable" xThreshold={75} thresholdLabel="UMBRAL PRESTAMISTA 75" />}
      </Card>
      <CompanyViewer mode="lender" />
    </div>
  );
}
