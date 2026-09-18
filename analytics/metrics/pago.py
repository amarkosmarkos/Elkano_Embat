"""A. Comportamiento de pago (docs/salud.md §A)."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .. import config as C


def _paid_in_month(L, df: pd.DataFrame) -> pd.DataFrame:
    som = L.eom.replace(day=1)
    return df[(df.paid_at >= som) & (df.paid_at <= L.eom)]


def a1_retraso_pago(L) -> pd.Series:
    """A1. retraso = mediana(payment_date − due_date) sobre facturas recibidas pagadas en el mes."""
    d = _paid_in_month(L, L.received()).dropna(subset=["due_date"])
    delay = (d.paid_at - d.due_date).dt.days
    return L.series(delay.groupby(d.company_id).median())


def a2_pct_pago_tarde(L) -> pd.Series:
    """A2. % de facturas recibidas pagadas en el mes con payment_date > due_date."""
    d = _paid_in_month(L, L.received()).dropna(subset=["due_date"])
    late = (d.paid_at > d.due_date).astype(float)
    return L.series(late.groupby(d.company_id).mean())


def regular_missing(L, cats: tuple = C.REGULAR_CATS) -> pd.DataFrame:
    """falta_X = 1 si no hay salida de categoría X este mes y sí la hubo en los REGULAR_LOOKBACK anteriores.
    Devuelve un DataFrame empresa × categoría (0/1; NaN si la empresa no tiene 6 meses de historia)."""
    d = L.tx(C.REGULAR_LOOKBACK + 1, cats=cats)
    d = d[d.outflow > 0]
    present = d.groupby(["company_id", "category", "mi"]).size().unstack("mi").notna()
    out = pd.DataFrame(0.0, index=L.company_ids.values, columns=list(cats))
    prev_months = [m for m in range(L.mi - C.REGULAR_LOOKBACK, L.mi)]
    hist_ok = (L.companies.set_index("company_id").first_mi <= L.mi - C.REGULAR_LOOKBACK).reindex(out.index)
    for cat in cats:
        p = present.xs(cat, level="category") if cat in present.index.get_level_values("category") else pd.DataFrame()
        was = p.reindex(columns=prev_months).fillna(False).sum(axis=1) if len(p) else pd.Series(dtype=float)
        now = p.reindex(columns=[L.mi]).fillna(False).iloc[:, 0] if len(p) else pd.Series(dtype=bool)
        missing = (was >= C.REGULAR_MIN_PRESENT) & (~now.astype(bool))
        out.loc[missing[missing].index, cat] = 1.0
    out[~hist_ok.fillna(False).values] = np.nan
    return out


def a3_falta_regular(L) -> pd.Series:
    """A3. nº de {salary, social_security, tax} que faltan este mes y estaban los 6 anteriores (0–3)."""
    return L.series(regular_missing(L).sum(axis=1, min_count=1))


def a4_dso(L) -> pd.Series:
    """A4. DSO = mediana(payment_date − issuance_date) sobre facturas emitidas cobradas en el mes."""
    d = _paid_in_month(L, L.issued())
    days = (d.paid_at - d.issuance_date).dt.days
    return L.series(days.groupby(d.company_id).median())


def a5_pct_cobro_vencido(L) -> pd.Series:
    """A5. vencido a fin de mes (emitidas con due_date < eom y sin cobrar) / emitido en los últimos 90 días.
    Punto en el tiempo: no usa status; sin cobrar = paid_at vacío o > eom (ya enmascarado por el loader)."""
    d = L.issued()
    overdue = d[(d.due_date < L.eom) & d.paid_at.isna()].groupby("company_id").amount.sum()
    recent = d[d.issuance_date > L.eom - pd.Timedelta(days=90)].groupby("company_id").amount.sum()
    ratio = overdue.reindex(recent.index).fillna(0.0) / recent.replace(0, np.nan)
    return L.series(ratio.clip(upper=5.0))


def a6_devoluciones(L) -> pd.Series:
    """A6. nº movimientos con category = collection_refund en el mes."""
    d = L.tx(1, cats=("collection_refund",)).groupby("company_id").n.sum()
    return L.series(d).fillna(0.0).where(L.companies.set_index("company_id").first_mi.reindex(L.company_ids.values) <= L.mi)
