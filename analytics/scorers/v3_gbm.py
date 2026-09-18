"""v3-gbm: modelo (gradient boosting) sobre el vector completo de métricas, entrenado contra events_v1.

Es el "v2_model" de docs/arquitectura-score.md. Es el único generador que ve los eventos, y solo
para entrenar; por eso publica cómo se evaluó sin trampa:
- `trained_without_fold`: cada fila se predice con un modelo entrenado SIN el fold (por grupo) de su empresa
  → el Gini que mide el evaluador ya es out-of-sample.
- `score_oot`: para los últimos meses, predicción de un modelo entrenado solo con etiquetas anteriores al
  periodo de test → Gini out-of-time honesto.
Target: media de dos modelos, y_3 e y_6 (evento en t+1..t+3 / t+1..t+6). Score = 100 · (1 − P(evento)), suavizado 0,7/0,3.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier

from .. import config as C
from ..evaluate import _mi
from ..metrics import DIMENSIONS, REGISTRY

VERSION = "v3-gbm"
PARAMS = dict(max_iter=300, learning_rate=0.05, max_depth=4, min_samples_leaf=40, l2_regularization=1.0, random_state=C.SEED)
HORIZON = 6
HORIZONS_ENSEMBLE = (3, 6)         # se promedian las probabilidades de un modelo por horizonte


def label_y(metrics: pd.DataFrame, events: pd.DataFrame, h: int = HORIZON) -> pd.Series:
    ev = events.copy()
    ev["mi"] = _mi(ev.month)
    idx = ev.set_index(["company_id", "mi"]).event
    last = ev.groupby("company_id").mi.max()
    mi = _mi(metrics.month)
    fut = np.vstack([idx.reindex(pd.MultiIndex.from_arrays([metrics.company_id, mi + k])).values for k in range(1, h + 1)]).T
    y = np.nanmax(fut, axis=1)
    complete = (mi + h <= metrics.company_id.map(last).values)
    return pd.Series(np.where(complete & ~np.isnan(y), y, np.nan), index=metrics.index)


def feature_frame(metrics: pd.DataFrame) -> pd.DataFrame:
    X = metrics.drop(columns=["company_id", "month"]).astype(float)
    # percentiles por mes de las métricas base: comparabilidad entre meses
    for m in REGISTRY:
        X["pct_" + m.name] = metrics.groupby("month")[m.name].rank(pct=True)
    # columnas constantes o vacías (p. ej. delta_12m de crecimiento_cobros): el binning de HGB necesita ≥ 2 valores
    keep = [c for c in X.columns if X[c].nunique(dropna=True) >= 2]
    return X[keep]


class Model:
    """HGB + lista de columnas usables (las constantes en el subconjunto de entrenamiento rompen el binning)."""

    def __init__(self, X: pd.DataFrame, y: pd.Series):
        self.cols = [c for c in X.columns if X[c].nunique(dropna=True) >= 2]
        self.m = HistGradientBoostingClassifier(**PARAMS).fit(X[self.cols], y.astype(int))

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        return self.m.predict_proba(X[self.cols])


def fit(X: pd.DataFrame, y: pd.Series) -> Model:
    return Model(X, y)


def run_v3(metrics: pd.DataFrame, events: pd.DataFrame, splits: pd.DataFrame, first_mi: pd.Series,
           min_history: int = C.MIN_HISTORY_MONTHS) -> pd.DataFrame:
    df = metrics.copy()
    df["mi"] = _mi(df.month)
    df = df[df.mi - df.company_id.map(first_mi) >= min_history - 1].reset_index(drop=True)   # contrato: desde el 6º mes
    X = feature_frame(df)
    ys = {h: label_y(df, events, h) for h in HORIZONS_ENSEMBLE}
    fold = df.company_id.map(splits.set_index("company_id").fold)
    proba = pd.Series(0.0, index=df.index)
    # un modelo por fold y horizonte, entrenado sin ese fold; contribuciones = score sin las métricas de cada dimensión
    contrib = pd.DataFrame(0.0, index=df.index, columns=["c_" + d for d in DIMENSIONS])
    dim_cols = {d: [c for c in X.columns if any(c.startswith(m.name) or c == "pct_" + m.name for m in REGISTRY if m.dimension == d)]
                for d in DIMENSIONS}
    for k in sorted(fold.dropna().unique()):
        te = fold == k
        for h, y in ys.items():
            tr = (fold != k) & y.notna()
            model = fit(X[tr], y[tr])
            base = model.predict_proba(X[te])[:, 1]
            proba[te] += base / len(ys)
            for d in DIMENSIONS:
                Xd = X[te].copy()
                Xd[dim_cols[d]] = np.nan
                contrib.loc[te, "c_" + d] += 100 * (model.predict_proba(Xd)[:, 1] - base) / len(ys)   # > 0: la dimensión mejora el score
    # out-of-time: modelos con etiquetas completamente anteriores al periodo de test
    last = df.mi.max()
    test = df.mi > last - C.OOT_TEST_MONTHS
    p_oot = np.zeros(int(test.sum()))
    for h, y in ys.items():
        tr_oot = (df.mi <= last - C.OOT_TEST_MONTHS - h) & y.notna()
        p_oot += fit(X[tr_oot], y[tr_oot]).predict_proba(X[test])[:, 1] / len(ys)
    score_oot = pd.Series(np.nan, index=df.index)
    score_oot[test] = 100 * (1 - p_oot)
    raw = 100 * (1 - proba)
    out = pd.DataFrame({"company_id": df.company_id, "month": df.month, "score_raw": raw.round(2)})
    out = out.sort_values(["company_id", "month"])
    out["score"] = out.groupby("company_id").score_raw.transform(lambda s: s.ewm(alpha=C.SMOOTHING, adjust=False).mean()).round(2)
    out["score_version"] = VERSION
    for c in contrib.columns:
        out[c] = contrib[c].round(2)
    out["trained_without_fold"] = fold.astype("Int64")
    out["score_oot"] = score_oot.round(2)
    thr = out.groupby("month").score.transform(lambda s: np.nanpercentile(s, C.ALERT_PERCENTILE))
    out["alert"] = (out.score < thr).astype(int)
    prev = out.groupby("company_id").score.shift(1)
    delta = (out.score - prev).round(1)
    cprev = out.groupby("company_id")[list(contrib.columns)].shift(1)
    main = (out[list(contrib.columns)] - cprev).abs().fillna(-1).idxmax(axis=1)
    out["explanation"] = np.where(prev.isna(), "", np.where(delta > 0, "subió ", "bajó ") + delta.abs().astype(str) + " pts: " + main.str.replace("c_", "", regex=False))
    return out.reset_index(drop=True)
