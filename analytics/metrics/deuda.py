"""D. Deuda (docs/salud.md §D).

Nota de fuga: `outstanding` de debt_products es el saldo a fecha de extracción (no existe histórico).
D1, D2 y D4 lo usan tal cual, como dice el doc; es una foto constante en el tiempo, así que no
introduce información sobre eventos futuros pero tampoco varía mes a mes.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .. import config as C
from .caja import operating_net_by_month


def _lines(L) -> pd.DataFrame:
    return L.debt[L.debt.type.isin(C.CREDIT_LINE_TYPES)].dropna(subset=["granted_abs"])


def d1_pct_dispuesto(L) -> pd.Series:
    """D1. Σ|outstanding| / Σ|granted| en lineofcredit, confirming, factoring."""
    d = _lines(L)
    g = d.groupby("company_id")[["granted_abs", "outstanding_abs"]].sum()
    g = g[g.granted_abs > 0]
    return L.series((g.outstanding_abs / g.granted_abs).clip(0, 2))


def d2_servicio_deuda(L) -> pd.Series:
    """D2. cuota mensual = Σ(outstanding / periodos restantes) + interés mensual, / neto operativo medio 6 m."""
    s = L.sched.copy()
    if s.empty:
        return L.series()
    months_left = ((s.last_payment_date - L.eom).dt.days / 30.44).clip(lower=1.0)
    periods_left = (months_left / s.period_months).clip(lower=1.0)
    principal = s.outstanding_balance / periods_left / s.period_months          # por mes
    interest = s.outstanding_balance * s.annual_rate.fillna(0) / 12.0
    cuota = (principal + interest).groupby(s.company_id).sum()
    net6 = operating_net_by_month(L, 6).net.groupby(level="company_id").mean()
    v = cuota / net6.reindex(cuota.index)
    v = v.where(net6.reindex(cuota.index) > 0, 5.0)                             # sin caja neta positiva → tope
    return L.series(v.clip(0, 5))


def d3_coste_financiero(L) -> pd.Series:
    """D3. Σ salidas {interest_charge, fee} / salidas del mes."""
    fin = L.flows(1, cats=C.FINANCE_COST_CATS).outflow
    out = L.outflow_month()
    v = (fin / out.replace(0, np.nan)).clip(0, 1)
    return L.series(v).where(L.companies.set_index("company_id").first_mi.reindex(L.company_ids.values) <= L.mi)


def d4_deuda_cobros(L) -> pd.Series:
    """D4. Σ|outstanding| / Σ cobros 12 m."""
    debt = L.debt.groupby("company_id").outstanding_abs.sum()
    cob = L.flows(12, cats=C.COLLECTION_CATS).inflow
    v = debt / cob.reindex(debt.index).replace(0, np.nan)
    return L.series(v.clip(upper=20))
