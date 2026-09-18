"""CLI del generador/evaluador (docs/arquitectura-score.md).

    python -m analytics.run labels                       # → 03_validation/events_v1.csv
    python -m analytics.run splits                       # → 03_validation/splits.csv
    python -m analytics.run score --version v1           # → 02_score/scores_v1.csv + metrics_v1.parquet
    python -m analytics.run eval --scores 02_score/scores_v1.csv   # → 03_validation/report_v1.{json,md} + comparison.md
    python -m analytics.run all
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from . import config as C
from . import evaluate, labels, splits
from .loader import build_base
from .scorers.base import run_scorer
from .scorers.v1_scorecard import ScorecardV1
from .scorers.v2_gini import ScorecardV2Gini
from .scorers import v3_gbm

SCORERS = {"v1": ScorecardV1, "v2": ScorecardV2Gini}
MODELS = {"v3": v3_gbm}


def cmd_labels(base=None) -> dict:
    base = base or build_base()
    s = labels.run(base, C.VALIDATION_DIR)
    print(f"  events: {s['rows']:,} filas · tasa de evento {s['event_rate']:.1%} "
          f"(D1 {s['rate_by_rule']['D1']:.1%} · D2 {s['rate_by_rule']['D2']:.1%} · D3 {s['rate_by_rule']['D3']:.1%} · D4 {s['rate_by_rule']['D4']:.1%}) "
          f"· {'dentro' if s['in_expected_range'] else 'FUERA'} del rango esperado {C.EVENT_RATE_RANGE}")
    return s


def cmd_splits(base=None):
    base = base or build_base()
    s = splits.run(base.companies, C.VALIDATION_DIR)
    print(f"  splits: {len(s)} empresas en {s.fold.nunique()} folds por grupo → {s.groupby('fold').size().to_dict()}")
    return s


def cmd_score(version: str, base=None) -> Path:
    base = base or build_base()
    t0 = time.time()
    C.SCORE_DIR.mkdir(parents=True, exist_ok=True)
    if version in MODELS:
        # modelo entrenado: usa el vector de métricas causal de v1 (se calcula si no existe) y los eventos/splits
        mpath = C.SCORE_DIR / "metrics_v1.parquet"
        if not mpath.exists():
            cmd_score("v1", base)
        import pandas as pd
        metrics = pd.read_parquet(mpath)
        events = pd.read_csv(C.VALIDATION_DIR / f"{C.EVENTS_VERSION}.csv")
        splits_df = pd.read_csv(C.VALIDATION_DIR / "splits.csv")
        scores = MODELS[version].run_v3(metrics, events, splits_df, base.companies.set_index("company_id").first_mi)
        scores_path = C.SCORE_DIR / f"scores_{version}.csv"
        scores.to_csv(scores_path, index=False)
        print(f"  scores_{version}.csv: {len(scores):,} filas · {scores.company_id.nunique()} empresas · OOS por fold + score_oot · {time.time() - t0:.0f}s")
        return scores_path
    scorer = SCORERS[version]()
    scores, metrics = run_scorer(base, scorer)
    scores_path = C.SCORE_DIR / f"scores_{version}.csv"
    scores.to_csv(scores_path, index=False)
    metrics.to_parquet(C.SCORE_DIR / f"metrics_{version}.parquet", index=False)
    last = scores[scores.month == scores.month.max()]
    (C.SCORE_DIR / f"summary_{version}.json").write_text(json.dumps({
        "score_version": scorer.version, "rows": int(len(scores)), "companies": int(scores.company_id.nunique()),
        "months": [scores.month.min(), scores.month.max()], "metric_columns": int(metrics.shape[1] - 2),
        "last_month": {"n": int(len(last)), "mean": round(float(last.score.mean()), 2), "p10": round(float(last.score.quantile(.1)), 1),
                       "p50": round(float(last.score.median()), 1), "p90": round(float(last.score.quantile(.9)), 1),
                       "alerts": int(last.alert.sum())}, "seconds": round(time.time() - t0, 1)}, indent=2))
    print(f"  scores_{version}.csv: {len(scores):,} filas · {scores.company_id.nunique()} empresas · {metrics.shape[1] - 2} columnas de métricas · {time.time() - t0:.0f}s")
    return scores_path


def cmd_eval(scores_path: Path, events_path: Path | None = None, metrics_path: Path | None = None) -> dict:
    events_path = events_path or C.VALIDATION_DIR / f"{C.EVENTS_VERSION}.csv"
    if metrics_path is None:
        guess = Path(str(scores_path).replace("scores_", "metrics_").replace(".csv", ".parquet"))
        metrics_path = guess if guess.exists() else (C.SCORE_DIR / "metrics_v1.parquet" if (C.SCORE_DIR / "metrics_v1.parquet").exists() else None)
    R = evaluate.run(scores_path, events_path, C.VALIDATION_DIR / "splits.csv", C.VALIDATION_DIR, metrics_path)
    g = R["gini"]
    print(f"  eval {R['score_version']}: Gini h1 {g['h1']} · h3 {g['h3']} · h6 {g['h6']} · KS h6 {R['ks']['h6']} · lead time {R['lead_time_months']['median']} m · "
          f"autocorr {R['autocorr_lag1']} · " + " · ".join(f"{a['metric']}={a['status']}" for a in R["acceptance"]))
    return R


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("labels"); sub.add_parser("splits"); sub.add_parser("all")
    p = sub.add_parser("score"); p.add_argument("--version", default="v1", choices=list(SCORERS) + list(MODELS))
    p = sub.add_parser("eval"); p.add_argument("--scores", required=True); p.add_argument("--events"); p.add_argument("--metrics")
    a = ap.parse_args()
    if a.cmd == "labels":
        cmd_labels()
    elif a.cmd == "splits":
        cmd_splits()
    elif a.cmd == "score":
        cmd_score(a.version)
    elif a.cmd == "eval":
        cmd_eval(Path(a.scores), Path(a.events) if a.events else None, Path(a.metrics) if a.metrics else None)
    elif a.cmd == "all":
        base = build_base()
        cmd_labels(base); cmd_splits(base)
        for v in ("v1", "v2", "v3"):
            cmd_eval(cmd_score(v, base))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
