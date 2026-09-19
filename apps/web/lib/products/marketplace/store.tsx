"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CompanyIndex } from "@/lib/score/types";
import { DEFAULT_CONFIG, type Network, type PortfolioConfig, type PortfolioResult } from "./portfolio";
import { applyActions, type ExecutedAction } from "./actions";
import { assessAll, type Assessed } from "./assess";

const KEY = "xray_marketplace_v1";

interface Persisted { lenderId: string | null; config: PortfolioConfig; result: PortfolioResult | null; monitorMonth: string | null; executed: ExecutedAction[] }

interface Ctx extends Persisted {
  network: Network | null;
  error: string | null;
  assessed: Assessed[];
  byId: Map<string, CompanyIndex>;
  /** cartera con las acciones ejecutadas aplicadas */
  effective: PortfolioResult | null;
  setLender: (id: string | null) => void;
  setConfig: (patch: Partial<PortfolioConfig>) => void;
  setResult: (r: PortfolioResult | null) => void;
  setMonitorMonth: (m: string | null) => void;
  execute: (a: ExecutedAction) => void;
  undoActions: () => void;
}

const MarketplaceCtx = createContext<Ctx | null>(null);

let cache: Promise<Network> | null = null;
function loadNetwork(): Promise<Network> {
  if (!cache) cache = fetch("/api/network").then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<Network>; });
  return cache;
}

function read(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw) as Partial<Persisted>; return { lenderId: p.lenderId ?? null, config: { ...DEFAULT_CONFIG, ...(p.config ?? {}) }, result: p.result ?? null, monitorMonth: p.monitorMonth ?? null, executed: p.executed ?? [] }; }
  } catch {}
  return { lenderId: null, config: DEFAULT_CONFIG, result: null, monitorMonth: null, executed: [] };
}

/** Estado del marketplace (prestamista, configuración, cartera, mes del monitor, acciones), persistido en el navegador. */
export function MarketplaceProvider({ children, initialLender }: { children: React.ReactNode; initialLender?: string | null }) {
  const [network, setNetwork] = useState<Network | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<Persisted>({ lenderId: null, config: DEFAULT_CONFIG, result: null, monitorMonth: null, executed: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = read();
    if (initialLender) { p.lenderId = initialLender; p.config = { ...p.config, lenderId: initialLender }; }
    setState(p);
    setHydrated(true);
    loadNetwork().then(setNetwork).catch((e) => setError(String(e)));
  }, [initialLender]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }, [state, hydrated]);

  const assessed = useMemo(() => (network ? assessAll(network) : []), [network]);
  const byId = useMemo(() => new Map(network?.companies.map((c) => [c.id, c]) ?? []), [network]);
  const effective = useMemo(() => (state.result ? applyActions(state.result, state.executed) : null), [state.result, state.executed]);

  const setLender = useCallback((lenderId: string | null) => setState((s) => ({ ...s, lenderId, config: { ...s.config, lenderId } })), []);
  const setConfig = useCallback((patch: Partial<PortfolioConfig>) => setState((s) => ({ ...s, config: { ...s.config, ...patch } })), []);
  const setResult = useCallback((result: PortfolioResult | null) => setState((s) => ({ ...s, result, monitorMonth: result?.config.asOf ?? null, executed: [] })), []);
  const setMonitorMonth = useCallback((monitorMonth: string | null) => setState((s) => ({ ...s, monitorMonth })), []);
  const execute = useCallback((a: ExecutedAction) => setState((s) => (s.executed.some((x) => x.id === a.id && x.kind === a.kind && x.month === a.month) ? s : { ...s, executed: [...s.executed, a] })), []);
  const undoActions = useCallback(() => setState((s) => ({ ...s, executed: [] })), []);

  const value: Ctx = { ...state, network, error, assessed, byId, effective, setLender, setConfig, setResult, setMonitorMonth, execute, undoActions };
  return <MarketplaceCtx.Provider value={value}>{children}</MarketplaceCtx.Provider>;
}

export function useMarketplace(): Ctx {
  const ctx = useContext(MarketplaceCtx);
  if (!ctx) throw new Error("useMarketplace fuera de MarketplaceProvider");
  return ctx;
}
