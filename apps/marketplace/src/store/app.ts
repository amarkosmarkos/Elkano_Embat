import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NetworkData } from "@/lib/types";
import { DEFAULT_CONFIG, type PortfolioConfig, type PortfolioResult } from "@/lib/portfolio";

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
  accepted: string[];
  toggleAccepted: (id: string) => void;
  setAccepted: (ids: string[]) => void;
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
      setResult: (result) => set({ result, monitorMonth: result?.config.asOf ?? null, accepted: [] }),
      monitorMonth: null,
      setMonitorMonth: (monitorMonth) => set({ monitorMonth }),
      accepted: [],
      toggleAccepted: (id) => set((s) => ({ accepted: s.accepted.includes(id) ? s.accepted.filter((x) => x !== id) : [...s.accepted, id] })),
      setAccepted: (accepted) => set({ accepted }),
      theme: "dark",
      setTheme: (theme) => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        try { localStorage.setItem("embat-theme", theme); } catch { /* ignore */ }
        set({ theme });
      },
    }),
    {
      name: "embat-capital-network",
      partialize: (s) => ({ config: s.config, result: s.result, monitorMonth: s.monitorMonth, accepted: s.accepted, perspective: s.perspective, theme: s.theme }),
    },
  ),
);
