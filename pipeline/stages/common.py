"""Utilidades compartidas por las etapas: conexión, export a parquet, registro de métricas."""
from __future__ import annotations

import json
import time
from pathlib import Path

import duckdb

from config import DATA_DIR, DB_PATH


def connect() -> duckdb.DuckDBPyConnection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(DB_PATH))
    con.sql("SET preserve_insertion_order=false")
    for schema in ("bronze", "silver", "gold", "meta"):
        con.sql(f"CREATE SCHEMA IF NOT EXISTS {schema}")
    con.sql("""CREATE TABLE IF NOT EXISTS meta.runs (
        stage VARCHAR, table_name VARCHAR, rows BIGINT, seconds DOUBLE, ran_at TIMESTAMP, detail JSON)""")
    return con


class Stage:
    """Contexto de una etapa: mide tiempos, cuenta filas y exporta cada tabla a parquet."""

    def __init__(self, con: duckdb.DuckDBPyConnection, name: str, layer: str):
        self.con, self.name, self.layer = con, name, layer
        self.t0 = time.time()
        self.out_dir = DATA_DIR / layer
        self.out_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n=== {name} → {layer}/")

    def log(self, msg: str) -> None:
        print(f"  [{time.time() - self.t0:6.1f}s] {msg}", flush=True)

    def create(self, table: str, sql: str, detail: dict | None = None) -> int:
        """CREATE OR REPLACE <layer>.<table> AS <sql>; exporta a parquet y registra filas."""
        t = time.time()
        self.con.sql(f"CREATE OR REPLACE TABLE {self.layer}.{table} AS {sql}")
        n = self.con.sql(f"SELECT count(*) FROM {self.layer}.{table}").fetchone()[0]
        self.con.sql(f"COPY {self.layer}.{table} TO '{self.out_dir / (table + '.parquet')}' (FORMAT PARQUET, COMPRESSION ZSTD)")
        self.con.execute("INSERT INTO meta.runs VALUES (?, ?, ?, ?, now(), ?)",
                         [self.name, f"{self.layer}.{table}", n, time.time() - t, json.dumps(detail or {})])
        self.log(f"{self.layer}.{table}: {n:,} filas")
        return n

    def flag_counts(self, table: str, flag_col: str = "flags") -> dict[str, int]:
        rows = self.con.sql(f"""SELECT f, count(*) FROM (SELECT unnest({flag_col}) AS f FROM {self.layer}.{table})
                                GROUP BY 1 ORDER BY 2 DESC""").fetchall()
        return {k: v for k, v in rows}

    def scalar(self, sql: str):
        return self.con.sql(sql).fetchone()[0]


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2, default=str))
