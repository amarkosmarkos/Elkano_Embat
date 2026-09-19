#!/usr/bin/env python3
"""Prepara una cartera demostrativa a partir de los artefactos V4 versionados."""

from __future__ import annotations

import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

from src.pricing import PricingAssumptions, price_history


ROOT = Path(__file__).resolve().parent
V4 = ROOT.parent
SCORES = V4 / "output/02_score/scores_v3.csv"
EVENTS = V4 / "output/03_validation/events_v1.csv"
REPORT = V4 / "output/03_validation/report_v3.json"
OUT = V4 / "apps/web/public/data/insurance-portfolio.json"


def number(value: str | None) -> float | None:
    if value in (None, ""):
        return None
    return float(value)


def stable_exposure(company_id: str) -> int:
    seed = int(hashlib.sha256(company_id.encode()).hexdigest()[:10], 16)
    return 100_000 + (seed % 17) * 50_000


def read_rows() -> tuple[dict[str, list[dict]], dict[tuple[str, str], dict]]:
    by_company: dict[str, list[dict]] = defaultdict(list)
    with SCORES.open(newline="") as fh:
        for row in csv.DictReader(fh):
            by_company[row["company_id"]].append(
                {
                    "month": row["month"],
                    "score": float(row["score"]),
                    "score_raw": float(row["score_raw"]),
                    "alert": int(row["alert"]),
                    "explanation": row["explanation"],
                    "components": {
                        "pago": number(row["c_pago"]),
                        "liquidez": number(row["c_liquidez"]),
                        "caja": number(row["c_caja"]),
                        "deuda": number(row["c_deuda"]),
                        "concentracion": number(row["c_concentracion"]),
                    },
                }
            )
    events: dict[tuple[str, str], dict] = {}
    with EVENTS.open(newline="") as fh:
        for row in csv.DictReader(fh):
            events[(row["company_id"], row["month"])] = {
                key: int(float(row[key])) for key in ("D1", "D2", "D3", "D4", "event", "cure")
            }
    return by_company, events


def choose_companies(by_company: dict[str, list[dict]]) -> list[str]:
    eligible = []
    for company_id, history in by_company.items():
        history.sort(key=lambda row: row["month"])
        if len(history) < 15 or history[-1]["month"] != "2026-08":
            continue
        latest = history[-1]["score"]
        delta_3m = latest - history[-4]["score"]
        eligible.append((company_id, latest, delta_3m, history[-1]["alert"]))

    deteriorating = sorted(eligible, key=lambda x: x[2])[:16]
    improving = sorted(eligible, key=lambda x: x[2], reverse=True)[:12]
    watched = sorted((x for x in eligible if x[3]), key=lambda x: x[1])[:12]
    stable = sorted(eligible, key=lambda x: (abs(x[2]), abs(x[1] - 70)))[:20]
    selected = []
    for row in deteriorating + improving + watched + stable:
        if row[0] not in selected:
            selected.append(row[0])
        if len(selected) == 48:
            break
    return selected


def main() -> None:
    by_company, events = read_rows()
    selected = choose_companies(by_company)
    assumptions = PricingAssumptions()
    companies = []
    for company_id in selected:
        history = by_company[company_id]
        exposure = stable_exposure(company_id)
        priced = price_history([row["score"] for row in history], exposure, assumptions)
        enriched = []
        for index, (row, pricing) in enumerate(zip(history, priced)):
            previous_3m = history[index - 3]["score"] if index >= 3 else None
            enriched.append(
                row
                | pricing
                | {
                    "delta_3m": None if previous_3m is None else round(row["score"] - previous_3m, 2),
                    "events": events.get((company_id, row["month"]), {k: 0 for k in ("D1", "D2", "D3", "D4", "event", "cure")}),
                }
            )
        companies.append(
            {
                "id": company_id,
                "name": f"Cliente {company_id[-4:]}",
                "exposure": exposure,
                "history": enriched,
            }
        )

    report = json.loads(REPORT.read_text())
    payload = {
        "meta": {
            "product": "Elkano Cover",
            "build_status": "complete",
            "generated_from": "V4 / Elkano_Embat",
            "score_version": "v3-gbm",
            "population": "Cartera demostrativa de 48 contrapartes con al menos 15 meses de score V4",
            "observed_period": ["2025-02", "2026-08"],
            "currency": "EUR",
            "actual_fields": ["score", "alert", "components", "events"],
            "modeled_fields": ["exposure", "premium", "coverage proposal", "default conversion"],
            "sources": [
                {"name": "Scores V4", "path": "Elkano_Embat/output/02_score/scores_v3.csv", "grain": "empresa × mes"},
                {"name": "Eventos V4", "path": "Elkano_Embat/output/03_validation/events_v1.csv", "grain": "empresa × mes"},
                {"name": "Validación V4", "path": "Elkano_Embat/output/03_validation/report_v3.json", "grain": "resumen del modelo"},
            ],
            "limitations": [
                "El score V4 es un ranking de estrés, no una probabilidad calibrada de impago.",
                "Las exposiciones son escenarios deterministas porque el repositorio no contiene una cartera asegurada real.",
                "La conversión de estrés a impago, LGD, gastos y margen son supuestos editables de producto.",
                "La prima resultante es una demostración comercial, no una tarifa actuarial lista para producción.",
            ],
        },
        "validation": {
            "gini_h1": report["gini"]["h1"],
            "gini_h3": report["gini"]["h3"],
            "gini_h6": report["gini"]["h6"],
            "gini_new_event_h6": report["gini_new_events"]["h6"],
            "lead_time_median": report["lead_time_months"]["median"],
            "alert_precision_h3": report["alerts"]["precision_h3"],
            "alert_recall_h3": report["alerts"]["recall_h3"],
            "calibration_h6": report["calibration_h6"],
        },
        "assumptions": {
            "stress_to_default": assumptions.stress_to_default,
            "loss_given_default": assumptions.loss_given_default,
            "coverage": assumptions.coverage,
            "expenses_rate": assumptions.expenses_rate,
            "capital_margin_rate": assumptions.capital_margin_rate,
            "monthly_rate_cap": assumptions.monthly_rate_cap,
            "smoothing": assumptions.smoothing,
        },
        "companies": companies,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    print(f"{OUT}: {len(companies)} contrapartes")


if __name__ == "__main__":
    main()
