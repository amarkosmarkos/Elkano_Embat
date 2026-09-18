"""Evaluador: scores.csv + events.csv + splits.csv → report.json / report.md / comparison.md.

No lee datos crudos. Implementa docs/validacion_salud.md §3 y el contrato de docs/arquitectura-score.md.
Convención: menor score ⇒ más probable el evento (AUC se calcula con el score invertido).
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

from . import config as C


# ----------------------------------------------------------------------------- estadísticos
def auc_low_is_bad(score: pd.Series, y: pd.Series) -> float | None:
    """AUC = P(score_a < score_b) para a con evento y b sin evento."""
    m = score.notna() & y.notna()
    s, t = score[m].values.astype(float), y[m].values.astype(int)
    n1, n0 = int(t.sum()), int((t == 0).sum())
    if n1 == 0 or n0 == 0:
        return None
    u = stats.mannwhitneyu(s[t == 0], s[t == 1], alternative="two-sided").statistic   # nº pares (b > a)
    return float(u / (n0 * n1))


def gini(score, y) -> float | None:
    a = auc_low_is_bad(score, y)
    return None if a is None else round(2 * a - 1, 4)


def ks(score: pd.Series, y: pd.Series) -> float | None:
    m = score.notna() & y.notna()
    s, t = score[m].values, y[m].values.astype(int)
    if t.sum() == 0 or (t == 0).sum() == 0:
        return None
    return round(float(stats.ks_2samp(s[t == 1], s[t == 0]).statistic), 4)


def psi(a: pd.Series, b: pd.Series, bins: int = 10) -> float | None:
    a, b = a.dropna(), b.dropna()
    if len(a) < 50 or len(b) < 50:
        return None
    edges = np.unique(np.quantile(a, np.linspace(0, 1, bins + 1)))
    pa = np.histogram(a, edges)[0] / len(a)
    pb = np.histogram(b, edges)[0] / len(b)
    pa, pb = np.clip(pa, 1e-4, None), np.clip(pb, 1e-4, None)
    return round(float(((pb - pa) * np.log(pb / pa)).sum()), 4)


# ----------------------------------------------------------------------------- tabla de validación
def _mi(month: pd.Series) -> pd.Series:
    return (month.str[:4].astype(int) - 2024) * 12 + month.str[5:7].astype(int) - 9


def validation_table(scores: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:
    """Una fila por (empresa, t): score_t, event_t, y_1, y_3, y_6, cure_6, meses de futuro disponibles."""
    ev = events.copy()
    ev["mi"] = _mi(ev.month)
    sc = scores.copy()
    sc["mi"] = _mi(sc.month)
    ev_idx = ev.set_index(["company_id", "mi"])
    last_mi = ev.groupby("company_id").mi.max()
    rows = sc.merge(ev[["company_id", "mi", "event", "cure"]], on=["company_id", "mi"], how="left")
    rows = rows.rename(columns={"event": "event_t"})
    for h in C.HORIZONS:
        fut = []
        for k in range(1, h + 1):
            key = pd.MultiIndex.from_arrays([rows.company_id, rows.mi + k])
            fut.append(ev_idx.event.reindex(key).values)
        fut = np.vstack(fut).T
        y = np.nanmax(fut, axis=1)
        complete = rows.mi + h <= rows.company_id.map(last_mi).values
        rows[f"y_{h}"] = np.where(complete & ~np.isnan(y), y, np.nan)
    cure = []
    for k in range(1, 7):
        key = pd.MultiIndex.from_arrays([rows.company_id, rows.mi + k])
        cure.append(ev_idx.cure.reindex(key).values)
    cure = np.nanmax(np.vstack(cure).T, axis=1)
    rows["cure_6"] = np.where((rows.mi + 6 <= rows.company_id.map(last_mi).values) & (rows.event_t == 1), cure, np.nan)
    prev = sc.set_index(["company_id", "mi"]).score
    rows["score_prev3"] = prev.reindex(pd.MultiIndex.from_arrays([rows.company_id, rows.mi - 3])).values
    rows["score_next1"] = prev.reindex(pd.MultiIndex.from_arrays([rows.company_id, rows.mi + 1])).values
    return rows


# ----------------------------------------------------------------------------- evaluación
def evaluate(scores: pd.DataFrame, events: pd.DataFrame, splits: pd.DataFrame, metrics: pd.DataFrame | None = None,
             events_version: str = C.EVENTS_VERSION) -> dict:
    version = str(scores.score_version.iloc[0])
    T = validation_table(scores, events)
    T = T.merge(splits[["company_id", "fold", "group_id"]], on="company_id", how="left")
    R: dict = {"score_version": version, "events_version": events_version, "ran_at": dt.datetime.now().isoformat(timespec="seconds"),
               "n_rows": int(len(T)), "n_companies": int(T.company_id.nunique()),
               "coverage": {"missing_score": int(T.score.isna().sum()), "rows_with_event_label": int(T.event_t.notna().sum())}}
    R["n_pairs"] = int(T.y_6.notna().sum())
    R["event_rate"] = round(float(T.event_t.mean()), 4)
    R["event_rate_h"] = {f"h{h}": round(float(T[f"y_{h}"].mean()), 4) for h in C.HORIZONS}
    # 1-2. Gini / KS por horizonte
    R["gini"] = {f"h{h}": gini(T.score, T[f"y_{h}"]) for h in C.HORIZONS}
    R["ks"] = {f"h{h}": ks(T.score, T[f"y_{h}"]) for h in C.HORIZONS}
    # solo "nuevos" eventos: filas en las que la empresa NO está en evento en t (mide anticipación, no estado)
    new = T[T.event_t == 0]
    R["gini_new_events"] = {f"h{h}": gini(new.score, new[f"y_{h}"]) for h in C.HORIZONS}
    R["event_rate_new_h6"] = round(float(new.y_6.mean()), 4) if new.y_6.notna().any() else None
    # Gini sin la feature gemela (si el generador la publica)
    if "score_no_twin" in T:
        R["gini_no_twin"] = {f"h{h}": gini(T.score_no_twin, T[f"y_{h}"]) for h in C.HORIZONS}
    # 3. Gini de mejora
    imp = T[(T.event_t == 1) & T.cure_6.notna() & T.score_prev3.notna()]
    R["gini_cure_h6"] = None if imp.empty else (lambda g: None if g is None else -g)(gini(imp.score - imp.score_prev3, imp.cure_6))  # Δ alto ⇒ cura
    R["n_cure_rows"] = int(len(imp))
    # 4. Lead time
    R["lead_time_months"] = lead_time(T)
    # 5. OOS por fold (scorecard sin entrenamiento: Gini por fold)
    by_fold = [gini(T[T.fold == k].score, T[T.fold == k].y_6) for k in sorted(T.fold.dropna().unique())]
    by_fold = [g for g in by_fold if g is not None]
    R["oos"] = {"gini_h6_by_fold": by_fold, "mean": round(float(np.mean(by_fold)), 4) if by_fold else None,
                "drop_vs_in_sample": round(R["gini"]["h6"] - float(np.mean(by_fold)), 4) if by_fold and R["gini"]["h6"] is not None else None}
    # 6. OOT: últimos meses de observación vs el resto. Si el generador publica `score_oot` (modelo entrenado solo con
    #    etiquetas anteriores al periodo de test) se usa esa columna en el test; si no, el score normal (scorecard sin entrenar).
    last = T.mi.max()
    oot, ins = T[T.mi > last - C.OOT_TEST_MONTHS], T[T.mi <= last - C.OOT_TEST_MONTHS]
    s_test = oot.score_oot if "score_oot" in T and oot.score_oot.notna().any() else oot.score
    g_oot, g_in = gini(s_test, oot.y_6), gini(ins.score, ins.y_6)
    g3_oot, g3_in = gini(s_test, oot.y_3), gini(ins.score, ins.y_3)
    R["oot"] = {"train_months": f"…{ins.month.max()}", "test_months": f"{oot.month.min()}…", "gini_h6": g_oot, "gini_h6_train": g_in,
                "drop": None if g_oot is None or g_in is None else round(g_in - g_oot, 4),
                "uses_score_oot": bool("score_oot" in T and oot.score_oot.notna().any()),
                "note": "y_6 necesita 6 meses de futuro: en el periodo de test solo hay h1/h3; la caída OOT se mide con h3" if g_oot is None else ""}
    R["oot_h3"] = {"gini_h3_test": g3_oot, "gini_h3_train": g3_in, "drop": None if g3_oot is None or g3_in is None else round(g3_in - g3_oot, 4)}
    # 7. PSI y autocorrelación
    months = sorted(T.month.unique())
    pairs = [(m, months[i + C.PSI_LAG]) for i, m in enumerate(months) if i + C.PSI_LAG < len(months)]
    R["psi"] = {f"{a}_vs_{b}": psi(T[T.month == a].score, T[T.month == b].score) for a, b in pairs[-3:]}
    ac = T.dropna(subset=["score", "score_next1"])
    R["autocorr_lag1"] = round(float(np.corrcoef(ac.score, ac.score_next1)[0, 1]), 4) if len(ac) > 10 else None
    per_co = ac.groupby("company_id").apply(lambda g: np.corrcoef(g.score, g.score_next1)[0, 1] if len(g) >= 8 and g.score.std() > 0 else np.nan)
    R["autocorr_lag1_company_mean"] = round(float(per_co.mean()), 4) if per_co.notna().any() else None
    # 8. Univariante: contribuciones y dimensiones
    uni = {c: gini(T[c], T.y_6) for c in T.columns if c.startswith("c_") or c.startswith("dim_")}
    R["univariate"] = {k: v for k, v in uni.items() if v is not None}
    best = max((v for k, v in R["univariate"].items() if k.startswith("c_")), default=None)
    R["score_beats_best_dimension"] = None if best is None or R["gini"]["h6"] is None else bool(R["gini"]["h6"] > best)
    if metrics is not None:
        R["univariate_metrics"] = univariate_metrics(T, metrics)
    # calibración por decil (h6) y por tramo de score
    T["decile"] = pd.qcut(T.score.rank(method="first"), 10, labels=False) + 1
    R["calibration_h6"] = T.groupby("decile").agg(n=("score", "size"), score_min=("score", "min"), score_max=("score", "max"),
                                                    event_h1=("y_1", "mean"), event_h3=("y_3", "mean"), event_h6=("y_6", "mean")).round(4).reset_index().to_dict(orient="records")
    # 9. casos
    hi, lo = T.score.quantile(0.75), T.score.quantile(0.25)
    fn = T[(T.score >= hi) & (T.y_3 == 1)].sort_values("score", ascending=False)
    fp = T[(T.score <= lo) & (T.y_6 == 0) & (T.event_t == 0)].sort_values("score")
    R["worst_false_negatives"] = fn.drop_duplicates("company_id").head(10)[["company_id", "month", "score"]].to_dict(orient="records")
    R["worst_false_positives"] = fp.drop_duplicates("company_id").head(10)[["company_id", "month", "score"]].to_dict(orient="records")
    # filiales: correlación de score dentro del grupo
    R["group_corr"] = group_correlation(T)
    # alertas
    if "alert" in T:
        R["alerts"] = {"rate": round(float(T.alert.mean()), 4), "precision_h3": round(float(T[T.alert == 1].y_3.mean()), 4) if (T.alert == 1).any() else None,
                       "recall_h3": round(float(T[T.y_3 == 1].alert.mean()), 4) if (T.y_3 == 1).any() else None}
    R["acceptance"] = acceptance(R)
    return R


def lead_time(T: pd.DataFrame) -> dict:
    thr = T.groupby("month").score.transform(lambda s: np.nanpercentile(s, C.ALERT_PERCENTILE))
    warn = T[T.score < thr].groupby("company_id").mi.min()
    first_ev = T[T.event_t == 1].groupby("company_id").mi.min()
    # solo empresas cuyo primer evento observado no es su primer mes con score (si no, no hay "antes")
    first_obs = T.groupby("company_id").mi.min()
    first_ev = first_ev[first_ev > first_obs.reindex(first_ev.index)]
    lead = (first_ev - warn.reindex(first_ev.index)).dropna()
    lead = lead.clip(lower=0)
    warned = warn.reindex(first_ev.index).notna() & (warn.reindex(first_ev.index) <= first_ev)
    return {"median": float(lead.median()) if len(lead) else None, "p25": float(lead.quantile(.25)) if len(lead) else None,
            "p75": float(lead.quantile(.75)) if len(lead) else None, "n_companies_with_event": int(len(first_ev)),
            "share_warned_before_or_at_event": round(float(warned.mean()), 4) if len(first_ev) else None,
            "share_warned_2m_before": round(float((lead >= 2).mean()), 4) if len(lead) else None}


def group_correlation(T: pd.DataFrame) -> dict:
    last = T[T.month == T.month.max()].dropna(subset=["group_id", "score"])
    multi = last.groupby("group_id").filter(lambda g: len(g) >= 2)
    if multi.empty:
        return {"pairs": 0, "corr": None}
    # correlación entre pares de filiales del mismo grupo (todas las combinaciones)
    a, b = [], []
    for _, g in multi.groupby("group_id"):
        s = g.score.values
        for i in range(len(s)):
            for j in range(i + 1, len(s)):
                a.append(s[i]); b.append(s[j])
    return {"pairs": len(a), "corr": round(float(np.corrcoef(a, b)[0, 1]), 4) if len(a) > 5 else None}


def univariate_metrics(T: pd.DataFrame, metrics: pd.DataFrame) -> dict:
    """Gini univariante de cada métrica (orientado: se reporta |Gini| y el signo) y pares muy correlacionados."""
    base_cols = [c for c in metrics.columns if c not in ("company_id", "month") and "__" not in c and not c.startswith("S") and c != "n_stress"]
    M = T[["company_id", "month", "y_6"]].merge(metrics[["company_id", "month"] + base_cols], on=["company_id", "month"], how="left")
    out = {}
    for c in base_cols:
        g = gini(M[c], M.y_6)
        if g is not None:
            out[c] = {"gini": g, "coverage": round(float(M[c].notna().mean()), 3)}
    corr = M[base_cols].corr(method="spearman")
    pairs = [(a, b, round(float(corr.loc[a, b]), 2)) for i, a in enumerate(base_cols) for b in base_cols[i + 1:]
             if pd.notna(corr.loc[a, b]) and abs(corr.loc[a, b]) > 0.8]
    return {"gini": out, "weak (|gini| < 0.05)": [c for c, v in out.items() if abs(v["gini"]) < 0.05], "correlated_pairs (|rho| > 0.8)": pairs}


def acceptance(R: dict) -> list[dict]:
    A = C.ACCEPTANCE
    rows = []

    def add(name, value, minimum, good, higher_better=True):
        ok_min = None if value is None else (value >= minimum if higher_better else value <= minimum)
        ok_good = None if value is None else (value >= good if higher_better else value <= good)
        rows.append({"metric": name, "value": value, "min": minimum, "good": good,
                     "status": "n/a" if value is None else ("bueno" if ok_good else ("mínimo" if ok_min else "FALLA"))})

    add("Gini h6", R["gini"]["h6"], *A["gini_h6"])
    rows.append({"metric": "Gini h6 > mejor dimensión", "value": R.get("score_beats_best_dimension"), "min": True, "good": True,
                 "status": "n/a" if R.get("score_beats_best_dimension") is None else ("bueno" if R["score_beats_best_dimension"] else "FALLA")})
    add("KS h6", R["ks"]["h6"], *A["ks_h6"])
    add("Lead time mediano (meses)", R["lead_time_months"]["median"], *A["lead_time_median"])
    add("Gini de mejora", R["gini_cure_h6"], *A["gini_cure"])
    add("Caída in-sample → OOS", R["oos"]["drop_vs_in_sample"], *A["oos_drop"], higher_better=False)
    add("Caída → OOT (h6, o h3 si no hay h6)", R["oot"]["drop"] if R["oot"]["drop"] is not None else R["oot_h3"]["drop"], *A["oot_drop"], higher_better=False)
    p = [v for v in R["psi"].values() if v is not None]
    add("PSI 12 meses (máx.)", max(p) if p else None, *A["psi"], higher_better=False)
    ac = R["autocorr_lag1"]
    lo_min, hi_min = A["autocorr"][0]
    lo_good, hi_good = A["autocorr"][1]
    rows.append({"metric": "Autocorrelación lag 1", "value": ac, "min": f"{lo_min}–{hi_min}", "good": f"{lo_good}–{hi_good}",
                 "status": "n/a" if ac is None else ("bueno" if lo_good <= ac <= hi_good else ("mínimo" if lo_min <= ac <= hi_min else "FALLA"))})
    return rows


# ----------------------------------------------------------------------------- informes
def render_md(R: dict) -> str:
    f = lambda v: "–" if v is None else (f"{v:.3f}" if isinstance(v, float) else str(v))  # noqa: E731
    L = [f"# Evaluación · {R['score_version']} vs {R['events_version']}\n",
         f"Generado {R['ran_at']} · {R['n_rows']:,} filas (empresa, mes) · {R['n_companies']} empresas · "
         f"{R['n_pairs']:,} pares con y_6 · tasa de evento {R['event_rate']:.1%} (h1 {R['event_rate_h']['h1']:.1%} · h3 {R['event_rate_h']['h3']:.1%} · h6 {R['event_rate_h']['h6']:.1%})\n",
         "## Criterios de aceptación\n\n| métrica | valor | mínimo | bueno | estado |\n|---|---:|---:|---:|---|"]
    L += [f"| {a['metric']} | {f(a['value'])} | {a['min']} | {a['good']} | **{a['status']}** |" for a in R["acceptance"]]
    L.append("\n## Poder de ordenación por horizonte\n\n| | h1 | h3 | h6 |\n|---|---:|---:|---:|")
    L.append("| Gini | " + " | ".join(f(R["gini"][f"h{h}"]) for h in C.HORIZONS) + " |")
    L.append("| KS | " + " | ".join(f(R["ks"][f"h{h}"]) for h in C.HORIZONS) + " |")
    if "gini_no_twin" in R:
        L.append("| Gini sin features gemelas del evento | " + " | ".join(f(R["gini_no_twin"][f"h{h}"]) for h in C.HORIZONS) + " |")
    L.append("| Gini solo nuevos eventos (empresa sin evento en t) | " + " | ".join(f(R["gini_new_events"][f"h{h}"]) for h in C.HORIZONS) + " |")
    lt = R["lead_time_months"]
    L.append(f"\n**Lead time**: mediana {f(lt['median'])} meses (p25 {f(lt['p25'])} · p75 {f(lt['p75'])}) sobre {lt['n_companies_with_event']} empresas con evento; "
             f"{f(lt['share_warned_before_or_at_event'])} avisadas antes o en el evento, {f(lt['share_warned_2m_before'])} con ≥ 2 meses de antelación.")
    L.append(f"\n**Gini de mejora** (Δscore 3 m vs cura en 6 m): {f(R['gini_cure_h6'])} sobre {R['n_cure_rows']} filas en evento.")
    L.append(f"\n**OOS** por fold (h6): {R['oos']['gini_h6_by_fold']} · media {f(R['oos']['mean'])} · caída {f(R['oos']['drop_vs_in_sample'])}")
    L.append(f"\n**OOT**: entreno {R['oot']['train_months']} → test {R['oot']['test_months']}: Gini h6 {f(R['oot']['gini_h6'])} (train {f(R['oot']['gini_h6_train'])}); "
             f"h3 test {f(R['oot_h3']['gini_h3_test'])} vs train {f(R['oot_h3']['gini_h3_train'])}. {R['oot']['note']}")
    L.append("\n**PSI**: " + " · ".join(f"{k}: {f(v)}" for k, v in R["psi"].items()) + f" · **Autocorrelación lag 1**: {f(R['autocorr_lag1'])} (media por empresa {f(R['autocorr_lag1_company_mean'])})")
    if "alerts" in R:
        L.append(f"\n**Alertas**: {R['alerts']['rate']:.1%} de filas · precisión h3 {f(R['alerts']['precision_h3'])} · recall h3 {f(R['alerts']['recall_h3'])}")
    L.append("\n## Univariante (Gini h6 de cada dimensión / contribución)\n\n| columna | Gini |\n|---|---:|")
    L += [f"| {k} | {f(v)} |" for k, v in sorted(R["univariate"].items(), key=lambda kv: -abs(kv[1]))]
    if "univariate_metrics" in R:
        U = R["univariate_metrics"]
        L.append("\n### Métricas (Gini h6 · signo + = menor valor ⇒ evento)\n\n| métrica | Gini | cobertura |\n|---|---:|---:|")
        L += [f"| {k} | {v['gini']:+.3f} | {v['coverage']:.0%} |" for k, v in sorted(U["gini"].items(), key=lambda kv: -abs(kv[1]["gini"]))]
        L.append(f"\nDébiles (|Gini| < 0,05): {', '.join(U['weak (|gini| < 0.05)']) or '—'}")
        L.append("Pares correlacionados (|ρ| > 0,8): " + ("; ".join(f"{a}~{b} ({r})" for a, b, r in U["correlated_pairs (|rho| > 0.8)"]) or "—"))
    L.append("\n## Calibración por decil de score\n\n| decil | n | score | evento h1 | h3 | h6 |\n|---:|---:|---|---:|---:|---:|")
    for d in R["calibration_h6"]:
        L.append(f"| {d['decile']} | {d['n']} | {d['score_min']:.0f}–{d['score_max']:.0f} | {d['event_h1']:.1%} | {d['event_h3']:.1%} | {d['event_h6']:.1%} |")
    L.append(f"\n**Filiales**: correlación de score entre empresas del mismo grupo {f(R['group_corr']['corr'])} ({R['group_corr']['pairs']} pares).")
    L.append("\n## Casos\n\nFalsos negativos (score alto, evento en ≤ 3 meses): " + ", ".join(f"{c['company_id']} ({c['month']}, {c['score']:.0f})" for c in R["worst_false_negatives"]))
    L.append("\nFalsos positivos (score bajo, 6 meses sin evento): " + ", ".join(f"{c['company_id']} ({c['month']}, {c['score']:.0f})" for c in R["worst_false_positives"]))
    return "\n".join(L) + "\n"


def update_comparison(out_dir: Path, R: dict) -> None:
    path = out_dir / "comparison.md"
    row = {"score_version": R["score_version"], "events": R["events_version"], "gini_h1": R["gini"]["h1"], "gini_h3": R["gini"]["h3"],
           "gini_h6": R["gini"]["h6"], "gini_h6_new": R["gini_new_events"]["h6"], "ks_h6": R["ks"]["h6"], "lead_time": R["lead_time_months"]["median"], "gini_cure": R["gini_cure_h6"],
           "oos_mean": R["oos"]["mean"], "autocorr": R["autocorr_lag1"], "ran_at": R["ran_at"]}
    hist = out_dir / "comparison.jsonl"
    rows = [json.loads(l) for l in hist.read_text().splitlines() if l.strip()] if hist.exists() else []
    rows = [r for r in rows if r["score_version"] != row["score_version"]] + [row]
    hist.write_text("\n".join(json.dumps(r) for r in rows) + "\n")
    cols = list(row.keys())
    f = lambda v: "–" if v is None else (f"{v:.3f}" if isinstance(v, float) else str(v))  # noqa: E731
    md = "| " + " | ".join(cols) + " |\n|" + "---|" * len(cols) + "\n" + "\n".join("| " + " | ".join(f(r.get(c)) for c in cols) + " |" for r in rows)
    path.write_text("# Comparación de versiones del score\n\n" + md + "\n")


def run(scores_path: Path, events_path: Path, splits_path: Path, out_dir: Path, metrics_path: Path | None = None) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    scores = pd.read_csv(scores_path)
    events = pd.read_csv(events_path)
    splits = pd.read_csv(splits_path)
    metrics = pd.read_parquet(metrics_path) if metrics_path and Path(metrics_path).exists() else None
    R = evaluate(scores, events, splits, metrics, events_version=Path(events_path).stem)
    tag = R["score_version"].split("-")[0]
    (out_dir / f"report_{tag}.json").write_text(json.dumps(R, indent=2, ensure_ascii=False, default=str))
    (out_dir / f"report_{tag}.md").write_text(render_md(R))
    update_comparison(out_dir, R)
    return R
