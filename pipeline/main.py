"""Pipeline principal con checkpoints:  RAW → PREPROCESAMIENTO → ETIQUETAS → SCORE → VALIDACIÓN

    python main.py                      # ejecuta lo que haga falta (cada paso se salta si su huella no cambió)
    python main.py --force              # rehace todo
    python main.py --from score         # rehace desde 'score' (y lo posterior)
    python main.py --only validate      # solo ese paso (aunque esté al día)
    python main.py --status             # qué pasos están al día y por qué

Cada paso declara sus entradas (ficheros de datos + su propio código + las claves de config.py
que le afectan). Su huella (sha256 de rutas, tamaños, mtimes y valores de config) se guarda en
output/.pipeline_state.json junto con las salidas producidas. Un paso se re-ejecuta solo si la huella cambió, faltan salidas, o se fuerza.
Las salidas se persisten en disco entre pasos, así que un fallo en 'score' no obliga a repetir
el preprocesamiento.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))          # paquete analytics/

import config as C  # noqa: E402

HERE = Path(__file__).parent
ANALYTICS = HERE.parent / "analytics"
SCORE_VERSIONS = ("v1", "v2", "v3")
RAW_FILES = ["groups", "companies", "banking_products", "debt_products", "debt_schedule_config", "balances", "transactions", "invoices"]
GOLD_TABLES = ["fact_transactions", "fact_invoices", "dim_calendar", "dim_company", "dim_product", "dim_counterparty",
               "company_month", "company_day", "product_day_balance", "invoice_tx_match"]


# ----------------------------------------------------------------------------- pasos
def step_raw() -> None:
    missing = [f for f in RAW_FILES if not (C.RAW_DIR / f"{f}.csv").exists()]
    if missing:
        raise FileNotFoundError(f"faltan CSV en {C.RAW_DIR}: {missing} — descomprime output_hackspain_data.zip")
    sizes = {f: (C.RAW_DIR / f"{f}.csv").stat().st_size for f in RAW_FILES}
    print("  raw OK: " + ", ".join(f"{k} {v / 1e6:.1f} MB" for k, v in sizes.items()))


def step_preprocess() -> None:
    from stages import clean, ingest, marts, quality
    from stages.common import connect
    con = connect()
    ingest.run(con)
    clean.run(con)
    marts.run(con)
    ok = quality.run(con)
    con.close()
    if not ok:
        raise RuntimeError("checks críticos de calidad fallidos: ver 01_preprocessed/quality/REPORT.md")


def step_labels() -> None:
    """Etiquetas D1–D4 + cura (events_v1.csv) y folds por grupo (splits.csv): docs/validacion_salud.md §1, arquitectura-score.md."""
    from analytics import run as A
    from analytics.loader import build_base
    base = build_base()
    summary = A.cmd_labels(base)
    A.cmd_splits(base)
    if not summary["in_expected_range"]:
        raise RuntimeError(f"tasa de evento {summary['event_rate']:.1%} fuera de {C_EVENT_RANGE()}: ajustar umbrales D1–D4 en analytics/config.py")


def C_EVENT_RANGE():
    from analytics import config as AC
    return AC.EVENT_RATE_RANGE


def step_score() -> None:
    """Generadores de score (docs/salud.md + arquitectura-score.md): v1 scorecard literal, v2 pesos ∝ Gini, v3 GBM (OOS por fold)."""
    from analytics import run as A
    from analytics.loader import build_base
    base = build_base()
    for v in SCORE_VERSIONS:
        A.cmd_score(v, base)


def step_validate() -> None:
    """Evaluador (docs/validacion_salud.md §3): Gini/KS por horizonte, lead time, cura, OOS, OOT, PSI, autocorrelación, univariante, casos."""
    from analytics import run as A
    from analytics import config as AC
    (AC.VALIDATION_DIR / "comparison.jsonl").unlink(missing_ok=True)
    for v in SCORE_VERSIONS:
        A.cmd_eval(AC.SCORE_DIR / f"scores_{v}.csv")


@dataclass
class Step:
    name: str
    run: Callable[[], None]
    inputs: Callable[[], list[Path]]      # ficheros de datos de los que depende
    code: list[Path]                      # ficheros de código cuya modificación invalida el paso
    outputs: Callable[[], list[Path]]     # ficheros que debe producir
    config: Callable[[str], bool]         # qué claves de config.py afectan a este paso (cambiarlas lo invalida)
    deps: list[str] = field(default_factory=list)


def config_snapshot(selector: Callable[[str], bool]) -> str:
    vals = {k: v for k, v in vars(C).items() if k.isupper() and selector(k) and not isinstance(v, Path)}
    return json.dumps(vals, sort_keys=True, default=lambda o: sorted(o) if isinstance(o, set) else str(o))


is_score_cfg = lambda k: k.startswith("SCORE_")  # noqa: E731
is_valid_cfg = lambda k: k.startswith("VALIDATION_")  # noqa: E731
is_prep_cfg = lambda k: not (is_score_cfg(k) or is_valid_cfg(k))  # noqa: E731


STEPS: list[Step] = [
    Step("raw", step_raw,
         inputs=lambda: [C.RAW_DIR / f"{f}.csv" for f in RAW_FILES],
         code=[], outputs=lambda: [], config=lambda k: False),
    Step("preprocess", step_preprocess,
         inputs=lambda: [C.RAW_DIR / f"{f}.csv" for f in RAW_FILES],
         code=sorted((HERE / "stages").glob("*.py")), config=is_prep_cfg,
         outputs=lambda: [C.DATA_DIR / "gold" / f"{t}.parquet" for t in GOLD_TABLES] + [C.DATA_DIR / "quality" / "checks.json"],
         deps=["raw"]),
    Step("labels", step_labels,
         inputs=lambda: [C.DATA_DIR / "gold" / f"{t}.parquet" for t in GOLD_TABLES],
         code=[ANALYTICS / "labels.py", ANALYTICS / "splits.py", ANALYTICS / "loader.py", ANALYTICS / "config.py", ANALYTICS / "metrics" / "pago.py"],
         config=lambda k: False,
         outputs=lambda: [C.VALIDATION_DIR / f for f in ("events_v1.csv", "splits.csv", "labels_summary.json")],
         deps=["preprocess"]),
    Step("score", step_score,
         inputs=lambda: [C.DATA_DIR / "gold" / f"{t}.parquet" for t in GOLD_TABLES] + [C.VALIDATION_DIR / "events_v1.csv", C.VALIDATION_DIR / "splits.csv"],
         code=[ANALYTICS / "config.py", ANALYTICS / "loader.py", ANALYTICS / "run.py", *sorted((ANALYTICS / "metrics").glob("*.py")), *sorted((ANALYTICS / "scorers").glob("*.py"))],
         config=lambda k: False,
         outputs=lambda: [C.SCORE_DIR / f"scores_{v}.csv" for v in SCORE_VERSIONS] + [C.SCORE_DIR / "metrics_v1.parquet"],
         deps=["labels"]),
    Step("validate", step_validate,
         inputs=lambda: [C.SCORE_DIR / f"scores_{v}.csv" for v in SCORE_VERSIONS] + [C.SCORE_DIR / "metrics_v1.parquet",
                         C.VALIDATION_DIR / "events_v1.csv", C.VALIDATION_DIR / "splits.csv"],
         code=[ANALYTICS / "evaluate.py", ANALYTICS / "config.py", ANALYTICS / "run.py"],
         config=lambda k: False,
         outputs=lambda: [C.VALIDATION_DIR / f"report_{v}.{ext}" for v in SCORE_VERSIONS for ext in ("json", "md")] + [C.VALIDATION_DIR / "comparison.md"],
         deps=["score"]),
]


# ----------------------------------------------------------------------------- checkpoints
def _rel(p: Path) -> str:
    """Ruta relativa a output/ o a pipeline/ para que la huella sea la misma en host y en Docker."""
    for base in (C.OUT_DIR, HERE):
        try:
            return str(p.resolve().relative_to(base.resolve()))
        except ValueError:
            continue
    return p.name


def fingerprint(paths: list[Path], extra: str = "") -> str:
    h = hashlib.sha256(extra.encode())
    for p in paths:
        st = p.stat() if p.exists() else None
        h.update(f"{_rel(p)}|{st.st_size if st else 'missing'}|{int(st.st_mtime) if st else 0}\n".encode())
    return h.hexdigest()[:16]


def load_state() -> dict:
    return json.loads(C.STATE_FILE.read_text()) if C.STATE_FILE.exists() else {}


def save_state(state: dict) -> None:
    C.STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    C.STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def status(step: Step, state: dict) -> tuple[bool, str]:
    """(al día?, motivo)"""
    rec = state.get(step.name)
    if not rec:
        return False, "nunca ejecutado"
    if rec.get("status") != "ok":
        return False, f"última ejecución: {rec.get('status')}"
    missing = [p for p in step.outputs() if not p.exists()]
    if missing:
        return False, f"faltan salidas: {missing[0].name}…"
    fp = fingerprint(step.inputs() + step.code, config_snapshot(step.config))
    if fp != rec.get("fingerprint"):
        return False, "cambiaron entradas, código o config"
    return True, f"al día (ejecutado {rec['ran_at']}, {rec['seconds']:.0f}s)"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="rehacer todos los pasos")
    ap.add_argument("--from", dest="from_step", choices=[s.name for s in STEPS], help="rehacer desde este paso")
    ap.add_argument("--only", choices=[s.name for s in STEPS], help="ejecutar solo este paso")
    ap.add_argument("--status", action="store_true", help="mostrar el estado de los checkpoints y salir")
    a = ap.parse_args()

    state = load_state()
    if a.status:
        for s in STEPS:
            ok, why = status(s, state)
            print(f"  {'✓' if ok else '○'} {s.name:<11} {why}")
        return 0

    force_from = None if not a.from_step else [s.name for s in STEPS].index(a.from_step)
    t_all = time.time()
    print(f"pipeline · raw={C.RAW_DIR} · out={C.OUT_DIR}")
    for i, s in enumerate(STEPS):
        if a.only and s.name != a.only:
            continue
        up_to_date, why = status(s, state)
        must = a.force or a.only or (force_from is not None and i >= force_from) or not up_to_date
        # si una dependencia se acaba de re-ejecutar, la huella de entradas cambia y este paso se rehace solo
        if not must:
            print(f"\n[{i}] {s.name}: ⏭  {why}")
            continue
        print(f"\n[{i}] {s.name}: ▶  {'forzado' if (a.force or a.only or force_from is not None) else why}")
        t0 = time.time()
        try:
            s.run()
        except Exception as e:  # noqa: BLE001
            state[s.name] = {"status": f"error: {e}", "ran_at": dt.datetime.now().isoformat(timespec="seconds"),
                             "seconds": time.time() - t0, "fingerprint": None}
            save_state(state)
            print(f"\n✗ {s.name} falló tras {time.time() - t0:.0f}s: {e}\n  Los pasos anteriores están guardados; corrige y relanza (se retomará aquí).")
            return 1
        state[s.name] = {"status": "ok", "ran_at": dt.datetime.now().isoformat(timespec="seconds"), "seconds": time.time() - t0,
                         "fingerprint": fingerprint(s.inputs() + s.code, config_snapshot(s.config)), "outputs": [str(p) for p in s.outputs()]}
        save_state(state)
        print(f"  ✓ {s.name} en {time.time() - t0:.0f}s")
    print(f"\nOK en {time.time() - t_all:.0f}s · salidas en {C.OUT_DIR}/{{01_preprocessed,02_score,03_validation}} · estado: {C.STATE_FILE.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
