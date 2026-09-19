"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Row } from "@/lib/data/portfolio";
import { DIMENSIONS, type Dimension } from "@/lib/score/types";
import { DIM_LABEL } from "@/lib/score/meta";
import { TIER_LABEL, TREND_LABEL, type Tier, type Trend } from "@/lib/score/derived";
import { Pill, Delta } from "@/components/ui/Pill";
import { scoreColor, DIM_COLOR } from "@/lib/score/colors";
import { formatCount } from "@/lib/format";

type SortKey = "score" | "d1" | "d3" | "d6" | "nStress" | "name";
const TIER_TONE: Record<Tier, "good" | "warn" | "bad"> = { prime: "good", healthy: "good", watch: "warn", risk: "bad" };
const TREND_TONE: Record<Trend, "good" | "neutral" | "bad"> = { improving: "good", stable: "neutral", deteriorating: "bad" };

export default function CompanyTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<"all" | Tier>("all");
  const [trend, setTrend] = useState<"all" | Trend>("all");
  const [dim, setDim] = useState<"all" | Dimension>("all");
  const [onlyAlert, setOnlyAlert] = useState(false);
  const [onlyStress, setOnlyStress] = useState(false);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "score", dir: -1 });
  const [page, setPage] = useState(0);
  const PAGE = 50;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = rows.filter((r) =>
      (!s || r.name.toLowerCase().includes(s) || r.id.toLowerCase().includes(s) || (r.group ?? "").toLowerCase().includes(s)) &&
      (tier === "all" || r.tier === tier) && (trend === "all" || r.trend === trend) &&
      (dim === "all" || r.driver?.dim === dim) && (!onlyAlert || r.alert) && (!onlyStress || r.nStress > 0));
    const get = (r: Row) => (sort.k === "name" ? r.name : (r[sort.k] as number | null) ?? (sort.dir === -1 ? -Infinity : Infinity));
    return f.sort((a, b) => { const x = get(a), y = get(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }, [rows, q, tier, trend, dim, onlyAlert, onlyStress, sort]);

  const shown = list.slice(page * PAGE, page * PAGE + PAGE);
  const th = (k: SortKey, label: string, right = true) => (
    <button type="button" onClick={() => { setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 })); setPage(0); }} className={`flex items-center gap-1 ${right ? "ml-auto" : ""} ${sort.k === k ? "text-ink" : "text-ink-mute hover:text-ink-dim"}`}>
      {label}{sort.k === k && <span className="text-[9px]">{sort.dir === -1 ? "▼" : "▲"}</span>}
    </button>
  );
  const seg = <T extends string>(value: T, set: (v: T) => void, opts: [T, string][]) => (
    <div className="flex rounded-lg border border-line bg-panel p-0.5 text-[11.5px]">
      {opts.map(([v, l]) => <button key={v} type="button" onClick={() => { set(v); setPage(0); }} className={`rounded-lg px-2.5 py-1 ${value === v ? "bg-panel-hi text-ink" : "text-ink-mute hover:text-ink-dim"}`}>{l}</button>)}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Buscar empresa, id o grupo…" className="h-9 w-64 rounded-lg border border-line bg-ground px-4 text-[13px] text-ink outline-none placeholder:text-ink-mute focus:border-accent" />
        {seg(tier, setTier, [["all", "Todas"], ["prime", "Prime ≥80"], ["healthy", "Sana 70–80"], ["watch", "Vigilar 40–70"], ["risk", "Riesgo <40"]])}
        {seg(trend, setTrend, [["all", "Régimen"], ["improving", "Mejorando"], ["stable", "Estable"], ["deteriorating", "Deteriorando"]])}
        {seg(dim, setDim, [["all", "Motivo"], ...DIMENSIONS.map((d) => [d, DIM_LABEL[d]] as [Dimension, string])])}
        <label className="flex items-center gap-1.5 text-[11.5px] text-ink-mute"><input type="checkbox" className="accent-accent" checked={onlyAlert} onChange={(e) => { setOnlyAlert(e.target.checked); setPage(0); }} />20 % peor</label>
        <label className="flex items-center gap-1.5 text-[11.5px] text-ink-mute"><input type="checkbox" className="accent-accent" checked={onlyStress} onChange={(e) => { setOnlyStress(e.target.checked); setPage(0); }} />con alarma</label>
        <span className="num ml-auto text-[12px] text-ink-mute">{formatCount(list.length)} empresas</span>
      </div>
      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-[minmax(0,2fr)_90px_120px_140px_64px_64px_64px_64px_56px] gap-3 border-b border-line-soft bg-panel-2/60 px-5 py-2.5 text-[12px] font-medium text-ink-mute">
          <span>{th("name", "Empresa", false)}</span><span>Semáforo</span><span>Régimen</span><span>Motivo</span>
          <span>{th("score", "Score")}</span><span>{th("d1", "Δ 1m")}</span><span>{th("d3", "Δ 3m")}</span><span>{th("d6", "Δ 6m")}</span><span>{th("nStress", "S")}</span>
        </div>
        <div className="divide-y divide-line-soft">
          {shown.map((r) => (
            <Link key={r.id} href={`/empresas/${r.id}`} className="grid grid-cols-[minmax(0,2fr)_90px_120px_140px_64px_64px_64px_64px_56px] items-center gap-3 px-5 py-2.5 text-[12.5px] transition-colors hover:bg-panel-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 shrink-0 rounded-lg" style={{ background: scoreColor(r.score) }} /><span className="truncate text-ink">{r.name}</span></div>
                <div className="num ml-3.5 text-[10.5px] text-ink-mute">{r.id}{r.group ? ` · ${r.group}` : ""}{r.alert ? <span className="ml-2 text-bad">20 % peor</span> : null}</div>
              </div>
              <Pill tone={TIER_TONE[r.tier]}>{TIER_LABEL[r.tier]}</Pill>
              <Pill tone={TREND_TONE[r.trend]}>{TREND_LABEL[r.trend]}</Pill>
              <span className="flex items-center gap-1.5 text-[11.5px] text-ink-dim">{r.driver && <><span className="h-2 w-2 rounded-sm" style={{ background: DIM_COLOR[r.driver.dim] }} />{DIM_LABEL[r.driver.dim]}<span className={`num ${r.driver.value >= 0 ? "text-good" : "text-bad"}`}>{r.driver.value >= 0 ? "+" : "−"}{Math.abs(r.driver.value).toFixed(0)}</span></>}</span>
              <span className="num text-right text-[14px] text-ink">{r.score.toFixed(0)}</span>
              <span className="text-right"><Delta v={r.d1} /></span>
              <span className="text-right"><Delta v={r.d3} /></span>
              <span className="text-right"><Delta v={r.d6} /></span>
              <span className={`num text-right ${r.nStress > 0 ? "text-warn" : "text-ink-mute"}`}>{r.nStress}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-line-soft px-5 py-2.5 text-[12px] text-ink-mute">
          <span>{page * PAGE + 1}–{Math.min(list.length, (page + 1) * PAGE)} de {formatCount(list.length)}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-30">Anterior</button>
            <button type="button" disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-30">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
