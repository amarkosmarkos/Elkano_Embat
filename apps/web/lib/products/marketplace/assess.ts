import { assessProvider, assessReceiver, momentum, trend, type ProviderAssessment, type ReceiverAssessment, type Trend } from "@/lib/score/derived";
import type { CompanyIndex } from "@/lib/score/types";
import type { Network } from "./portfolio";

export interface Assessed { c: CompanyIndex; trend: Trend; momentum: number | null; provider: ProviderAssessment; receiver: ReceiverAssessment }

/** Vista derivada de todas las empresas en el último mes del dataset. */
export function assessAll(network: Network): Assessed[] {
  const idx = network.months.length - 1;
  const sorted = network.companies.map((c) => c.scores[idx]).filter((v): v is number => v != null).sort((a, b) => a - b);
  return network.companies.filter((c) => c.scores[idx] != null).map((c) => ({ c, trend: trend(c.scores, idx), momentum: momentum(c.scores, idx), provider: assessProvider(c, idx, sorted), receiver: assessReceiver(c, idx) }));
}

export const isRelated = (lender: CompanyIndex | null, c: CompanyIndex) => !!lender && (c.id === lender.id || (lender.group != null && c.group === lender.group));
