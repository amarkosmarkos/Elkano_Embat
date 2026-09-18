"""Construye el panel empresa × mes (24 meses) para la ingeniería inversa del generador."""
import duckdb, sys
d = sys.argv[1] if len(sys.argv) > 1 else "/data"
con = duckdb.connect()
con.sql(f"""CREATE TABLE tx AS SELECT company_id, product_id, CAST(date AS DATE) AS date, amount, category, counterparty_id, description
  FROM read_csv('{d}/transactions.csv', header=true, sample_size=200000, ignore_errors=true) WHERE abs(amount) < 1e8""")
con.sql(f"""CREATE TABLE inv AS SELECT company_id, document_type, CAST(issuance_date AS DATE) AS issuance_date, CAST(due_date AS DATE) AS due_date,
  CAST(payment_date AS DATE) AS payment_date, amount, pending_amount, status, counterparty_id
  FROM read_csv('{d}/invoices.csv', header=true, sample_size=200000, ignore_errors=true) WHERE abs(amount) < 1e8""")
con.sql(f"CREATE TABLE companies AS SELECT * FROM read_csv('{d}/companies.csv', header=true)")
con.sql(f"CREATE TABLE bp AS SELECT * FROM read_csv('{d}/banking_products.csv', header=true)")
con.sql(f"CREATE TABLE bal AS SELECT product_id, company_id, try_cast(balance AS DOUBLE) AS balance FROM read_csv('{d}/balances.csv', header=true, all_varchar=true)")
con.sql("""CREATE TABLE months AS SELECT date_trunc('month', DATE '2024-09-01' + INTERVAL (i) MONTH)::DATE AS m, i FROM range(24) t(i)""")
con.sql("""COPY (
WITH t AS (
  SELECT company_id, date_trunc('month', date)::DATE AS m,
    count(*) AS n_tx, sum(amount) FILTER (WHERE amount>0) AS inflow, -sum(amount) FILTER (WHERE amount<0) AS outflow,
    sum(amount) AS net, count(DISTINCT product_id) AS n_prod, count(DISTINCT counterparty_id) AS n_cp,
    sum(amount) FILTER (WHERE category='collection') AS collection, -sum(amount) FILTER (WHERE category='payment') AS payment,
    -sum(amount) FILTER (WHERE category IN ('salary','social_security')) AS payroll,
    -sum(amount) FILTER (WHERE category='tax') AS tax, -sum(amount) FILTER (WHERE category IN ('debt_repayment','interest_charge')) AS debt_service,
    avg((category='-')::int) AS uncat_share
  FROM tx GROUP BY 1,2),
i AS (
  SELECT company_id, date_trunc('month', issuance_date)::DATE AS m, count(*) AS n_inv,
    sum(amount) FILTER (WHERE amount>0) AS ar, -sum(amount) FILTER (WHERE amount<0) AS ap,
    avg((status='overdue')::int) AS overdue_share,
    avg(date_diff('day', issuance_date, payment_date)) FILTER (WHERE status='paid' AND payment_date BETWEEN issuance_date AND issuance_date + INTERVAL 730 DAY) AS dso
  FROM inv WHERE document_type='invoice' GROUP BY 1,2),
grid AS (SELECT c.company_id, mo.m, mo.i FROM companies c CROSS JOIN months mo)
SELECT g.company_id, g.i, g.m, coalesce(t.n_tx,0) n_tx, coalesce(t.inflow,0) inflow, coalesce(t.outflow,0) outflow, coalesce(t.net,0) net,
  coalesce(t.n_prod,0) n_prod, coalesce(t.n_cp,0) n_cp, coalesce(t.collection,0) collection, coalesce(t.payment,0) payment,
  coalesce(t.payroll,0) payroll, coalesce(t.tax,0) tax, coalesce(t.debt_service,0) debt_service, t.uncat_share,
  coalesce(i.n_inv,0) n_inv, coalesce(i.ar,0) ar, coalesce(i.ap,0) ap, i.overdue_share, i.dso
FROM grid g LEFT JOIN t ON t.company_id=g.company_id AND t.m=g.m LEFT JOIN i ON i.company_id=g.company_id AND i.m=g.m
ORDER BY 1,2) TO '/eda/panel.csv' (HEADER)""")
# saldo final por empresa (solo cuentas bancarias) para reconstruir la curva de saldo hacia atrás
con.sql("""COPY (SELECT b.company_id, sum(balance) AS final_balance FROM bal b JOIN bp USING (product_id) WHERE abs(balance)<1e9 GROUP BY 1) TO '/eda/final_balance.csv' (HEADER)""")
# primera/última fecha por empresa, created_at
con.sql("""COPY (SELECT c.company_id, c.group_id, c.currency, c.erp, CAST(c.created_at AS DATE) AS created_at, t.first_tx, t.last_tx, t.n
  FROM companies c LEFT JOIN (SELECT company_id, min(date) first_tx, max(date) last_tx, count(*) n FROM tx GROUP BY 1) t USING (company_id)) TO '/eda/company_meta.csv' (HEADER)""")
print("panel listo")
