import { useMemo } from "react";
import { useApp } from "@/store/app";
import { applyActions } from "@/lib/actions";
import type { PortfolioResult } from "@/lib/portfolio";

/** The stored portfolio with executed actions applied. */
export function useEffectiveResult(): PortfolioResult | null {
  const result = useApp((s) => s.result);
  const executed = useApp((s) => s.executed);
  return useMemo(() => (result ? applyActions(result, executed) : null), [result, executed]);
}
