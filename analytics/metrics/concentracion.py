"""E. Concentración y cartera (docs/salud.md §E)."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .. import config as C


def _issued_12m(L) -> pd.DataFrame:
    d = L.issued()
    return d[(d.issuance_date > L.eom - pd.DateOffset(months=12)) & d.counterparty_id.notna()]


def _shares(L) -> pd.Series:
    """cuota de cada cliente en lo facturado 12 m, por empresa: Series indexada (company_id, counterparty_id)."""
    d = _issued_12m(L)
    by_cp = d.groupby(["company_id", "counterparty_id"]).amount.sum()
    tot = by_cp.groupby(level="company_id").sum()
    return by_cp / tot.reindex(by_cp.index, level="company_id")


def e1_top5_clientes(L) -> pd.Series:
    """E1. Σ importe facturado a los 5 mayores clientes / Σ facturado (12 m)."""
    sh = _shares(L)
    top5 = sh.groupby(level="company_id").apply(lambda s: s.nlargest(5).sum())
    return L.series(top5)


def e2_hhi(L) -> pd.Series:
    """E2. Herfindahl = Σ share_i² por cliente (12 m)."""
    sh = _shares(L)
    return L.series((sh ** 2).groupby(level="company_id").sum())


def counterparty_rating(L, k: int = C.RATING_PRIOR_K) -> pd.Series:
    """rating_c = (Σ retrasos de c + k · retraso_global) / (nº facturas de c + k), con facturas cobradas ≤ t.
    Las contrapartes se agregan por counterparty_id en todas las empresas (bureau casero)."""
    d = L.issued().dropna(subset=["paid_at", "due_date", "counterparty_id"])
    delay = (d.paid_at - d.due_date).dt.days.astype(float)
    if len(delay) == 0:
        return pd.Series(dtype=float)
    prior = float(delay.mean())
    g = delay.groupby(d.counterparty_id).agg(["sum", "count"])
    return (g["sum"] + k * prior) / (g["count"] + k)


def e3_rating_cartera(L) -> pd.Series:
    """E3. rating de cartera = Σ(rating_c × facturado a c) / Σ facturado (12 m). Más días = peor."""
    r = counterparty_rating(L)
    d = _issued_12m(L)
    by_cp = d.groupby(["company_id", "counterparty_id"]).amount.sum().reset_index()
    by_cp["rating"] = by_cp.counterparty_id.map(r)
    by_cp = by_cp.dropna(subset=["rating"])
    w = by_cp.groupby("company_id").apply(lambda x: np.average(x.rating, weights=x.amount) if x.amount.sum() > 0 else np.nan)
    return L.series(w)


def e4_clientes_activos(L) -> pd.Series:
    """E4. nº counterparty_id con factura emitida en el mes."""
    d = L.issued()
    d = d[d.mi_issue == L.mi]
    n = d.groupby("company_id").counterparty_id.nunique().astype(float)
    has_inv = L.issued().groupby("company_id").size()
    return L.series(n.reindex(has_inv.index).fillna(0.0))
