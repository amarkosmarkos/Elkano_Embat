"""SILVER → GOLD: dataset limpio listo para análisis y para la app.

- fact_transactions / fact_invoices: solo filas is_valid (las demás quedan en silver con su flag).
- dim_*: dimensiones enriquecidas (empresa, producto, contraparte, calendario).
- company_month / company_day: panel de tesorería por empresa (flujos + saldo reconstruido).
- product_day_balance: saldo diario por cuenta reconstruido hacia atrás desde balances.csv.
- invoice_tx_match: candidatos de conciliación factura ↔ movimiento.
"""
from __future__ import annotations

import config as C
from stages.common import Stage


def run(con) -> None:
    st = Stage(con, "marts", "gold")
    hol = ", ".join(f"DATE '{h}'" for h in C.HOLIDAYS_ES)

    # ------------------------------------------------------------------ hechos limpios
    st.create("fact_transactions", """
        SELECT transaction_id, company_id, group_id, product_id, product_family, product_type, date, booked_at, value_date,
               value_lag_days, year_month, dow, is_weekend, is_holiday_es, amount, abs_amount, direction,
               product_currency, company_currency, exchange_rate, amount_company_ccy, status, accounting_status, category, category_bank, category_source,
               description, counterparty_id, counterparty_token, dup_group_size, flags
        FROM silver.transactions WHERE is_valid""")
    st.create("fact_invoices", """
        SELECT operation_id, company_id, group_id, document_type, issuance_date, year_month, due_date, payment_date,
               amount, abs_amount, direction, pending_amount, currency, accounting_currency, exchange_rate, amount_accounting_ccy,
               status, concept, counterparty_id, counterparty_token, terms_days, days_to_payment, days_late, paid_on_time,
               overdue_days, aging_bucket, flags
        FROM silver.invoices WHERE is_valid""")

    # ------------------------------------------------------------------ calendario
    st.create("dim_calendar", f"""
        SELECT d::DATE AS date, strftime(d, '%Y-%m') AS year_month, year(d) AS year, month(d) AS month, day(d) AS day,
               dayofweek(d) AS dow, dayofweek(d) IN (0, 6) AS is_weekend, d::DATE IN ({hol}) AS is_holiday_es,
               NOT (dayofweek(d) IN (0, 6) OR d::DATE IN ({hol})) AS is_business_day,
               d::DATE = last_day(d::DATE) AS is_month_end, date_diff('day', d::DATE, last_day(d::DATE)) AS days_to_month_end,
               strftime(d, '%Y-%m') = strftime(DATE '{C.SNAPSHOT}', '%Y-%m') AS is_partial_month
        FROM generate_series(DATE '{C.PERIOD_START}', DATE '{C.SNAPSHOT}', INTERVAL 1 DAY) t(d)""")

    # ------------------------------------------------------------------ dimensiones
    st.create("dim_product", f"""
        SELECT p.product_id, p.company_id, p.group_id, p.family, p.type, p.label, p.bank_name, p.is_custom, p.service, p.currency,
               p.company_currency, p.created_at, p.granted_abs, p.outstanding_abs, p.utilization, p.liquidity,
               b.balance AS balance_snapshot, b.date AS balance_date, b.is_valid AS balance_is_valid,
               coalesce(t.n_tx, 0) AS n_tx, t.first_tx, t.last_tx, coalesce(t.n_tx, 0) > 0 AS is_active,
               t.fx_rate AS fx_rate_median, p.flags
        FROM silver.products p
        LEFT JOIN silver.balances b USING (product_id)
        LEFT JOIN (SELECT product_id, count(*) n_tx, min(date) first_tx, max(date) last_tx,
                          median(exchange_rate) FILTER (WHERE exchange_rate IS NOT NULL AND exchange_rate <> 1) AS fx_rate
                   FROM gold.fact_transactions GROUP BY 1) t USING (product_id)""")

    st.create("dim_company", f"""
        SELECT c.company_id, c.group_id, c.group_size, c.country, c.currency, c.erp, c.erp_effective, c.created_at,
               coalesce(pb.n, 0) AS n_banking_products, coalesce(pd.n, 0) AS n_debt_products,
               coalesce(t.n_tx, 0) AS n_tx, t.first_tx, t.last_tx, coalesce(t.active_months, 0) AS active_months,
               coalesce(t.n_tx, 0) > 0 AS has_transactions,
               coalesce(i.n_inv, 0) AS n_invoices, coalesce(i.n_inv, 0) > 0 AS has_invoices, i.first_invoice, i.last_invoice,
               coalesce(pd.n, 0) > 0 AS has_debt, ds.n IS NOT NULL AS has_debt_schedule,
               bal.balance_total AS banking_balance_snapshot, bal.n_products_with_balance,
               pd.outstanding_total AS debt_outstanding_total, pd.granted_total AS debt_granted_total,
               i.overdue_pending_total, i.overdue_share, c.flags
        FROM silver.companies c
        LEFT JOIN (SELECT company_id, count(*) n FROM silver.products WHERE family = 'banking' GROUP BY 1) pb USING (company_id)
        LEFT JOIN (SELECT company_id, count(*) n, sum(outstanding_abs) FILTER (WHERE outstanding_abs < {C.DEBT_OUTLIER_ABS}) outstanding_total,
                          sum(granted_abs) FILTER (WHERE granted_abs < {C.DEBT_OUTLIER_ABS}) granted_total
                   FROM silver.products WHERE family = 'debt' GROUP BY 1) pd USING (company_id)
        LEFT JOIN (SELECT company_id, count(*) n_tx, min(date) first_tx, max(date) last_tx, count(DISTINCT year_month) active_months
                   FROM gold.fact_transactions GROUP BY 1) t USING (company_id)
        LEFT JOIN (SELECT company_id, count(*) n_inv, min(issuance_date) first_invoice, max(issuance_date) last_invoice,
                          sum(abs(pending_amount)) FILTER (WHERE status = 'overdue') overdue_pending_total,
                          avg((status = 'overdue')::int) FILTER (WHERE document_type = 'invoice') overdue_share
                   FROM gold.fact_invoices GROUP BY 1) i USING (company_id)
        LEFT JOIN (SELECT company_id, count(*) n FROM silver.debt_schedule GROUP BY 1) ds USING (company_id)
        LEFT JOIN (SELECT b.company_id, sum(b.balance) balance_total, count(*) n_products_with_balance
                   FROM silver.balances b JOIN silver.products p USING (product_id)
                   WHERE b.is_valid AND p.family = 'banking' GROUP BY 1) bal USING (company_id)""")

    st.create("dim_counterparty", """
        WITH t AS (
            SELECT company_id, counterparty_id, count(*) n_tx, sum(amount) FILTER (WHERE amount > 0) tx_inflow,
                   -sum(amount) FILTER (WHERE amount < 0) tx_outflow, min(date) first_tx, max(date) last_tx,
                   mode(counterparty_token) token, mode(category) top_category
            FROM gold.fact_transactions WHERE counterparty_id IS NOT NULL GROUP BY 1, 2),
        i AS (
            SELECT company_id, counterparty_id, count(*) n_invoices, sum(amount) FILTER (WHERE amount > 0) inv_receivable,
                   -sum(amount) FILTER (WHERE amount < 0) inv_payable, min(issuance_date) first_invoice, max(issuance_date) last_invoice,
                   avg((status = 'overdue')::int) overdue_share, mode(counterparty_token) token
            FROM gold.fact_invoices WHERE counterparty_id IS NOT NULL GROUP BY 1, 2)
        SELECT coalesce(t.company_id, i.company_id) company_id, coalesce(t.counterparty_id, i.counterparty_id) counterparty_id,
               t.counterparty_id IS NOT NULL AS in_transactions, i.counterparty_id IS NOT NULL AS in_invoices,
               coalesce(t.token, i.token) AS name_token,
               CASE WHEN coalesce(i.inv_receivable, 0) > coalesce(i.inv_payable, 0) THEN 'customer'
                    WHEN coalesce(i.inv_payable, 0) > 0 THEN 'supplier'
                    WHEN coalesce(t.tx_inflow, 0) > coalesce(t.tx_outflow, 0) THEN 'payer' ELSE 'payee' END AS role,
               coalesce(t.n_tx, 0) n_tx, t.tx_inflow, t.tx_outflow, t.first_tx, t.last_tx, t.top_category,
               coalesce(i.n_invoices, 0) n_invoices, i.inv_receivable, i.inv_payable, i.first_invoice, i.last_invoice, i.overdue_share
        FROM t FULL OUTER JOIN i ON t.company_id = i.company_id AND t.counterparty_id = i.counterparty_id""")

    # ------------------------------------------------------------------ saldo diario reconstruido por cuenta
    # balance(d) = balance_snapshot - Σ amount(date > d)   (solo cuentas bancarias con saldo válido)
    st.log("product_day_balance: reconstrucción hacia atrás")
    st.create("product_day_balance", f"""
        WITH prods AS (
            SELECT p.product_id, p.company_id, p.currency, b.balance AS balance_snapshot, b.date AS balance_date, dp.first_tx
            FROM silver.products p JOIN silver.balances b USING (product_id) JOIN gold.dim_product dp USING (product_id)
            WHERE p.family = 'banking' AND b.is_valid AND dp.is_active),
        grid AS (SELECT pr.*, c.date FROM prods pr CROSS JOIN gold.dim_calendar c),
        daily AS (SELECT product_id, date, sum(amount) net, count(*) n_tx, sum(amount) FILTER (WHERE amount > 0) inflow,
                         -sum(amount) FILTER (WHERE amount < 0) outflow FROM gold.fact_transactions GROUP BY 1, 2),
        rec AS (
            SELECT g.product_id, g.company_id, g.currency, g.date, coalesce(d.n_tx, 0) n_tx, coalesce(d.inflow, 0) inflow,
                   coalesce(d.outflow, 0) outflow, coalesce(d.net, 0) net, g.balance_snapshot, g.first_tx,
                   g.balance_snapshot - coalesce(sum(coalesce(d.net, 0)) OVER (PARTITION BY g.product_id ORDER BY g.date DESC
                       ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS balance_rec
            FROM grid g LEFT JOIN daily d ON d.product_id = g.product_id AND d.date = g.date)
        -- antes del primer movimiento importado el saldo es desconocido (la cuenta aún no estaba conectada)
        SELECT product_id, company_id, currency, date, n_tx, inflow, outflow, net, balance_snapshot,
               CASE WHEN date >= first_tx THEN balance_rec END AS balance_eod, date >= first_tx AS is_observed
        FROM rec""")

    # ------------------------------------------------------------------ panel empresa × día y empresa × mes
    st.log("company_day / company_month")
    st.create("company_day", f"""
        WITH grid AS (SELECT c.company_id, c.currency, d.date, d.year_month, d.is_business_day
                      FROM silver.companies c CROSS JOIN gold.dim_calendar d),
        tx AS (SELECT company_id, date, count(*) n_tx, sum(amount_company_ccy) FILTER (WHERE amount > 0) inflow,
                      -sum(amount_company_ccy) FILTER (WHERE amount < 0) outflow, sum(amount_company_ccy) net,
                      count(*) FILTER (WHERE amount_company_ccy IS NULL) n_tx_no_fx
               FROM gold.fact_transactions GROUP BY 1, 2),
        bal AS (SELECT b.company_id, b.date,
                       sum(b.balance_eod / CASE WHEN b.currency = p.company_currency THEN 1 ELSE coalesce(p.fx_rate_median, 1) END) balance_eod,
                       count(*) n_products
                FROM gold.product_day_balance b JOIN gold.dim_product p USING (product_id) GROUP BY 1, 2)
        SELECT g.company_id, g.currency, g.date, g.year_month, g.is_business_day,
               coalesce(t.n_tx, 0) n_tx, coalesce(t.inflow, 0) inflow, coalesce(t.outflow, 0) outflow, coalesce(t.net, 0) net,
               coalesce(t.n_tx_no_fx, 0) n_tx_no_fx, b.balance_eod, coalesce(b.n_products, 0) n_products_with_balance
        FROM grid g LEFT JOIN tx t ON t.company_id = g.company_id AND t.date = g.date
                    LEFT JOIN bal b ON b.company_id = g.company_id AND b.date = g.date""")

    cats = ["collection", "payment", "utility", "fee", "transfer", "tax", "salary", "social_security", "debt_repayment",
            "interest_charge", "bulk_collection", "bulk_payment", "cash_settlement", "pos_settlement", "uncategorized"]
    cat_cols = ",\n               ".join(
        f"coalesce(sum(amount_company_ccy) FILTER (WHERE category = '{c}'), 0) AS amt_{c}" for c in cats)
    st.create("company_month", f"""
        WITH months AS (SELECT DISTINCT year_month, bool_or(is_partial_month) is_partial_month FROM gold.dim_calendar GROUP BY 1),
        grid AS (SELECT c.company_id, c.currency, m.year_month, m.is_partial_month FROM silver.companies c CROSS JOIN months m),
        tx AS (SELECT company_id, year_month, count(*) n_tx, sum(amount_company_ccy) FILTER (WHERE amount > 0) inflow,
                      -sum(amount_company_ccy) FILTER (WHERE amount < 0) outflow, sum(amount_company_ccy) net,
                      count(DISTINCT product_id) n_products_active, count(DISTINCT counterparty_id) n_counterparties,
                      avg((category = 'uncategorized')::int) uncategorized_share,
                      avg((accounting_status IS NOT NULL)::int) reconciled_share,
                      {cat_cols}
               FROM gold.fact_transactions GROUP BY 1, 2),
        inv AS (SELECT company_id, year_month, count(*) n_invoices,
                       sum(amount_accounting_ccy) FILTER (WHERE amount > 0) ar_issued,
                       -sum(amount_accounting_ccy) FILTER (WHERE amount < 0) ap_issued,
                       avg((status = 'overdue')::int) FILTER (WHERE document_type = 'invoice') overdue_share,
                       median(terms_days) FILTER (WHERE document_type = 'invoice') terms_days_median,
                       median(days_to_payment) FILTER (WHERE document_type = 'invoice' AND amount > 0) dso_median,
                       median(days_to_payment) FILTER (WHERE document_type = 'invoice' AND amount < 0) dpo_median
                FROM gold.fact_invoices GROUP BY 1, 2),
        eom AS (SELECT company_id, year_month, arg_max(balance_eod, date) balance_eom, min(balance_eod) balance_min,
                       max(balance_eod) balance_max, avg(balance_eod) balance_avg
                FROM gold.company_day WHERE balance_eod IS NOT NULL GROUP BY 1, 2)
        SELECT g.company_id, g.currency, g.year_month, g.is_partial_month,
               coalesce(t.n_tx, 0) n_tx, coalesce(t.inflow, 0) inflow, coalesce(t.outflow, 0) outflow, coalesce(t.net, 0) net,
               coalesce(t.n_products_active, 0) n_products_active, coalesce(t.n_counterparties, 0) n_counterparties,
               t.uncategorized_share, t.reconciled_share,
               {", ".join("coalesce(t.amt_" + c + ", 0) amt_" + c for c in cats)},
               coalesce(i.n_invoices, 0) n_invoices, coalesce(i.ar_issued, 0) ar_issued, coalesce(i.ap_issued, 0) ap_issued,
               i.overdue_share, i.terms_days_median, i.dso_median, i.dpo_median,
               e.balance_eom, e.balance_min, e.balance_max, e.balance_avg,
               coalesce(t.n_tx, 0) > 0 AS is_active
        FROM grid g LEFT JOIN tx t ON t.company_id = g.company_id AND t.year_month = g.year_month
                    LEFT JOIN inv i ON i.company_id = g.company_id AND i.year_month = g.year_month
                    LEFT JOIN eom e ON e.company_id = g.company_id AND e.year_month = g.year_month""")

    # ------------------------------------------------------------------ conciliación factura ↔ movimiento
    st.log("invoice_tx_match")
    st.create("invoice_tx_match", f"""
        WITH inv AS (SELECT operation_id, company_id, counterparty_id, abs_amount, amount, issuance_date, due_date, status
                     FROM gold.fact_invoices WHERE counterparty_id IS NOT NULL AND document_type = 'invoice'),
        cand AS (
            SELECT i.operation_id, t.transaction_id, i.company_id,
                   CASE WHEN t.counterparty_id = i.counterparty_id THEN 'id' ELSE 'token' END AS match_via,
                   date_diff('day', i.issuance_date, t.date) AS days_from_issuance,
                   date_diff('day', i.due_date, t.date) AS days_from_due,
                   sign(i.amount) = sign(t.amount) AS same_sign, i.status AS invoice_status
            FROM inv i JOIN gold.fact_transactions t
              ON t.company_id = i.company_id
             AND (t.counterparty_id = i.counterparty_id OR t.counterparty_token = i.counterparty_id)
             AND abs(t.abs_amount - i.abs_amount) < 0.005
             AND t.date BETWEEN i.issuance_date - {C.MATCH_WINDOW_BEFORE_DAYS} AND i.issuance_date + {C.MATCH_WINDOW_AFTER_DAYS}),
        ranked AS (
            SELECT *, count(*) OVER (PARTITION BY operation_id) AS n_candidates_for_invoice,
                      count(*) OVER (PARTITION BY transaction_id) AS n_invoices_for_tx,
                      row_number() OVER (PARTITION BY operation_id ORDER BY (match_via = 'id') DESC, same_sign DESC, abs(coalesce(days_from_due, days_from_issuance))) AS rank_for_invoice,
                      row_number() OVER (PARTITION BY transaction_id ORDER BY (match_via = 'id') DESC, same_sign DESC, abs(coalesce(days_from_due, days_from_issuance))) AS rank_for_tx
            FROM cand)
        SELECT *, rank_for_invoice = 1 AND rank_for_tx = 1 AS is_best,
               n_candidates_for_invoice = 1 AND n_invoices_for_tx = 1 AS is_unique
        FROM ranked""")

    st.log("resumen gold: " + ", ".join(
        f"{t}={st.scalar(f'SELECT count(*) FROM gold.{t}'):,}" for t in
        ["fact_transactions", "fact_invoices", "dim_company", "dim_product", "dim_counterparty", "company_month", "company_day",
         "product_day_balance", "invoice_tx_match"]))
