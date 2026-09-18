"""F. Trayectoria: delta_3m, delta_12m y racha, para cualquier métrica (docs/salud.md §F).

Trabaja sobre el histórico de métricas ya calculadas (mes a mes, sin futuro): history[mi] = DataFrame
empresa × métrica.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def deltas(history: dict[int, pd.DataFrame], mi: int, names: list[str]) -> pd.DataFrame:
    """delta_3m = M_t − M_{t−3}; delta_12m = M_t − M_{t−12} (NaN si no hay ese mes)."""
    cur = history[mi]
    out = {}
    for lag, suffix in ((3, "delta_3m"), (12, "delta_12m")):
        prev = history.get(mi - lag)
        for n in names:
            out[f"{n}__{suffix}"] = (cur[n] - prev[n].reindex(cur.index)) if prev is not None else pd.Series(np.nan, index=cur.index)
    return pd.DataFrame(out, index=cur.index)


def streaks(history: dict[int, pd.DataFrame], mi: int, names: list[str], higher_is_better: dict[str, bool]) -> pd.DataFrame:
    """racha = nº de meses consecutivos (hasta t) en que la métrica empeora respecto al mes anterior."""
    cur = history[mi]
    out = {}
    for n in names:
        streak = pd.Series(0.0, index=cur.index)
        alive = pd.Series(True, index=cur.index)
        m = mi
        while m - 1 in history and alive.any():
            a, b = history[m][n].reindex(cur.index), history[m - 1][n].reindex(cur.index)
            worse = (a < b) if higher_is_better[n] else (a > b)
            worse = worse & a.notna() & b.notna()
            alive = alive & worse
            streak[alive] += 1
            m -= 1
        out[f"{n}__racha"] = streak
    return pd.DataFrame(out, index=cur.index)
