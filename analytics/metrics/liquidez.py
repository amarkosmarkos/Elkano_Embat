"""B. Liquidez (docs/salud.md §B)."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .. import config as C


def _bal(L) -> pd.DataFrame:
    return L.bal_month[L.bal_month.mi == L.mi].set_index("company_id")


def b1_colchon(L) -> pd.Series:
    """B1. colchón = saldo mínimo del mes / salidas del mes."""
    b = _bal(L)
    out = L.outflow_month()
    return L.series((b.bal_min / out.reindex(b.index).replace(0, np.nan)).clip(-10, 10))


def b2_runway(L) -> pd.Series:
    """B2. runway = saldo fin de mes / media(salidas − entradas, 3 m) si hay quema de caja; si no, tope."""
    b = _bal(L)
    f = L.flows(3)
    burn = (f.outflow - f.inflow) / 3.0
    r = b.bal_eom / burn.reindex(b.index)
    r = r.where(burn.reindex(b.index) > 0, C.RUNWAY_CAP)          # entradas ≥ salidas → runway infinito → tope
    r = r.where(b.bal_eom >= 0, 0.0)                              # saldo negativo → 0
    return L.series(r.clip(0, C.RUNWAY_CAP))


def b3_dias_negativo(L) -> pd.Series:
    """B3. nº días del mes con saldo < 0."""
    return L.series(_bal(L).days_negative.astype(float))


def b4_credito_disponible(L) -> pd.Series:
    """B4. Σ(|granted| − |outstanding|) en líneas de crédito / confirming / factoring, / salidas del mes."""
    d = L.debt[L.debt.type.isin(C.CREDIT_LINE_TYPES)].dropna(subset=["granted_abs"])
    avail = (d.granted_abs - d.outstanding_abs.fillna(0)).clip(lower=0).groupby(d.company_id).sum()
    out = L.outflow_month()
    return L.series((avail / out.reindex(avail.index).replace(0, np.nan)).clip(upper=50))
