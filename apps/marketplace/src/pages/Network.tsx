import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Map as MapIcon, Search } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useAssessments, type Assessed } from "@/hooks/useAssessments";
import { useApp } from "@/store/app";
import { BubbleMap } from "@/components/charts/BubbleMap";
import { Histogram } from "@/components/charts/Histogram";
import { CompanyCard } from "@/components/CompanyCard";
import { AutoSize } from "@/components/ui/AutoSize";
import { Eyebrow, Pager, PanelHead, Segmented, Skeleton, Slider } from "@/components/ui/primitives";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { fmtMonth } from "@/lib/format";
import type { Trend } from "@/lib/derived";

type SortKey = "score" | "momentum" | "index";
const CARDS_PER_PAGE = 8;

export function Network() {
  const { data, error } = useNetwork();
  const assessed = useAssessments(data);
  const perspective = useApp((s) => s.perspective);
  const setPerspective = useApp((s) => s.setPerspective);
  const nav = useNavigate();
  const [view, setView] = useState<"map" | "grid">("map");
  const [minScore, setMinScore] = useState(0);
  const [trendFilter, setTrendFilter] = useState<"all" | Trend>("all");
  const [onlyQualified, setOnlyQualified] = useState(true);
  const [sort, setSort] = useState<SortKey>("index");
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const [page, setPage] = useState(0);

  const isQualified = (a: Assessed) => (perspective === "provider" ? a.provider.qualified : a.receiver.eligible && a.receiver.need >= 25);
  const indexOf = (a: Assessed) => (perspective === "provider" ? a.provider.capacity : a.receiver.fit);

  const filtered = useMemo(() => {
    const needle = dq.trim().toLowerCase();
    const list = assessed.filter((a) =>
      a.c.latest.score >= minScore &&
      (trendFilter === "all" || a.trend === trendFilter) &&
      (!onlyQualified || isQualified(a)) &&
      (!needle || a.c.name.toLowerCase().includes(needle) || a.c.id.toLowerCase().includes(needle)));
    list.sort((x, y) => sort === "score" ? y.c.latest.score - x.c.latest.score : sort === "momentum" ? (y.momentum ?? -99) - (x.momentum ?? -99) : indexOf(y) - indexOf(x) || y.c.latest.score - x.c.latest.score);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessed, minScore, trendFilter, onlyQualified, dq, sort, perspective]);
  useEffect(() => { setPage(0); }, [filtered.length, perspective, view]);

  const nQualified = useMemo(() => assessed.filter(isQualified).length, [assessed, perspective]); // eslint-disable-line react-hooks/exhaustive-deps
  const bins = useMemo(() => {
    const out = [] as { from: number; to: number; value: number }[];
    for (let f = 0; f < 100; f += 5) out.push({ from: f, to: f + 5, value: assessed.filter((a) => a.c.latest.score >= f && a.c.latest.score < f + 5 + (f === 95 ? 1 : 0)).length });
    return out;
  }, [assessed]);
  const median = useMemo(() => {
    const s = assessed.map((a) => a.c.latest.score).sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  }, [assessed]);
  const bubbles = useMemo(() => {
    const visible = new Set(filtered.map((a) => a.c.id));
    return assessed.map((a) => ({
      id: a.c.id, name: a.c.name, score: a.c.latest.score, momentum: a.momentum ?? 0, size: indexOf(a),
      qualified: isQualified(a), alert: a.c.latest.alert === 1, dimmed: !visible.has(a.c.id),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessed, filtered, perspective]);

  if (error) return <div className="card p-8 text-negative">Could not load the score dataset: {error}</div>;

  const pageItems = filtered.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);

  return (
    <div className="grid h-full min-h-0 grid-cols-[300px_1fr] gap-4">
      {/* left: story + filters */}
      <aside className="card flex min-h-0 min-w-0 flex-col p-4">
        <Eyebrow>Capital network · {data ? fmtMonth(data.meta.asOf, "long") : "loading"}</Eyebrow>
        <h1 className="mt-1 font-display text-[30px] leading-[1.05]">
          {perspective === "provider" ? <>Captains with <span className="text-accent">treasure to lend</span>.</> : <>Healthy crews that could <span className="text-accent-2">take on capital</span>.</>}
        </h1>
        <p className="mt-1.5 text-[12px] italic leading-snug text-muted">
          {perspective === "provider"
            ? "Ranked by the Embat financial-health score: strong, stable liquidity and no stress flags. Embat sits in between — matching excess treasury with financing demand."
            : "A company can need working capital and still be financially healthy. These candidates pay on time and keep a good score, yet show visible demand for capital."}
        </p>
        <Segmented className="mt-3 w-full" value={perspective} onChange={setPerspective} size="sm" options={[{ value: "provider", label: "Lenders" }, { value: "receiver", label: "Borrowers" }]} />

        <div className="inset mt-3 p-3">
          {!data ? <Skeleton className="h-20 w-full" /> : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <Eyebrow>{perspective === "provider" ? "Qualified providers" : "Financing candidates"}</Eyebrow>
                  <div className="tnum font-caps text-3xl font-bold leading-none"><AnimatedNumber value={nQualified} /><span className="text-sm text-faint"> / {data.meta.nCompanies}</span></div>
                </div>
                <div className="text-right"><Eyebrow>Median</Eyebrow><div className="tnum font-caps text-xl font-bold leading-none">{median.toFixed(0)}</div></div>
              </div>
              <div className="mt-2"><Histogram bins={bins} height={44} highlight={(b) => b.from >= (perspective === "provider" ? 75 : 60)} valueLabel={(v) => `${v} companies`} /></div>
            </>
          )}
        </div>

        <div className="mt-3 space-y-3">
          <label className="relative block">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company or ID" className="inset h-9 w-full pl-8 pr-3 text-[13px] outline-none placeholder:text-faint focus:border-accent" />
          </label>
          <Slider label="Min score" value={minScore} min={0} max={90} step={5} onChange={setMinScore} />
          <div>
            <Eyebrow className="mb-1">Trend</Eyebrow>
            <Segmented className="w-full" value={trendFilter} onChange={setTrendFilter} size="sm" options={[{ value: "all", label: "Any" }, { value: "improving", label: "Rising" }, { value: "stable", label: "Stable" }, { value: "deteriorating", label: "Falling" }]} />
          </div>
          <div>
            <Eyebrow className="mb-1">Sort</Eyebrow>
            <Segmented className="w-full" value={sort} onChange={setSort} size="sm" options={[{ value: "index", label: perspective === "provider" ? "Capacity" : "Fit" }, { value: "score", label: "Score" }, { value: "momentum", label: "Momentum" }]} />
          </div>
          <label className="flex cursor-pointer select-none items-center gap-2 text-[12.5px] text-muted">
            <input type="checkbox" checked={onlyQualified} onChange={(e) => setOnlyQualified(e.target.checked)} className="h-3.5 w-3.5 accent-[#8a6512]" />
            {perspective === "provider" ? "Qualified only" : "Candidates only"}
            <span className="tnum ml-auto font-caps text-[10px] text-faint">{filtered.length} shown</span>
          </label>
        </div>
        <div className="mt-auto hidden pt-3 text-[10px] italic leading-snug text-faint [@media(min-height:840px)]:block">Same principles, new horizons — every number is a v3 score field or a deterministic derivation of it.</div>
      </aside>

      {/* right: map + picks, or paged cards */}
      <section className="card flex min-h-0 min-w-0 flex-col p-4">
        <PanelHead
          eyebrow={view === "map" ? "Charted waters" : (perspective === "provider" ? "Ready to lend" : "Healthy, with visible capital needs")}
          title={view === "map" ? "Every scored company · area = " + (perspective === "provider" ? "provider capacity" : "financing fit") + " · gold ring = qualified" : `${filtered.length} companies`}
          right={<>
            {view === "grid" && <Pager page={page} pageSize={CARDS_PER_PAGE} total={filtered.length} onChange={setPage} />}
            <Segmented value={view} onChange={setView} size="sm" options={[{ value: "map", label: <span className="flex items-center gap-1.5"><MapIcon size={12} />Map</span> }, { value: "grid", label: <span className="flex items-center gap-1.5"><LayoutGrid size={12} />Cards</span> }]} />
          </>}
        />
        {!data ? (
          <div className="mt-3 grid flex-1 grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-full" />)}</div>
        ) : view === "map" ? (
          <>
            <div className="mt-2 min-h-0 flex-1">
              <AutoSize>{(w, h) => <BubbleMap data={bubbles} width={w} height={h} onSelect={(id) => nav(`/company/${id}`)} sizeLabel={perspective === "provider" ? "Capacity" : "Fit"} xThreshold={perspective === "provider" ? 75 : 60} />}</AutoSize>
            </div>
            <div className="mt-2 flex shrink-0 items-center justify-between">
              <Eyebrow>{perspective === "provider" ? "Strongest providers" : "Best-fit candidates"}</Eyebrow>
              <button onClick={() => setView("grid")} className="font-caps text-[10px] font-semibold uppercase tracking-[0.14em] text-accent hover:underline">See all {filtered.length} →</button>
            </div>
            <div className="mt-1.5 grid shrink-0 grid-cols-4 gap-3">
              {filtered.slice(0, 4).map((a, i) => <CompanyCard key={a.c.id} a={a} perspective={perspective} index={i} />)}
            </div>
          </>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.25 }} className="mt-3 grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-3">
              {pageItems.map((a, i) => <CompanyCard key={a.c.id} a={a} perspective={perspective} index={i} />)}
              {pageItems.length === 0 && <div className="col-span-4 row-span-2 flex items-center justify-center italic text-muted">No company matches these filters.</div>}
            </motion.div>
          </AnimatePresence>
        )}
      </section>
    </div>
  );
}
