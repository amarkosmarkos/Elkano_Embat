import { getDetail, getStore, type Store } from "./store";
import type { CompanyDetail, CompanyIndex, EventRow, MetricId } from "@/lib/score/types";
import { METRICS } from "@/lib/score/meta";

export interface Bundle { store: Store; c: CompanyIndex; d: CompanyDetail; events: EventRow[]; idx: number; month: string; mi: number }

/** Todo lo que necesita la ficha de una empresa en el mes observado. `mi` = índice en metricMonths. */
export async function getBundle(id: string, idx: number): Promise<Bundle | null> {
  const store = await getStore();
  const c = store.byId.get(id);
  if (!c) return null;
  const d = await getDetail(id);
  const month = store.months[idx];
  return { store, c, d, events: store.events.get(id) ?? [], idx, month, mi: d.metricMonths.indexOf(month) };
}

/** Último mes ≤ idx con score para la empresa (si el mes global es anterior a su primer score, null). */
export function scoreIdx(c: CompanyIndex, idx: number): number | null {
  return c.scores[idx] == null ? null : idx;
}

export interface MetricRow { id: MetricId; value: number | null; delta3: number | null; delta12: number | null; streak: number; gini: number | null; coverage: number | null; series: (number | null)[] }

/** Las 24 métricas en el mes observado, con trayectoria recalculada sobre la serie del parquet. */
export function metricRows(b: Bundle): MetricRow[] {
  const r3 = b.store.reports.v3.univariate_metrics.gini;
  return (Object.keys(METRICS) as MetricId[]).map((id) => {
    const s = b.d.metrics[id];
    const mi = b.mi;
    const v = mi >= 0 ? s[mi] : null;
    const at = (k: number) => (mi - k >= 0 ? s[mi - k] : null);
    const higher = METRICS[id].higherIsBetter;
    let streak = 0;
    for (let i = mi; i > 0; i--) {
      const a = s[i], p = s[i - 1];
      if (a == null || p == null) break;
      const worse = higher ? a < p : a > p;
      if (!worse) break;
      streak++;
    }
    return {
      id, value: v,
      delta3: v != null && at(3) != null ? v - (at(3) as number) : null,
      delta12: v != null && at(12) != null ? v - (at(12) as number) : null,
      streak, gini: r3[id]?.gini ?? null, coverage: r3[id]?.coverage ?? null, series: s,
    };
  });
}
