"""Registro de métricas: una función por métrica de docs/salud.md.

Cada función recibe un `Loaded` (datos ≤ fin del mes t, ver loader.py) y devuelve una Series
indexada por company_id (NaN = no calculable). El registro dice a qué dimensión pertenece y si
"más es mejor", que es lo que necesita el scorer para convertirla en percentil orientado.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import pandas as pd

from . import caja, concentracion, deuda, liquidez, pago


@dataclass(frozen=True)
class Metric:
    id: str            # A1, B2…
    name: str          # nombre de columna
    dimension: str     # pago | liquidez | caja | deuda | concentracion | (None: solo feature)
    higher_is_better: bool
    fn: Callable[["Loaded"], pd.Series]  # noqa: F821
    doc: str = ""


REGISTRY: list[Metric] = [
    # A. comportamiento de pago
    Metric("A1", "retraso_pago", "pago", False, pago.a1_retraso_pago, "mediana(payment_date − due_date) en facturas recibidas pagadas en el mes"),
    Metric("A2", "pct_pago_tarde", "pago", False, pago.a2_pct_pago_tarde, "% facturas recibidas pagadas en el mes con payment_date > due_date"),
    Metric("A3", "falta_regular", "pago", False, pago.a3_falta_regular, "nº de {salary, social_security, tax} que faltan este mes y estaban los 6 anteriores"),
    Metric("A4", "dso", "pago", False, pago.a4_dso, "mediana(payment_date − issuance_date) en facturas emitidas cobradas en el mes"),
    Metric("A5", "pct_cobro_vencido", "pago", False, pago.a5_pct_cobro_vencido, "importe emitido vencido y sin cobrar a fin de mes / emitido últimos 90 días"),
    Metric("A6", "devoluciones", "pago", False, pago.a6_devoluciones, "nº movimientos collection_refund en el mes"),
    # B. liquidez
    Metric("B1", "colchon", "liquidez", True, liquidez.b1_colchon, "saldo mínimo del mes / salidas del mes"),
    Metric("B2", "runway", "liquidez", True, liquidez.b2_runway, "saldo fin de mes / media(salidas − entradas, 3 m); ∞ → tope"),
    Metric("B3", "dias_negativo", "liquidez", False, liquidez.b3_dias_negativo, "nº días del mes con saldo < 0"),
    Metric("B4", "credito_disponible", "liquidez", True, liquidez.b4_credito_disponible, "Σ(granted − outstanding) en líneas / salidas del mes"),
    # C. generación de caja
    Metric("C1", "neto_operativo", "caja", True, caja.c1_neto_operativo, "entradas − salidas sin transfer/debt_repayment/investment/cash_withdrawal, normalizado por salidas"),
    Metric("C2a", "tendencia_3m", "caja", True, caja.c2_tendencia_3m, "pendiente del neto operativo, 3 meses, / salidas medias"),
    Metric("C2b", "tendencia_6m", "caja", True, caja.c2_tendencia_6m, "pendiente del neto operativo, 6 meses, / salidas medias"),
    Metric("C3", "volatilidad", "caja", False, caja.c3_volatilidad, "sd(neto, 12 m) / media(|neto|, 12 m)"),
    Metric("C4", "ratio_cobros_pagos", "caja", True, caja.c4_ratio_cobros_pagos, "Σ cobros / Σ pagos (categorías de negocio) en el mes"),
    Metric("C5", "crecimiento_cobros", "caja", True, caja.c5_crecimiento_cobros, "cobros del mes / cobros mismo mes año anterior − 1"),
    # D. deuda
    Metric("D1", "pct_dispuesto", "deuda", False, deuda.d1_pct_dispuesto, "Σ|outstanding| / Σ|granted| en líneas"),
    Metric("D2", "servicio_deuda", "deuda", False, deuda.d2_servicio_deuda, "cuota mensual estimada / neto operativo medio 6 m"),
    Metric("D3", "coste_financiero", "deuda", False, deuda.d3_coste_financiero, "salidas interest_charge + fee / salidas del mes"),
    Metric("D4", "deuda_cobros", "deuda", False, deuda.d4_deuda_cobros, "Σ|outstanding| / Σ cobros 12 m"),
    # E. concentración y cartera
    Metric("E1", "top5_clientes", "concentracion", False, concentracion.e1_top5_clientes, "cuota de los 5 mayores clientes en lo facturado 12 m"),
    Metric("E2", "hhi", "concentracion", False, concentracion.e2_hhi, "Herfindahl de la facturación por cliente 12 m"),
    Metric("E3", "rating_cartera", "concentracion", False, concentracion.e3_rating_cartera, "retraso medio suavizado de los clientes, ponderado por facturación"),
    Metric("E4", "clientes_activos", "concentracion", True, concentracion.e4_clientes_activos, "nº clientes con factura emitida en el mes"),
]

BY_NAME = {m.name: m for m in REGISTRY}
DIMENSIONS = ["pago", "liquidez", "caja", "deuda", "concentracion"]
