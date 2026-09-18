"""Etiquetas: evento de impago D1–D4 y cura, por empresa y mes (docs/validacion_salud.md §1).

Se calculan con los datos completos (aquí sí se mira todo): es la verdad contra la que se evalúa.
Salida: events_v1.csv con company_id, month, D1..D4, event, cure  +  labels_summary.json.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from . import config as C
from .loader import Base, Loaded, load, mi_to_str
from .metrics.pago import regular_missing


def d1_unpaid_received(base: Base, mi: int) -> pd.Series:
    """D1: factura recibida con due_date ≤ m − 90 días, sin pagar a fin de m, de importe ≥ 1 % de las salidas mensuales."""
    L = Loaded(base, mi)                                   # paid_at > eom ya enmascarado → "sin pagar a fin de m"
    r = L.received().dropna(subset=["due_date"])
    old = r[(r.due_date <= L.eom - pd.Timedelta(days=C.D1_DAYS)) & (r.due_date > L.eom - pd.Timedelta(days=C.D1_MAX_AGE_DAYS)) & r.paid_at.isna()]
    out6 = L.flows(6).outflow / 6.0
    thr = (out6 * C.D1_MIN_SHARE_OUTFLOW).reindex(old.company_id).values
    big = old[old.amount.abs().values >= np.where(np.isnan(thr), np.inf, thr)]
    return L.series(big.groupby("company_id").size().gt(0).astype(float)).fillna(0.0)


def d2_missing_regular(base: Base, mi: int) -> pd.Series:
    """D2: falta el pago de salary / social_security / tax que existía en los 6 meses anteriores."""
    L = load(base, mi)
    rm = regular_missing(L)
    return L.series((rm.fillna(0).sum(axis=1) > 0).astype(float)).fillna(0.0)


def d3_negative_balance(base: Base, mi: int) -> pd.Series:
    """D3: saldo checking < 0 durante ≥ 5 días del mes."""
    b = base.bal_month[base.bal_month.mi == mi].set_index("company_id").days_negative
    return Loaded(base, mi).series((b >= C.D3_MIN_DAYS).astype(float)).fillna(0.0)


def d4_finance_cost_spike(base: Base, mi: int) -> pd.Series:
    """D4: interest_charge + fee > 3 × mediana de 6 meses y > 2 % de las salidas."""
    L = load(base, mi)
    fin = L.tx(7, cats=C.FINANCE_COST_CATS).groupby(["company_id", "mi"]).outflow.sum().unstack("mi")
    fin = fin.reindex(columns=range(mi - 6, mi + 1)).fillna(0.0)
    cur, med6 = fin[mi], fin[[m for m in range(mi - 6, mi)]].median(axis=1)
    out = L.outflow_month().reindex(fin.index)
    spike = (cur > C.D4_MULT * med6) & (cur > C.D4_MIN_SHARE * out) & (med6 > 0)
    return L.series(spike.astype(float)).fillna(0.0)


def build_events(base: Base, months: range | None = None) -> pd.DataFrame:
    months = months if months is not None else range(0, C.LAST_FULL_MI + 1)
    rows = []
    for mi in months:
        d = pd.DataFrame({"D1": d1_unpaid_received(base, mi), "D2": d2_missing_regular(base, mi),
                          "D3": d3_negative_balance(base, mi), "D4": d4_finance_cost_spike(base, mi)})
        d["event"] = d[["D1", "D2", "D3", "D4"]].max(axis=1)
        d.insert(0, "month", mi_to_str(mi))
        d.insert(0, "mi", mi)
        d.index.name = "company_id"
        rows.append(d.reset_index())
    ev = pd.concat(rows, ignore_index=True).sort_values(["company_id", "mi"])
    # solo meses en los que la empresa ya tiene actividad
    first = base.companies.set_index("company_id").first_mi
    ev = ev[ev.mi >= ev.company_id.map(first).fillna(10**6)].reset_index(drop=True)
    ev["cure"] = cure_flags(ev)
    return ev


def cure_flags(ev: pd.DataFrame) -> pd.Series:
    """cura_m = 1 si lleva ≥ 3 meses sin evento (m−2..m) y justo antes estuvo ≥ 2 meses seguidos en evento."""
    out = pd.Series(0, index=ev.index, dtype=int)
    for _, g in ev.groupby("company_id"):
        e = g.event.values.astype(int)
        for i in range(len(e)):
            k, c = C.CURE_CLEAN_MONTHS, C.CURE_MIN_EVENT_MONTHS
            if i - k - c + 1 < 0:
                continue
            clean = e[i - k + 1:i + 1].sum() == 0
            before = e[i - k - c + 1:i - k + 1].sum() == c
            if clean and before:
                out.loc[g.index[i]] = 1
    return out


def run(base: Base, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    ev = build_events(base)
    rate = float(ev.event.mean())
    summary = {"version": C.EVENTS_VERSION, "rows": int(len(ev)), "event_rate": rate,
               "rate_by_rule": {k: float(ev[k].mean()) for k in ("D1", "D2", "D3", "D4")},
               "companies_ever_in_event": int(ev.groupby("company_id").event.max().sum()), "cure_rows": int(ev.cure.sum()),
               "in_expected_range": C.EVENT_RATE_RANGE[0] <= rate <= C.EVENT_RATE_RANGE[1],
               "thresholds": {"D1_DAYS": C.D1_DAYS, "D1_MAX_AGE_DAYS": C.D1_MAX_AGE_DAYS, "D1_MIN_SHARE_OUTFLOW": C.D1_MIN_SHARE_OUTFLOW, "D3_MIN_DAYS": C.D3_MIN_DAYS,
                              "D4_MULT": C.D4_MULT, "D4_MIN_SHARE": C.D4_MIN_SHARE, "BALANCE_MODE": C.BALANCE_MODE}}
    ev.drop(columns=["mi"]).to_csv(out_dir / f"{C.EVENTS_VERSION}.csv", index=False)
    (out_dir / "labels_summary.json").write_text(json.dumps(summary, indent=2))
    return summary
