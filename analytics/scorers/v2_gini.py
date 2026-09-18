"""v2-gini: scorecard con pesos proporcionales al Gini univariante (docs/validacion_salud.md §3.3).

Iteración sobre v1 siguiendo el doc:
- regla 1: fuera las métricas con |Gini| < 0,05 (neto_operativo, tendencias, ratio cobros/pagos, crecimiento,
  pct_dispuesto, top5, hhi, clientes_activos, credito_disponible, volatilidad, devoluciones, falta_regular);
- regla 2: de cada par con |ρ| > 0,8 se queda la más fuerte (pct_pago_tarde vs retraso_pago);
- pesos ∝ Gini univariante medido en el periodo de entrenamiento (t ≤ 2026-02, y_6);
- sin penalización por estrés ni bonus de tendencia (medidos: restan Gini); con suavizado 0,7/0,3.

Los Ginis vienen del informe del evaluador (report_v1.md); el generador solo lee esta tabla.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .. import config as C
from ..metrics import BY_NAME, DIMENSIONS

# métrica → Gini univariante (train, percentil orientado). Fuente: report_v1.md
GINI_WEIGHTS = {
    "colchon": 0.256, "runway": 0.203, "dias_negativo": 0.191, "pct_pago_tarde": 0.143, "pct_cobro_vencido": 0.126,
    "rating_cartera": 0.112, "dso": 0.091, "coste_financiero": 0.087, "deuda_cobros": 0.071,
}


class ScorecardV2Gini:
    version = "v2-gini"

    def __init__(self, weights: dict[str, float] | None = None):
        self.w = pd.Series(weights or GINI_WEIGHTS)
        self.w = self.w / self.w.sum()

    def score_month(self, L, M: pd.DataFrame, F: pd.DataFrame, S: pd.DataFrame, state: dict) -> pd.DataFrame:
        P = pd.DataFrame(index=M.index)
        for name in self.w.index:
            p = M[name].rank(pct=True, method="average") * 100.0
            P[name] = p if BY_NAME[name].higher_is_better else 100.0 - p
        avail = P.notna()
        wsum = (avail * self.w).sum(axis=1)
        raw = (P.fillna(0) * self.w).sum(axis=1) / wsum.replace(0, np.nan)
        prev = state.get("score_final")
        score = raw if prev is None else (C.SMOOTHING * raw + (1 - C.SMOOTHING) * prev.reindex(M.index)).fillna(raw)
        no_data = raw.isna()
        score = score.where(~no_data, C.DEFAULT_SCORE)
        state["score_final"] = score
        # contribuciones por dimensión = Σ w_i · p_i de sus métricas (renormalizado a los pesos disponibles)
        contrib = {}
        for d in DIMENSIONS:
            cols = [n for n in self.w.index if BY_NAME[n].dimension == d]
            contrib["c_" + d] = (P[cols].fillna(0) * self.w[cols]).sum(axis=1) / wsum.replace(0, np.nan) if cols else pd.Series(np.nan, index=M.index)
        contrib = pd.DataFrame(contrib)
        # explicación: métrica cuyo término w·p más cambió respecto al mes anterior
        prev_terms = state.get("terms")
        terms = P.fillna(0) * self.w
        expl = pd.Series("", index=M.index, dtype="object")
        if prev_terms is not None:
            d = (terms - prev_terms.reindex(M.index)).abs()
            main = d.fillna(-1).idxmax(axis=1).where(~d.isna().all(axis=1))
            ds = (score - prev.reindex(M.index)).round(1)
            for cid in M.index:
                if pd.isna(main[cid]) or pd.isna(ds[cid]) or cid not in prev_terms.index:
                    continue
                n = main[cid]
                b, a = M[n][cid], state["metrics"][n].get(cid, np.nan) if "metrics" in state else np.nan
                expl[cid] = f"{'subió' if ds[cid] > 0 else 'bajó'} {abs(ds[cid]):.1f} pts: {n} {a:.2f} → {b:.2f}" if pd.notna(a) and pd.notna(b) else f"{'subió' if ds[cid] > 0 else 'bajó'} {abs(ds[cid]):.1f} pts: {n}"
        expl = expl.where(~no_data, "sin datos suficientes: score por defecto")
        state["terms"], state["metrics"] = terms, M[list(self.w.index)]
        thr = np.nanpercentile(score[~no_data], C.ALERT_PERCENTILE) if (~no_data).any() else 0
        alert = (score < thr).astype(int)
        first_mi = L.companies.set_index("company_id").first_mi.reindex(M.index)
        eligible = (L.mi - first_mi) >= C.MIN_HISTORY_MONTHS - 1
        out = pd.DataFrame({"company_id": M.index, "score": score.round(2).values, "score_version": self.version})
        for c in contrib.columns:
            out[c] = contrib[c].round(2).values
        out["alert"] = alert.values
        out["explanation"] = expl.values
        out["n_metrics"] = avail.sum(axis=1).values
        return out[eligible.values].reset_index(drop=True)
