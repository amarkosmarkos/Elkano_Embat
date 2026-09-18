"""Splits: 5 folds asignados por group_id (todas las filiales de un grupo en el mismo fold), semilla fija."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from . import config as C


def build_splits(companies: pd.DataFrame, folds: int = C.FOLDS, seed: int = C.SEED) -> pd.DataFrame:
    groups = companies.group_id.drop_duplicates().sort_values().values
    rng = np.random.default_rng(seed)
    perm = rng.permutation(len(groups))
    fold_of_group = {g: int(perm[i] % folds) for i, g in enumerate(groups)}
    return pd.DataFrame({"company_id": companies.company_id, "group_id": companies.group_id,
                         "fold": companies.group_id.map(fold_of_group)}).sort_values("company_id").reset_index(drop=True)


def run(companies: pd.DataFrame, out_dir: Path) -> pd.DataFrame:
    out_dir.mkdir(parents=True, exist_ok=True)
    s = build_splits(companies)
    s.to_csv(out_dir / "splits.csv", index=False)
    return s
