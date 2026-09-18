"""C. Generación de caja (docs/salud.md §C)."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .. import config as C


def operating_net_by_month(L, months_back: int) -> pd.DataFrame:
    """neto operativo por (empresa, mes): entradas − salidas sin categorías no operativas (C1)."""
    return L.flows_by_month(months_back, exclude=C.NON_OPERATING)


def _active_since(L) -> pd.Series:
    return L.companies.set_index("company_id").first_mi.reindex(L.company_ids.values)


def c1_neto_operativo(L) -> pd.Series:
    """C1. neto operativo del mes, normalizado por las salidas medias de 3 meses (comparable entre empresas)."""
    d = operating_net_by_month(L, 3)
    net_t = d.xs(L.mi, level="mi").net
    out3 = d.outflow.groupby(level="company_id").mean()
    v = (net_t / out3.replace(0, np.nan)).clip(-5, 5)
    return L.series(v).where(_active_since(L) <= L.mi)


def _slope(y: np.ndarray) -> float:
    x = np.arange(len(y), dtype=float)
    x -= x.mean()
    return float((x * (y - y.mean())).sum() / (x * x).sum())


def _tendencia(L, n: int) -> pd.Series:
    d = operating_net_by_month(L, n)
    ok = _active_since(L) <= L.mi - n + 1                          # necesita n meses de historia
    net = d.net.unstack("mi")
    out_mean = d.outflow.groupby(level="company_id").mean()
    slope = net.apply(lambda r: _slope(r.values), axis=1)
    v = (slope / out_mean.reindex(slope.index).replace(0, np.nan)).clip(-5, 5)
    return L.series(v).where(ok)


def c2_tendencia_3m(L) -> pd.Series:
    """C2. pendiente del neto operativo en los últimos 3 meses / salidas medias."""
    return _tendencia(L, 3)


def c2_tendencia_6m(L) -> pd.Series:
    """C2. pendiente del neto operativo en los últimos 6 meses / salidas medias."""
    return _tendencia(L, 6)


def c3_volatilidad(L) -> pd.Series:
    """C3. sd(neto, 12 m) / media(|neto|, 12 m)."""
    d = operating_net_by_month(L, 12)
    ok = _active_since(L) <= L.mi - 5                               # al menos 6 meses de historia
    g = d.net.groupby(level="company_id")
    v = g.std() / d.net.abs().groupby(level="company_id").mean().replace(0, np.nan)
    return L.series(v.clip(upper=10)).where(ok)


def c4_ratio_cobros_pagos(L) -> pd.Series:
    """C4. Σ entradas {collection, bulk_collection, pos_settlement} / Σ salidas {payment, bulk_payment, utility} del mes."""
    cob = L.flows(1, cats=C.COLLECTION_CATS).inflow
    pag = L.flows(1, cats=C.PAYMENT_CATS).outflow
    v = (cob / pag.replace(0, np.nan)).clip(upper=10)
    return L.series(v).where(_active_since(L) <= L.mi)


def c5_crecimiento_cobros(L) -> pd.Series:
    """C5. cobros del mes / cobros del mismo mes del año anterior − 1 (solo desde 2025-09)."""
    if L.mi < 12:
        return L.series()
    d = L.tx(13, cats=C.COLLECTION_CATS)
    now = d[d.mi == L.mi].groupby("company_id").inflow.sum()
    prev = d[d.mi == L.mi - 12].groupby("company_id").inflow.sum()
    prev = prev[prev > 0]
    v = (now.reindex(prev.index).fillna(0.0) / prev - 1).clip(-1, 5)
    return L.series(v)
