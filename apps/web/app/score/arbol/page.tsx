import { getStore } from "@/lib/data/store";
import ScoreTree from "@/components/score/ScoreTree";

export default async function ArbolPage() {
  const store = await getStore();
  const r = store.reports.v3;
  return <ScoreTree dimGini={r.univariate} metricGini={r.univariate_metrics.gini} weak={r.univariate_metrics["weak (|gini| < 0.05)"]} pairs={r.univariate_metrics["correlated_pairs (|rho| > 0.8)"]} />;
}
