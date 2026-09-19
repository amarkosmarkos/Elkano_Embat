"""Genera los JSON estáticos que lee la demo (apps/web/public/data) a partir de las salidas del pipeline.

    python apps/web/scripts/build_demo_data.py [--out apps/web/public/data]

Lee output/02_score/scores_v3.csv (score, contribuciones, alerta, explicación), scores_v2.csv (explicación con métrica),
metrics_v1.parquet (métricas por empresa y mes), 03_validation/events_v1.csv y las tablas gold del preprocesamiento.
No calcula ningún score: solo reorganiza y construye las tarjetas de decisión con reglas simples y explícitas.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import duckdb
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "output"
LAST = "2026-08"
RATE_PLACEMENT = 0.025   # depósito / fondo monetario
RATE_LINE = 0.05         # coste medio de una póliza dispuesta

WINDOWS = [
    {"key": "caja", "title": "Por la caja", "value": "2.460 M€", "detail": "535 M€ llevan un año sin moverse en 312 empresas"},
    {"key": "deuda", "title": "Por la deuda", "value": "1.910 M€", "detail": "378 empresas deben; 163 no cubren las cuotas del próximo trimestre"},
    {"key": "cobros", "title": "Por lo que cobran", "value": "3.900 M€", "detail": "del saldo pendiente hoy, el 88% ya está vencido"},
    {"key": "pagos", "title": "Por cómo pagan", "value": "53%", "detail": "de los euros a proveedores se pagan tarde; 115 empresas estiran desde marzo"},
    {"key": "banco", "title": "Por el banco", "value": "283 M€", "detail": "en comisiones; diferencias de 7 veces entre bancos comparables"},
    {"key": "grupo", "title": "Por el grupo", "value": "97 de 179", "detail": "grupos con una filial sobrada y otra tirando de póliza el mismo día"},
    {"key": "recibos", "title": "Por los recibos devueltos", "value": "x3", "detail": "empresas afectadas cada mes, de 40 a más de 100 en dos años"},
]


def f(x, nd=2):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    return round(float(x), nd)


def month_add(m: str, k: int) -> str:
    y, mm = int(m[:4]), int(m[5:7])
    t = y * 12 + (mm - 1) + k
    return f"{t // 12:04d}-{t % 12 + 1:02d}"


def month_diff(a: str, b: str) -> int:
    return (int(a[:4]) * 12 + int(a[5:7])) - (int(b[:4]) * 12 + int(b[5:7]))


def tier(s):
    return "verde" if s >= 70 else ("ambar" if s >= 40 else "rojo")


def trend(d6, d3):
    d = d6 if d6 is not None else (d3 * 2 if d3 is not None else 0)
    return "mejora" if d >= 5 else ("empeora" if d <= -5 else "estable")


def main(out_dir: Path):
    c = duckdb.connect()
    s3 = c.sql(f"select * from read_csv_auto('{OUT}/02_score/scores_v3.csv')").df()
    s2 = c.sql(f"select company_id, month, explanation as explanation_v2 from read_csv_auto('{OUT}/02_score/scores_v2.csv')").df()
    met = c.sql(f"""select company_id, month, retraso_pago, dso, devoluciones, servicio_deuda, runway, colchon,
                    pct_dispuesto, credito_disponible, n_stress from '{OUT}/02_score/metrics_v1.parquet'""").df()
    cm = c.sql(f"""select company_id, year_month as month, inflow, outflow, net, balance_eom, balance_min,
                   dpo_median, dso_median, overdue_share, amt_debt_repayment, amt_interest_charge
                   from '{OUT}/01_preprocessed/gold/company_month.parquet' where not is_partial_month""").df()
    ev = c.sql(f"select * from read_csv_auto('{OUT}/03_validation/events_v1.csv')").df()
    dc = c.sql(f"select * from '{OUT}/01_preprocessed/gold/dim_company.parquet'").df().set_index("company_id")
    dp = c.sql(f"select * from '{OUT}/01_preprocessed/gold/dim_product.parquet'").df()

    s3["month"] = s3["month"].astype(str)
    s2["month"] = s2["month"].astype(str)
    met["month"] = met["month"].astype(str)
    cm["month"] = cm["month"].astype(str)
    ev["month"] = ev["month"].astype(str)

    panel = (s3.merge(s2, on=["company_id", "month"], how="left")
               .merge(met, on=["company_id", "month"], how="left")
               .merge(cm, on=["company_id", "month"], how="left")
               .sort_values(["company_id", "month"]))
    ev = ev.sort_values(["company_id", "month"])

    # productos por empresa
    prod = {}
    for cid, g in dp.groupby("company_id"):
        banks = sorted({b for b in g["bank_name"].dropna() if b and not str(b).startswith("Other")})
        lines = g[(g["type"].isin(["lineofcredit"]))]
        prod[cid] = {
            "n_bank": int((g["family"] == "banking").sum()) if "family" in g else int(len(g)),
            "n_debt": int((g["family"] == "debt").sum()) if "family" in g else 0,
            "banks": banks[:6],
            "has_investment": bool(g["type"].isin(["investment", "saving"]).any()),
            "credit_lines": [
                {"bank": (r.bank_name or "")[:30], "granted": f(r.granted_abs, 0), "drawn": f(r.outstanding_abs, 0)}
                for r in lines.itertuples() if r.granted_abs and not math.isnan(r.granted_abs)
            ][:6],
        }

    companies = []
    company_files = {}
    last_rows = {}
    for cid, g in panel.groupby("company_id", sort=True):
        g = g.reset_index(drop=True)
        by_m = {r.month: r for r in g.itertuples()}
        if LAST not in by_m:
            continue
        r = by_m[LAST]
        r3 = by_m.get(month_add(LAST, -3))
        r6 = by_m.get(month_add(LAST, -6))
        d3 = f(r.score - r3.score, 1) if r3 is not None else None
        d6 = f(r.score - r6.score, 1) if r6 is not None else None
        tr = trend(d6, d3)
        info = dc.loc[cid] if cid in dc.index else None
        p = prod.get(cid, {"n_bank": 0, "n_debt": 0, "banks": [], "has_investment": False, "credit_lines": []})
        cur = str(info["currency"]) if info is not None and isinstance(info["currency"], str) else "EUR"

        months = []
        for x in g.itertuples():
            months.append({
                "m": x.month, "score": f(x.score, 1),
                "c": {"pago": f(x.c_pago, 1), "liquidez": f(x.c_liquidez, 1), "caja": f(x.c_caja, 1),
                      "deuda": f(x.c_deuda, 1), "concentracion": f(x.c_concentracion, 1)},
                "alert": int(x.alert) if not pd.isna(x.alert) else 0,
                "explanation": x.explanation if isinstance(x.explanation, str) else None,
                "inflow": f(x.inflow, 0), "outflow": f(x.outflow, 0), "net": f(x.net, 0),
                "balance_eom": f(x.balance_eom, 0), "balance_min": f(x.balance_min, 0),
                "dpo": f(x.dpo_median, 0), "dso": f(x.dso_median, 0), "overdue_share": f(x.overdue_share, 3),
                "retraso_pago": f(x.retraso_pago, 1), "devoluciones": f(x.devoluciones, 0),
                "servicio_deuda": f(x.servicio_deuda, 3), "runway": f(x.runway, 1),
            })

        # eventos
        eg = ev[ev.company_id == cid]
        events = [{"m": e.month, "event": int(e.event or 0), "D1": int(e.D1 or 0), "D2": int(e.D2 or 0),
                   "D3": int(e.D3 or 0), "D4": int(e.D4 or 0), "cure": int(e.cure or 0)}
                  for e in eg.itertuples() if (e.event or 0) == 1 or (e.cure or 0) == 1]
        anticipation = None
        ev_months = [e.month for e in eg.itertuples() if (e.event or 0) == 1]
        ev_set = set(ev_months)
        starts = [m for m in ev_months if month_add(m, -1) not in ev_set and m > months[0]["m"]]
        alert_months = [x.month for x in g.itertuples() if x.alert == 1]
        best = None
        for st in starts:
            prior = [a for a in alert_months if a < st and month_diff(st, a) <= 6 and month_add(a, -1) not in ev_set]
            if prior:
                cand = {"first_alert_month": prior[0], "first_event_month": st, "lead_months": month_diff(st, prior[0])}
                if best is None or cand["lead_months"] > best["lead_months"]:
                    best = cand
        anticipation = best

        # tarjeta excedentes
        last12 = [x for x in g.itertuples() if month_diff(LAST, x.month) < 12 and not pd.isna(x.balance_min)]
        last6 = [x for x in last12 if month_diff(LAST, x.month) < 6]
        floor12 = min((x.balance_min for x in last12), default=None)
        floor6 = min((x.balance_min for x in last6), default=None)
        exc = None
        if floor12 is not None and floor12 > 0 and len(last12) >= 6:
            if r.score >= 70 and tr != "empeora":
                factor, horizon, why = 0.8, 6, f"Score {r.score:.0f} y {tr}: puede colocar el 80% de su suelo de 12 meses a 6 meses"
            elif r.score >= 40:
                factor, horizon, why = 0.5, 3, f"Score {r.score:.0f}: propuesta prudente, la mitad del suelo a 3 meses"
            else:
                factor, horizon, why = 0.0, 0, f"Score {r.score:.0f}: no se propone colocar; la caja es el colchón"
            proposal = floor12 * factor
            exc = {"floor6": f(floor6, 0), "floor12": f(floor12, 0), "proposal": f(proposal, 0),
                   "horizon_months": horizon, "yield_yearly": f(proposal * RATE_PLACEMENT, 0),
                   "rate": RATE_PLACEMENT, "reason": why}

        # alertas del monitor
        alertas = []
        svc = [abs(x.amt_debt_repayment or 0) + abs(x.amt_interest_charge or 0) for x in g.itertuples()
               if month_diff(LAST, x.month) < 3 and not pd.isna(x.amt_debt_repayment)]
        if svc and sum(svc) > 0 and not pd.isna(r.balance_eom):
            service3 = sum(svc) / len(svc) * 3
            undrawn = sum((l["granted"] or 0) - (l["drawn"] or 0) for l in p["credit_lines"])
            if service3 > 5000 and service3 > r.balance_eom:
                sev = "alta" if service3 > r.balance_eom + undrawn else "media"
                alertas.append({"type": "cuotas", "severity": sev, "month": month_add(LAST, 3),
                                "title": "Cuotas del próximo trimestre no cubiertas",
                                "text": f"Servicio de deuda estimado {service3:,.0f} frente a caja de {r.balance_eom:,.0f}"
                                        + (f" y {undrawn:,.0f} sin disponer en líneas." if undrawn > 0 else ". Sin líneas disponibles: mover caja del grupo o renegociar."),
                                "months_ahead": 3})
        rp_now = sorted(x.retraso_pago for x in g.itertuples() if month_diff(LAST, x.month) < 3 and not pd.isna(x.retraso_pago) and abs(x.retraso_pago) <= 120)
        rp_before = sorted(x.retraso_pago for x in g.itertuples() if 3 <= month_diff(LAST, x.month) < 9 and not pd.isna(x.retraso_pago) and abs(x.retraso_pago) <= 120)
        if len(rp_now) >= 2 and len(rp_before) >= 3:
            dd = rp_now[len(rp_now) // 2] - rp_before[len(rp_before) // 2]
            if dd >= 5:
                alertas.append({"type": "proveedores", "severity": "alta" if dd >= 15 else "media", "month": LAST,
                                "title": f"Paga a proveedores {dd:.0f} días más tarde que hace seis meses",
                                "text": "Estirar el pago a proveedores es la primera señal de deterioro que ve un banco. Recomendación: pagar en el último día de plazo, nunca después, y cubrir el hueco con línea o pooling.",
                                "months_ahead": 0})
        dv_now = [x.devoluciones for x in g.itertuples() if month_diff(LAST, x.month) < 3 and not pd.isna(x.devoluciones)]
        dv_before = [x.devoluciones for x in g.itertuples() if 3 <= month_diff(LAST, x.month) < 9 and not pd.isna(x.devoluciones)]
        if dv_now and dv_before and sum(dv_now) / len(dv_now) > max(1.0, 1.5 * sum(dv_before) / len(dv_before)):
            alertas.append({"type": "recibos", "severity": "media", "month": LAST,
                            "title": "Suben los recibos devueltos de sus clientes",
                            "text": "Los recibos que vuelven impagados son la señal más temprana de que un cliente está mal. Revisar límite de crédito de los clientes afectados.",
                            "months_ahead": 0})
        if d3 is not None and d3 <= -8:
            alertas.append({"type": "score", "severity": "alta" if tier(r.score) == "rojo" else "media", "month": LAST,
                            "title": f"El score cae {abs(d3):.0f} puntos en tres meses",
                            "text": (r.explanation if isinstance(r.explanation, str) else "") or "Deterioro sostenido, no un bache.",
                            "months_ahead": 0})
        elif int(r.alert or 0) == 1:
            alertas.append({"type": "score", "severity": "media", "month": LAST, "title": "En el 20% peor del mes",
                            "text": (r.explanation if isinstance(r.explanation, str) else "") or "Score en la cola baja del mes.", "months_ahead": 0})

        rec = {"id": cid, "group_id": str(info["group_id"]) if info is not None else None,
               "group_size": int(info["group_size"]) if info is not None and not pd.isna(info["group_size"]) else 1,
               "country": str(info["country"]) if info is not None and isinstance(info["country"], str) else None,
               "currency": cur,
               "score": f(r.score, 1), "score_3m": f(r3.score, 1) if r3 is not None else None,
               "score_6m": f(r6.score, 1) if r6 is not None else None, "delta3": d3, "delta6": d6,
               "tier": tier(r.score), "trend": tr, "alert": int(r.alert or 0),
               "explanation": r.explanation if isinstance(r.explanation, str) else None,
               "c": months[-1]["c"], "cash": f(r.balance_eom, 0),
               "has_debt": bool(info["has_debt"]) if info is not None else False, "first_month": months[0]["m"],
               "n_alertas": len(alertas)}
        companies.append(rec)
        cash_ok = 0.0 if pd.isna(r.balance_eom) or abs(r.balance_eom) > 3e8 else float(r.balance_eom)
        last_rows[cid] = {"score": r.score, "tier": rec["tier"], "trend": tr, "cash": cash_ok,
                          "floor12": floor12, "drawn": sum((l["drawn"] or 0) for l in p["credit_lines"]),
                          "undrawn": sum((l["granted"] or 0) - (l["drawn"] or 0) for l in p["credit_lines"])}
        company_files[cid] = {**{k: rec[k] for k in ("id", "group_id", "group_size", "country", "currency")},
                              "months": months, "events": events, "anticipation": anticipation,
                              "explanation_v2": r.explanation_v2 if isinstance(r.explanation_v2, str) else None,
                              "products": p, "cards": {"excedentes": exc, "pooling": None, "alertas": alertas}}

    # grupos y pooling
    groups = []
    by_group = {}
    for rec in companies:
        by_group.setdefault(rec["group_id"], []).append(rec["id"])
    for gid, members in by_group.items():
        if not gid or len(members) < 2:
            continue
        rows = {m: last_rows[m] for m in members}
        surplus = sum(max(v["cash"] or 0, 0) for v in rows.values())
        drawn = sum(v["drawn"] for v in rows.values())
        overdraft = sum(-min(v["cash"] or 0, 0) for v in rows.values())
        lenders = sorted([(m, min(max((v["cash"] or 0) - 0.5 * max(v["floor12"] or 0, 0), 0), 5e7)) for m, v in rows.items()
                          if (v["cash"] or 0) > 0 and v["score"] >= 40], key=lambda t: -t[1])
        borrowers = []
        for m, v in rows.items():
            need = min(v["drawn"] + (-min(v["cash"] or 0, 0)), 5e7)
            if need <= 0:
                continue
            factor = 1.0 if v["score"] >= 70 else (0.5 if v["score"] >= 40 else (0.0 if v["trend"] == "empeora" else 0.25))
            borrowers.append((m, need, need * factor, v["score"], v["trend"]))
        borrowers.sort(key=lambda t: -t[1])
        proposals = []
        for bm, need, limit, bs, btr in borrowers:
            remaining = limit
            for i, (lm, avail) in enumerate(lenders):
                if remaining <= 0 or avail <= 0 or lm == bm:
                    continue
                amt = min(avail, remaining)
                if amt < 1000:
                    continue
                rate = round(0.02 + (100 - bs) / 100 * 0.03, 3)
                why = (f"Score {bs:.0f} y {btr}: " +
                       ("cubre todo lo dispuesto" if limit >= need else f"límite al {limit / need:.0%} de lo dispuesto"))
                proposals.append({"from": lm, "to": bm, "amount": f(amt, 0), "limit": f(limit, 0), "rate_internal": rate, "reason": why})
                lenders[i] = (lm, avail - amt)
                remaining -= amt
        nettable = sum(p_["amount"] for p_ in proposals)
        pooling = bool(proposals)
        groups.append({"id": gid, "size": len(members), "members": members, "surplus": f(surplus, 0), "drawn": f(drawn, 0),
                       "overdraft": f(overdraft, 0), "nettable": f(nettable, 0), "pooling": pooling,
                       "saving_yearly": f(nettable * RATE_LINE, 0)})
        if pooling:
            card = {"group_id": gid,
                    "members": [{"id": m, "score": f(rows[m]["score"], 1), "cash": f(rows[m]["cash"], 0), "drawn": f(rows[m]["drawn"], 0)} for m in members],
                    "proposals": proposals, "saving_yearly": f(nettable * RATE_LINE, 0)}
            for m in members:
                company_files[m]["cards"]["pooling"] = card

    # overview
    scores = [x["score"] for x in companies]
    hist = [{"bucket": f"{b}-{b + 10}", "n": sum(1 for s in scores if b <= s < b + 10 or (b == 90 and s == 100))} for b in range(0, 100, 10)]
    counts = {"verde": sum(1 for x in companies if x["tier"] == "verde"), "ambar": sum(1 for x in companies if x["tier"] == "ambar"),
              "rojo": sum(1 for x in companies if x["tier"] == "rojo"), "mejorando": sum(1 for x in companies if x["trend"] == "mejora"),
              "empeorando": sum(1 for x in companies if x["trend"] == "empeora"), "alertas": sum(1 for x in companies if x["alert"] == 1),
              "grupos_pooling": sum(1 for g in groups if g["pooling"]),
              "con_excedente": sum(1 for cf in company_files.values() if cf["cards"]["excedentes"] and cf["cards"]["excedentes"]["proposal"])}
    overview = {"month_last": LAST, "n_companies": 1286, "n_groups": 250, "n_tx": 2556437, "n_invoices": 897894, "months": 24,
                "windows": WINDOWS, "score_hist": hist, "counts": counts, "n_scored": len(companies)}

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "company").mkdir(exist_ok=True)
    (out_dir / "overview.json").write_text(json.dumps(overview, ensure_ascii=False))
    (out_dir / "companies.json").write_text(json.dumps(companies, ensure_ascii=False))
    (out_dir / "groups.json").write_text(json.dumps(groups, ensure_ascii=False))
    for cid, cf in company_files.items():
        (out_dir / "company" / f"{cid}.json").write_text(json.dumps(cf, ensure_ascii=False))
    print(f"{len(companies)} empresas, {len(groups)} grupos ({counts['grupos_pooling']} con pooling), "
          f"{counts['con_excedente']} con propuesta de excedentes → {out_dir}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "apps" / "web" / "public" / "data"))
    main(Path(ap.parse_args().out))
