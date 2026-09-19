"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { CompanyIndex } from "@/lib/score/types";
import { applyRisk, DEFAULT_CONFIG, type Network, type PortfolioConfig, type PortfolioResult, type RiskTolerance } from "./portfolio";
import { applyActions, type ExecutedAction } from "./actions";
import { assessAll, type Assessed } from "./assess";
import { marketPotential, type Potential } from "./potential";
import { deployableCapital as deployableAt } from "@/lib/score/derived";

const KEY = "xray_marketplace_v3";

/** Una operación cerrada: la cartera tal como se firmó, más lo que le pasa después. */
export interface Deal {
  id: string;
  closedAt: string;
  lenderId: string;
  lenderName: string;
  result: PortfolioResult;
  monitorMonth: string | null;
  executed: ExecutedAction[];
}

interface Persisted { lenderId: string | null; config: PortfolioConfig; result: PortfolioResult | null; deals: Deal[]; activeDealId: string | null }

interface Ctx extends Persisted {
  network: Network | null;
  error: string | null;
  assessed: Assessed[];
  potential: Potential | null;
  byId: Map<string, CompanyIndex>;
  openCompany: string | null;
  setOpenCompany: (id: string | null) => void;
  setLender: (id: string | null) => void;
  setConfig: (patch: Partial<PortfolioConfig>) => void;
  setRisk: (r: RiskTolerance) => void;
  setResult: (r: PortfolioResult | null) => void;
  /** firma la cartera actual como operación cerrada y la devuelve */
  closeDeal: () => Deal | null;
  setActiveDeal: (id: string | null) => void;
  setDealMonth: (id: string, month: string | null) => void;
  executeOnDeal: (id: string, a: ExecutedAction) => void;
  undoDeal: (id: string) => void;
  removeDeal: (id: string) => void;
  /** cartera de una operación con sus acciones aplicadas y revalorada */
  effectiveOf: (deal: Deal) => PortfolioResult;
}

const MarketplaceCtx = createContext<Ctx | null>(null);

let cache: Promise<Network> | null = null;
function loadNetwork(): Promise<Network> {
  if (!cache) cache = fetch("/api/network?v=3").then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<Network>; });
  return cache;
}

const EMPTY: Persisted = { lenderId: null, config: DEFAULT_CONFIG, result: null, deals: [], activeDealId: null };

function read(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw) as Partial<Persisted>; return { lenderId: p.lenderId ?? null, config: { ...DEFAULT_CONFIG, ...(p.config ?? {}) }, result: p.result ?? null, deals: p.deals ?? [], activeDealId: p.activeDealId ?? null }; }
  } catch {}
  return EMPTY;
}

/** Tesorería desplegable real del prestamista en el último mes (ver lib/score/derived.ts). */
export function deployableCapital(c: CompanyIndex, months: string[]) {
  const r = deployableAt(c, months.length - 1);
  return r ? { ...r, month: months[months.length - 1] } : null;
}

/** Estado del marketplace (prestamista, configuración, cartera en borrador, operaciones cerradas), persistido en el navegador. */
export function MarketplaceProvider({ children, initialLender }: { children: React.ReactNode; initialLender?: string | null }) {
  const [network, setNetwork] = useState<Network | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [openCompany, setOpenCompany] = useState<string | null>(null);
  const pathname = usePathname();
  useEffect(() => { setOpenCompany(null); }, [pathname]);

  useEffect(() => {
    const p = read();
    if (initialLender) { p.lenderId = initialLender; p.config = { ...p.config, lenderId: initialLender }; }
    setState(p);
    setHydrated(true);
    loadNetwork().then(setNetwork).catch((e) => setError(String(e)));
  }, [initialLender]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }, [state, hydrated]);

  const assessed = useMemo(() => (network ? assessAll(network) : []), [network]);
  const potential = useMemo(() => (network ? marketPotential(network, assessed) : null), [network, assessed]);
  const byId = useMemo(() => new Map(network?.companies.map((c) => [c.id, c]) ?? []), [network]);
  const cal = network?.calibration ?? [];

  // al elegir prestamista, el capital pasa a ser su tesorería desplegable real y el visor lo muestra
  const setLender = useCallback((lenderId: string | null) => setState((s) => {
    const c = lenderId ? network?.companies.find((x) => x.id === lenderId) ?? null : null;
    const cap = c && network ? deployableCapital(c, network.months) : null;
    return { ...s, lenderId, config: { ...s.config, lenderId, ...(cap ? { capital: cap.deployable } : {}) } };
  }), [network]);
  const setConfig = useCallback((patch: Partial<PortfolioConfig>) => setState((s) => ({ ...s, config: { ...s.config, ...patch } })), []);
  const setRisk = useCallback((r: RiskTolerance) => setState((s) => ({ ...s, config: applyRisk(s.config, r) })), []);
  const setResult = useCallback((result: PortfolioResult | null) => setState((s) => ({ ...s, result })), []);
  const closeDeal = useCallback((): Deal | null => {
    let deal: Deal | null = null;
    setState((s) => {
      if (!s.result || !s.lenderId) return s;
      const lender = network?.companies.find((c) => c.id === s.lenderId);
      deal = { id: `deal-${Date.now().toString(36)}`, closedAt: new Date().toISOString(), lenderId: s.lenderId, lenderName: lender?.name ?? s.lenderId, result: s.result, monitorMonth: s.result.config.asOf, executed: [] };
      return { ...s, deals: [deal, ...s.deals], activeDealId: deal.id, result: null };
    });
    return deal;
  }, [network]);
  const setActiveDeal = useCallback((activeDealId: string | null) => setState((s) => ({ ...s, activeDealId })), []);
  const patchDeal = (id: string, f: (d: Deal) => Deal) => setState((s) => ({ ...s, deals: s.deals.map((d) => (d.id === id ? f(d) : d)) }));
  const setDealMonth = useCallback((id: string, month: string | null) => patchDeal(id, (d) => ({ ...d, monitorMonth: month })), []);
  const executeOnDeal = useCallback((id: string, a: ExecutedAction) => patchDeal(id, (d) => (d.executed.some((x) => x.id === a.id && x.kind === a.kind && x.month === a.month) ? d : { ...d, executed: [...d.executed, a] })), []);
  const undoDeal = useCallback((id: string) => patchDeal(id, (d) => ({ ...d, executed: [] })), []);
  const removeDeal = useCallback((id: string) => setState((s) => ({ ...s, deals: s.deals.filter((d) => d.id !== id), activeDealId: s.activeDealId === id ? null : s.activeDealId })), []);
  const effectiveOf = useCallback((deal: Deal) => applyActions(deal.result, deal.executed, cal), [cal]);

  const value: Ctx = { ...state, network, error, assessed, potential, byId, openCompany, setOpenCompany, setLender, setConfig, setRisk, setResult, closeDeal, setActiveDeal, setDealMonth, executeOnDeal, undoDeal, removeDeal, effectiveOf };
  return <MarketplaceCtx.Provider value={value}>{children}</MarketplaceCtx.Provider>;
}

export function useMarketplace(): Ctx {
  const ctx = useContext(MarketplaceCtx);
  if (!ctx) throw new Error("useMarketplace fuera de MarketplaceProvider");
  return ctx;
}
