"""RAW (CSV) → BRONZE: tipado explícito, cero transformación de valores.

Bronze es una copia fiel de los CSV con tipos correctos y en parquet. Si una fila no se puede
parsear queda registrada en meta.rejects (DuckDB store_rejects) en lugar de perderse en silencio.
"""
from __future__ import annotations

from config import RAW_DIR
from stages.common import Stage

# columnas y tipos de cada CSV (el orden es el del fichero)
SCHEMAS = {
    "groups": {"group_id": "VARCHAR", "erp": "VARCHAR", "n_companies_in_sample": "INTEGER"},
    "companies": {"company_id": "VARCHAR", "group_id": "VARCHAR", "country": "VARCHAR", "currency": "VARCHAR",
                  "erp": "VARCHAR", "created_at": "TIMESTAMP"},
    "banking_products": {"product_id": "VARCHAR", "company_id": "VARCHAR", "label": "VARCHAR", "type": "VARCHAR",
                         "bank_name": "VARCHAR", "service": "VARCHAR", "currency": "VARCHAR", "created_at": "TIMESTAMP"},
    "debt_products": {"product_id": "VARCHAR", "company_id": "VARCHAR", "label": "VARCHAR", "type": "VARCHAR",
                      "bank_name": "VARCHAR", "service": "VARCHAR", "currency": "VARCHAR", "created_at": "TIMESTAMP",
                      "granted": "DOUBLE", "outstanding": "DOUBLE", "liquidity": "DOUBLE"},
    "debt_schedule_config": {"product_id": "VARCHAR", "company_id": "VARCHAR", "settlement_product_id": "VARCHAR",
                             "currency": "VARCHAR", "amortization_type": "VARCHAR", "interest_calc_method": "VARCHAR",
                             "amortising_frequency": "VARCHAR", "granted_balance": "DOUBLE", "outstanding_balance": "DOUBLE",
                             "total_periods": "INTEGER", "next_payment_date": "TIMESTAMP", "last_payment_date": "TIMESTAMP",
                             "annual_interest_rate_or_spread": "DOUBLE", "interest_type": "VARCHAR"},
    "balances": {"product_id": "VARCHAR", "company_id": "VARCHAR", "date": "TIMESTAMP", "balance": "DOUBLE",
                 "available": "DOUBLE", "granted": "DOUBLE", "liquidity": "DOUBLE", "countable": "DOUBLE"},
    "transactions": {"transaction_id": "VARCHAR", "company_id": "VARCHAR", "product_id": "VARCHAR", "date": "TIMESTAMP",
                     "value_date": "TIMESTAMP", "amount": "DOUBLE", "exchange_rate": "DOUBLE", "status": "VARCHAR",
                     "accounting_status": "VARCHAR", "category": "VARCHAR", "description": "VARCHAR",
                     "counterparty_id": "VARCHAR"},
    "invoices": {"operation_id": "VARCHAR", "company_id": "VARCHAR", "document_type": "VARCHAR", "issuance_date": "TIMESTAMP",
                 "due_date": "TIMESTAMP", "payment_date": "TIMESTAMP", "amount": "DOUBLE", "pending_amount": "DOUBLE",
                 "currency": "VARCHAR", "accounting_currency": "VARCHAR", "exchange_rate": "DOUBLE", "status": "VARCHAR",
                 "concept": "VARCHAR", "counterparty_id": "VARCHAR"},
}


def run(con) -> None:
    st = Stage(con, "ingest", "bronze")
    con.sql("CREATE OR REPLACE TABLE meta.rejects (table_name VARCHAR, line BIGINT, column_name VARCHAR, error VARCHAR, csv_line VARCHAR)")
    for name, cols in SCHEMAS.items():
        path = RAW_DIR / f"{name}.csv"
        if not path.exists():
            raise FileNotFoundError(f"falta {path}: descomprime output_hackspain_data.zip en la raíz del repo")
        coltypes = ", ".join(f"'{c}': '{t}'" for c, t in cols.items())
        # store_rejects: las filas que no parsean van a reject_errors en vez de abortar o desaparecer
        # types= (no columns=) mantiene la autodetección del dialecto: necesaria por las descripciones multilínea con \r\n
        st.create(name, f"""SELECT *, row_number() OVER () AS _row FROM read_csv('{path}', header=true, types={{{coltypes}}},
            nullstr='', store_rejects=true, rejects_table='reject_errors', rejects_scan='reject_scans')""")
        try:
            con.sql(f"""INSERT INTO meta.rejects SELECT '{name}', line, column_name, error_message, csv_line FROM reject_errors""")
            con.sql("DROP TABLE reject_errors")
            con.sql("DROP TABLE reject_scans")
        except Exception:
            pass
        n_rej = st.scalar(f"SELECT count(*) FROM meta.rejects WHERE table_name='{name}'")
        if n_rej:
            st.log(f"  ⚠ {n_rej} filas rechazadas por el parser (ver meta.rejects)")
    # el fichero de balances trae 'available' vacío al 100 %: se conserva en bronze, se elimina en silver
