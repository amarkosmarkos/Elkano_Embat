"""Interfaz del generador de score y bucle mes a mes.

Un scorer implementa `score_month(L, M, F, S, state) -> DataFrame` con las columnas del contrato
(docs/arquitectura-score.md): company_id, month, score, score_version, c_<dimension>, alert, explanation.
El bucle `run_scorer` calcula por cada mes las métricas (A–E), la trayectoria (F) y el estrés (G) con
datos ≤ fin de mes, y las pasa al scorer. Devuelve (scores, metrics) para todos los meses.
"""
from __future__ import annotations

import time
from typing import Protocol

import pandas as pd

from .. import config as C
from ..loader import Base, load
from ..metrics import REGISTRY
from ..metrics.estres import stress_events
from ..metrics.trayectoria import deltas, streaks


class Scorer(Protocol):
    version: str

    def score_month(self, L, M: pd.DataFrame, F: pd.DataFrame, S: pd.DataFrame, state: dict) -> pd.DataFrame: ...


def compute_metrics(L) -> pd.DataFrame:
    cols = {}
    for m in REGISTRY:
        try:
            cols[m.name] = m.fn(L)
        except Exception as e:  # noqa: BLE001
            raise RuntimeError(f"métrica {m.id} {m.name} falló en {L.month}: {e}") from e
    return pd.DataFrame(cols, index=L.company_ids.values)


def run_scorer(base: Base, scorer: Scorer, months: range | None = None, verbose: bool = True) -> tuple[pd.DataFrame, pd.DataFrame]:
    months = months if months is not None else range(0, C.LAST_FULL_MI + 1)
    names = [m.name for m in REGISTRY]
    hib = {m.name: m.higher_is_better for m in REGISTRY}
    history: dict[int, pd.DataFrame] = {}
    state: dict = {}
    scores, metrics = [], []
    t0 = time.time()
    for mi in months:
        L = load(base, mi)
        M = compute_metrics(L)
        history[mi] = M
        F = pd.concat([deltas(history, mi, names), streaks(history, mi, names, hib)], axis=1)
        S = stress_events(L, history, F)
        out = scorer.score_month(L, M, F, S, state)
        out.insert(1, "month", L.month)
        scores.append(out)
        full = pd.concat([M, F, S], axis=1)
        full.insert(0, "month", L.month)
        full.index.name = "company_id"
        metrics.append(full.reset_index())
        if verbose:
            print(f"  {L.month}: {int(out.score.notna().sum()):>5} empresas · score medio {out.score.mean():5.1f} · "
                  f"{int(S.n_stress.gt(0).sum()):>4} con estrés · {time.time() - t0:5.1f}s", flush=True)
    return pd.concat(scores, ignore_index=True), pd.concat(metrics, ignore_index=True)
