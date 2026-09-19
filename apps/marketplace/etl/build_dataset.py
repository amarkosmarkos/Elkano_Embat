"""Reshape the real v3 score outputs into the JSON the marketplace UI reads.

Runs at Docker build time (python:3.12 + pandas + pyarrow). It does NOT compute any metric:
every number written here exists verbatim in the pipeline outputs. All derived calculations
(trend, momentum, qualification, portfolio, monitoring, actions) live in the frontend under
`src/lib/derived.ts`, `src/lib/portfolio.ts`, `src/lib/monitor.ts` and `src/lib/actions.ts`.

Inputs (repo `output/`):
  02_score/scores_v3.csv        score, c_<dim> contributions, alert, explanation (per company-month)
  02_score/scores_v2.csv        metric-level explanation ("colchon 1.93 -> 0.85") for the same rows
  02_score/metrics_v1.parquet   the 24 base metrics, their trajectories and the 8 stress flags
  companies.csv, groups.csv     identity: group, country, currency, ERP

Outputs (`public/data/`):
  network.json                  index: one entry per scored company with its full score history
  companies/<id>.json           detail: full 24-month metric series, pipeline trajectory (delta_3m/12m, racha),
                                stress flags, explanations

The dataset is anonymised (COMP_xxxx). Display names are deterministic aliases derived from the
company id so the demo reads like a product; the real id is always kept alongside.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

DIMS = ["pago", "liquidez", "caja", "deuda", "concentracion"]
BASE_METRICS = [
    "retraso_pago", "pct_pago_tarde", "falta_regular", "dso", "pct_cobro_vencido", "devoluciones",
    "colchon", "runway", "dias_negativo", "credito_disponible",
    "neto_operativo", "tendencia_3m", "tendencia_6m", "volatilidad", "ratio_cobros_pagos", "crecimiento_cobros",
    "pct_dispuesto", "servicio_deuda", "coste_financiero", "deuda_cobros",
    "top5_clientes", "hhi", "rating_cartera", "clientes_activos",
]
STRESS = ["S1_descubierto", "S2_coste_disparado", "S3_falta_regular", "S4_lineas_limite",
          "S5_cobros_vencidos", "S6_paga_tarde_peor", "S7_devoluciones", "S8_caja_negativa"]
# metrics shown on network cards / used by filters (latest month only)
CARD_METRICS = ["colchon", "runway", "dias_negativo", "neto_operativo", "tendencia_6m", "retraso_pago",
                "pct_pago_tarde", "dso", "pct_cobro_vencido", "pct_dispuesto", "credito_disponible",
                "crecimiento_cobros", "hhi", "clientes_activos", "volatilidad", "deuda_cobros"]

# --- deterministic display aliases (the dataset has no names) -------------------------------------
FIRST = ["Nova", "Alder", "Meridian", "Sable", "Halcyon", "Corvid", "Lumen", "Aster", "Vireo", "Boreal",
         "Cinder", "Delta", "Ember", "Fjord", "Granite", "Helix", "Iris", "Juniper", "Kestrel", "Lariat",
         "Marlow", "Nimbus", "Orion", "Pilar", "Quill", "Rowan", "Solis", "Tamar", "Umbra", "Vega",
         "Wren", "Xenon", "Yarrow", "Zephyr", "Atlas", "Basalt", "Cobalt", "Dune", "Elm", "Flint",
         "Garnet", "Harbor", "Ion", "Jade", "Kite", "Linden", "Mesa", "North", "Onyx", "Pike",
         "Quartz", "Ridge", "Sierra", "Tidal", "Ultra", "Vale", "Willow", "Yield", "Zenith", "Arbor"]
SECOND = ["Industries", "Logistics", "Systems", "Foods", "Energy", "Labs", "Textiles", "Retail", "Media",
          "Marine", "Components", "Packaging", "Mobility", "Robotics", "Pharma", "Steel", "Agro", "Digital",
          "Construction", "Health", "Optics", "Freight", "Materials", "Studio", "Analytics", "Fabrics",
          "Motors", "Networks", "Chemicals", "Print", "Aero", "Capital", "Works", "Group", "Supply"]


COUNTRY_ISO = {"ESPAÑA": "ES", "ESPAÑA ": "ES", "ESPANYA": "ES", "SPAIN": "ES", "PORTUGAL": "PT", "ITALIA": "IT",
               "ALEMANIA": "DE", "MALAYSIA": "MY"}


def country_iso(v) -> str | None:
    """companies.csv mixes ISO-2 codes with spellings ("España", "Espanya"); normalise like the pipeline does."""
    if v is None or pd.isna(v) or not str(v).strip():
        return None
    k = str(v).strip().upper()
    return COUNTRY_ISO.get(k, k if len(k) == 2 else None)


def alias(company_id: str) -> str:
    h = hashlib.sha256(company_id.encode()).digest()
    a = FIRST[h[0] % len(FIRST)]
    b = SECOND[h[1] % len(SECOND)]
    return f"{a} {b}"


def num(x, nd=2):
    """float rounded, None for NaN (JSON has no NaN)."""
    if x is None:
        return None
    try:
        if isinstance(x, str):
            return x
        if math.isnan(float(x)):
            return None
    except (TypeError, ValueError):
        return None
    return round(float(x), nd)


def series(df: pd.DataFrame, col: str, months: list[str], nd=2):
    m = df.set_index("month")[col]
    return [num(m.get(mo), nd) for mo in months]


def main(data: Path, out: Path) -> None:
    s3 = pd.read_csv(data / "02_score" / "scores_v3.csv")
    s2 = pd.read_csv(data / "02_score" / "scores_v2.csv")[["company_id", "month", "score", "explanation"]]
    s2 = s2.rename(columns={"score": "score_v2", "explanation": "explanation_v2"})
    met = pd.read_parquet(data / "02_score" / "metrics_v1.parquet")
    comp = pd.read_csv(data / "companies.csv")
    groups = pd.read_csv(data / "groups.csv")

    months = sorted(s3.month.unique().tolist())
    as_of = months[-1]
    s3 = s3.sort_values(["company_id", "month"])
    d = s3.merge(s2, on=["company_id", "month"], how="left")
    d = d.merge(met[["company_id", "month"] + BASE_METRICS + STRESS + ["n_stress"]], on=["company_id", "month"], how="left")
    met = met.sort_values(["company_id", "month"])
    comp = comp.merge(groups[["group_id", "n_companies_in_sample"]], on="group_id", how="left").set_index("company_id")

    (out / "companies").mkdir(parents=True, exist_ok=True)
    index = []
    for cid, g in d.groupby("company_id", sort=True):
        g = g.sort_values("month")
        last = g.iloc[-1]
        info = comp.loc[cid] if cid in comp.index else None
        entry = {
            "id": cid,
            "name": alias(cid),
            "group": None if info is None or pd.isna(info.group_id) else str(info.group_id),
            "groupSize": None if info is None or pd.isna(info.n_companies_in_sample) else int(info.n_companies_in_sample),
            "country": None if info is None else country_iso(info.country),
            "currency": None if info is None or pd.isna(info.currency) else str(info.currency),
            "erp": None if info is None or pd.isna(info.erp) else str(info.erp),
            "firstMonth": g.month.iloc[0],
            "lastMonth": g.month.iloc[-1],
            "nScored": int(len(g)),
            # aligned to meta.months (null where the company has no score that month)
            "scores": series(g, "score", months),
            "alerts": [None if v is None else int(v) for v in series(g, "alert", months, 0)],
            "stress": [None if v is None else int(v) for v in series(g, "n_stress", months, 0)],
            "components": {dim: series(g, f"c_{dim}", months) for dim in DIMS},
            "latest": {
                "month": last.month,
                "score": num(last.score),
                "scoreRaw": num(last.score_raw),
                "alert": int(last.alert),
                "explanation": None if pd.isna(last.explanation) else str(last.explanation),
                "explanationV2": None if pd.isna(last.explanation_v2) else str(last.explanation_v2),
                "components": {dim: num(last[f"c_{dim}"]) for dim in DIMS},
                "metrics": {k: num(last[k], 4) for k in CARD_METRICS},
                "stress": {k: (None if pd.isna(last[k]) else int(last[k])) for k in STRESS},
                "nStress": None if pd.isna(last.n_stress) else int(last.n_stress),
            },
        }
        index.append(entry)
        # full metric history from the parquet (24 months, before the first score too) + the pipeline's own
        # trajectory columns (delta_3m / delta_12m / racha) for the latest scored month
        mh = met[met.company_id == cid].sort_values("month")
        mlast = mh[mh.month == last.month]
        mlast = mlast.iloc[0] if len(mlast) else None
        detail = {
            "id": cid,
            "months": g.month.tolist(),
            "metricMonths": mh.month.tolist(),
            "metrics": {k: [num(v, 4) for v in mh[k]] for k in BASE_METRICS},
            "trajectory": {k: {
                "delta3": None if mlast is None else num(mlast[f"{k}__delta_3m"], 4),
                "delta12": None if mlast is None else num(mlast[f"{k}__delta_12m"], 4),
                "streak": None if mlast is None or pd.isna(mlast[f"{k}__racha"]) else int(mlast[f"{k}__racha"]),
            } for k in BASE_METRICS},
            "stress": {k: [None if pd.isna(v) else int(v) for v in mh[k]] for k in STRESS},
            "nStress": [None if pd.isna(v) else int(v) for v in mh.n_stress],
            "score": [num(v) for v in g.score],
            "scoreRaw": [num(v) for v in g.score_raw],
            "scoreV2": [num(v) for v in g.score_v2],
            "alert": [int(v) for v in g.alert],
            "explanation": [None if pd.isna(v) else str(v) for v in g.explanation],
            "explanationV2": [None if pd.isna(v) else str(v) for v in g.explanation_v2],
            "components": {dim: [num(v) for v in g[f"c_{dim}"]] for dim in DIMS},
        }
        (out / "companies" / f"{cid}.json").write_text(json.dumps(detail, separators=(",", ":")))

    meta = {
        "asOf": as_of,
        "months": months,
        "scoreVersion": str(s3.score_version.iloc[0]),
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sources": ["02_score/scores_v3.csv", "02_score/scores_v2.csv", "02_score/metrics_v1.parquet", "companies.csv", "groups.csv"],
        "nCompanies": len(index),
        "nRows": int(len(s3)),
        "dimensions": DIMS,
        "stressFlags": STRESS,
        "note": "Company names are deterministic display aliases; the dataset is anonymised (COMP_xxxx).",
    }
    (out / "network.json").write_text(json.dumps({"meta": meta, "companies": index}, separators=(",", ":")))
    print(f"network.json: {len(index)} companies, {len(months)} months ({months[0]} → {as_of}); "
          f"{(out / 'network.json').stat().st_size / 1e6:.1f} MB; details in companies/")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, default=Path("output"))
    ap.add_argument("--out", type=Path, default=Path("apps/marketplace/public/data"))
    a = ap.parse_args()
    main(a.data, a.out)
