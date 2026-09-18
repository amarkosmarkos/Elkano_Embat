"""G. Métricas de estrés: eventos binarios S1–S8 del mes (docs/salud.md §G).

Se calculan a partir de las métricas del mes y del histórico (rachas, medianas de 6 meses),
sin mirar el futuro.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .. import config as C
from .pago import regular_missing


def _median_prev(history: dict[int, pd.DataFrame], mi: int, name: str, n: int, index) -> pd.Series:
    prev = [history[m][name].reindex(index) for m in range(mi - n, mi) if m in history]
    if not prev:
        return pd.Series(np.nan, index=index)
    return pd.concat(prev, axis=1).median(axis=1)


def stress_events(L, history: dict[int, pd.DataFrame], streaks: pd.DataFrame) -> pd.DataFrame:
    """S1..S8 (0/1) por empresa para el mes L.mi. history[L.mi] debe contener las métricas del mes."""
    M = history[L.mi]
    idx = M.index
    S = pd.DataFrame(index=idx)
    S["S1_descubierto"] = (M.dias_negativo >= C.S1_MIN_NEG_DAYS).astype(float)
    med6 = _median_prev(history, L.mi, "coste_financiero", 6, idx)
    S["S2_coste_disparado"] = ((M.coste_financiero > C.S2_MULT * med6) & (M.coste_financiero > C.S2_MIN_SHARE)).astype(float)
    rm = regular_missing(L).reindex(idx)
    S["S3_falta_regular"] = (rm.fillna(0).sum(axis=1) > 0).astype(float)
    S["S4_lineas_limite"] = (M.pct_dispuesto > C.S4_MAX_UTIL).astype(float)
    S["S5_cobros_vencidos"] = (M.pct_cobro_vencido > C.S5_MAX_OVERDUE).astype(float)
    S["S6_paga_tarde_peor"] = ((M.retraso_pago > C.S6_MIN_DELAY) & (streaks["retraso_pago__racha"].reindex(idx) >= C.S6_MIN_STREAK)).astype(float)
    S["S7_devoluciones"] = ((M.devoluciones > 0) & (streaks["devoluciones__racha"].reindex(idx) >= C.S7_MIN_STREAK)).astype(float)
    neg = [(history[m].neto_operativo.reindex(idx) < 0) for m in range(L.mi - C.S8_MONTHS + 1, L.mi + 1) if m in history]
    S["S8_caja_negativa"] = (pd.concat(neg, axis=1).all(axis=1) if len(neg) == C.S8_MONTHS else pd.Series(False, index=idx)).astype(float)
    # las que no se pueden evaluar (métrica NaN) cuentan como 0, pero se conserva la info en las métricas
    S["n_stress"] = S.sum(axis=1)
    return S
