"""Controles de calidad sobre bronze/silver/gold + informe (data/quality/REPORT.md y checks.json).

Cada check es una consulta que devuelve un número; `expect` lo compara. Los checks `critical`
hacen fallar el pipeline (exit 1); los `warn` solo se reportan.
"""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

import config as C
from stages.common import DATA_DIR, Stage, write_json


@dataclass
class Check:
    name: str
    sql: str
    expect: str = "== 0"        # expresión Python evaluada como  value <expect>
    severity: str = "critical"  # critical | warn
    note: str = ""


CHECKS = [
    # --- conservación de filas ----------------------------------------------------------------
    Check("bronze.transactions = filas del CSV oficial", "SELECT count(*) - 2556437 FROM bronze.transactions", "== 0", "warn",
          "el diccionario declara 2.556.437 filas"),
    Check("bronze.invoices = filas del CSV oficial", "SELECT count(*) - 897894 FROM bronze.invoices", "== 0", "warn"),
    Check("filas rechazadas por el parser", "SELECT count(*) FROM meta.rejects", "== 0", "warn"),
    Check("silver.transactions conserva todas las filas", "SELECT (SELECT count(*) FROM silver.transactions) - (SELECT count(*) FROM bronze.transactions)"),
    Check("silver.invoices conserva todas las filas", "SELECT (SELECT count(*) FROM silver.invoices) - (SELECT count(*) FROM bronze.invoices)"),
    Check("silver.products = bancarios + deuda", "SELECT (SELECT count(*) FROM silver.products) - (SELECT count(*) FROM bronze.banking_products) - (SELECT count(*) FROM bronze.debt_products)"),
    # --- claves ---------------------------------------------------------------------------------
    Check("transaction_id único", "SELECT count(*) - count(DISTINCT transaction_id) FROM silver.transactions"),
    Check("operation_id único", "SELECT count(*) - count(DISTINCT operation_id) FROM silver.invoices"),
    Check("product_id único", "SELECT count(*) - count(DISTINCT product_id) FROM silver.products"),
    Check("company_id único", "SELECT count(*) - count(DISTINCT company_id) FROM silver.companies"),
    Check("balances: un saldo por producto", "SELECT count(*) - count(DISTINCT product_id) FROM silver.balances"),
    # --- integridad referencial -----------------------------------------------------------------
    Check("tx.company_id resuelve", "SELECT count(*) FROM silver.transactions WHERE company_id NOT IN (SELECT company_id FROM silver.companies)"),
    Check("inv.company_id resuelve", "SELECT count(*) FROM silver.invoices WHERE company_id NOT IN (SELECT company_id FROM silver.companies)"),
    Check("companies.group_id resuelve", "SELECT count(*) FROM silver.companies WHERE group_id NOT IN (SELECT group_id FROM silver.groups)"),
    Check("tx con producto desconocido (flag product_unknown)", "SELECT count(*) FROM silver.transactions WHERE list_contains(flags, 'product_unknown')", "<= 2000", "warn",
          "1.314 en el dataset original; se conservan con product_family NULL"),
    Check("tx cuyo producto pertenece a otra empresa", "SELECT count(*) FROM silver.transactions WHERE list_contains(flags, 'product_company_mismatch')"),
    # --- dominios ------------------------------------------------------------------------------
    Check("country normalizado a ISO-2 (o null)", "SELECT count(*) FROM silver.companies WHERE country IS NOT NULL AND NOT regexp_matches(country, '^[A-Z]{2}$')"),
    Check("erp sin mapear (prefijo other:)", "SELECT count(*) FROM silver.companies WHERE erp LIKE 'other:%' OR group_erp LIKE 'other:%'", "== 0", "warn"),
    Check("categoría vacía o '-' tras limpiar", "SELECT count(*) FROM silver.transactions WHERE category IS NULL OR category IN ('', '-')"),
    Check("categorías recuperadas por regla (informativo)", "SELECT count(*) FROM silver.transactions WHERE category_source = 'rule'", ">= 0", "warn"),
    Check("status de tx fuera de dominio", "SELECT count(*) FROM silver.transactions WHERE status NOT IN ('booked', 'pending')"),
    Check("direction consistente con el signo", "SELECT count(*) FROM silver.transactions WHERE (amount > 0 AND direction <> 'in') OR (amount < 0 AND direction <> 'out')"),
    Check("status de factura fuera de dominio", "SELECT count(*) FROM silver.invoices WHERE status NOT IN ('paid','overdue','pending','cancelled','payment_in_progress','payment_order','shipped')"),
    # --- fechas ---------------------------------------------------------------------------------
    Check("tx.date dentro del periodo", f"SELECT count(*) FROM silver.transactions WHERE date NOT BETWEEN DATE '{C.PERIOD_START}' AND DATE '{C.SNAPSHOT}'"),
    Check("inv.issuance_date dentro del periodo", f"SELECT count(*) FROM silver.invoices WHERE issuance_date NOT BETWEEN DATE '{C.PERIOD_START}' AND DATE '{C.SNAPSHOT}'"),
    Check("due_date limpia dentro de la ventana", f"SELECT count(*) FROM silver.invoices WHERE due_date NOT BETWEEN DATE '{C.DATE_MIN}' AND DATE '{C.DATE_MAX}'"),
    Check("payment_date limpia dentro de la ventana", f"SELECT count(*) FROM silver.invoices WHERE payment_date NOT BETWEEN DATE '{C.DATE_MIN}' AND DATE '{C.DATE_MAX}'"),
    Check("value_date limpia a ≤ 365 días de date", "SELECT count(*) FROM silver.transactions WHERE abs(value_lag_days) > 365"),
    # --- importes -------------------------------------------------------------------------------
    Check("gold: sin importes ≥ umbral global", f"SELECT count(*) FROM gold.fact_transactions WHERE abs_amount >= {C.AMOUNT_OUTLIER_ABS}"),
    Check("gold: sin facturas ≥ umbral global", f"SELECT count(*) FROM gold.fact_invoices WHERE abs_amount >= {C.AMOUNT_OUTLIER_ABS}"),
    Check("gold: sin importes 0", "SELECT count(*) FROM gold.fact_transactions WHERE amount = 0"),
    Check("gold: sin datos de prueba", "SELECT count(*) FROM gold.fact_transactions WHERE lower(trim(description)) IN ('test','tests')"),
    Check("exchange_rate limpia > 0", "SELECT count(*) FROM silver.transactions WHERE exchange_rate <= 0"),
    Check("amount_company_ccy definido cuando misma moneda", "SELECT count(*) FROM silver.transactions WHERE product_currency = company_currency AND amount_company_ccy IS NULL"),
    Check("tx multidivisa sin conversión posible (flag fx_rate_missing)", "SELECT count(*) FROM silver.transactions WHERE list_contains(flags, 'fx_rate_missing')", "< 20000", "warn"),
    Check("pending_amount = 0 en pagadas/canceladas", "SELECT count(*) FROM silver.invoices WHERE status IN ('paid','cancelled') AND pending_amount <> 0"),
    # --- gold -----------------------------------------------------------------------------------
    Check("fact_transactions ⊂ silver válidas", "SELECT (SELECT count(*) FROM gold.fact_transactions) - (SELECT count(*) FROM silver.transactions WHERE is_valid)"),
    Check("fact_invoices ⊂ silver válidas", "SELECT (SELECT count(*) FROM gold.fact_invoices) - (SELECT count(*) FROM silver.invoices WHERE is_valid)"),
    Check("company_month cubre empresas × meses", "SELECT count(*) - (SELECT count(*) FROM silver.companies) * (SELECT count(DISTINCT year_month) FROM gold.dim_calendar) FROM gold.company_month"),
    Check("company_month.n_tx cuadra con fact_transactions", "SELECT (SELECT sum(n_tx) FROM gold.company_month) - (SELECT count(*) FROM gold.fact_transactions)"),
    Check("company_day cubre empresas × días", "SELECT count(*) - (SELECT count(*) FROM silver.companies) * (SELECT count(*) FROM gold.dim_calendar) FROM gold.company_day"),
    Check("saldo reconstruido = saldo snapshot en la fecha de corte", f"SELECT count(*) FROM gold.product_day_balance WHERE date = DATE '{C.SNAPSHOT}' AND abs(balance_eod - balance_snapshot) > 0.01"),
    Check("saldo reconstruido: Δsaldo = Σ flujos", """SELECT count(*) FROM (
            SELECT product_id, arg_max(balance_eod, date) - arg_min(balance_eod, date) AS delta, sum(net) - arg_min(net, date) AS flows
            FROM gold.product_day_balance WHERE is_observed GROUP BY 1) WHERE abs(delta - flows) > 0.01"""),
    Check("saldo reconstruido: nulo antes del primer movimiento", "SELECT count(*) FROM gold.product_day_balance WHERE NOT is_observed AND balance_eod IS NOT NULL"),
    Check("invoice_tx_match: is_best asigna cada tx a ≤ 1 factura", "SELECT count(*) FROM (SELECT transaction_id FROM gold.invoice_tx_match WHERE is_best GROUP BY 1 HAVING count(*) > 1)"),
    Check("invoice_tx_match: is_best asigna cada factura a ≤ 1 tx", "SELECT count(*) FROM (SELECT operation_id FROM gold.invoice_tx_match WHERE is_best GROUP BY 1 HAVING count(*) > 1)"),
    Check("dim_counterparty sin duplicados", "SELECT count(*) - count(DISTINCT (company_id, counterparty_id)) FROM gold.dim_counterparty"),
]


def run(con) -> bool:
    st = Stage(con, "quality", "quality")
    results = []
    for ch in CHECKS:
        try:
            value = con.sql(ch.sql).fetchone()[0]
            value = 0 if value is None else value
            ok = bool(eval(f"{value} {ch.expect}"))
        except Exception as e:  # noqa: BLE001
            value, ok = f"ERROR: {e}", False
        results.append({"name": ch.name, "value": value, "expect": ch.expect, "ok": ok, "severity": ch.severity, "note": ch.note})
        st.log(f"{'✓' if ok else ('✗' if ch.severity == 'critical' else '⚠')} {ch.name}: {value} (esperado {ch.expect})")

    # --- inventario de tablas y flags -------------------------------------------------------------
    tables = con.sql("""SELECT schema_name, table_name, estimated_size FROM duckdb_tables()
                        WHERE schema_name IN ('bronze','silver','gold') ORDER BY 1, 2""").fetchall()
    inventory = [{"schema": s, "table": t, "rows": con.sql(f"SELECT count(*) FROM {s}.{t}").fetchone()[0]} for s, t, _ in tables]
    flags = {}
    for t in ("transactions", "invoices", "balances", "products", "debt_schedule", "companies", "groups"):
        total = con.sql(f"SELECT count(*) FROM silver.{t}").fetchone()[0]
        fc = con.sql(f"SELECT f, count(*) FROM (SELECT unnest(flags) f FROM silver.{t}) GROUP BY 1 ORDER BY 2 DESC").fetchall()
        valid = con.sql(f"SELECT count(*) FROM silver.{t} WHERE is_valid").fetchone()[0] if t not in ("companies", "groups") else total
        flags[t] = {"rows": total, "valid": valid, "invalidating": sorted(C.INVALIDATING_FLAGS.get(t, set())),
                    "flags": [{"flag": f, "n": n, "share": n / total} for f, n in fc]}

    failed = [r for r in results if not r["ok"] and r["severity"] == "critical"]
    warned = [r for r in results if not r["ok"] and r["severity"] == "warn"]
    report = {"ran_at": dt.datetime.now().isoformat(timespec="seconds"), "passed": not failed, "checks": results,
              "inventory": inventory, "flags": flags,
              "config": {k: (sorted(v) if isinstance(v, set) else v) for k, v in vars(C).items()
                         if k.isupper() and not k.endswith("_DIR") and k != "DB_PATH" and k != "ROOT"}}
    write_json(DATA_DIR / "quality" / "checks.json", report)
    (DATA_DIR / "quality" / "REPORT.md").write_text(render_md(report, failed, warned))
    st.log(f"informe → {DATA_DIR / 'quality' / 'REPORT.md'}  ({len(results)} checks, {len(failed)} críticos fallidos, {len(warned)} avisos)")
    return not failed


def render_md(rep: dict, failed: list, warned: list) -> str:
    L = [f"# Informe de calidad del pipeline\n", f"Generado: {rep['ran_at']}  ·  Estado: **{'OK' if rep['passed'] else 'FALLIDO'}**  "
         f"({len(rep['checks'])} checks · {len(failed)} críticos fallidos · {len(warned)} avisos)\n"]
    L.append("## Tablas\n\n| capa | tabla | filas |\n|---|---|---:|")
    L += [f"| {i['schema']} | {i['table']} | {i['rows']:,} |" for i in rep["inventory"]]
    L.append("\n## Flags por tabla (silver)\n")
    for t, f in rep["flags"].items():
        L.append(f"### {t} — {f['rows']:,} filas · {f['valid']:,} válidas ({f['valid'] / max(f['rows'], 1):.1%})"
                 + (f" · invalidan: `{'`, `'.join(f['invalidating'])}`" if f["invalidating"] else "") + "\n")
        if f["flags"]:
            L.append("| flag | filas | % |\n|---|---:|---:|")
            L += [f"| `{x['flag']}` | {x['n']:,} | {x['share']:.2%} |" for x in f["flags"]]
        else:
            L.append("_sin flags_")
        L.append("")
    L.append("## Checks\n\n| | check | valor | esperado | severidad |\n|---|---|---:|---|---|")
    for r in rep["checks"]:
        mark = "✓" if r["ok"] else ("✗" if r["severity"] == "critical" else "⚠")
        L.append(f"| {mark} | {r['name']}{(' — ' + r['note']) if r['note'] else ''} | {r['value']} | `{r['expect']}` | {r['severity']} |")
    L.append("\n## Configuración aplicada\n\n```json")
    import json
    L.append(json.dumps(rep["config"], ensure_ascii=False, indent=2, default=str))
    L.append("```\n")
    return "\n".join(L)
