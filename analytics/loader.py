"""Loader: construye las tablas base desde gold y entrega, para cada mes t, SOLO datos ≤ fin de t.

`build_base()` precalcula agregados mensuales/diarios (una vez por ejecución).
`load(base, mi)` devuelve un `Loaded` cuyas tablas están truncadas al mes `mi`: las facturas
emitidas después no existen y los pagos posteriores a fin de mes aparecen como no pagados. Las
métricas solo ven este objeto, así que no pueden usar el futuro.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd

from . import config as C


def month_index(ts) -> int:
    return (ts.year - 2024) * 12 + ts.month - 9


def mi_to_str(mi: int) -> str:
    y, m = divmod(mi + 8, 12)
    return f"{2024 + y}-{m + 1:02d}"


def eom(mi: int) -> pd.Timestamp:
    return pd.Timestamp(mi_to_str(mi) + "-01") + pd.offsets.MonthEnd(0)


@dataclass
class Base:
    companies: pd.DataFrame
    tx_month: pd.DataFrame
    bal_month: pd.DataFrame
    inv: pd.DataFrame
    debt: pd.DataFrame
    sched: pd.DataFrame


def build_base(gold_dir: Path = C.GOLD_DIR, balance_mode: str = C.BALANCE_MODE) -> Base:
    con = duckdb.connect()
    g = lambda t: f"read_parquet('{gold_dir / (t + '.parquet')}')"  # noqa: E731
    s = lambda t: f"read_parquet('{gold_dir.parent / 'silver' / (t + '.parquet')}')"  # noqa: E731
    mi = lambda col: f"((year({col}) - 2024) * 12 + month({col}) - 9)"  # noqa: E731

    companies = con.sql(f"""
        SELECT c.company_id, c.group_id, c.currency, {mi('t.first_tx')} AS first_mi, {mi('t.last_tx')} AS last_mi
        FROM {g('dim_company')} c LEFT JOIN (SELECT company_id, min(date) first_tx, max(date) last_tx FROM {g('fact_transactions')} GROUP BY 1) t USING (company_id)""").df()

    tx_month = con.sql(f"""
        SELECT company_id, {mi('date')} AS mi, category, count(*) AS n,
               sum(coalesce(amount_company_ccy, amount)) FILTER (WHERE amount > 0) AS inflow,
               -sum(coalesce(amount_company_ccy, amount)) FILTER (WHERE amount < 0) AS outflow
        FROM {g('fact_transactions')} GROUP BY 1, 2, 3""").df()
    tx_month[["inflow", "outflow"]] = tx_month[["inflow", "outflow"]].fillna(0.0)

    types = ", ".join(f"'{t}'" for t in C.BALANCE_TYPES)
    if balance_mode == "cumsum":
        # saldo = suma acumulada de amount por cuenta checking desde su primer movimiento (docs/salud.md)
        bal_day = con.sql(f"""
            WITH p AS (SELECT product_id, company_id, currency = company_currency AS same, coalesce(fx_rate_median, 1) AS fx, first_tx
                       FROM {g('dim_product')} WHERE type IN ({types}) AND is_active),
            daily AS (SELECT product_id, date, sum(amount) net FROM {g('fact_transactions')}
                      WHERE product_id IN (SELECT product_id FROM p) GROUP BY 1, 2),
            grid AS (SELECT p.product_id, p.company_id, p.same, p.fx, c.date FROM p JOIN {g('dim_calendar')} c ON c.date >= p.first_tx),
            cum AS (SELECT g.company_id, g.date,
                           sum(coalesce(d.net, 0)) OVER (PARTITION BY g.product_id ORDER BY g.date) / (CASE WHEN g.same THEN 1 ELSE g.fx END) AS bal
                    FROM grid g LEFT JOIN daily d ON d.product_id = g.product_id AND d.date = g.date)
            SELECT company_id, date, sum(bal) AS balance FROM cum GROUP BY 1, 2""")
    else:
        bal_day = con.sql(f"""
            SELECT b.company_id, b.date,
                   sum(b.balance_eod / (CASE WHEN p.currency = p.company_currency THEN 1 ELSE coalesce(p.fx_rate_median, 1) END)) AS balance
            FROM {g('product_day_balance')} b JOIN {g('dim_product')} p USING (product_id)
            WHERE b.is_observed AND p.type IN ({types}) GROUP BY 1, 2""")
    con.register("bal_day_v", bal_day)
    bal_month = con.sql(f"""
        SELECT company_id, {mi('date')} AS mi, min(balance) AS bal_min, arg_max(balance, date) AS bal_eom,
               count(*) FILTER (WHERE balance < 0) AS days_negative, count(*) AS n_days
        FROM bal_day_v GROUP BY 1, 2""").df()

    inv = con.sql(f"""
        SELECT company_id, counterparty_id, coalesce(amount_accounting_ccy, amount) AS amount, issuance_date, due_date,
               CASE WHEN status = 'paid' THEN payment_date END AS paid_at, {mi('issuance_date')} AS mi_issue
        FROM {g('fact_invoices')} WHERE document_type = 'invoice' AND status <> 'cancelled' AND amount <> 0""").df()
    for c in ("issuance_date", "due_date", "paid_at"):
        inv[c] = pd.to_datetime(inv[c])

    debt = con.sql(f"""
        SELECT company_id, product_id, type, granted_abs, outstanding_abs, created_at
        FROM {g('dim_product')} WHERE family = 'debt' AND coalesce(granted_abs, 0) < 1e9 AND coalesce(outstanding_abs, 0) < 1e9""").df()
    debt["created_at"] = pd.to_datetime(debt.created_at)

    sched = con.sql(f"""
        SELECT company_id, product_id, outstanding_balance, total_periods, annual_rate, last_payment_date, next_payment_date,
               CASE amortising_frequency WHEN 'monthly' THEN 1 WHEN 'quarterly' THEN 3 WHEN 'semiannually' THEN 6 ELSE 12 END AS period_months
        FROM {s('debt_schedule')}""").df()
    sched["last_payment_date"] = pd.to_datetime(sched.last_payment_date)
    return Base(companies, tx_month, bal_month, inv, debt, sched)


class Loaded:
    """Vista de los datos a fin del mes `mi`. Todo lo que contiene es ≤ eom(mi)."""

    def __init__(self, base: Base, mi: int):
        self.mi = mi
        self.month = mi_to_str(mi)
        self.eom = eom(mi)
        self.companies = base.companies
        self.company_ids = base.companies.company_id
        self.tx_month = base.tx_month[base.tx_month.mi <= mi]
        self.bal_month = base.bal_month[base.bal_month.mi <= mi]
        inv = base.inv[base.inv.issuance_date <= self.eom].copy()
        inv.loc[inv.paid_at > self.eom, "paid_at"] = pd.NaT           # pagos posteriores a t no existen todavía
        self.inv = inv
        self.debt = base.debt[base.debt.created_at <= self.eom]
        self.sched = base.sched

    # ------------------------------------------------------------------ helpers
    def series(self, values: pd.Series | dict | None = None) -> pd.Series:
        """Series float indexada por todas las empresas (NaN por defecto)."""
        out = pd.Series(np.nan, index=self.company_ids.values, dtype="float64")
        if values is not None:
            v = pd.Series(values)
            out.loc[v.index.intersection(out.index)] = v.astype(float)
        return out

    def tx(self, months_back: int = 1, cats: tuple | None = None, exclude: tuple | None = None) -> pd.DataFrame:
        """tx_month de los últimos `months_back` meses (incluido t), opcionalmente filtrado por categoría."""
        d = self.tx_month[self.tx_month.mi > self.mi - months_back]
        if cats is not None:
            d = d[d.category.isin(cats)]
        if exclude is not None:
            d = d[~d.category.isin(exclude)]
        return d

    def flows(self, months_back: int = 1, cats=None, exclude=None) -> pd.DataFrame:
        """entradas y salidas por empresa (sumadas sobre la ventana)."""
        d = self.tx(months_back, cats, exclude).groupby("company_id")[["inflow", "outflow"]].sum()
        return d.reindex(self.company_ids.values).fillna(0.0)

    def flows_by_month(self, months_back: int, exclude=None) -> pd.DataFrame:
        """neto = inflow − outflow por (empresa, mes) en la ventana, completando meses sin movimientos con 0."""
        d = self.tx(months_back, exclude=exclude).groupby(["company_id", "mi"])[["inflow", "outflow"]].sum()
        idx = pd.MultiIndex.from_product([self.company_ids.values, range(self.mi - months_back + 1, self.mi + 1)], names=["company_id", "mi"])
        d = d.reindex(idx).fillna(0.0)
        d["net"] = d.inflow - d.outflow
        return d

    def outflow_month(self) -> pd.Series:
        return self.flows(1).outflow

    def received(self) -> pd.DataFrame:   # facturas recibidas (debemos)
        return self.inv[self.inv.amount < 0]

    def issued(self) -> pd.DataFrame:     # facturas emitidas (nos deben)
        return self.inv[self.inv.amount > 0]


def load(base: Base, mi: int) -> Loaded:
    return Loaded(base, mi)
