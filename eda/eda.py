"""EDA de primer nivel sobre output_hackspain_data.zip (Track Embat · HackSpain 2026).

Lee los 8 CSV con DuckDB, calcula todas las métricas y las vuelca a eda_data.json.
build_report.py incrusta ese JSON en report_template.html -> report.html.

Uso (ver run.sh):  python eda.py --data ../output --out eda_data.json
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import time

import duckdb

SNAPSHOT = "2026-09-01"          # fecha de corte del dataset
PERIOD_START = "2024-09-01"
AMOUNT_OUTLIER = 1e8             # |importe| > 100 M se considera outlier


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="../output")
    ap.add_argument("--out", default="eda_data.json")
    args = ap.parse_args()
    d = args.data.rstrip("/")

    con = duckdb.connect()
    con.sql("SET preserve_insertion_order=false")
    t0 = time.time()

    def q(sql: str):
        return con.sql(sql).fetchall()

    def rows(sql: str) -> list[dict]:
        rel = con.sql(sql)
        cols = rel.columns
        return [dict(zip(cols, r)) for r in rel.fetchall()]

    def one(sql: str):
        return con.sql(sql).fetchone()[0]

    def log(msg: str) -> None:
        print(f"[{time.time() - t0:6.1f}s] {msg}", flush=True)

    # ------------------------------------------------------------------ carga
    log("cargando CSV pequeños")
    con.sql(f"CREATE TABLE groups AS SELECT * FROM read_csv('{d}/groups.csv', header=true)")
    con.sql(f"CREATE TABLE companies AS SELECT * FROM read_csv('{d}/companies.csv', header=true)")
    con.sql(f"CREATE TABLE bp AS SELECT * FROM read_csv('{d}/banking_products.csv', header=true)")
    con.sql(f"CREATE TABLE dp AS SELECT * FROM read_csv('{d}/debt_products.csv', header=true)")
    con.sql(f"CREATE TABLE dsc AS SELECT * FROM read_csv('{d}/debt_schedule_config.csv', header=true)")
    con.sql(f"CREATE TABLE bal AS SELECT * FROM read_csv('{d}/balances.csv', header=true, all_varchar=true)")
    con.sql("""CREATE TABLE balances AS SELECT product_id, company_id, try_cast(date AS DATE) AS date,
               try_cast(balance AS DOUBLE) AS balance, try_cast(available AS DOUBLE) AS available,
               try_cast(granted AS DOUBLE) AS granted, try_cast(liquidity AS DOUBLE) AS liquidity,
               try_cast(countable AS DOUBLE) AS countable FROM bal""")

    log("cargando transactions.csv (2,5 M filas)")
    con.sql(f"""CREATE TABLE tx AS SELECT transaction_id, company_id, product_id,
               CAST(date AS DATE) AS date, CAST(value_date AS DATE) AS value_date, amount, exchange_rate,
               status, accounting_status, category, description, counterparty_id
               FROM read_csv('{d}/transactions.csv', header=true, sample_size=200000, ignore_errors=true)""")
    log("cargando invoices.csv (0,9 M filas)")
    con.sql(f"""CREATE TABLE inv AS SELECT operation_id, company_id, document_type,
               CAST(issuance_date AS DATE) AS issuance_date, CAST(due_date AS DATE) AS due_date,
               CAST(payment_date AS DATE) AS payment_date, amount, pending_amount, currency,
               accounting_currency, exchange_rate, status, concept, counterparty_id
               FROM read_csv('{d}/invoices.csv', header=true, sample_size=200000, ignore_errors=true)""")

    out: dict = {"generated_at": dt.datetime.now().isoformat(timespec="seconds"),
                 "snapshot": SNAPSHOT, "period_start": PERIOD_START}

    # ------------------------------------------------------------------ meta
    log("meta")
    files = ["groups", "companies", "bp", "dp", "dsc", "balances", "tx", "inv"]
    names = {"bp": "banking_products", "dp": "debt_products", "dsc": "debt_schedule_config",
             "tx": "transactions", "inv": "invoices"}
    out["meta"] = {"rows": {names.get(f, f): one(f"SELECT count(*) FROM {f}") for f in files}}

    # ------------------------------------------------------------------ empresas y grupos
    log("empresas y grupos")
    out["companies"] = {
        "group_size_hist": rows("""SELECT n, count(*) AS groups FROM (
            SELECT group_id, count(*) AS n FROM companies GROUP BY 1) GROUP BY 1 ORDER BY 1"""),
        "currency": rows("SELECT currency AS k, count(*) AS n FROM companies GROUP BY 1 ORDER BY 2 DESC"),
        "country_norm": rows("""SELECT k, count(*) AS n FROM (SELECT CASE
            WHEN country IS NULL OR trim(country)='' THEN '(sin país)'
            WHEN upper(country) IN ('ES','ESPAÑA','ESPANA','SPAIN') THEN 'ES'
            WHEN upper(country) IN ('PT','PORTUGAL') THEN 'PT'
            WHEN upper(country) IN ('DE','GERMANY','ALEMANIA') THEN 'DE'
            WHEN upper(country) IN ('FR','FRANCE','FRANCIA') THEN 'FR'
            WHEN upper(country) IN ('NL','NETHERLANDS') THEN 'NL'
            WHEN upper(country) IN ('UK','GB','UNITED KINGDOM') THEN 'GB'
            WHEN upper(country) IN ('US','USA','UNITED STATES') THEN 'US'
            WHEN upper(country) IN ('MX','MEXICO','MÉXICO') THEN 'MX'
            ELSE upper(country) END AS k FROM companies) GROUP BY 1 ORDER BY 2 DESC"""),
        "country_raw": rows("""SELECT coalesce(country,'(vacío)') AS k, count(*) AS n FROM companies
            GROUP BY 1 ORDER BY 2 DESC"""),
        "erp": rows("""SELECT coalesce(erp,'(sin ERP)') AS k, count(*) AS n FROM companies
            GROUP BY 1 ORDER BY 2 DESC"""),
        "onboarding_q": rows("""SELECT strftime(date_trunc('quarter', CAST(created_at AS DATE)), '%Y-Q') ||
            CAST(quarter(CAST(created_at AS DATE)) AS VARCHAR) AS k, count(*) AS n
            FROM companies GROUP BY 1 ORDER BY 1"""),
        "onboarding_cum": rows("""SELECT k, sum(n) OVER (ORDER BY k) AS cum FROM (
            SELECT strftime(date_trunc('month', CAST(created_at AS DATE)), '%Y-%m') AS k, count(*) AS n
            FROM companies GROUP BY 1) ORDER BY k"""),
        "coverage": rows("""WITH c AS (
            SELECT company_id,
              company_id IN (SELECT DISTINCT company_id FROM tx) AS has_tx,
              company_id IN (SELECT DISTINCT company_id FROM inv) AS has_inv,
              company_id IN (SELECT DISTINCT company_id FROM dp) AS has_debt,
              company_id IN (SELECT DISTINCT company_id FROM bp) AS has_bank,
              company_id IN (SELECT DISTINCT company_id FROM dsc) AS has_dsc,
              company_id IN (SELECT DISTINCT company_id FROM balances) AS has_bal
            FROM companies)
            SELECT 'transacciones' AS k, sum(has_tx::int) AS n FROM c UNION ALL
            SELECT 'productos bancarios', sum(has_bank::int) FROM c UNION ALL
            SELECT 'saldos', sum(has_bal::int) FROM c UNION ALL
            SELECT 'facturas (ERP)', sum(has_inv::int) FROM c UNION ALL
            SELECT 'deuda', sum(has_debt::int) FROM c UNION ALL
            SELECT 'cuadro amortización', sum(has_dsc::int) FROM c"""),
        "coverage_combo": rows("""WITH c AS (
            SELECT company_id,
              company_id IN (SELECT DISTINCT company_id FROM inv) AS has_inv,
              company_id IN (SELECT DISTINCT company_id FROM dp) AS has_debt
            FROM companies)
            SELECT CASE WHEN has_inv AND has_debt THEN 'facturas + deuda'
                        WHEN has_inv THEN 'solo facturas'
                        WHEN has_debt THEN 'solo deuda'
                        ELSE 'solo banca' END AS k, count(*) AS n FROM c GROUP BY 1 ORDER BY 2 DESC"""),
        "erp_group_vs_company": one("""SELECT count(*) FROM companies c JOIN groups g USING (group_id)
            WHERE c.erp IS NOT NULL AND g.erp IS NOT NULL"""),
        "multicurrency_groups": one("""SELECT count(*) FROM (SELECT group_id FROM companies
            GROUP BY 1 HAVING count(DISTINCT currency) > 1)"""),
    }

    # ------------------------------------------------------------------ productos
    log("productos")
    con.sql("""CREATE TABLE products AS
        SELECT product_id, company_id, type, bank_name, service, currency, CAST(created_at AS DATE) AS created_at,
               'banking' AS family, NULL::DOUBLE AS granted, NULL::DOUBLE AS outstanding, NULL::DOUBLE AS liquidity FROM bp
        UNION ALL
        SELECT product_id, company_id, type, bank_name, service, currency, CAST(created_at AS DATE),
               'debt', granted, outstanding, liquidity FROM dp""")
    out["products"] = {
        "banking_type": rows("SELECT type AS k, count(*) AS n FROM bp GROUP BY 1 ORDER BY 2 DESC"),
        "banking_bank_top": rows("""SELECT bank_name AS k, count(*) AS n FROM bp GROUP BY 1
            ORDER BY 2 DESC LIMIT 15"""),
        "banking_bank_distinct": one("SELECT count(DISTINCT bank_name) FROM bp"),
        "banking_custom_share": one("SELECT avg((service='custom')::int) FROM bp"),
        "banking_currency": rows("SELECT currency AS k, count(*) AS n FROM bp GROUP BY 1 ORDER BY 2 DESC LIMIT 10"),
        "per_company_hist": rows("""SELECT CASE WHEN n<=1 THEN '1' WHEN n<=2 THEN '2' WHEN n<=3 THEN '3'
            WHEN n<=5 THEN '4-5' WHEN n<=10 THEN '6-10' WHEN n<=20 THEN '11-20' ELSE '>20' END AS k,
            count(*) AS n, min(n) AS o FROM (SELECT company_id, count(*) AS n FROM bp GROUP BY 1)
            GROUP BY 1 ORDER BY o"""),
        "per_company_q": q("""SELECT quantile_cont(n,[0.1,0.25,0.5,0.75,0.9,0.99]), max(n), avg(n)
            FROM (SELECT company_id, count(*) AS n FROM bp GROUP BY 1)""")[0],
        "banking_created_q": rows("""SELECT strftime(date_trunc('quarter', CAST(created_at AS DATE)), '%Y-Q') ||
            CAST(quarter(CAST(created_at AS DATE)) AS VARCHAR) AS k, count(*) AS n FROM bp GROUP BY 1 ORDER BY 1"""),
        "debt_type": rows("""SELECT type AS k, count(*) AS n, sum(abs(granted)) AS granted,
            sum(abs(outstanding)) AS outstanding, count(DISTINCT company_id) AS companies
            FROM dp WHERE abs(coalesce(granted,0)) < 1e9 AND abs(outstanding) < 1e9 GROUP BY 1 ORDER BY 2 DESC"""),
        "debt_bank_top": rows("""SELECT bank_name AS k, count(*) AS n, sum(abs(outstanding)) AS outstanding
            FROM dp WHERE abs(outstanding) < 1e9 GROUP BY 1 ORDER BY 3 DESC LIMIT 12"""),
        "debt_sign": rows("""SELECT CASE WHEN outstanding<0 THEN 'negativo' WHEN outstanding=0 THEN 'cero'
            ELSE 'positivo' END AS k, count(*) AS n FROM dp GROUP BY 1 ORDER BY 2 DESC"""),
        "debt_granted_null": one("SELECT count(*) FROM dp WHERE granted IS NULL"),
        "debt_outstanding_gt_granted": one("""SELECT count(*) FROM dp WHERE granted IS NOT NULL AND granted<>0
            AND abs(outstanding) > abs(granted)*1.0001"""),
        "debt_util_q": q("""SELECT quantile_cont(u,[0.1,0.25,0.5,0.75,0.9]) FROM (
            SELECT abs(outstanding)/abs(granted) AS u FROM dp WHERE type='lineofcredit' AND granted IS NOT NULL
            AND granted<>0 AND abs(outstanding) <= abs(granted))""")[0][0],
        "debt_util_hist": rows("""SELECT CASE WHEN u<0.1 THEN '0-10%' WHEN u<0.25 THEN '10-25%' WHEN u<0.5 THEN '25-50%'
            WHEN u<0.75 THEN '50-75%' WHEN u<0.9 THEN '75-90%' WHEN u<=1 THEN '90-100%' ELSE '>100%' END AS k,
            count(*) AS n, min(u) AS o FROM (SELECT abs(outstanding)/abs(granted) AS u FROM dp
            WHERE type='lineofcredit' AND granted IS NOT NULL AND granted<>0) GROUP BY 1 ORDER BY o"""),
        "debt_outstanding_hist": rows("""SELECT b AS k, count(*) AS n FROM (SELECT CASE
            WHEN abs(outstanding)=0 THEN '0' WHEN abs(outstanding)<1e4 THEN '<10K' WHEN abs(outstanding)<1e5 THEN '10K-100K'
            WHEN abs(outstanding)<1e6 THEN '100K-1M' WHEN abs(outstanding)<1e7 THEN '1M-10M' ELSE '>10M' END AS b
            FROM dp) GROUP BY 1 ORDER BY CASE k WHEN '0' THEN 0 WHEN '<10K' THEN 1 WHEN '10K-100K' THEN 2
            WHEN '100K-1M' THEN 3 WHEN '1M-10M' THEN 4 ELSE 5 END"""),
        "debt_per_company_q": q("""SELECT quantile_cont(n,[0.25,0.5,0.75,0.9]), max(n) FROM (
            SELECT company_id, count(*) AS n FROM dp GROUP BY 1)""")[0],
        "debt_company_top": rows("""SELECT company_id AS k, count(*) AS n, sum(abs(outstanding)) AS outstanding
            FROM dp WHERE abs(outstanding) < 1e9 GROUP BY 1 ORDER BY 3 DESC LIMIT 10"""),
        "debt_created_q": rows("""SELECT strftime(date_trunc('quarter', CAST(created_at AS DATE)), '%Y-Q') ||
            CAST(quarter(CAST(created_at AS DATE)) AS VARCHAR) AS k, count(*) AS n FROM dp GROUP BY 1 ORDER BY 1"""),
    }

    # ------------------------------------------------------------------ saldos
    log("saldos")
    out["balances"] = {
        "date": rows("SELECT CAST(date AS VARCHAR) AS k, count(*) AS n FROM balances GROUP BY 1 ORDER BY 1"),
        "q": q("""SELECT quantile_cont(balance,[0.01,0.05,0.1,0.25,0.5,0.75,0.9,0.95,0.99]) FROM balances
            WHERE abs(balance) < 1e9""")[0][0],
        "sign": rows("""SELECT CASE WHEN balance<0 THEN 'negativo' WHEN balance=0 THEN 'cero' ELSE 'positivo' END AS k,
            count(*) AS n FROM balances GROUP BY 1 ORDER BY 2 DESC"""),
        "hist": rows("""SELECT b AS k, count(*) AS n, o FROM (SELECT CASE
            WHEN balance <= -1e6 THEN '≤ −1M' WHEN balance <= -1e5 THEN '−1M…−100K' WHEN balance <= -1e4 THEN '−100K…−10K'
            WHEN balance < 0 THEN '−10K…0' WHEN balance = 0 THEN '0' WHEN balance < 1e3 THEN '0…1K'
            WHEN balance < 1e4 THEN '1K…10K' WHEN balance < 1e5 THEN '10K…100K' WHEN balance < 1e6 THEN '100K…1M'
            WHEN balance < 1e7 THEN '1M…10M' WHEN balance < 1e9 THEN '10M…1B' ELSE '≥ 1B (outlier)' END AS b,
            CASE WHEN balance <= -1e6 THEN 0 WHEN balance <= -1e5 THEN 1 WHEN balance <= -1e4 THEN 2 WHEN balance < 0 THEN 3
            WHEN balance = 0 THEN 4 WHEN balance < 1e3 THEN 5 WHEN balance < 1e4 THEN 6 WHEN balance < 1e5 THEN 7
            WHEN balance < 1e6 THEN 8 WHEN balance < 1e7 THEN 9 WHEN balance < 1e9 THEN 10 ELSE 11 END AS o
            FROM balances) GROUP BY 1,3 ORDER BY o"""),
        "by_type": rows("""SELECT coalesce(p.type,'(sin producto)') AS k, coalesce(p.family,'?') AS family,
            count(*) AS n, sum(b.balance) AS total, median(b.balance) AS med,
            avg((b.balance<0)::int) AS neg_share
            FROM balances b LEFT JOIN products p USING (product_id) WHERE abs(b.balance) < 1e9
            GROUP BY 1,2 ORDER BY 3 DESC"""),
        "outliers": rows("""SELECT b.product_id, b.company_id, coalesce(p.type,'?') AS type, b.balance
            FROM balances b LEFT JOIN products p USING (product_id) WHERE abs(b.balance) >= 1e9 ORDER BY abs(b.balance) DESC"""),
        "orphans": one("SELECT count(*) FROM balances WHERE product_id NOT IN (SELECT product_id FROM products)"),
        "nulls": rows("""SELECT 'available' AS k, avg((available IS NULL)::int) AS n FROM balances UNION ALL
            SELECT 'granted', avg((granted IS NULL)::int) FROM balances UNION ALL
            SELECT 'liquidity', avg((liquidity IS NULL)::int) FROM balances UNION ALL
            SELECT 'countable', avg((countable IS NULL)::int) FROM balances"""),
        "concentration": q("""WITH pos AS (SELECT balance FROM balances WHERE balance>0 AND balance<1e9),
            r AS (SELECT balance, row_number() OVER (ORDER BY balance DESC) AS rn, count(*) OVER () AS n,
                  sum(balance) OVER () AS tot FROM pos)
            SELECT sum(balance) FILTER (WHERE rn <= n*0.01)/max(tot),
                   sum(balance) FILTER (WHERE rn <= n*0.10)/max(tot),
                   sum(balance) FILTER (WHERE rn <= n*0.50)/max(tot) FROM r""")[0],
        "lorenz": rows("""WITH pos AS (SELECT balance FROM balances WHERE balance>0 AND balance<1e9),
            r AS (SELECT balance, row_number() OVER (ORDER BY balance) AS rn, count(*) OVER () AS n,
                  sum(balance) OVER (ORDER BY balance) AS cum, sum(balance) OVER () AS tot FROM pos)
            SELECT round(rn*1.0/n, 2) AS x, max(cum/tot) AS y FROM r GROUP BY 1 ORDER BY 1"""),
        "company_total_q": q("""SELECT quantile_cont(t,[0.1,0.25,0.5,0.75,0.9,0.99]) FROM (
            SELECT b.company_id, sum(balance) AS t FROM balances b JOIN products p USING (product_id)
            WHERE p.family='banking' AND abs(balance)<1e9 GROUP BY 1)""")[0][0],
        "company_total_hist": rows("""SELECT b AS k, count(*) AS n, o FROM (SELECT CASE
            WHEN t < 0 THEN '< 0' WHEN t < 1e4 THEN '0…10K' WHEN t < 1e5 THEN '10K…100K' WHEN t < 1e6 THEN '100K…1M'
            WHEN t < 1e7 THEN '1M…10M' ELSE '≥ 10M' END AS b,
            CASE WHEN t < 0 THEN 0 WHEN t < 1e4 THEN 1 WHEN t < 1e5 THEN 2 WHEN t < 1e6 THEN 3 WHEN t < 1e7 THEN 4 ELSE 5 END AS o
            FROM (SELECT b.company_id, sum(balance) AS t FROM balances b JOIN products p USING (product_id)
            WHERE p.family='banking' AND abs(balance)<1e9 GROUP BY 1)) GROUP BY 1,3 ORDER BY o"""),
        "currency_share": rows("""SELECT p.currency AS k, count(*) AS n, sum(b.balance) AS total
            FROM balances b JOIN products p USING (product_id) WHERE p.family='banking' AND abs(b.balance)<1e9
            GROUP BY 1 ORDER BY 3 DESC LIMIT 8"""),
    }

    # ------------------------------------------------------------------ transacciones
    log("transacciones: series temporales")
    con.sql(f"CREATE VIEW txc AS SELECT * FROM tx WHERE abs(amount) < {AMOUNT_OUTLIER}")
    T = out["transactions"] = {}
    T["monthly"] = rows("""SELECT strftime(date_trunc('month', date), '%Y-%m') AS k, count(*) AS n,
        sum(amount) FILTER (WHERE amount>0) AS inflow, -sum(amount) FILTER (WHERE amount<0) AS outflow,
        sum(amount) AS net, count(DISTINCT company_id) AS companies, count(DISTINCT product_id) AS products
        FROM txc GROUP BY 1 ORDER BY 1""")
    T["daily"] = rows("""SELECT CAST(date AS VARCHAR) AS k, count(*) AS n, sum(amount) AS net FROM txc GROUP BY 1 ORDER BY 1""")
    T["weekday"] = rows("""SELECT dayofweek(date) AS k, count(*) AS n, sum(abs(amount)) AS vol FROM txc GROUP BY 1 ORDER BY 1""")
    T["dom"] = rows("""SELECT day(date) AS k, count(*) AS n, sum(amount) FILTER (WHERE amount>0) AS inflow,
        -sum(amount) FILTER (WHERE amount<0) AS outflow FROM txc GROUP BY 1 ORDER BY 1""")
    T["month_of_year"] = rows("""SELECT month(date) AS k, count(*)/count(DISTINCT year(date)) AS n FROM txc GROUP BY 1 ORDER BY 1""")

    log("transacciones: importes")
    T["sign"] = rows("""SELECT CASE WHEN amount<0 THEN 'salida' WHEN amount=0 THEN 'cero' ELSE 'entrada' END AS k,
        count(*) AS n, sum(amount) AS total FROM tx GROUP BY 1 ORDER BY 2 DESC""")
    T["amount_q"] = q("""SELECT quantile_cont(abs(amount),[0.01,0.05,0.1,0.25,0.5,0.75,0.9,0.95,0.99,0.999])
        FROM tx WHERE amount<>0""")[0][0]
    T["amount_hist"] = rows("""SELECT b AS k, count(*) FILTER (WHERE amount>0) AS entrada,
        count(*) FILTER (WHERE amount<0) AS salida, o FROM (SELECT amount, CASE
        WHEN abs(amount)<1 THEN '<1' WHEN abs(amount)<10 THEN '1…10' WHEN abs(amount)<100 THEN '10…100'
        WHEN abs(amount)<1e3 THEN '100…1K' WHEN abs(amount)<1e4 THEN '1K…10K' WHEN abs(amount)<1e5 THEN '10K…100K'
        WHEN abs(amount)<1e6 THEN '100K…1M' WHEN abs(amount)<1e7 THEN '1M…10M' WHEN abs(amount)<1e8 THEN '10M…100M'
        ELSE '≥100M' END AS b, CASE WHEN abs(amount)<1 THEN 0 WHEN abs(amount)<10 THEN 1 WHEN abs(amount)<100 THEN 2
        WHEN abs(amount)<1e3 THEN 3 WHEN abs(amount)<1e4 THEN 4 WHEN abs(amount)<1e5 THEN 5 WHEN abs(amount)<1e6 THEN 6
        WHEN abs(amount)<1e7 THEN 7 WHEN abs(amount)<1e8 THEN 8 ELSE 9 END AS o FROM tx WHERE amount<>0)
        GROUP BY 1,4 ORDER BY o""")
    T["outliers_n"] = one(f"SELECT count(*) FROM tx WHERE abs(amount) >= {AMOUNT_OUTLIER}")
    T["outliers_top"] = rows(f"""SELECT company_id, product_id, CAST(date AS VARCHAR) AS date, amount, category,
        left(description, 60) AS description FROM tx WHERE abs(amount) >= {AMOUNT_OUTLIER} ORDER BY abs(amount) DESC LIMIT 10""")
    T["round_amounts"] = one("SELECT avg((amount = round(amount, 0) AND amount<>0)::int) FROM tx")
    T["fx_share"] = one("SELECT avg((exchange_rate<>1)::int) FROM tx")
    T["fx_zero"] = one("SELECT count(*) FROM tx WHERE exchange_rate=0")
    T["fx_hist"] = rows("""SELECT round(exchange_rate,2) AS k, count(*) AS n FROM tx WHERE exchange_rate<>1
        GROUP BY 1 ORDER BY 2 DESC LIMIT 12""")

    log("transacciones: categorías y estados")
    T["category"] = rows("""SELECT coalesce(category,'(null)') AS k, count(*) AS n, sum(amount) AS net,
        sum(abs(amount)) AS vol, avg((amount>0)::int) AS in_share, median(abs(amount)) AS med
        FROM txc GROUP BY 1 ORDER BY 2 DESC""")
    T["category_monthly"] = rows("""SELECT strftime(date_trunc('month', date), '%Y-%m') AS k,
        coalesce(category,'(null)') AS cat, count(*) AS n FROM txc
        WHERE category IN ('-','collection','payment','utility','fee','transfer') GROUP BY 1,2 ORDER BY 1,2""")
    T["status"] = rows("SELECT coalesce(status,'(vacío)') AS k, count(*) AS n FROM tx GROUP BY 1 ORDER BY 2 DESC")
    T["accounting_status"] = rows("""SELECT coalesce(accounting_status,'(vacío)') AS k, count(*) AS n
        FROM tx GROUP BY 1 ORDER BY 2 DESC""")
    T["acc_status_by_company"] = rows("""SELECT k, count(*) AS n FROM (SELECT company_id,
        CASE WHEN avg((accounting_status IS NOT NULL)::int)=0 THEN 'sin conciliación'
             WHEN avg((accounting_status IS NOT NULL)::int)<0.5 THEN 'parcial (<50%)'
             WHEN avg((accounting_status IS NOT NULL)::int)<1 THEN 'mayoritaria (≥50%)' ELSE 'completa' END AS k
        FROM tx GROUP BY 1) GROUP BY 1 ORDER BY 2 DESC""")
    T["uncategorized_monthly"] = rows("""SELECT strftime(date_trunc('month', date), '%Y-%m') AS k,
        avg((category='-')::int) AS share FROM txc GROUP BY 1 ORDER BY 1""")

    log("transacciones: contrapartes y texto")
    T["cp_coverage"] = {
        "id": one("SELECT avg((counterparty_id IS NOT NULL)::int) FROM tx"),
        "desc": one("SELECT avg((description LIKE '%COUNTERPARTY_%')::int) FROM tx"),
        "desc_no_id": one("SELECT avg((counterparty_id IS NULL AND description LIKE '%COUNTERPARTY_%')::int) FROM tx"),
        "either": one("SELECT avg((counterparty_id IS NOT NULL OR description LIKE '%COUNTERPARTY_%')::int) FROM tx"),
        "distinct_id": one("SELECT count(DISTINCT counterparty_id) FROM tx"),
    }
    T["cp_coverage_by_category"] = rows("""SELECT coalesce(category,'(null)') AS k, count(*) AS n,
        avg((counterparty_id IS NOT NULL)::int) AS id_share,
        avg((counterparty_id IS NOT NULL OR description LIKE '%COUNTERPARTY_%')::int) AS any_share
        FROM tx GROUP BY 1 HAVING count(*) > 10000 ORDER BY 2 DESC""")
    T["cp_top"] = rows("""SELECT counterparty_id AS k, count(*) AS n, sum(abs(amount)) AS vol,
        count(DISTINCT company_id) AS companies FROM txc WHERE counterparty_id IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10""")
    T["cp_per_company_q"] = q("""SELECT quantile_cont(n,[0.25,0.5,0.75,0.9]) FROM (
        SELECT company_id, count(DISTINCT counterparty_id) AS n FROM tx WHERE counterparty_id IS NOT NULL GROUP BY 1)""")[0][0]
    T["placeholders"] = rows("""SELECT k, sum((description LIKE '%' || k || '%')::int) AS n FROM tx,
        (SELECT unnest(['COUNTERPARTY_','[COMPANY]','[PERSON]','[NAME]','[IBAN]','[ACCOUNT]','[CARD]','[TAXID]',
        '[EMAIL]','[PHONE]','[URL]','[ADDRESS]','[REF]','[NUM]','[X]']) AS k) GROUP BY 1 ORDER BY 2 DESC""")
    T["desc_top"] = rows("""SELECT description AS k, count(*) AS n, sum(amount) AS net FROM tx
        GROUP BY 1 ORDER BY 2 DESC LIMIT 15""")
    T["desc_distinct"] = one("SELECT count(DISTINCT description) FROM tx")
    T["desc_len_q"] = q("SELECT quantile_cont(length(description),[0.1,0.5,0.9,0.99]) FROM tx")[0][0]

    log("transacciones: actividad por empresa/producto")
    T["per_company_hist"] = rows("""SELECT b AS k, count(*) AS n, o FROM (SELECT CASE
        WHEN n<100 THEN '<100' WHEN n<500 THEN '100…500' WHEN n<1000 THEN '500…1K' WHEN n<2500 THEN '1K…2,5K'
        WHEN n<5000 THEN '2,5K…5K' WHEN n<10000 THEN '5K…10K' WHEN n<25000 THEN '10K…25K' ELSE '≥25K' END AS b,
        CASE WHEN n<100 THEN 0 WHEN n<500 THEN 1 WHEN n<1000 THEN 2 WHEN n<2500 THEN 3 WHEN n<5000 THEN 4
        WHEN n<10000 THEN 5 WHEN n<25000 THEN 6 ELSE 7 END AS o
        FROM (SELECT company_id, count(*) AS n FROM tx GROUP BY 1)) GROUP BY 1,3 ORDER BY o""")
    T["per_company_q"] = q("""SELECT quantile_cont(n,[0.1,0.25,0.5,0.75,0.9,0.99]), max(n) FROM (
        SELECT company_id, count(*) AS n FROM tx GROUP BY 1)""")[0]
    T["company_concentration"] = q("""WITH r AS (SELECT n, row_number() OVER (ORDER BY n DESC) AS rn,
        count(*) OVER () AS c, sum(n) OVER () AS tot FROM (SELECT company_id, count(*) AS n FROM tx GROUP BY 1))
        SELECT sum(n) FILTER (WHERE rn<=c*0.1)/max(tot), sum(n) FILTER (WHERE rn<=c*0.2)/max(tot) FROM r""")[0]
    T["company_top"] = rows("""SELECT company_id AS k, count(*) AS n, sum(abs(amount)) AS vol FROM txc
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10""")
    T["products_active"] = q("""SELECT count(DISTINCT product_id),
        count(DISTINCT product_id) FILTER (WHERE product_id IN (SELECT product_id FROM bp)),
        count(DISTINCT product_id) FILTER (WHERE product_id IN (SELECT product_id FROM dp)),
        count(DISTINCT product_id) FILTER (WHERE product_id NOT IN (SELECT product_id FROM products)) FROM tx""")[0]
    T["bp_without_tx"] = one("SELECT count(*) FROM bp WHERE product_id NOT IN (SELECT DISTINCT product_id FROM tx)")
    T["bp_type_activity"] = rows("""SELECT b.type AS k, count(*) AS n,
        count(*) FILTER (WHERE b.product_id IN (SELECT DISTINCT product_id FROM tx)) AS active FROM bp b GROUP BY 1 ORDER BY 2 DESC""")
    T["company_activity_span"] = rows("""SELECT b AS k, count(*) AS n, o FROM (SELECT CASE
        WHEN m<=3 THEN '≤3 meses' WHEN m<=6 THEN '4-6' WHEN m<=12 THEN '7-12' WHEN m<=18 THEN '13-18'
        WHEN m<=23 THEN '19-23' ELSE '24-25 (todo el periodo)' END AS b,
        CASE WHEN m<=3 THEN 0 WHEN m<=6 THEN 1 WHEN m<=12 THEN 2 WHEN m<=18 THEN 3 WHEN m<=23 THEN 4 ELSE 5 END AS o
        FROM (SELECT company_id, count(DISTINCT date_trunc('month', date)) AS m FROM tx GROUP BY 1))
        GROUP BY 1,3 ORDER BY o""")
    T["first_tx_month"] = rows("""SELECT strftime(date_trunc('month', f), '%Y-%m') AS k, count(*) AS n FROM (
        SELECT company_id, min(date) AS f FROM tx GROUP BY 1) GROUP BY 1 ORDER BY 1""")
    T["last_tx_month"] = rows("""SELECT strftime(date_trunc('month', f), '%Y-%m') AS k, count(*) AS n FROM (
        SELECT company_id, max(date) AS f FROM tx GROUP BY 1) GROUP BY 1 ORDER BY 1""")

    log("transacciones: fechas")
    T["value_lag"] = rows("""SELECT CASE WHEN dd < -7 THEN '< −7' WHEN dd < -2 THEN '−7…−3' WHEN dd = -2 THEN '−2'
        WHEN dd = -1 THEN '−1' WHEN dd = 0 THEN '0' WHEN dd = 1 THEN '+1' WHEN dd = 2 THEN '+2' WHEN dd <= 7 THEN '+3…+7'
        ELSE '> +7' END AS k, count(*) AS n, min(dd) AS o FROM (SELECT date_diff('day', date, value_date) AS dd FROM tx)
        GROUP BY 1 ORDER BY o""")
    T["value_date_out_of_range"] = one(f"SELECT count(*) FROM tx WHERE value_date < DATE '{PERIOD_START}' - INTERVAL 30 DAY OR value_date > DATE '{SNAPSHOT}' + INTERVAL 30 DAY")
    T["value_date_far_future"] = one("SELECT count(*) FROM tx WHERE value_date >= DATE '2027-01-01'")
    T["pending_dates"] = rows("""SELECT strftime(date_trunc('month', date), '%Y-%m') AS k, count(*) AS n FROM tx
        WHERE status='pending' GROUP BY 1 ORDER BY 1""")

    # ------------------------------------------------------------------ facturas
    log("facturas")
    con.sql(f"CREATE VIEW invc AS SELECT * FROM inv WHERE abs(amount) < {AMOUNT_OUTLIER}")
    I = out["invoices"] = {}
    I["monthly"] = rows("""SELECT strftime(date_trunc('month', issuance_date), '%Y-%m') AS k, count(*) AS n,
        sum(amount) FILTER (WHERE amount>0) AS receivable, -sum(amount) FILTER (WHERE amount<0) AS payable,
        count(DISTINCT company_id) AS companies FROM invc GROUP BY 1 ORDER BY 1""")
    I["document_type"] = rows("""SELECT document_type AS k, count(*) AS n, sum(abs(amount)) AS vol
        FROM invc GROUP BY 1 ORDER BY 2 DESC""")
    I["status"] = rows("""SELECT status AS k, count(*) AS n, sum(pending_amount) AS pending, sum(abs(amount)) AS vol
        FROM invc GROUP BY 1 ORDER BY 2 DESC""")
    I["sign"] = rows("""SELECT CASE WHEN amount<0 THEN 'negativo (pagar)' WHEN amount=0 THEN 'cero' ELSE 'positivo (cobrar)' END AS k,
        count(*) AS n, sum(abs(amount)) AS vol FROM invc GROUP BY 1 ORDER BY 2 DESC""")
    I["sign_by_type"] = rows("""SELECT document_type AS k, count(*) FILTER (WHERE amount>0) AS pos,
        count(*) FILTER (WHERE amount<0) AS neg FROM invc GROUP BY 1 ORDER BY pos+neg DESC LIMIT 8""")
    I["amount_q"] = q("""SELECT quantile_cont(abs(amount),[0.01,0.05,0.1,0.25,0.5,0.75,0.9,0.95,0.99,0.999])
        FROM inv WHERE amount<>0""")[0][0]
    I["amount_hist"] = rows("""SELECT b AS k, count(*) FILTER (WHERE amount>0) AS cobrar,
        count(*) FILTER (WHERE amount<0) AS pagar, o FROM (SELECT amount, CASE
        WHEN abs(amount)<10 THEN '<10' WHEN abs(amount)<100 THEN '10…100'
        WHEN abs(amount)<1e3 THEN '100…1K' WHEN abs(amount)<1e4 THEN '1K…10K' WHEN abs(amount)<1e5 THEN '10K…100K'
        WHEN abs(amount)<1e6 THEN '100K…1M' WHEN abs(amount)<1e7 THEN '1M…10M' WHEN abs(amount)<1e8 THEN '10M…100M'
        ELSE '≥100M' END AS b, CASE WHEN abs(amount)<10 THEN 0 WHEN abs(amount)<100 THEN 1
        WHEN abs(amount)<1e3 THEN 2 WHEN abs(amount)<1e4 THEN 3 WHEN abs(amount)<1e5 THEN 4 WHEN abs(amount)<1e6 THEN 5
        WHEN abs(amount)<1e7 THEN 6 WHEN abs(amount)<1e8 THEN 7 ELSE 8 END AS o FROM inv WHERE amount<>0)
        GROUP BY 1,4 ORDER BY o""")
    I["outliers_n"] = one(f"SELECT count(*) FROM inv WHERE abs(amount) >= {AMOUNT_OUTLIER}")
    I["outliers_top"] = rows(f"""SELECT company_id, document_type, CAST(issuance_date AS VARCHAR) AS issuance_date,
        amount, currency, status, left(concept, 50) AS concept FROM inv WHERE abs(amount) >= {AMOUNT_OUTLIER}
        ORDER BY abs(amount) DESC LIMIT 10""")
    I["terms"] = rows("""SELECT CASE WHEN dd < 0 THEN '< 0 (vence antes de emitir)' WHEN dd = 0 THEN '0 (contado)'
        WHEN dd <= 7 THEN '1-7' WHEN dd <= 15 THEN '8-15' WHEN dd <= 30 THEN '16-30' WHEN dd <= 45 THEN '31-45'
        WHEN dd <= 60 THEN '46-60' WHEN dd <= 90 THEN '61-90' WHEN dd <= 120 THEN '91-120' WHEN dd <= 365 THEN '121-365'
        ELSE '> 365' END AS k, count(*) AS n, min(dd) AS o FROM (
        SELECT date_diff('day', issuance_date, due_date) AS dd FROM inv WHERE document_type='invoice') GROUP BY 1 ORDER BY o""")
    I["terms_top"] = rows("""SELECT date_diff('day', issuance_date, due_date) AS k, count(*) AS n FROM inv
        WHERE document_type='invoice' GROUP BY 1 ORDER BY 2 DESC LIMIT 10""")
    I["terms_q"] = q("""SELECT quantile_cont(dd,[0.25,0.5,0.75,0.9]) FROM (SELECT date_diff('day', issuance_date, due_date) AS dd
        FROM inv WHERE document_type='invoice' AND due_date BETWEEN issuance_date AND issuance_date + INTERVAL 730 DAY)""")[0][0]
    I["dso"] = rows("""SELECT CASE WHEN dd < 0 THEN '< 0 (pago antes de emitir)' WHEN dd = 0 THEN '0' WHEN dd <= 7 THEN '1-7'
        WHEN dd <= 15 THEN '8-15' WHEN dd <= 30 THEN '16-30' WHEN dd <= 45 THEN '31-45' WHEN dd <= 60 THEN '46-60'
        WHEN dd <= 90 THEN '61-90' WHEN dd <= 120 THEN '91-120' WHEN dd <= 365 THEN '121-365' ELSE '> 365' END AS k,
        count(*) FILTER (WHERE amount>0) AS cobrar, count(*) FILTER (WHERE amount<0) AS pagar, min(dd) AS o FROM (
        SELECT amount, date_diff('day', issuance_date, payment_date) AS dd FROM inv
        WHERE status='paid' AND document_type='invoice') GROUP BY 1 ORDER BY o""")
    I["dso_q"] = q("""SELECT quantile_cont(dd,[0.25,0.5,0.75,0.9]) FILTER (WHERE amount>0),
        quantile_cont(dd,[0.25,0.5,0.75,0.9]) FILTER (WHERE amount<0) FROM (
        SELECT amount, date_diff('day', issuance_date, payment_date) AS dd FROM inv
        WHERE status='paid' AND document_type='invoice' AND payment_date BETWEEN issuance_date - INTERVAL 30 DAY AND issuance_date + INTERVAL 730 DAY)""")[0]
    I["late_payment"] = rows("""SELECT CASE WHEN dd < -30 THEN 'muy anticipado (< −30)' WHEN dd < 0 THEN 'anticipado' WHEN dd = 0 THEN 'puntual (día vto.)'
        WHEN dd <= 7 THEN '1-7 tarde' WHEN dd <= 30 THEN '8-30 tarde' WHEN dd <= 90 THEN '31-90 tarde' ELSE '> 90 tarde' END AS k,
        count(*) AS n, min(dd) AS o FROM (SELECT date_diff('day', due_date, payment_date) AS dd FROM inv
        WHERE status='paid' AND document_type='invoice' AND due_date BETWEEN DATE '2020-01-01' AND DATE '2030-01-01'
        AND payment_date BETWEEN DATE '2020-01-01' AND DATE '2030-01-01') GROUP BY 1 ORDER BY o""")
    I["on_time_share"] = one("""SELECT avg((payment_date <= due_date)::int) FROM inv
        WHERE status='paid' AND document_type='invoice' AND due_date BETWEEN DATE '2020-01-01' AND DATE '2030-01-01'
        AND payment_date BETWEEN DATE '2020-01-01' AND DATE '2030-01-01'""")
    I["overdue_aging"] = rows(f"""SELECT CASE WHEN dd <= 0 THEN 'no vencida aún' WHEN dd <= 30 THEN '1-30' WHEN dd <= 60 THEN '31-60'
        WHEN dd <= 90 THEN '61-90' WHEN dd <= 180 THEN '91-180' WHEN dd <= 365 THEN '181-365' ELSE '> 365' END AS k,
        count(*) AS n, sum(abs(pending_amount)) AS pending, min(dd) AS o FROM (
        SELECT pending_amount, date_diff('day', due_date, DATE '{SNAPSHOT}') AS dd FROM invc WHERE status='overdue'
        AND due_date BETWEEN DATE '2020-01-01' AND DATE '2030-01-01') GROUP BY 1 ORDER BY o""")
    I["overdue_monthly"] = rows("""SELECT strftime(date_trunc('month', issuance_date), '%Y-%m') AS k,
        avg((status='overdue')::int) AS overdue_share, avg((status='paid')::int) AS paid_share FROM invc
        WHERE document_type='invoice' GROUP BY 1 ORDER BY 1""")
    I["overdue_by_company"] = rows("""SELECT b AS k, count(*) AS n, o FROM (SELECT CASE
        WHEN s = 0 THEN '0%' WHEN s < 0.1 THEN '<10%' WHEN s < 0.25 THEN '10-25%' WHEN s < 0.5 THEN '25-50%' ELSE '≥50%' END AS b,
        CASE WHEN s = 0 THEN 0 WHEN s < 0.1 THEN 1 WHEN s < 0.25 THEN 2 WHEN s < 0.5 THEN 3 ELSE 4 END AS o
        FROM (SELECT company_id, avg((status='overdue')::int) AS s FROM inv WHERE document_type='invoice' GROUP BY 1 HAVING count(*)>=20))
        GROUP BY 1,3 ORDER BY o""")
    I["pending_consistency"] = rows("""SELECT status AS k, count(*) AS n,
        avg((pending_amount = 0)::int) AS zero_share, avg((abs(pending_amount) > abs(amount)*1.0001)::int) AS gt_amount
        FROM inv GROUP BY 1 ORDER BY 2 DESC""")
    I["currency"] = rows("SELECT currency AS k, count(*) AS n FROM inv GROUP BY 1 ORDER BY 2 DESC LIMIT 10")
    I["currency_mismatch"] = one("SELECT avg((currency<>accounting_currency)::int) FROM inv")
    I["fx_zero"] = one("SELECT count(*) FROM inv WHERE exchange_rate=0")
    I["fx_one_mismatch"] = one("SELECT count(*) FROM inv WHERE currency<>accounting_currency AND exchange_rate=1")
    I["dates_out_of_range"] = {
        "due_before_2020": one("SELECT count(*) FROM inv WHERE due_date < DATE '2020-01-01'"),
        "due_after_2030": one("SELECT count(*) FROM inv WHERE due_date > DATE '2030-01-01'"),
        "pay_before_2020": one("SELECT count(*) FROM inv WHERE payment_date < DATE '2020-01-01'"),
        "pay_after_2030": one("SELECT count(*) FROM inv WHERE payment_date > DATE '2030-01-01'"),
        "pay_after_snapshot": one(f"SELECT count(*) FROM inv WHERE status='paid' AND payment_date > DATE '{SNAPSHOT}'"),
        "due_before_issue": one("SELECT count(*) FROM inv WHERE due_date < issuance_date"),
        "pay_before_issue": one("SELECT count(*) FROM inv WHERE status='paid' AND payment_date < issuance_date"),
        "paid_pending_nonzero": one("SELECT count(*) FROM inv WHERE status='paid' AND pending_amount<>0"),
    }
    I["per_company_hist"] = rows("""SELECT b AS k, count(*) AS n, o FROM (SELECT CASE
        WHEN n<50 THEN '<50' WHEN n<200 THEN '50…200' WHEN n<500 THEN '200…500' WHEN n<1000 THEN '500…1K'
        WHEN n<2500 THEN '1K…2,5K' WHEN n<5000 THEN '2,5K…5K' WHEN n<10000 THEN '5K…10K' ELSE '≥10K' END AS b,
        CASE WHEN n<50 THEN 0 WHEN n<200 THEN 1 WHEN n<500 THEN 2 WHEN n<1000 THEN 3 WHEN n<2500 THEN 4
        WHEN n<5000 THEN 5 WHEN n<10000 THEN 6 ELSE 7 END AS o
        FROM (SELECT company_id, count(*) AS n FROM inv GROUP BY 1)) GROUP BY 1,3 ORDER BY o""")
    I["per_company_q"] = q("""SELECT quantile_cont(n,[0.1,0.25,0.5,0.75,0.9,0.99]), max(n) FROM (
        SELECT company_id, count(*) AS n FROM inv GROUP BY 1)""")[0]
    I["cp_concentration"] = q("""WITH c AS (SELECT counterparty_id, sum(abs(amount)) AS v FROM invc
        WHERE counterparty_id IS NOT NULL GROUP BY 1),
        r AS (SELECT v, row_number() OVER (ORDER BY v DESC) AS rn, count(*) OVER () AS n, sum(v) OVER () AS tot FROM c)
        SELECT sum(v) FILTER (WHERE rn<=n*0.01)/max(tot), sum(v) FILTER (WHERE rn<=n*0.1)/max(tot), max(n) FROM r""")[0]
    I["cp_per_company_q"] = q("""SELECT quantile_cont(n,[0.25,0.5,0.75,0.9]) FROM (
        SELECT company_id, count(DISTINCT counterparty_id) AS n FROM inv GROUP BY 1)""")[0][0]
    I["cp_invoices_hist"] = rows("""SELECT b AS k, count(*) AS n, o FROM (SELECT CASE
        WHEN n=1 THEN '1' WHEN n<=5 THEN '2-5' WHEN n<=20 THEN '6-20' WHEN n<=100 THEN '21-100' ELSE '>100' END AS b,
        CASE WHEN n=1 THEN 0 WHEN n<=5 THEN 1 WHEN n<=20 THEN 2 WHEN n<=100 THEN 3 ELSE 4 END AS o
        FROM (SELECT counterparty_id, count(*) AS n FROM inv WHERE counterparty_id IS NOT NULL GROUP BY 1))
        GROUP BY 1,3 ORDER BY o""")
    I["weekday"] = rows("SELECT dayofweek(issuance_date) AS k, count(*) AS n FROM inv GROUP BY 1 ORDER BY 1")
    I["dom"] = rows("SELECT day(issuance_date) AS k, count(*) AS n FROM inv GROUP BY 1 ORDER BY 1")
    I["concept_placeholders"] = rows("""SELECT k, sum((concept LIKE '%' || k || '%')::int) AS n FROM inv,
        (SELECT unnest(['COUNTERPARTY_','[COMPANY]','[PERSON]','[NAME]','[X]','[NUM]','[REF]','[TAXID]','[IBAN]']) AS k)
        GROUP BY 1 ORDER BY 2 DESC""")
    I["concept_top"] = rows("SELECT concept AS k, count(*) AS n FROM inv GROUP BY 1 ORDER BY 2 DESC LIMIT 12")

    # ------------------------------------------------------------------ cruces
    log("cruces factura ↔ movimiento")
    X = out["cross"] = {}
    X["cp_overlap"] = q("""SELECT count(*) FILTER (WHERE t AND i), count(*) FILTER (WHERE t AND NOT i),
        count(*) FILTER (WHERE i AND NOT t) FROM (
        SELECT counterparty_id, bool_or(src='t') AS t, bool_or(src='i') AS i FROM (
            SELECT DISTINCT counterparty_id, 't' AS src FROM tx WHERE counterparty_id IS NOT NULL
            UNION ALL SELECT DISTINCT counterparty_id, 'i' FROM inv WHERE counterparty_id IS NOT NULL) GROUP BY 1)""")[0]
    X["cp_overlap_with_desc"] = one("""SELECT count(*) FROM (
        SELECT DISTINCT regexp_extract(description, 'COUNTERPARTY_[0-9]+') AS c FROM tx WHERE counterparty_id IS NULL
        AND description LIKE '%COUNTERPARTY_%') WHERE c IN (SELECT DISTINCT counterparty_id FROM inv WHERE counterparty_id IS NOT NULL)""")
    # emparejamiento exacto: misma empresa, misma contraparte, mismo importe absoluto, movimiento en ±60 días del vencimiento
    con.sql("""CREATE TABLE inv_paid AS SELECT operation_id, company_id, counterparty_id, abs(amount) AS a, issuance_date, due_date, payment_date, amount
        FROM inv WHERE status='paid' AND document_type='invoice' AND counterparty_id IS NOT NULL AND amount<>0""")
    con.sql("""CREATE TABLE tx_cp AS SELECT transaction_id, company_id,
        coalesce(counterparty_id, regexp_extract(description, 'COUNTERPARTY_[0-9]+')) AS cp, abs(amount) AS a, date, amount
        FROM tx WHERE counterparty_id IS NOT NULL OR description LIKE '%COUNTERPARTY_%'""")
    X["match"] = q("""WITH m AS (
        SELECT i.operation_id, count(*) AS c, min(abs(date_diff('day', i.due_date, t.date))) AS lag
        FROM inv_paid i JOIN tx_cp t ON i.company_id=t.company_id AND i.counterparty_id=t.cp AND i.a=t.a
        AND t.date BETWEEN i.issuance_date - INTERVAL 30 DAY AND i.issuance_date + INTERVAL 365 DAY GROUP BY 1)
        SELECT (SELECT count(*) FROM inv_paid), count(*), count(*) FILTER (WHERE c=1) FROM m""")[0]
    X["match_lag"] = rows("""WITH m AS (
        SELECT i.operation_id, i.amount, min(date_diff('day', i.due_date, t.date)) AS lag
        FROM inv_paid i JOIN tx_cp t ON i.company_id=t.company_id AND i.counterparty_id=t.cp AND i.a=t.a
        AND t.date BETWEEN i.issuance_date - INTERVAL 30 DAY AND i.issuance_date + INTERVAL 365 DAY GROUP BY 1,2)
        SELECT CASE WHEN lag < -30 THEN '< −30' WHEN lag < -7 THEN '−30…−8' WHEN lag < 0 THEN '−7…−1' WHEN lag = 0 THEN '0'
        WHEN lag <= 7 THEN '1…7' WHEN lag <= 30 THEN '8…30' WHEN lag <= 90 THEN '31…90' ELSE '> 90' END AS k,
        count(*) FILTER (WHERE amount>0) AS cobrar, count(*) FILTER (WHERE amount<0) AS pagar, min(lag) AS o FROM m GROUP BY 1 ORDER BY o""")
    X["match_sign"] = q("""SELECT avg((sign(i.amount) = sign(t.amount))::int) FROM inv_paid i JOIN tx_cp t
        ON i.company_id=t.company_id AND i.counterparty_id=t.cp AND i.a=t.a
        AND t.date BETWEEN i.issuance_date - INTERVAL 30 DAY AND i.issuance_date + INTERVAL 365 DAY""")[0][0]
    X["company_profile"] = rows("""SELECT c.company_id, c.currency, coalesce(c.erp,'') AS erp,
        (SELECT count(*) FROM bp WHERE bp.company_id=c.company_id) AS bank_products,
        (SELECT count(*) FROM dp WHERE dp.company_id=c.company_id) AS debt_products,
        (SELECT count(*) FROM tx WHERE tx.company_id=c.company_id) AS tx,
        (SELECT count(*) FROM inv WHERE inv.company_id=c.company_id) AS inv,
        (SELECT sum(balance) FROM balances b JOIN bp USING (product_id) WHERE b.company_id=c.company_id AND abs(balance)<1e9) AS balance
        FROM companies c ORDER BY tx DESC LIMIT 15""")

    # ------------------------------------------------------------------ cuadro de amortización
    log("cuadro de amortización")
    out["debt_schedule"] = {
        "interest_type": rows("SELECT interest_type AS k, count(*) AS n FROM dsc GROUP BY 1 ORDER BY 2 DESC"),
        "frequency": rows("SELECT amortising_frequency AS k, count(*) AS n FROM dsc GROUP BY 1 ORDER BY 2 DESC"),
        "calc": rows("SELECT interest_calc_method AS k, count(*) AS n FROM dsc GROUP BY 1 ORDER BY 2 DESC"),
        "rate_hist": rows("""SELECT round(annual_interest_rate_or_spread*100, 1) AS k, count(*) AS n,
            interest_type FROM dsc GROUP BY 1,3 ORDER BY 1"""),
        "rate_q": q("SELECT quantile_cont(annual_interest_rate_or_spread,[0.25,0.5,0.75]) FROM dsc")[0][0],
        "periods_hist": rows("""SELECT CASE WHEN total_periods<=12 THEN '≤12' WHEN total_periods<=36 THEN '13-36'
            WHEN total_periods<=60 THEN '37-60' WHEN total_periods<=120 THEN '61-120' ELSE '>120' END AS k, count(*) AS n,
            min(total_periods) AS o FROM dsc GROUP BY 1 ORDER BY o"""),
        "remaining": rows("""SELECT CASE WHEN r<0.25 THEN '<25%' WHEN r<0.5 THEN '25-50%' WHEN r<0.75 THEN '50-75%'
            WHEN r<=1 THEN '75-100%' ELSE '>100%' END AS k, count(*) AS n, min(r) AS o FROM (
            SELECT outstanding_balance/nullif(granted_balance,0) AS r FROM dsc) WHERE r IS NOT NULL GROUP BY 1 ORDER BY o"""),
        "next_payment": rows("""SELECT strftime(date_trunc('month', CAST(next_payment_date AS DATE)), '%Y-%m') AS k, count(*) AS n
            FROM dsc GROUP BY 1 ORDER BY 1"""),
        "next_payment_past": one(f"SELECT count(*) FROM dsc WHERE CAST(next_payment_date AS DATE) < DATE '{SNAPSHOT}'"),
        "settlement_orphan": one("SELECT count(*) FROM dsc WHERE settlement_product_id NOT IN (SELECT product_id FROM bp)"),
        "type_match": rows("""SELECT dp.type AS k, count(*) AS n FROM dsc JOIN dp USING (product_id) GROUP BY 1 ORDER BY 2 DESC"""),
        "sign_mismatch": one("""SELECT count(*) FROM dsc JOIN dp USING (product_id)
            WHERE abs(abs(dp.outstanding) - dsc.outstanding_balance) > 1"""),
        "granted_zero": one("SELECT count(*) FROM dsc WHERE granted_balance=0"),
    }

    # ------------------------------------------------------------------ calidad
    log("calidad")
    out["quality"] = {
        "tx_orphan_product": one("SELECT count(*) FROM tx WHERE product_id NOT IN (SELECT product_id FROM products)"),
        "tx_orphan_company": one("SELECT count(*) FROM tx WHERE company_id NOT IN (SELECT company_id FROM companies)"),
        "tx_dup_id": one("SELECT count(*) - count(DISTINCT transaction_id) FROM tx"),
        "tx_zero_amount": one("SELECT count(*) FROM tx WHERE amount=0"),
        "tx_status_null": one("SELECT count(*) FROM tx WHERE status IS NULL"),
        "tx_category_dash": one("SELECT count(*) FROM tx WHERE category='-'"),
        "tx_desc_tests": one("SELECT count(*) FROM tx WHERE lower(description) IN ('test','tests','prueba')"),
        "tx_exact_dups": one("""SELECT sum(c-1) FROM (SELECT count(*) AS c FROM tx
            GROUP BY company_id, product_id, date, amount, description HAVING count(*)>1)"""),
        "inv_dup_id": one("SELECT count(*) - count(DISTINCT operation_id) FROM inv"),
        "inv_zero_amount": one("SELECT count(*) FROM inv WHERE amount=0"),
        "inv_cp_null": one("SELECT count(*) FROM inv WHERE counterparty_id IS NULL"),
        "inv_concept_null": one("SELECT count(*) FROM inv WHERE concept IS NULL OR trim(concept)=''"),
        "bp_currency_vs_company": one("""SELECT count(*) FROM bp JOIN companies USING (company_id)
            WHERE bp.currency <> companies.currency"""),
        "dp_currency_vs_company": one("""SELECT count(*) FROM dp JOIN companies USING (company_id)
            WHERE dp.currency <> companies.currency"""),
        "bp_created_after_snapshot": one(f"SELECT count(*) FROM bp WHERE CAST(created_at AS DATE) > DATE '{SNAPSHOT}'"),
        "tx_before_product_created": one("""SELECT count(*) FROM tx JOIN products p USING (product_id)
            WHERE tx.date < p.created_at"""),
        "companies_no_products": one("SELECT count(*) FROM companies WHERE company_id NOT IN (SELECT company_id FROM products)"),
        "groups_size_mismatch": one("""SELECT count(*) FROM groups g JOIN (SELECT group_id, count(*) AS n FROM companies GROUP BY 1) c
            USING (group_id) WHERE g.n_companies_in_sample <> c.n"""),
    }

    log(f"escribiendo {args.out}")

    def default(o):
        if isinstance(o, (dt.date, dt.datetime)):
            return o.isoformat()
        if isinstance(o, dt.timedelta):
            return o.days
        raise TypeError(str(type(o)))

    with open(args.out, "w") as f:
        json.dump(out, f, ensure_ascii=False, default=default)
    log("hecho")


if __name__ == "__main__":
    main()
