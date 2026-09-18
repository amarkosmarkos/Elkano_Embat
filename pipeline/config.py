"""Configuración del pipeline RAW → BRONZE → SILVER → GOLD.

Todo lo que es una *decisión* de limpieza vive aquí, con su justificación (ver eda/report.html).
"""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = Path(os.environ.get("ELKANO_RAW", ROOT / "output"))                       # los 8 CSV del zip (paso 0: raw)
OUT_DIR = Path(os.environ.get("ELKANO_OUT", RAW_DIR))                               # raíz de salidas: output/
DATA_DIR = Path(os.environ.get("ELKANO_DATA", OUT_DIR / "01_preprocessed"))         # paso 1: bronze/silver/gold
SCORE_DIR = OUT_DIR / "02_score"                                                    # paso 2
VALIDATION_DIR = OUT_DIR / "03_validation"                                          # paso 3
STATE_FILE = OUT_DIR / ".pipeline_state.json"                                       # checkpoints entre pasos
DB_PATH = DATA_DIR / "elkano.duckdb"

# --- ventana temporal del dataset -------------------------------------------------------------
PERIOD_START = "2024-09-01"
SNAPSHOT = "2026-09-01"            # fecha de corte: balances y "hoy" para el aging
DATE_MIN = "2020-01-01"            # fuera de [DATE_MIN, DATE_MAX] una fecha se considera corrupta (año 7025…)
DATE_MAX = "2030-12-31"

# --- umbrales de outliers ---------------------------------------------------------------------
AMOUNT_OUTLIER_ABS = 1e8           # |importe| ≥ 100 M en tx/facturas: 500 tx + 159 facturas claramente anómalas
BALANCE_OUTLIER_ABS = 1e9          # |saldo| ≥ 1.000 M: 4 saldos (uno de 99.999 M)
DEBT_OUTLIER_ABS = 1e9             # |granted|/|outstanding| ≥ 1.000 M en deuda (los ±300 M son sospechosos pero se conservan)
COMPANY_OUTLIER_MULT = 50          # además: |importe| > 50 × p99 de la propia empresa …
COMPANY_OUTLIER_MIN = 1e6          # … y > 1 M (evita marcar empresas pequeñas)

# --- texto -----------------------------------------------------------------------------------
TEST_DESCRIPTIONS = ("test", "tests", "prueba", "pruebas", "testing")
COUNTERPARTY_TOKEN_RE = r"COUNTERPARTY_[0-9]+"   # token global de *nombre* en description/concept (≠ counterparty_id)

# --- normalizaciones categóricas --------------------------------------------------------------
COUNTRY_MAP = {  # → ISO-3166 alpha-2
    "ES": "ES", "ESPAÑA": "ES", "ESPANA": "ES", "ESPANYA": "ES", "SPAIN": "ES",
    "PT": "PT", "PORTUGAL": "PT",
    "DE": "DE", "ALEMANIA": "DE", "GERMANY": "DE",
    "FR": "FR", "FRANCIA": "FR", "FRANCE": "FR",
    "IT": "IT", "ITALIA": "IT", "ITALY": "IT",
    "NL": "NL", "GB": "GB", "UK": "GB", "US": "US", "USA": "US", "SE": "SE", "AT": "AT", "BE": "BE", "PL": "PL",
    "MY": "MY", "MALAYSIA": "MY",
}

# Un único vocabulario de ERP para companies.erp (claves) y groups.erp (nombres comerciales)
ERP_MAP = {
    # companies.erp
    "businesscentral": "business_central", "netsuite": "netsuite", "businessone": "sap_business_one",
    "sage200": "sage_200", "dynamicsax": "dynamics_ax", "a3": "a3", "m3rosetta": "infor_m3", "libra": "libra",
    "navision": "navision", "fo": "dynamics_fo", "distritok": "distrito_k", "ekon": "ekon", "sagex3": "sage_x3",
    "r3": "sap_r3", "sageintacct": "sage_intacct", "holded": "holded", "datev": "datev", "sage50": "sage_50",
    "etendo": "etendo", "sapbyd": "sap_bydesign",
    # groups.erp
    "microsoft business central": "business_central", "sap business one": "sap_business_one", "sage 200": "sage_200",
    "sage x3": "sage_x3", "sage 50": "sage_50", "a3 erp": "a3", "microsoft navision": "navision",
    "microsoft dynamics - ax 2012": "dynamics_ax", "microsoft dynamics - ax 2009": "dynamics_ax",
    "microsoft dynamics - f&o": "dynamics_fo", "desarrollo propio": "custom", "sap r3 / s4": "sap_r3",
    "infor m3": "infor_m3", "movex": "infor_m3", "oracle cloud": "oracle_cloud", "odoo": "odoo", "distrito k": "distrito_k",
}

CATEGORY_MAP = {"-": "uncategorized", "cash_settlements": "cash_settlement"}   # null → 'uncategorized' también

# Recuperación de categoría por reglas sobre la descripción, SOLO para movimientos sin categoría del banco
# (docs/validacion_salud.md §5.1: D2/D4 y A3/D3 dependen de salary/social_security/tax/interest/fee).
# Orden = prioridad. Regex DuckDB (RE2), case-insensitive.
CATEGORY_RULES = [
    ("social_security", r"(?i)tgss|seguridad social|social security|cotizaci|seg\.? ?soc"),
    ("salary",          r"(?i)n[oó]minas?\b|payroll|salari|sueldo"),
    ("tax",             r"(?i)\baeat\b|hacienda|impuest|\biva\b|\birpf\b|tribut|modelo ?[0-9]{3}|agencia tributaria|autoliquid|\bnrc\b|gencat [0-9]{3}|ayuntamiento|\bibi\b|gbrno\.|gobierno de navarra|diputaci"),
    ("interest_charge", r"(?i)liquidacion de intereses|intereses de|liquidacion del contrato|liquidacion cta\.?cto"),
    ("fee",             r"(?i)comisi[oó]n|processing fee|precio servic|serv\. em\."),
    ("collection_refund", r"(?i)impagado|devolucion (de )?recibo|refund for charge|efectos devueltos"),
]
INVOICE_STATUS_MAP = {"cancel": "cancelled", "paymentOrder": "payment_order"}

# Festivos nacionales (España) dentro del periodo; usados en la dimensión calendario
HOLIDAYS_ES = [
    "2024-10-12", "2024-11-01", "2024-12-06", "2024-12-25",
    "2025-01-01", "2025-01-06", "2025-04-18", "2025-05-01", "2025-08-15", "2025-11-01", "2025-12-06", "2025-12-08", "2025-12-25",
    "2026-01-01", "2026-01-06", "2026-04-03", "2026-05-01", "2026-08-15",
]

# --- qué flags dejan una fila FUERA de gold (is_valid = false). El resto son avisos. ------------
INVALIDATING_FLAGS = {
    "transactions": {"amount_zero", "amount_outlier_global", "amount_outlier_company", "test_data"},
    "invoices": {"amount_zero", "amount_outlier_global"},
    "balances": {"balance_outlier", "product_unknown"},
    "products": set(),
    "debt_schedule": set(),
}

# --- matching factura ↔ movimiento ------------------------------------------------------------
MATCH_WINDOW_BEFORE_DAYS = 30      # movimiento hasta 30 días antes de la emisión (anticipos)
MATCH_WINDOW_AFTER_DAYS = 365      # … y hasta 365 días después

# --- score y validación: analytics/config.py (docs/salud.md, docs/validacion_salud.md) ------------
