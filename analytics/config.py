"""Parámetros del generador de score, de las etiquetas y del evaluador (docs/salud.md, docs/validacion_salud.md)."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get("ELKANO_OUT", ROOT / "output"))
GOLD_DIR = Path(os.environ.get("ELKANO_GOLD", OUT / "01_preprocessed" / "gold"))
SILVER_DIR = GOLD_DIR.parent / "silver"
SCORE_DIR = OUT / "02_score"
VALIDATION_DIR = OUT / "03_validation"

PERIOD_START = "2024-09-01"
SNAPSHOT = "2026-09-01"
N_MONTHS = 25                      # 2024-09 … 2026-09 (el último es parcial: 1 día)
LAST_FULL_MI = 23                  # 2026-08

# --- convenciones (docs/salud.md) --------------------------------------------------------------
BALANCE_MODE = "reconstructed"     # 'reconstructed': saldo real reconstruido hacia atrás desde balances.csv (gold.product_day_balance)
                                   # 'cumsum': suma acumulada desde el primer movimiento (literal del doc). Medido: con 'cumsum' el
                                   # saldo empieza en 0 y D3 sale en el 62 % de los meses (1.194 empresas "en descubierto");
                                   # con el saldo real, 9,4 %. El saldo real en t es información disponible en t: no es fuga.
BALANCE_TYPES = ("checking",)
MIN_HISTORY_MONTHS = 6             # contrato: filas desde el 6º mes de historia de la empresa
NON_OPERATING = ("transfer", "debt_repayment", "investment_deployment", "investment_return", "cash_withdrawal")
COLLECTION_CATS = ("collection", "bulk_collection", "pos_settlement")
PAYMENT_CATS = ("payment", "bulk_payment", "utility")
REGULAR_CATS = ("salary", "social_security", "tax")
REGULAR_LOOKBACK = 6               # meses anteriores en los que "siempre estaba"
REGULAR_MIN_PRESENT = 6            # en cuántos de ellos debía estar (6 = todos, literal del doc)
CREDIT_LINE_TYPES = ("lineofcredit", "confirming", "factoring")
RUNWAY_CAP = 24.0
RATING_PRIOR_K = 5                 # E3: peso del prior en el rating de contrapartes
FINANCE_COST_CATS = ("interest_charge", "fee")

# --- H. combinación ----------------------------------------------------------------------------
WEIGHTS = {"pago": 0.30, "liquidez": 0.25, "caja": 0.20, "deuda": 0.15, "concentracion": 0.10}
STRESS_PENALTY = 5.0               # − 5 · nº eventos S activos
TREND_BONUS = 10.0                 # + 10 · tendencia_6m normalizada (acotado a ±10)
SMOOTHING = 0.7                    # score_final_t = 0,7 · score_t + 0,3 · score_final_{t−1}
ALERT_PERCENTILE = 20              # alerta si score < p20 del mes o ≥ 2 eventos de estrés
DEFAULT_SCORE = 50.0               # sin dimensiones disponibles

# --- G. eventos de estrés ------------------------------------------------------------------------
S1_MIN_NEG_DAYS = 5
S2_MULT, S2_MIN_SHARE = 3.0, 0.02
S4_MAX_UTIL = 0.9
S5_MAX_OVERDUE = 0.3
S6_MIN_DELAY, S6_MIN_STREAK = 15, 3
S7_MIN_STREAK = 2
S8_MONTHS = 3

# --- etiquetas (docs/validacion_salud.md §1) -------------------------------------------------------
D1_DAYS = 90                       # factura recibida vencida ≥ 90 días y sin pagar a fin de mes
D1_MIN_SHARE_OUTFLOW = 0.25        # … de importe ≥ 25 % de las salidas mensuales (doc: 1 %; ajustado, ver abajo)
D1_MAX_AGE_DAYS = 180              # … y vencida hace < 6 meses (evita facturas fantasma nunca cerradas en el ERP)
# Ajuste de D1 (validacion_salud.md §1: "si la tasa sale fuera de 5–20 %, ajustar umbrales antes de evaluar"):
# con 1 % y sin límite de antigüedad la tasa de evento es 36,6 % (D1 solo 27 %, y pegajoso: el 87 % de los meses en D1
# repiten el anterior porque hay 92 k facturas recibidas que el ERP nunca marca pagadas). Con 25 % y ventana de 6 meses:
# D1 7,5 %, evento total 19,1 %, 802 empresas con algún evento.
D3_MIN_DAYS = 5
D4_MULT, D4_MIN_SHARE = 3.0, 0.02
CURE_MIN_EVENT_MONTHS, CURE_CLEAN_MONTHS = 2, 3
EVENT_RATE_RANGE = (0.05, 0.20)
EVENTS_VERSION = "events_v1"

# --- evaluación ------------------------------------------------------------------------------------
HORIZONS = (1, 3, 6)
FOLDS, SEED = 5, 42
OOT_TEST_MONTHS = 6                # últimos 6 meses de observación
PSI_LAG = 12
ACCEPTANCE = {                      # (mínimo, bueno)
    "gini_h6": (0.40, 0.55), "ks_h6": (0.30, 0.45), "lead_time_median": (1.0, 2.0), "gini_cure": (0.20, 0.35),
    "oos_drop": (0.08, 0.05), "oot_drop": (0.08, 0.05), "psi": (0.25, 0.10), "autocorr": ((0.75, 0.97), (0.80, 0.95)),
}
