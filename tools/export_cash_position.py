"""Saldo de caja real (EUR) por empresa y mes, reconstruido desde los CSV originales del reto
(balances.csv + transactions.csv + banking_products.csv) — mismo método que documenta
analytics/README.md ("saldo real reconstruido hacia atrás desde balances.csv"), recalculado aquí
porque el parquet ya procesado (gold/company_month.parquet) no está disponible. No usa nada de
scores_v3.csv ni de ningún fichero inventado: es 100% trazable a los 3 CSV crudos.

Método:
  1. Cuentas de caja = banking_products.type == 'checking' (docs/salud.md: "saldo = suma
     acumulada de amount por cuenta checking").
  2. balances.csv da un saldo real por cuenta a una fecha ("snapshot", ~2026-09-01, o la más
     cercana con dato para esa cuenta).
  3. Para cualquier mes anterior: saldo_fin_de_mes = saldo_snapshot − Σ(amount de esa cuenta entre
     fin_de_mes (excl.) y snapshot (incl.)). Se calcula con sumas mensuales acumuladas, no una por
     una, por rendimiento (2,5 M filas en transactions.csv).
  4. Caja de la empresa ese mes = suma de sus cuentas checking con dato ese mes (si ninguna cuenta
     tiene aún historia, el mes queda a null — nunca a 0, no se inventa).

Uso:
    python tools/export_cash_position.py     # -> output/02_score/cash_position.csv
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
RAW_DIR = REPO / "output"  # CSV crudos del reto, descomprimidos aquí (ver output/README.md)

MONTHS = pd.period_range("2024-09", "2026-09", freq="M")  # incluye 2026-09 solo para calibrar K
OUTPUT_MONTHS = pd.period_range("2024-09", "2026-08", freq="M")  # 2026-09 no se publica (1 solo día)


def main() -> None:
    bp = pd.read_csv(RAW_DIR / "banking_products.csv", usecols=["product_id", "company_id", "type"])
    checking = bp[bp.type == "checking"]
    checking_ids = set(checking.product_id)
    print(f"cuentas checking: {len(checking)} de {len(bp)} productos bancarios")

    bal = pd.read_csv(RAW_DIR / "balances.csv", usecols=["product_id", "company_id", "date", "balance"])
    bal = bal[bal.product_id.isin(checking_ids)].copy()
    bal["date"] = pd.to_datetime(bal.date)
    bal["snapshot_month"] = bal.date.dt.to_period("M")
    print(f"cuentas checking con saldo en balances.csv: {len(bal)}")

    # transactions.csv es grande (2,5M filas): filtrar por producto en chunks para no cargarlo entero.
    nets = []
    for chunk in pd.read_csv(
        RAW_DIR / "transactions.csv", usecols=["product_id", "date", "amount"], chunksize=500_000
    ):
        sub = chunk[chunk.product_id.isin(checking_ids)]
        if len(sub):
            nets.append(sub)
    tx = pd.concat(nets, ignore_index=True)
    tx["month"] = pd.to_datetime(tx.date).dt.to_period("M")
    monthly_net = tx.groupby(["product_id", "month"]).amount.sum()
    print(f"movimientos en cuentas checking: {len(tx):,} · {monthly_net.index.get_level_values(0).nunique()} cuentas con movimientos")

    rows = []
    for _, b in bal.iterrows():
        pid, company_id, snapshot_bal, snap_month = b.product_id, b.company_id, b.balance, b.snapshot_month
        if pid not in monthly_net.index.get_level_values(0):
            continue
        series = monthly_net.xs(pid, level=0).reindex(MONTHS, fill_value=0.0)
        cum = series.cumsum()
        if snap_month not in cum.index:
            continue  # snapshot fuera del rango de meses del dataset (no debería pasar)
        k = snapshot_bal - cum.loc[snap_month]
        first_month = tx[tx.product_id == pid].date.min()
        first_month = pd.to_datetime(first_month).to_period("M")
        for m in OUTPUT_MONTHS:
            if m < first_month:
                continue
            rows.append({"company_id": company_id, "product_id": pid, "month": str(m), "balance_eom": k + cum.loc[m]})

    per_account = pd.DataFrame(rows)
    print(f"filas cuenta×mes reconstruidas: {len(per_account):,}")

    per_company = (
        per_account.groupby(["company_id", "month"], as_index=False)
        .balance_eom.sum(min_count=1)
        .rename(columns={"balance_eom": "cash_position"})
    )
    dest = REPO / "output" / "02_score" / "cash_position.csv"
    per_company.sort_values(["company_id", "month"]).to_csv(dest, index=False)
    print(f"{dest}: {len(per_company)} filas · {per_company.company_id.nunique()} empresas")


if __name__ == "__main__":
    main()
