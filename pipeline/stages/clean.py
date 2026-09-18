"""BRONZE → SILVER: limpieza, normalización, columnas derivadas y flags de calidad.

Principios:
- Nunca se borra una fila: cada tabla lleva `flags VARCHAR[]` con todo lo detectado e `is_valid` que
  resume si la fila entra en gold (config.INVALIDATING_FLAGS). Lo demás son avisos.
- Los valores corruptos se ponen a NULL en la columna limpia y se conserva el crudo en *_raw.
- Toda decisión (umbral, mapa, ventana) está en config.py y justificada en eda/report.html.
"""
from __future__ import annotations

import config as C
from stages.common import Stage


def sql_map(col: str, mapping: dict[str, str], lower: bool = False) -> str:
    """CASE que aplica un diccionario de normalización sobre `col` (dejando el valor original si no está)."""
    key = f"lower(trim({col}))" if lower else f"trim({col})"
    whens = " ".join(f"WHEN {key} = '{k}' THEN '{v}'" for k, v in mapping.items())
    return f"CASE {whens} ELSE trim({col}) END"


def flags_expr(conds: dict[str, str]) -> str:
    """Lista de flags a partir de {flag: condición SQL}."""
    items = ", ".join(f"CASE WHEN {cond} THEN '{flag}' END" for flag, cond in conds.items())
    return f"list_filter([{items}], x -> x IS NOT NULL)"


def valid_expr(table: str) -> str:
    inv = C.INVALIDATING_FLAGS[table]
    if not inv:
        return "true"
    lst = ", ".join(f"'{f}'" for f in sorted(inv))
    return f"NOT list_has_any(flags, [{lst}])"


def run(con) -> None:
    st = Stage(con, "clean", "silver")
    sql_lists = ", ".join(f"'{t}'" for t in C.TEST_DESCRIPTIONS)
    country_case = "CASE " + " ".join(f"WHEN upper(trim(country)) = '{k}' THEN '{v}'" for k, v in C.COUNTRY_MAP.items()) + " END"
    erp_case = lambda col: "CASE " + " ".join(f"WHEN lower(trim({col})) = '{k}' THEN '{v}'" for k, v in C.ERP_MAP.items()) + f" WHEN {col} IS NOT NULL THEN 'other:' || lower(trim({col})) END"

    # ------------------------------------------------------------------ groups
    st.create("groups", f"""
        SELECT g.group_id, g.erp AS erp_raw, {erp_case('g.erp')} AS erp,
               g.n_companies_in_sample, c.n AS n_companies,
               {flags_expr({'size_mismatch': 'g.n_companies_in_sample <> c.n', 'erp_missing': 'g.erp IS NULL'})} AS flags
        FROM bronze.groups g LEFT JOIN (SELECT group_id, count(*) n FROM bronze.companies GROUP BY 1) c USING (group_id)""")

    # ------------------------------------------------------------------ companies
    st.create("companies", f"""
        SELECT c.company_id, c.group_id, c.country AS country_raw, {country_case} AS country,
               c.currency, c.erp AS erp_raw, {erp_case('c.erp')} AS erp, g.erp AS group_erp,
               coalesce({erp_case('c.erp')}, g.erp) AS erp_effective,
               CAST(c.created_at AS DATE) AS created_at, g.n_companies AS group_size,
               {flags_expr({
                   'country_missing': 'c.country IS NULL',
                   'country_unmapped': f'c.country IS NOT NULL AND ({country_case}) IS NULL',
                   'erp_missing': 'c.erp IS NULL AND g.erp IS NULL',
                   'erp_conflict_with_group': f"c.erp IS NOT NULL AND g.erp IS NOT NULL AND {erp_case('c.erp')} <> g.erp",
                   'created_after_snapshot': f"c.created_at > TIMESTAMP '{C.SNAPSHOT}'"})} AS flags
        FROM bronze.companies c LEFT JOIN silver.groups g USING (group_id)""")
    assert st.scalar("SELECT count(*) FROM silver.companies WHERE country_raw IS NOT NULL AND country IS NULL") == 0, "país sin mapear: añadir a COUNTRY_MAP"

    # ------------------------------------------------------------------ products (bancarios + deuda)
    st.create("products", f"""
        WITH u AS (
            SELECT product_id, company_id, 'banking' AS family, type, label, bank_name, service, currency, created_at,
                   NULL::DOUBLE AS granted, NULL::DOUBLE AS outstanding, NULL::DOUBLE AS liquidity FROM bronze.banking_products
            UNION ALL
            SELECT product_id, company_id, 'debt', type, label, bank_name, service, currency, created_at,
                   granted, outstanding, liquidity FROM bronze.debt_products)
        SELECT u.product_id, u.company_id, c.group_id, u.family, u.type, u.label, u.bank_name,
               u.bank_name LIKE 'Other%' OR u.service = 'custom' AS is_custom, u.service, u.currency,
               c.currency AS company_currency, CAST(u.created_at AS DATE) AS created_at,
               u.granted AS granted_raw, u.outstanding AS outstanding_raw, u.liquidity,
               -- convención: la deuda va en negativo en debt_products; se expone en valor absoluto
               abs(u.granted) AS granted_abs, abs(u.outstanding) AS outstanding_abs,
               CASE WHEN abs(u.granted) > 0 THEN abs(u.outstanding) / abs(u.granted) END AS utilization,
               {flags_expr({
                   'currency_mismatch_company': 'u.currency <> c.currency',
                   'created_after_snapshot': f"u.created_at > TIMESTAMP '{C.SNAPSHOT}'",
                   'debt_granted_missing': "u.family = 'debt' AND u.granted IS NULL",
                   'debt_outstanding_positive': "u.family = 'debt' AND u.outstanding > 0",
                   'debt_outstanding_gt_granted': "u.family = 'debt' AND u.granted <> 0 AND abs(u.outstanding) > abs(u.granted) * 1.0001",
                   'debt_amount_outlier': f"u.family = 'debt' AND (abs(u.granted) >= {C.DEBT_OUTLIER_ABS} OR abs(u.outstanding) >= {C.DEBT_OUTLIER_ABS})",
                   'company_unknown': 'c.company_id IS NULL'})} AS flags,
               true AS is_valid
        FROM u LEFT JOIN bronze.companies c USING (company_id)""")
    assert st.scalar("SELECT count(*) - count(DISTINCT product_id) FROM silver.products") == 0, "product_id duplicado entre bancarios y deuda"

    # ------------------------------------------------------------------ debt schedule
    st.create("debt_schedule", f"""
        SELECT d.product_id, d.company_id, p.type AS product_type, d.settlement_product_id, d.currency,
               d.amortization_type, d.interest_calc_method, d.amortising_frequency, d.interest_type,
               d.granted_balance, d.outstanding_balance,
               CASE WHEN d.granted_balance > 0 THEN d.outstanding_balance / d.granted_balance END AS remaining_share,
               d.total_periods, CAST(d.next_payment_date AS DATE) AS next_payment_date,
               CAST(d.last_payment_date AS DATE) AS last_payment_date, d.annual_interest_rate_or_spread AS annual_rate,
               p.outstanding_abs AS product_outstanding_abs,
               {flags_expr({
                   'next_payment_in_past': f"d.next_payment_date < TIMESTAMP '{C.SNAPSHOT}'",
                   'settlement_product_unknown': 's.product_id IS NULL',
                   'settlement_product_not_banking': "s.product_id IS NOT NULL AND s.family <> 'banking'",
                   'granted_zero': 'd.granted_balance = 0',
                   'outstanding_mismatch_vs_product': 'abs(p.outstanding_abs - d.outstanding_balance) > 1',
                   'product_unknown': 'p.product_id IS NULL'})} AS flags,
               true AS is_valid
        FROM bronze.debt_schedule_config d
        LEFT JOIN silver.products p USING (product_id)
        LEFT JOIN silver.products s ON s.product_id = d.settlement_product_id""")

    # ------------------------------------------------------------------ balances
    st.create("balances", f"""
        SELECT *, {valid_expr('balances')} AS is_valid FROM (
        SELECT b.product_id, b.company_id, p.family AS product_family, p.type AS product_type, p.currency,
               CAST(b.date AS DATE) AS date, b.balance, b.granted, b.liquidity, b.countable,
               {flags_expr({
                   'balance_outlier': f'abs(b.balance) >= {C.BALANCE_OUTLIER_ABS}',
                   'product_unknown': 'p.product_id IS NULL',
                   'date_before_snapshot': f"CAST(b.date AS DATE) < DATE '{C.SNAPSHOT}'",
                   'company_mismatch_product': 'p.product_id IS NOT NULL AND p.company_id <> b.company_id'})} AS flags
        FROM bronze.balances b LEFT JOIN silver.products p USING (product_id))""")
    # (balances: 'available' se descarta, 100 % nulo)

    # ------------------------------------------------------------------ transactions
    st.log("transactions: estadísticas por empresa y duplicados")
    con.sql(f"""CREATE OR REPLACE TEMP TABLE tx_stats AS
        SELECT company_id, quantile_cont(abs(amount), 0.99) AS p99 FROM bronze.transactions GROUP BY 1""")
    con.sql("""CREATE OR REPLACE TEMP TABLE tx_dups AS
        SELECT company_id, product_id, date, amount, description, count(*) AS dup_group_size
        FROM bronze.transactions GROUP BY ALL HAVING count(*) > 1""")
    cat_case = "CASE WHEN t.category IS NULL OR trim(t.category) = '' THEN 'uncategorized' " + \
        " ".join(f"WHEN trim(t.category) = '{k}' THEN '{v}'" for k, v in C.CATEGORY_MAP.items()) + " ELSE trim(t.category) END"
    # categoría por reglas sobre la descripción (solo si el banco no la da); '' si ninguna regla aplica
    rule_case = "CASE " + " ".join(f"WHEN regexp_matches(t.description, '{rx}') THEN '{cat}'" for cat, rx in C.CATEGORY_RULES) + " END"
    tx_flags = {
        'amount_zero': 't.amount = 0',
        'amount_outlier_global': f'abs(t.amount) >= {C.AMOUNT_OUTLIER_ABS}',
        'amount_outlier_company': f'abs(t.amount) > {C.COMPANY_OUTLIER_MULT} * s.p99 AND abs(t.amount) > {C.COMPANY_OUTLIER_MIN}',
        'test_data': f'lower(trim(t.description)) IN ({sql_lists})',
        'status_imputed': 't.status IS NULL',
        'category_missing': "t.category IS NULL OR trim(t.category) IN ('', '-')",
        'value_date_invalid': "t.value_date IS NULL OR abs(date_diff('day', CAST(t.date AS DATE), CAST(t.value_date AS DATE))) > 365",
        'date_out_of_period': f"CAST(t.date AS DATE) NOT BETWEEN DATE '{C.PERIOD_START}' AND DATE '{C.SNAPSHOT}'",
        'fx_rate_zero': 't.exchange_rate = 0',
        'fx_rate_missing': "p.currency IS NOT NULL AND p.currency <> c.currency AND (t.exchange_rate IS NULL OR t.exchange_rate <= 0 OR t.exchange_rate = 1)",
        'product_unknown': 'p.product_id IS NULL',
        'product_company_mismatch': 'p.product_id IS NOT NULL AND p.company_id <> t.company_id',
        'dup_suspect': 'd.dup_group_size > 1',
        'counterparty_missing': f"t.counterparty_id IS NULL AND regexp_extract(t.description, '{C.COUNTERPARTY_TOKEN_RE}') = ''",
        'description_missing': "t.description IS NULL OR trim(t.description) = ''",
    }
    st.create("transactions", f"""
        SELECT *, {valid_expr('transactions')} AS is_valid FROM (
        SELECT t.transaction_id, t.company_id, c.group_id, t.product_id, p.family AS product_family, p.type AS product_type,
               CAST(t.date AS DATE) AS date, t.date AS booked_at,
               CASE WHEN abs(date_diff('day', CAST(t.date AS DATE), CAST(t.value_date AS DATE))) <= 365 THEN CAST(t.value_date AS DATE) END AS value_date,
               CASE WHEN abs(date_diff('day', CAST(t.date AS DATE), CAST(t.value_date AS DATE))) <= 365
                    THEN date_diff('day', CAST(t.date AS DATE), CAST(t.value_date AS DATE)) END AS value_lag_days,
               strftime(t.date, '%Y-%m') AS year_month, dayofweek(t.date) AS dow, dayofweek(t.date) IN (0, 6) AS is_weekend,
               CAST(t.date AS DATE) IN (SELECT unnest([{", ".join("DATE '" + h + "'" for h in C.HOLIDAYS_ES)}])) AS is_holiday_es,
               t.amount, abs(t.amount) AS abs_amount,
               CASE WHEN t.amount > 0 THEN 'in' WHEN t.amount < 0 THEN 'out' ELSE 'zero' END AS direction,
               p.currency AS product_currency, c.currency AS company_currency,
               t.exchange_rate AS exchange_rate_raw, CASE WHEN t.exchange_rate > 0 THEN t.exchange_rate END AS exchange_rate,
               -- exchange_rate = unidades de moneda del producto por 1 unidad de moneda de la empresa (verificado en el EDA)
               CASE WHEN p.currency IS NULL OR p.currency = c.currency THEN t.amount
                    WHEN t.exchange_rate > 0 AND t.exchange_rate <> 1 THEN t.amount / t.exchange_rate END AS amount_company_ccy,
               t.status AS status_raw, coalesce(t.status, 'booked') AS status, t.accounting_status,
               t.category AS category_raw, {cat_case} AS category_bank,
               CASE WHEN ({cat_case}) <> 'uncategorized' THEN ({cat_case}) ELSE coalesce({rule_case}, 'uncategorized') END AS category,
               CASE WHEN ({cat_case}) <> 'uncategorized' THEN 'bank' WHEN ({rule_case}) IS NOT NULL THEN 'rule' ELSE 'none' END AS category_source,
               t.description, nullif(regexp_extract(t.description, '{C.COUNTERPARTY_TOKEN_RE}'), '') AS counterparty_token,
               t.counterparty_id, coalesce(d.dup_group_size, 1) AS dup_group_size,
               {flags_expr(tx_flags)} AS flags
        FROM bronze.transactions t
        LEFT JOIN silver.products p USING (product_id)
        LEFT JOIN silver.companies c ON c.company_id = t.company_id
        LEFT JOIN tx_stats s ON s.company_id = t.company_id
        LEFT JOIN tx_dups d ON d.company_id = t.company_id AND d.product_id = t.product_id AND d.date = t.date
                            AND d.amount = t.amount AND d.description IS NOT DISTINCT FROM t.description)""")
    assert st.scalar("SELECT count(*) FROM silver.transactions") == st.scalar("SELECT count(*) FROM bronze.transactions"), "se han perdido filas en transactions"
    assert st.scalar("SELECT count(*) - count(DISTINCT transaction_id) FROM silver.transactions") == 0, "transaction_id duplicado"

    # ------------------------------------------------------------------ invoices
    st.log("invoices")
    status_case = sql_map("i.status", C.INVOICE_STATUS_MAP)
    dmin, dmax = f"TIMESTAMP '{C.DATE_MIN}'", f"TIMESTAMP '{C.DATE_MAX}'"
    due_ok = f"i.due_date BETWEEN {dmin} AND {dmax}"
    pay_ok = f"i.payment_date BETWEEN {dmin} AND {dmax}"
    inv_flags = {
        'amount_zero': 'i.amount = 0',
        'amount_outlier_global': f'abs(i.amount) >= {C.AMOUNT_OUTLIER_ABS}',
        'due_date_invalid': f'i.due_date IS NOT NULL AND NOT ({due_ok})',
        'payment_date_invalid': f'i.payment_date IS NOT NULL AND NOT ({pay_ok})',
        'due_before_issuance': f'{due_ok} AND i.due_date < i.issuance_date',
        'payment_before_issuance': f"{pay_ok} AND i.payment_date < i.issuance_date",
        'payment_after_snapshot': f"i.status = 'paid' AND {pay_ok} AND i.payment_date > TIMESTAMP '{C.SNAPSHOT}'",
        'paid_with_pending': "i.status = 'paid' AND i.pending_amount <> 0",
        'cancelled_with_pending': "i.status = 'cancel' AND i.pending_amount <> 0",
        'pending_gt_amount': 'abs(i.pending_amount) > abs(i.amount) * 1.0001',
        'overdue_not_yet_due': f"i.status = 'overdue' AND {due_ok} AND i.due_date > TIMESTAMP '{C.SNAPSHOT}'",
        'fx_rate_zero': 'i.exchange_rate = 0',
        'fx_rate_missing': 'i.currency <> i.accounting_currency AND (i.exchange_rate IS NULL OR i.exchange_rate <= 0 OR i.exchange_rate = 1)',
        'counterparty_missing': f"i.counterparty_id IS NULL AND regexp_extract(coalesce(i.concept, ''), '{C.COUNTERPARTY_TOKEN_RE}') = ''",
        'concept_missing': "i.concept IS NULL OR trim(i.concept) = ''",
        'company_unknown': 'c.company_id IS NULL',
        'issuance_out_of_period': f"CAST(i.issuance_date AS DATE) NOT BETWEEN DATE '{C.PERIOD_START}' AND DATE '{C.SNAPSHOT}'",
    }
    st.create("invoices", f"""
        SELECT *, {valid_expr('invoices')} AS is_valid FROM (
        SELECT i.operation_id, i.company_id, c.group_id, i.document_type,
               CAST(i.issuance_date AS DATE) AS issuance_date, strftime(i.issuance_date, '%Y-%m') AS year_month,
               CASE WHEN {due_ok} THEN CAST(i.due_date AS DATE) END AS due_date,
               CASE WHEN {pay_ok} THEN CAST(i.payment_date AS DATE) END AS payment_date,
               i.amount, abs(i.amount) AS abs_amount,
               CASE WHEN i.amount > 0 THEN 'receivable' WHEN i.amount < 0 THEN 'payable' ELSE 'zero' END AS direction,
               i.pending_amount AS pending_amount_raw,
               CASE WHEN i.status IN ('paid', 'cancel') THEN 0 ELSE i.pending_amount END AS pending_amount,
               i.currency, i.accounting_currency, i.exchange_rate AS exchange_rate_raw,
               CASE WHEN i.exchange_rate > 0 THEN i.exchange_rate END AS exchange_rate,
               -- exchange_rate = unidades de `currency` por 1 unidad de `accounting_currency` (misma convención que tx)
               CASE WHEN i.currency = i.accounting_currency THEN i.amount
                    WHEN i.exchange_rate > 0 AND i.exchange_rate <> 1 THEN i.amount / i.exchange_rate END AS amount_accounting_ccy,
               i.status AS status_raw, {status_case} AS status,
               i.concept, nullif(regexp_extract(coalesce(i.concept, ''), '{C.COUNTERPARTY_TOKEN_RE}'), '') AS counterparty_token,
               i.counterparty_id,
               CASE WHEN {due_ok} THEN date_diff('day', CAST(i.issuance_date AS DATE), CAST(i.due_date AS DATE)) END AS terms_days,
               CASE WHEN i.status = 'paid' AND {pay_ok} THEN date_diff('day', CAST(i.issuance_date AS DATE), CAST(i.payment_date AS DATE)) END AS days_to_payment,
               CASE WHEN i.status = 'paid' AND {pay_ok} AND {due_ok} THEN date_diff('day', CAST(i.due_date AS DATE), CAST(i.payment_date AS DATE)) END AS days_late,
               CASE WHEN i.status = 'paid' AND {pay_ok} AND {due_ok} THEN i.payment_date <= i.due_date END AS paid_on_time,
               CASE WHEN i.status = 'overdue' AND {due_ok} AND i.due_date <= TIMESTAMP '{C.SNAPSHOT}'
                    THEN date_diff('day', CAST(i.due_date AS DATE), DATE '{C.SNAPSHOT}') END AS overdue_days,
               CASE WHEN i.status <> 'overdue' OR NOT ({due_ok}) OR i.due_date > TIMESTAMP '{C.SNAPSHOT}' THEN NULL
                    WHEN date_diff('day', CAST(i.due_date AS DATE), DATE '{C.SNAPSHOT}') <= 30 THEN '01-30'
                    WHEN date_diff('day', CAST(i.due_date AS DATE), DATE '{C.SNAPSHOT}') <= 60 THEN '31-60'
                    WHEN date_diff('day', CAST(i.due_date AS DATE), DATE '{C.SNAPSHOT}') <= 90 THEN '61-90'
                    WHEN date_diff('day', CAST(i.due_date AS DATE), DATE '{C.SNAPSHOT}') <= 180 THEN '91-180'
                    WHEN date_diff('day', CAST(i.due_date AS DATE), DATE '{C.SNAPSHOT}') <= 365 THEN '181-365'
                    ELSE '>365' END AS aging_bucket,
               {flags_expr(inv_flags)} AS flags
        FROM bronze.invoices i LEFT JOIN silver.companies c USING (company_id))""")
    assert st.scalar("SELECT count(*) FROM silver.invoices") == st.scalar("SELECT count(*) FROM bronze.invoices"), "se han perdido filas en invoices"

    for t in ("transactions", "invoices", "balances", "products", "debt_schedule", "companies", "groups"):
        fc = st.flag_counts(t)
        st.log(f"flags {t}: " + ", ".join(f"{k}={v:,}" for k, v in fc.items()) if fc else f"flags {t}: ninguno")
