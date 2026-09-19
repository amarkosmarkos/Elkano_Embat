import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "./source";
import type { CompanyDetail, CompanyIndex, EventRow, NetworkMeta } from "@/lib/score/types";

export interface Report {
  gini: Record<"h1" | "h3" | "h6", number>;
  ks: Record<"h1" | "h3" | "h6", number>;
  gini_new_events: Record<"h1" | "h3" | "h6", number>;
  event_rate: number;
  event_rate_h: Record<"h1" | "h3" | "h6", number>;
  n_pairs: number;
  n_rows: number;
  n_companies: number;
  lead_time_months: { median: number; p25: number; p75: number; n_companies_with_event: number; share_warned_before_or_at_event: number; share_warned_2m_before: number };
  oos: { gini_h6_by_fold: number[]; mean: number; drop_vs_in_sample: number };
  oot_h3: { gini_h3_test: number; gini_h3_train: number; drop: number };
  psi: Record<string, number>;
  autocorr_lag1: number;
  univariate: Record<string, number>;
  univariate_metrics: { gini: Record<string, { gini: number; coverage: number }>; "weak (|gini| < 0.05)": string[]; "correlated_pairs (|rho| > 0.8)": [string, string, number][] };
  calibration_h6: { decile: number; n: number; score_min: number; score_max: number; event_h1: number; event_h3: number; event_h6: number }[];
  worst_false_negatives: { company_id: string; month: string; score: number }[];
  worst_false_positives: { company_id: string; month: string; score: number }[];
  group_corr: { pairs: number; corr: number };
  alerts: { rate: number; precision_h3: number; recall_h3: number };
  acceptance: { metric: string; value: number | boolean; min: number | boolean | string; good: number | boolean | string; status: string }[];
  gini_cure_h6: number;
}

export interface LabelsSummary {
  rows: number;
  event_rate: number;
  rate_by_rule: Record<"D1" | "D2" | "D3" | "D4", number>;
  companies_ever_in_event: number;
  cure_rows: number;
  thresholds: Record<string, number | string>;
}

export interface ComparisonRow { version: string; gini_h1: number; gini_h3: number; gini_h6: number; gini_h6_new: number; ks_h6: number; lead_time: number; gini_cure: number; oos_mean: number; autocorr: number }

export interface Store {
  meta: NetworkMeta;
  months: string[];
  companies: CompanyIndex[];
  byId: Map<string, CompanyIndex>;
  groups: Map<string, string[]>;
  /** caja real a fin de mes (EUR) por `${id}|${month}`: output/02_score/cash_position.csv, reconstruida desde balances + transactions (tools/export_cash_position.py) */
  cash: Map<string, number>;
  cashMonths: string[];
  events: Map<string, EventRow[]>;
  reports: Record<"v1" | "v2" | "v3", Report>;
  comparison: ComparisonRow[];
  labels: LabelsSummary;
  eda: Record<string, unknown>;
}

declare global {
  // eslint-disable-next-line no-var
  var __xrayStore: Promise<Store> | undefined;
  // eslint-disable-next-line no-var
  var __xrayDetails: Map<string, Promise<CompanyDetail>> | undefined;
  // eslint-disable-next-line no-var
  var __xrayAllDetails: Promise<Map<string, CompanyDetail>> | undefined;
}

async function json<T>(p: string): Promise<T> {
  return JSON.parse(await readFile(p, "utf8")) as T;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  const head = lines[0].split(",");
  return lines.slice(1).map((l) => {
    const cells = l.split(",");
    const row: Record<string, string> = {};
    head.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function parseComparison(md: string): ComparisonRow[] {
  return md
    .split("\n")
    .filter((l) => l.startsWith("| v"))
    .map((l) => {
      const c = l.split("|").map((s) => s.trim()).filter(Boolean);
      const n = (i: number) => Number(c[i]);
      return { version: c[0], gini_h1: n(2), gini_h3: n(3), gini_h6: n(4), gini_h6_new: n(5), ks_h6: n(6), lead_time: n(7), gini_cure: n(8), oos_mean: n(9), autocorr: n(10) };
    });
}

async function load(): Promise<Store> {
  const [net, cashCsv, eventsCsv, r1, r2, r3, comparisonMd, labels, eda] = await Promise.all([
    json<{ meta: NetworkMeta; companies: CompanyIndex[] }>(PATHS.network),
    readFile(PATHS.cash, "utf8").catch(() => "company_id,month,cash_position\n"),
    readFile(path.join(PATHS.validation, "events_v1.csv"), "utf8"),
    json<Report>(path.join(PATHS.validation, "report_v1.json")),
    json<Report>(path.join(PATHS.validation, "report_v2.json")),
    json<Report>(path.join(PATHS.validation, "report_v3.json")),
    readFile(path.join(PATHS.validation, "comparison.md"), "utf8"),
    json<LabelsSummary>(path.join(PATHS.validation, "labels_summary.json")),
    json<Record<string, unknown>>(PATHS.eda),
  ]);

  // el dataset es anónimo (COMP_xxxx): el nombre es el alias determinista del ETL del marketplace; el id se enseña siempre
  const companies = net.companies;
  const byId = new Map(companies.map((c) => [c.id, c]));

  const groups = new Map<string, string[]>();
  for (const c of companies) {
    if (!c.group) continue;
    if (!groups.has(c.group)) groups.set(c.group, []);
    groups.get(c.group)!.push(c.id);
  }

  const cash = new Map<string, number>();
  const cm = new Set<string>();
  for (const r of parseCsv(cashCsv)) {
    const v = Number(r.cash_position);
    if (!r.company_id || !Number.isFinite(v)) continue;
    cash.set(`${r.company_id}|${r.month}`, v);
    cm.add(r.month);
  }

  const events = new Map<string, EventRow[]>();
  for (const r of parseCsv(eventsCsv)) {
    const row: EventRow = { month: r.month, D1: Number(r.D1), D2: Number(r.D2), D3: Number(r.D3), D4: Number(r.D4), event: Number(r.event), cure: Number(r.cure) };
    if (!events.has(r.company_id)) events.set(r.company_id, []);
    events.get(r.company_id)!.push(row);
  }
  for (const rows of events.values()) rows.sort((a, b) => a.month.localeCompare(b.month));

  return {
    meta: net.meta,
    months: net.meta.months,
    companies,
    byId,
    groups,
    cash,
    cashMonths: [...cm].sort(),
    events,
    reports: { v1: r1, v2: r2, v3: r3 },
    comparison: parseComparison(comparisonMd),
    labels,
    eda,
  };
}

/** Todo el dataset en memoria, una vez por proceso (sobrevive a los hot-reloads de dev). */
export function getStore(): Promise<Store> {
  if (!globalThis.__xrayStore) globalThis.__xrayStore = load();
  return globalThis.__xrayStore;
}

export function getDetail(id: string): Promise<CompanyDetail> {
  if (!globalThis.__xrayDetails) globalThis.__xrayDetails = new Map();
  let p = globalThis.__xrayDetails.get(id);
  if (!p) {
    p = json<CompanyDetail>(path.join(PATHS.companyDir, `${id}.json`));
    globalThis.__xrayDetails.set(id, p);
  }
  return p;
}

/** Las 1.282 fichas (≈15 MB): solo para las vistas que miran una métrica en toda la red. */
export function getAllDetails(): Promise<Map<string, CompanyDetail>> {
  if (!globalThis.__xrayAllDetails) {
    globalThis.__xrayAllDetails = (async () => {
      const files = (await readdir(PATHS.companyDir)).filter((f) => f.endsWith(".json"));
      const out = new Map<string, CompanyDetail>();
      const chunk = 64;
      for (let i = 0; i < files.length; i += chunk) {
        const part = await Promise.all(files.slice(i, i + chunk).map((f) => getDetail(f.replace(".json", ""))));
        for (const d of part) out.set(d.id, d);
      }
      return out;
    })();
  }
  return globalThis.__xrayAllDetails;
}

export function cashAt(store: Store, id: string, month: string): number | null {
  return store.cash.get(`${id}|${month}`) ?? null;
}
