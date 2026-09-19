import { useMemo } from "react";
import { assessProvider, assessReceiver, momentum, trend, type ProviderAssessment, type ReceiverAssessment, type Trend } from "@/lib/derived";
import type { CompanyIndex, NetworkData } from "@/lib/types";

export interface Assessed {
  c: CompanyIndex;
  trend: Trend;
  momentum: number | null;
  provider: ProviderAssessment;
  receiver: ReceiverAssessment;
}

/** Derived view of every company at the latest month (memoised once per dataset). */
export function useAssessments(data: NetworkData | null): Assessed[] {
  return useMemo(() => {
    if (!data) return [];
    const months = data.meta.months;
    const idx = months.length - 1;
    const all = data.companies.map((c) => c.latest.score);
    return data.companies.map((c) => ({
      c,
      trend: trend(c.scores, idx),
      momentum: momentum(c.scores, idx),
      provider: assessProvider(c, months, all),
      receiver: assessReceiver(c, months),
    }));
  }, [data]);
}
