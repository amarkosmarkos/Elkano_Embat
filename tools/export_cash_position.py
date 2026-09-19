"""Extrae el saldo de caja real (EUR) por empresa y mes desde el gold del pipeline, para
cash-pooling y "excedentes" (necesitan un importe real; scores_v3.csv no lo lleva, solo el score
y las contribuciones c_*). No es un dato de score: es un hecho anterior al modelo (saldo bancario
reconstruido de balances.csv), así que no cambia aunque se reentrene v3.

Uso:
    python tools/export_cash_position.py     # -> output/02_score/cash_position.csv

Fuente: gold/company_month.parquet (01_preprocessed, no está en el repo — 646 MB de datos crudos,
regenerable con ./pipeline/run.sh; ver output/README.md). Se lee de donde se haya descomprimido/
generado el pipeline en esta máquina.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
RAW_DIR = Path("/home/iamludok/Luken/HackSpain/output_hackspain_data/output")


def main() -> None:
    cm = pd.read_parquet(RAW_DIR / "01_preprocessed" / "gold" / "company_month.parquet")
    out = cm[["company_id", "year_month", "balance_eom"]].rename(
        columns={"year_month": "month", "balance_eom": "cash_position"}
    )
    out = out.sort_values(["company_id", "month"])
    dest = REPO / "output" / "02_score" / "cash_position.csv"
    out.to_csv(dest, index=False)
    print(f"{dest}: {len(out)} filas · {out.company_id.nunique()} empresas")


if __name__ == "__main__":
    main()
