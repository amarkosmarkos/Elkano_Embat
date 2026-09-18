"""Ingeniería inversa del "generador": ¿hay arquetipos latentes por empresa o son datos reales anonimizados?

1. Panel empresa × mes (panel.py) -> vector de tendencias por empresa -> GMM/BIC/silhouette.
2. Huellas de datos reales: Benford, festivos, tipo de cambio, formatos de id, timestamps.
3. Espacios de id de contraparte (columna vs. texto).

Uso: python generator_probe.py --data /data --panel panel.csv --out probe_data.json
"""
from __future__ import annotations

import argparse
import json
import warnings

import duckdb
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

HOLIDAYS = ["2024-10-12", "2024-11-01", "2024-12-06", "2024-12-25", "2025-01-01", "2025-01-06", "2025-04-18",
            "2025-05-01", "2025-08-15", "2025-11-01", "2025-12-08", "2025-12-25", "2026-01-01", "2026-01-06",
            "2026-04-03", "2026-05-01", "2026-08-15"]


def trend_features(panel: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for cid, g in panel.groupby("company_id"):
        g = g[g.n_tx > 0]
        if len(g) < 12:
            continue
        x = g.i.values.astype(float)
        x = x - x.mean()
        li, lo, ln = np.log1p(g.inflow.values), np.log1p(g.outflow.values), np.log1p(g.n_tx.values)
        scale = np.median(g.inflow + g.outflow) + 1
        net = g.net.values / scale

        def fit(y):
            b = np.polyfit(x, y, 1)
            r = y - np.polyval(b, x)
            return b[0], 1 - r.var() / (y.var() + 1e-9), r.std()

        s_in, r2_in, noise_in = fit(li)
        s_out, r2_out, _ = fit(lo)
        s_n, r2_n, noise_n = fit(ln)
        s_net, _, _ = fit(net)
        ac1 = np.corrcoef(li[:-1], li[1:])[0, 1] if li.std() > 0 else 0.0
        seas = np.nan
        if len(g) >= 18:
            res = li - np.polyval(np.polyfit(x, li, 1), x)
            m = g.i.values % 12
            seas = np.abs(np.sum(res * np.exp(2j * np.pi * m / 12))) / len(res) / (res.std() + 1e-9)
        rows.append(dict(company_id=cid, months=len(g), s_in=s_in, s_out=s_out, s_n=s_n, s_net=s_net, r2_in=r2_in,
                         r2_out=r2_out, r2_n=r2_n, noise_in=noise_in, noise_n=noise_n, ac1=ac1, seas=seas,
                         ratio=np.log((g.inflow.sum() + 1) / (g.outflow.sum() + 1)), size=np.log10(scale)))
    return pd.DataFrame(rows).set_index("company_id")


def hist(v, edges, labels):
    c, _ = np.histogram(v, bins=edges)
    return [{"k": l, "n": int(n)} for l, n in zip(labels, c)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="/data")
    ap.add_argument("--panel", default="panel.csv")
    ap.add_argument("--out", default="probe_data.json")
    a = ap.parse_args()
    out = {}

    # ------------------------------------------------------------ 1. arquetipos
    panel = pd.read_csv(a.panel)
    F = trend_features(panel)
    F.to_csv("company_trend_features.csv")
    out["n_companies"] = int(len(F))
    edges = [-1, -0.3, -0.15, -0.05, -0.01, 0.01, 0.05, 0.15, 0.3, 1.5]
    labels = ["< −30%", "−30…−15", "−15…−5", "−5…−1", "−1…+1", "+1…+5", "+5…+15", "+15…+30", "> +30%"]
    out["slope_hist"] = {"inflow": hist(F.s_in, edges, labels), "outflow": hist(F.s_out, edges, labels),
                         "n_tx": hist(F.s_n, edges, labels)}
    out["slope_stats"] = {c: {"median": float(F[c].median()), "p10": float(F[c].quantile(.1)), "p90": float(F[c].quantile(.9)),
                              "skew": float(F[c].skew()), "kurt": float(F[c].kurt())} for c in ["s_in", "s_out", "s_n"]}
    out["slope_corr"] = {"in_out": float(F.s_in.corr(F.s_out)), "in_n": float(F.s_in.corr(F.s_n))}
    r2e = [0, .05, .1, .2, .3, .5, .7, 1.01]
    r2l = ["<5%", "5-10", "10-20", "20-30", "30-50", "50-70", "≥70%"]
    out["r2_hist"] = {"inflow": hist(F.r2_in, r2e, r2l), "n_tx": hist(F.r2_n, r2e, r2l)}
    out["r2_median"] = {"inflow": float(F.r2_in.median()), "n_tx": float(F.r2_n.median())}
    out["ac1_hist"] = hist(F.ac1, [-1, -.5, -.25, 0, .25, .5, .75, 1.01], ["< −0,5", "−0,5…−0,25", "−0,25…0", "0…0,25", "0,25…0,5", "0,5…0,75", "≥ 0,75"])
    out["seas_median"] = float(F.seas.median())

    cols = ["s_in", "s_out", "s_n", "r2_in", "noise_in", "ratio", "ac1"]
    Xf = F[cols].replace([np.inf, -np.inf], np.nan).dropna()
    X = StandardScaler().fit_transform(Xf)
    ks = []
    for k in range(1, 9):
        gm = GaussianMixture(k, n_init=5, random_state=0).fit(X)
        sil = float(silhouette_score(X, KMeans(k, n_init=10, random_state=0).fit_predict(X))) if k > 1 else None
        ks.append({"k": k, "bic": float(gm.bic(X)), "sil": sil})
    out["gmm"] = ks
    gm = GaussianMixture(4, n_init=5, random_state=0).fit(X)
    lab = gm.predict(X)
    prof = Xf.assign(cl=lab).groupby("cl").agg(["mean", "count"])
    out["gmm4"] = [{"cl": int(c), "n": int(prof.loc[c, ("s_in", "count")]),
                    **{col: float(prof.loc[c, (col, "mean")]) for col in cols}} for c in prof.index]
    # k=2 partition: what separates it?
    gm2 = GaussianMixture(2, n_init=5, random_state=0).fit(X)
    l2 = gm2.predict(X)
    p2 = Xf.assign(cl=l2).groupby("cl").agg(["mean", "count"])
    out["gmm2"] = [{"cl": int(c), "n": int(p2.loc[c, ("s_in", "count")]),
                    **{col: float(p2.loc[c, (col, "mean")]) for col in cols}} for c in p2.index]
    # slope vs size
    out["slope_vs_size"] = [{"x": float(r.size), "y": float(r.s_in), "m": int(r.months)} for r in F.sample(min(600, len(F)), random_state=0).itertuples()]

    # activity spans
    act = panel[panel.n_tx > 0].groupby("company_id").agg(first=("i", "min"), last=("i", "max"), months=("i", "count"))
    out["active_months_hist"] = [{"k": int(k), "n": int(v)} for k, v in act.months.value_counts().sort_index().items()]
    out["first_month_hist"] = [{"k": int(k), "n": int(v)} for k, v in act["first"].value_counts().sort_index().items()]

    # ------------------------------------------------------------ 2. huellas de datos reales
    con = duckdb.connect()
    d = a.data
    con.sql(f"""CREATE TABLE tx AS SELECT company_id, CAST(date AS DATE) date, date AS ts, amount, exchange_rate, description, counterparty_id,
        transaction_id, regexp_extract(description,'COUNTERPARTY_[0-9]+') tcp
        FROM read_csv('{d}/transactions.csv', header=true, sample_size=200000, ignore_errors=true)""")
    con.sql(f"""CREATE TABLE inv AS SELECT company_id, counterparty_id, amount, status, document_type, CAST(issuance_date AS DATE) issuance_date, operation_id
        FROM read_csv('{d}/invoices.csv', header=true, sample_size=200000, ignore_errors=true)""")
    con.sql(f"CREATE TABLE companies AS SELECT * FROM read_csv('{d}/companies.csv', header=true)")
    q = lambda s: con.sql(s).fetchall()
    rows = lambda s: [dict(zip(con.sql(s).columns, r)) for r in con.sql(s).fetchall()]

    out["benford"] = rows("""SELECT d, count(*) n, count(*)*1.0/sum(count(*)) over () obs, log10(1+1.0/d) expected FROM (
        SELECT CAST(left(CAST(CAST(abs(amount) AS BIGINT) AS VARCHAR),1) AS INT) d FROM tx WHERE abs(amount)>=1) GROUP BY 1 ORDER BY 1""")
    hol = ",".join(f"DATE '{h}'" for h in HOLIDAYS)
    out["holidays"] = rows(f"""WITH daily AS (SELECT date, count(*) n FROM tx GROUP BY 1), hol AS (SELECT unnest([{hol}]) h)
        SELECT CAST(h AS VARCHAR) k, dayname(h) dow, (SELECT n FROM daily WHERE date=h) n,
          (SELECT avg(n) FROM daily WHERE date BETWEEN h-7 AND h+7 AND date<>h AND dayofweek(date) BETWEEN 1 AND 5) base
        FROM hol WHERE dayofweek(h) BETWEEN 1 AND 5 ORDER BY 1""")
    out["fx_monthly"] = rows("""SELECT strftime(date_trunc('month',date),'%Y-%m') k, median(exchange_rate) fx, count(*) n
        FROM tx WHERE exchange_rate BETWEEN 1.02 AND 1.25 AND date < DATE '2026-09-01' GROUP BY 1 ORDER BY 1""")
    out["id_formats"] = rows("""SELECT CASE WHEN regexp_matches(transaction_id,'^[0-9a-f]{32}$') THEN 'hex 32 (md5)'
        WHEN regexp_matches(transaction_id,'^[0-9a-f]{64}$') THEN 'hex 64 (sha256)'
        WHEN regexp_matches(transaction_id,'^[0-9A-Z]{17}$') THEN 'alfanum 17 (PayPal)'
        WHEN transaction_id LIKE '%-Settled-%' OR transaction_id LIKE '%-Fee-%' THEN 'XXXX-XXXX-Settled (PSP)'
        WHEN regexp_matches(transaction_id,'^[0-9]+$') THEN 'numérico'
        WHEN regexp_matches(transaction_id,'^[A-Za-z0-9+/]+=*$') AND length(transaction_id) NOT IN (32,64) THEN 'base64-like' ELSE 'otro' END k, count(*) n
        FROM tx GROUP BY 1 ORDER BY 2 DESC""")
    out["ts_with_time"] = q("SELECT count(*) FROM tx WHERE hour(ts)<>0 OR minute(ts)<>0")[0][0]
    out["cents"] = rows("SELECT CAST(round((abs(amount)*100)%100) AS INT) k, count(*) n FROM tx WHERE amount<>0 GROUP BY 1 ORDER BY 2 DESC LIMIT 10")
    out["cents_even_share"] = q("SELECT avg((CAST(round((abs(amount)*100)%100) AS INT)%2=0)::int) FROM tx WHERE amount<>0")[0][0]
    out["recurring_pairs"] = q("""SELECT count(*) FILTER (WHERE k>=6), count(*) FROM (SELECT company_id, counterparty_id, amount,
        count(DISTINCT date_trunc('month',date)) k FROM tx WHERE counterparty_id IS NOT NULL GROUP BY 1,2,3)""")[0]
    out["net_over_gross_q"] = q("""SELECT quantile_cont(abs(net)/gross,[0.1,0.25,0.5,0.75,0.9]) FROM (
        SELECT company_id, sum(amount) net, sum(abs(amount)) gross FROM tx WHERE abs(amount)<1e8 GROUP BY 1)""")[0][0]
    out["id_order_corr"] = {
        "company_vs_created": q("SELECT corr(CAST(substr(company_id,6) AS INT), epoch(CAST(created_at AS TIMESTAMP))) FROM companies")[0][0],
        "cp_vs_first_date": q("""WITH f AS (SELECT counterparty_id, min(date) fd FROM tx WHERE counterparty_id IS NOT NULL GROUP BY 1)
            SELECT corr(CAST(substr(counterparty_id,14) AS INT), epoch(fd)) FROM f""")[0][0]}
    out["created_vs_first_tx"] = rows("""SELECT k, count(*) n FROM (SELECT CASE
        WHEN dd < -180 THEN '< −180' WHEN dd < -60 THEN '−180…−60' WHEN dd < -30 THEN '−60…−30' WHEN dd < 0 THEN '−30…−1'
        WHEN dd = 0 THEN '0' WHEN dd <= 30 THEN '1…30' WHEN dd <= 180 THEN '31…180' ELSE '> 180' END k, dd FROM (
        SELECT date_diff('day', CAST(c.created_at AS DATE), t.f) dd FROM companies c JOIN (SELECT company_id, min(date) f FROM tx GROUP BY 1) t USING (company_id)))
        GROUP BY 1 ORDER BY min(dd)""")

    # ------------------------------------------------------------ 3. espacios de id de contraparte
    out["cp_spaces"] = {
        "column_shared_across_companies": rows("""SELECT n_comp k, count(*) n FROM (SELECT counterparty_id, count(DISTINCT company_id) n_comp
            FROM tx WHERE counterparty_id IS NOT NULL GROUP BY 1) GROUP BY 1 ORDER BY 1 LIMIT 5"""),
        "text_shared_across_companies": rows("""SELECT CASE WHEN n_comp=1 THEN '1' WHEN n_comp<=3 THEN '2-3' WHEN n_comp<=10 THEN '4-10'
            WHEN n_comp<=50 THEN '11-50' ELSE '>50' END k, count(*) n, min(n_comp) o FROM (SELECT tcp, count(DISTINCT company_id) n_comp
            FROM tx WHERE tcp<>'' GROUP BY 1) GROUP BY 1 ORDER BY o"""),
        "text_eq_column": q("SELECT avg((tcp = counterparty_id)::int), count(*) FROM tx WHERE counterparty_id IS NOT NULL AND tcp<>''")[0],
        "text_top": rows("""SELECT tcp k, count(DISTINCT company_id) companies, count(*) n, min(left(description,70)) example
            FROM tx WHERE tcp<>'' GROUP BY 1 ORDER BY 2 DESC LIMIT 10"""),
        "inv_column_shared": q("SELECT max(n_comp) FROM (SELECT counterparty_id, count(DISTINCT company_id) n_comp FROM inv WHERE counterparty_id IS NOT NULL GROUP BY 1)")[0][0],
        "inv_tx_common_same_company": q("""SELECT count(*) FILTER (WHERE same), count(*) FROM (
            SELECT counterparty_id, bool_or(t.company_id = i.company_id) same FROM
            (SELECT DISTINCT counterparty_id, company_id FROM tx WHERE counterparty_id IS NOT NULL) t
            JOIN (SELECT DISTINCT counterparty_id, company_id FROM inv WHERE counterparty_id IS NOT NULL) i USING (counterparty_id) GROUP BY 1)""")[0],
    }
    con.sql("""CREATE TABLE ip AS SELECT company_id, counterparty_id cp, abs(amount) a, issuance_date FROM inv
        WHERE status='paid' AND document_type='invoice' AND counterparty_id IS NOT NULL AND amount<>0 AND abs(amount)<1e8""")
    out["match_by_space"] = dict(zip(["via_columna", "via_texto", "via_texto_sin_columna", "total"], q("""SELECT
        (SELECT count(DISTINCT (i.company_id,i.cp,i.a,i.issuance_date)) FROM ip i JOIN tx t ON t.company_id=i.company_id AND t.counterparty_id=i.cp AND abs(t.amount)=i.a AND t.date BETWEEN i.issuance_date-30 AND i.issuance_date+365),
        (SELECT count(DISTINCT (i.company_id,i.cp,i.a,i.issuance_date)) FROM ip i JOIN tx t ON t.company_id=i.company_id AND t.tcp=i.cp AND abs(t.amount)=i.a AND t.date BETWEEN i.issuance_date-30 AND i.issuance_date+365),
        (SELECT count(DISTINCT (i.company_id,i.cp,i.a,i.issuance_date)) FROM ip i JOIN tx t ON t.company_id=i.company_id AND t.tcp=i.cp AND t.counterparty_id IS NULL AND abs(t.amount)=i.a AND t.date BETWEEN i.issuance_date-30 AND i.issuance_date+365),
        (SELECT count(*) FROM ip)""")[0]))

    def default(o):
        if isinstance(o, (np.integer,)):
            return int(o)
        if isinstance(o, (np.floating,)):
            return None if np.isnan(o) else float(o)
        return str(o)

    with open(a.out, "w") as f:
        json.dump(out, f, ensure_ascii=False, default=default)
    print("probe_data.json escrito")


if __name__ == "__main__":
    main()
