"""v1-scorecard: combinación de docs/salud.md §H.

1. p_i = percentil de cada métrica entre las empresas del mes, orientado a "más = mejor".
2. dimensión = media de los percentiles de sus métricas.
3. score = Σ w_d · dimensión_d  (pesos renormalizados sobre las dimensiones disponibles).
4. score −= 5 · nº eventos de estrés ; score += 10 · tendencia_6m normalizada (acotado ±10).
5. score_final_t = 0,7 · score_t + 0,3 · score_final_{t−1}.
6. explicación: dimensión con mayor |w_d · (dim_t − dim_{t−1})|.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .. import config as C
from ..metrics import DIMENSIONS, REGISTRY


TWIN_METRICS = ("falta_regular", "dias_negativo", "coste_financiero")   # gemelas de D2, D3, D4 (validacion_salud.md §2)
TWIN_STRESS = ("S1_descubierto", "S2_coste_disparado", "S3_falta_regular")


class ScorecardV1:
    version = "v1-scorecard"

    def __init__(self, weights: dict[str, float] | None = None):
        self.w = pd.Series(weights or C.WEIGHTS)

    # ---------------------------------------------------------------- pasos
    @staticmethod
    def percentiles(M: pd.DataFrame) -> pd.DataFrame:
        """p_i ∈ [0, 100] por métrica, entre empresas con valor ese mes; 100 = mejor."""
        P = pd.DataFrame(index=M.index)
        for m in REGISTRY:
            v = M[m.name]
            p = v.rank(pct=True, method="average") * 100.0
            P["p_" + m.name] = p if m.higher_is_better else 100.0 - p
        return P

    @staticmethod
    def dimensions(P: pd.DataFrame, exclude: tuple = ()) -> pd.DataFrame:
        D = pd.DataFrame(index=P.index)
        for d in DIMENSIONS:
            cols = ["p_" + m.name for m in REGISTRY if m.dimension == d and m.name not in exclude]
            D["dim_" + d] = P[cols].mean(axis=1)               # media de las disponibles
            D["n_" + d] = P[cols].notna().sum(axis=1)
        return D

    def combine(self, D: pd.DataFrame) -> tuple[pd.Series, pd.DataFrame]:
        dims = D[["dim_" + d for d in DIMENSIONS]]
        dims.columns = DIMENSIONS
        avail = dims.notna()
        wsum = (avail * self.w).sum(axis=1)
        raw = (dims.fillna(0) * self.w).sum(axis=1) / wsum.replace(0, np.nan)
        contrib = dims.mul(self.w, axis=1).div(wsum.replace(0, np.nan), axis=0) * 1.0   # c_d = w_d · dim_d (renormalizado)
        contrib.columns = ["c_" + d for d in DIMENSIONS]
        return raw, contrib

    # ---------------------------------------------------------------- contrato
    def score_month(self, L, M: pd.DataFrame, F: pd.DataFrame, S: pd.DataFrame, state: dict) -> pd.DataFrame:
        P = self.percentiles(M)
        D = self.dimensions(P)
        raw, contrib = self.combine(D)
        # penalización por estrés y bonus por trayectoria (percentil de tendencia_6m, centrado en 0, ±10)
        trend_pct = P["p_tendencia_6m"]
        bonus = ((trend_pct / 100.0 - 0.5) * 2.0 * C.TREND_BONUS).clip(-C.TREND_BONUS, C.TREND_BONUS).fillna(0.0)
        penalty = C.STRESS_PENALTY * S.n_stress.reindex(M.index).fillna(0.0)
        score_t = (raw - penalty + bonus).clip(0, 100)
        # suavizado con el mes anterior
        prev = state.get("score_final")
        score_final = score_t if prev is None else (C.SMOOTHING * score_t + (1 - C.SMOOTHING) * prev.reindex(M.index)).fillna(score_t)
        # explicación: dimensión que más movió el score respecto al mes anterior
        prev_dims = state.get("dims")
        expl = pd.Series("", index=M.index, dtype="object")
        if prev_dims is not None:
            delta = (D[["dim_" + d for d in DIMENSIONS]] - prev_dims.reindex(M.index)).mul(self.w.values, axis=1)
            da = delta.abs()
            main = da.fillna(-1.0).idxmax(axis=1).where(~da.isna().all(axis=1))
            ds = (score_final - prev.reindex(M.index)).round(1)
            for cid in M.index:
                if pd.isna(ds[cid]) or pd.isna(main[cid]):
                    continue
                dname = main[cid].replace("dim_", "")
                before, after = prev_dims.loc[cid, main[cid]] if cid in prev_dims.index else np.nan, D.loc[cid, main[cid]]
                if pd.isna(before) or pd.isna(after):
                    continue
                verb = "subió" if ds[cid] > 0 else "bajó"
                expl[cid] = f"{verb} {abs(ds[cid]):.1f} pts: {dname} {before:.0f} → {after:.0f}"
        # eventos de estrés en la explicación
        active = S.drop(columns=["n_stress"]).reindex(M.index)
        ev = active.apply(lambda r: ", ".join(c.split("_", 1)[0] for c, v in r.items() if v == 1), axis=1)
        expl = expl.where(ev == "", (expl + " · estrés: " + ev).str.strip(" ·"))
        # sin datos: score por defecto y marca
        no_data = raw.isna()
        score_final = score_final.where(~no_data, C.DEFAULT_SCORE)
        expl = expl.where(~no_data, "sin datos suficientes: score por defecto")
        # alerta: score < p20 del mes o ≥ 2 eventos de estrés
        thr = np.nanpercentile(score_final[~no_data], C.ALERT_PERCENTILE) if (~no_data).any() else 0
        alert = ((score_final < thr) | (S.n_stress.reindex(M.index) >= 2)).astype(int)
        # variante sin las métricas gemelas del evento (para comprobar que el Gini no viene solo de ahí)
        raw_nt, _ = self.combine(self.dimensions(P, exclude=TWIN_METRICS))
        pen_nt = C.STRESS_PENALTY * S.drop(columns=list(TWIN_STRESS) + ["n_stress"]).reindex(M.index).sum(axis=1).fillna(0.0)
        st_nt = (raw_nt - pen_nt + bonus).clip(0, 100)
        prev_nt = state.get("score_no_twin")
        score_nt = st_nt if prev_nt is None else (C.SMOOTHING * st_nt + (1 - C.SMOOTHING) * prev_nt.reindex(M.index)).fillna(st_nt)
        score_nt = score_nt.where(raw_nt.notna(), C.DEFAULT_SCORE)
        state["score_no_twin"] = score_nt
        # solo empresas con historia suficiente (contrato: desde el 6º mes de historia)
        first_mi = L.companies.set_index("company_id").first_mi.reindex(M.index)
        eligible = (L.mi - first_mi) >= C.MIN_HISTORY_MONTHS - 1
        state["score_final"], state["dims"] = score_final, D[["dim_" + d for d in DIMENSIONS]]

        out = pd.DataFrame({"company_id": M.index, "score": score_final.round(2).values, "score_version": self.version})
        for c in contrib.columns:
            out[c] = contrib[c].round(2).values
        out["alert"] = alert.values
        out["explanation"] = expl.values
        out["score_raw"] = score_t.round(2).values
        out["score_no_twin"] = score_nt.round(2).values
        out["n_stress"] = S.n_stress.reindex(M.index).fillna(0).astype(int).values
        out["trend_bonus"] = bonus.round(2).values
        for d in DIMENSIONS:
            out["dim_" + d] = D["dim_" + d].round(2).values
        return out[eligible.values].reset_index(drop=True)
