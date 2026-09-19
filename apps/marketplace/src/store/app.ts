import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NetworkData } from "@/lib/types";
import { DEFAULT_CONFIG, type PortfolioConfig, type PortfolioResult } from "@/lib/portfolio";
import type { ExecutedAction } from "@/lib/actions";

export type Perspective = "provider" | "receiver";

interface AppState {
  network: NetworkData | null;
  setNetwork: (n: NetworkData) => void;
  perspective: Perspective;
  setPerspective: (p: Perspective) => void;
  config: PortfolioConfig;
  setConfig: (patch: Partial<PortfolioConfig>) => void;
  result: PortfolioResult | null;
  setResult: (r: PortfolioResult | null) => void;
  monitorMonth: string | null;
  setMonitorMonth: (m: string | null) => void;
  /** the company acting as lender (drives the borrower universe and the portfolio) */
  lenderId: string | null;
  setLender: (id: string | null) => void;
  /** actions executed on the portfolio (applied on top of `result`) */
  executed: ExecutedAction[];
  execute: (a: ExecutedAction) => void;
  undoActions: () => void;
  /** company opened in the overlay */
  openCompany: string | null;
  setOpenCompany: (id: string | null) => void;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      network: null,
      setNetwork: (network) => set({ network }),
      perspective: "provider",
      setPerspective: (perspective) => set({ perspective }),
      config: DEFAULT_CONFIG,
      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
      result: null,
      setResult: (result) => set({ result, monitorMonth: result?.config.asOf ?? null, executed: [] }),
      monitorMonth: null,
      setMonitorMonth: (monitorMonth) => set({ monitorMonth }),
      lenderId: null,
      setLender: (lenderId) => set((s) => ({ lenderId, config: { ...s.config, lenderId } })),
      executed: [],
      execute: (a) => set((s) => ({ executed: s.executed.some((x) => x.id === a.id && x.kind === a.kind && x.month === a.month) ? s.executed : [...s.executed, a] })),
      undoActions: () => set({ executed: [] }),
      openCompany: null,
      setOpenCompany: (openCompany) => set({ openCompany }),
      theme: "dark",
      setTheme: (theme) => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        try { localStorage.setItem("embat-theme", theme); } catch { /* ignore */ }
        set({ theme });
      },
    }),
    {
      name: "embat-capital-network",
      partialize: (s) => ({ config: s.config, result: s.result, monitorMonth: s.monitorMonth, executed: s.executed, lenderId: s.lenderId, perspective: s.perspective, theme: s.theme }),
      version: 2,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        const config = { ...DEFAULT_CONFIG, ...((p.config as object) ?? {}) };
        return { ...p, config, executed: [], result: null, monitorMonth: null } as unknown as AppState;
      },
    },
  ),
);
