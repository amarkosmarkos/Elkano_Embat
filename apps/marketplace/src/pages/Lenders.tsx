import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Coins, LayoutGrid, Map as MapIcon, Search } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useAssessments } from "@/hooks/useAssessments";
import { useApp } from "@/store/app";
import { BubbleMap } from "@/components/charts/BubbleMap";
import { Histogram } from "@/components/charts/Histogram";
import { LenderCard } from "@/components/LenderCard";
import { AutoSize } from "@/components/ui/AutoSize";
import { Button, Eyebrow, Pager, Segmented, Skeleton, Slider } from "@/components/ui/primitives";
import { InfoTip } from "@/components/ui/InfoTip";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { fmtMonth } from "@/lib/format";
import { scoreColor } from "@/lib/colors";
import type { Trend } from "@/lib/derived";

type SortKey = "capacity" | "score" | "momentum";
const PER_PAGE = 8;

/** Who is in a position to lend. */
export function Lenders() {
  const { data, error } = useNetwork();
  const assessed = useAssessments(data);
  const lenderId = useApp((s) => s.lenderId);
  const setLender = useApp((s) => s.setLender);
  const setOpenCompany = useApp((s) => s.setOpenCompany);
  const nav = useNavigate();
  const [view, setView] = useState<"cards" | "map">("map");
  const [minScore, setMinScore] = useState(0);
  const [trendFilter, setTrendFilter] = useState<"all" | Trend>("all");
  const [onlyQualified, setOnlyQualified] = useState(true);
  const [sort, setSort] = useState<SortKey>("capacity");
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = dq.trim().toLowerCase();
    const list = assessed.filter((a) =>
      a.c.latest.score >= minScore &&
      (trendFilter === "all" || a.trend === trendFilter) &&
      (!onlyQualified || a.provider.qualified) &&
      (!needle || a.c.name.toLowerCase().includes(needle) || a.c.id.toLowerCase().includes(needle)));
    list.sort((x, y) => sort === "score" ? y.c.latest.score - x.c.latest.score : sort === "momentum" ? (y.momentum ?? -99) - (x.momentum ?? -99) : y.provider.capacity - x.provider.capacity || y.c.latest.score - x.c.latest.score);
    return list;
  }, [assessed, minScore, trendFilter, onlyQualified, dq, sort]);
  useEffect(() => { setPage(0); }, [filtered.length, view]);

  const nQualified = useMemo(() => assessed.filter((a) => a.provider.qualified).length, [assessed]);
  const bins = useMemo(() => {
    const out = [] as { from: number; to: number; value: number }[];
    for (let f = 0; f < 100; f += 5) out.push({ from: f, to: f + 5, value: assessed.filter((a) => a.c.latest.score >= f && a.c.latest.score < f + 5 + (f === 95 ? 1 : 0)).length });
    return out;
  }, [assessed]);
  const bubbles = useMemo(() => {
    const visible = new Set(filtered.map((a) => a.c.id));
    return assessed.map((a) => ({ id: a.c.id, name: a.c.name, score: a.c.latest.score, momentum: a.momentum ?? 0, size: a.provider.capacity, qualified: a.provider.qualified, alert: a.c.latest.alert === 1, dimmed: !visible.has(a.c.id) }));
  }, [assessed, filtered]);
  const lender = useMemo(() => assessed.find((a) => a.c.id === lenderId) ?? null, [assessed, lenderId]);

  if (error) return <div className="card p-8 text-negative">Could not load the score dataset: {error}</div>;
  const pageItems = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <div className="grid h-full min-h-0 grid-cols-[300px_1fr] gap-4">
      <aside className="card flex min-h-0 min-w-0 flex-col p-4">
        <Eyebrow>Capital network · {data ? fmtMonth(data.meta.asOf, "long") : "loading"}</Eyebrow>
        <h1 className="mt-1 font-display text-[34px] leading-[1.02]">Who is in a <span className="text-accent">position to lend</span>.</h1>
        <p className="mt-1.5 hidden text-[12px] italic leading-snug text-muted [@media(min-height:800px)]:block">Qualified lenders score ≥ 75 with no alert, no stress flags, a year of history, a solid floor and healthy liquidity. Pick one to allocate its treasury.</p>

        <div className="inset mt-3 p-3">
          {!data ? <Skeleton className="h-20 w-full" /> : (
            <>
              <div className="flex items-end justify-between">
                <div><Eyebrow>Qualified lenders</Eyebrow><div className="tnum font-caps text-4xl font-bold leading-none"><AnimatedNumber value={nQualified} /><span className="text-sm text-faint"> / {data.meta.nCompanies}</span></div></div>
                <div className="text-right"><Eyebrow>Threshold</Eyebrow><div className="tnum font-caps text-xl font-bold leading-none">75</div></div>
              </div>
              <div className="mt-1.5"><Histogram bins={bins} height={34} highlight={(b) => b.from >= 75} valueLabel={(v) => `${v} companies`} /></div>
            </>
          )}
        </div>

        <div className="mt-2.5 space-y-2">
          <label className="relative block">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company or ID" className="inset h-9 w-full pl-8 pr-3 text-[13px] outline-none placeholder:text-faint focus:border-accent" />
          </label>
          <Slider label="Min score" value={minScore} min={0} max={90} step={5} onChange={setMinScore} />
          <div><Eyebrow className="mb-1">Trend</Eyebrow><Segmented className="w-full" value={trendFilter} onChange={setTrendFilter} size="sm" options={[{ value: "all", label: "Any" }, { value: "improving", label: "Rising" }, { value: "stable", label: "Stable" }, { value: "deteriorating", label: "Falling" }]} /></div>
          <div><Eyebrow className="mb-1">Sort</Eyebrow><Segmented className="w-full" value={sort} onChange={setSort} size="sm" options={[{ value: "capacity", label: "Capacity" }, { value: "score", label: "Score" }, { value: "momentum", label: "Momentum" }]} /></div>
          <label className="flex cursor-pointer select-none items-center gap-2 text-[12.5px] text-muted">
            <input type="checkbox" checked={onlyQualified} onChange={(e) => setOnlyQualified(e.target.checked)} className="h-3.5 w-3.5 accent-[#8a6512]" />Qualified only
            <span className="tnum ml-auto font-caps text-[10px] text-faint">{filtered.length} shown</span>
          </label>
        </div>

        {/* selected lender */}
        <div className="mt-auto pt-3">
          {lender ? (
            <div className="inset border-accent/60 p-2.5">
              <div className="flex items-center justify-between"><Eyebrow className="text-accent">Lending as</Eyebrow><button onClick={() => setOpenCompany(lender.c.id)} className="font-caps text-[9px] uppercase tracking-[0.12em] text-muted hover:text-fg">details</button></div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-display text-[18px] leading-tight">{lender.c.name}</span>
                <span className="tnum font-caps text-2xl font-bold" style={{ color: scoreColor(lender.c.latest.score) }}>{lender.c.latest.score.toFixed(0)}</span>
              </div>
              <Button size="sm" className="mt-1.5 w-full" onClick={() => nav("/borrowers")}>Find borrowers <ArrowRight size={12} /></Button>
            </div>
          ) : (
            <div className="inset p-3 text-[11.5px] italic text-muted"><Coins size={12} className="mr-1 inline text-accent" />Press <span className="font-caps not-italic text-accent">Lend</span> on a card to choose who deploys the capital.</div>
          )}
        </div>
      </aside>

      <section className="card flex min-h-0 min-w-0 flex-col p-4">
        <div className="flex shrink-0 items-end justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow>{view === "cards" ? "Ready to lend" : "Charted waters · every scored company"}</Eyebrow>
            <div className="truncate font-display text-xl leading-tight">{view === "cards" ? `${filtered.length} companies · strongest first` : "Area = lender capacity · gold ring = qualified · click to open"}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <InfoTip>
              <div className="font-caps text-[10px] font-bold uppercase tracking-[0.12em] text-accent">Lender threshold · dashed line at 75</div>
              <p className="mt-1">A company is a <b>qualified lender</b> when all of these hold this month:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li><b>Score ≥ 75</b> — the pipeline's green band starts at 70 (quartiles of the last month: 53 / 67 / 77); 75 keeps roughly the top third.</li>
                <li>Not in the bottom 20% of the network (no alert) and <b>no stress flags</b> active.</li>
                <li>≥ 12 months of scored history and never below 60 in the last 6 months.</li>
                <li>Liquidity not dragging the score (liquidity contribution ≥ −5 pts, or runway ≥ 12 mo with zero overdraft days).</li>
              </ul>
              <p className="mt-1 text-muted">Bubble area = capacity (45% score, 20% stability, 20% liquidity, 15% momentum). Rules in <span className="font-mono">src/lib/derived.ts</span>.</p>
            </InfoTip>
            {view === "cards" && <Pager page={page} pageSize={PER_PAGE} total={filtered.length} onChange={setPage} />}
            <Segmented value={view} onChange={setView} size="sm" options={[{ value: "map", label: <span className="flex items-center gap-1.5"><MapIcon size={12} />Map</span> }, { value: "cards", label: <span className="flex items-center gap-1.5"><LayoutGrid size={12} />Cards</span> }]} />
          </div>
        </div>
        {!data ? (
          <div className="mt-3 grid flex-1 grid-cols-4 grid-rows-2 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-full" />)}</div>
        ) : view === "cards" ? (
          <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.25 }} className="mt-3 grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-3">
              {pageItems.map((a, i) => <LenderCard key={a.c.id} a={a} index={i} selected={a.c.id === lenderId} onOpen={() => setOpenCompany(a.c.id)} onLend={() => setLender(a.c.id)} />)}
              {pageItems.length === 0 && <div className="col-span-4 row-span-2 flex items-center justify-center italic text-muted">No company matches these filters.</div>}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="mt-2 min-h-0 flex-1"><AutoSize>{(w, h) => <BubbleMap data={bubbles} width={w} height={h} onSelect={(id) => setOpenCompany(id)} sizeLabel="Capacity" xThreshold={75} thresholdLabel="LENDER THRESHOLD 75" />}</AutoSize></div>
        )}
      </section>
    </div>
  );
}
