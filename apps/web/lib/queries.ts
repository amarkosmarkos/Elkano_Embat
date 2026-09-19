import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import { alerts, companies, explanations, scores } from "./db/schema";

export type Signals = {
  cash_position: number | null;
  net_cash_flow: number | null;
  runway_months: number | null;
  dso_days: number | null;
  dpo_days: number | null;
  overdue_ar_ratio: number | null;
  overdue_ap_ratio: number | null;
  debt_utilization: number | null;
  debt_service_ratio: number | null;
  inflow_volatility: number | null;
  top_customer_share: number | null;
};

export async function listCompanies(limit = 60) {
  return db
    .select({ companyId: companies.companyId, displayName: companies.displayName, groupId: companies.groupId, hasDebt: companies.hasDebt })
    .from(companies)
    .orderBy(asc(companies.companyId))
    .limit(limit);
}

export async function getCompany(companyId: string) {
  const [co] = await db.select().from(companies).where(eq(companies.companyId, companyId)).limit(1);
  return co ?? null;
}

export async function getScoreSeries(companyId: string) {
  return db.select().from(scores).where(eq(scores.companyId, companyId)).orderBy(asc(scores.month));
}

export async function getLastScore(companyId: string) {
  const [row] = await db.select().from(scores).where(eq(scores.companyId, companyId)).orderBy(desc(scores.month)).limit(1);
  return row ?? null;
}

export async function getExplanation(companyId: string, month: string) {
  const [row] = await db
    .select()
    .from(explanations)
    .where(and(eq(explanations.companyId, companyId), eq(explanations.month, month)))
    .limit(1);
  return row ?? null;
}

export async function getRecentAlerts(companyId: string, n = 5) {
  return db.select().from(alerts).where(eq(alerts.companyId, companyId)).orderBy(desc(alerts.month)).limit(n);
}

/** Última foto de cada empresa del mismo grupo (para cash-pooling: quién sobra, quién falta). */
export async function getGroupLatestScores(groupId: string, excludeCompanyId?: string) {
  const siblings = await db.select().from(companies).where(eq(companies.groupId, groupId));
  const ids = siblings.map((s) => s.companyId).filter((id) => id !== excludeCompanyId);
  if (ids.length === 0) return [];
  const last = await db
    .select({ companyId: scores.companyId, month: scores.month, score: scores.score, signals: scores.signals })
    .from(scores)
    .where(inArray(scores.companyId, ids))
    .orderBy(desc(scores.month));
  // nos quedamos con la fila más reciente por empresa (la query ya viene ordenada por mes desc)
  const seen = new Set<string>();
  const out: typeof last = [];
  for (const row of last) {
    if (seen.has(row.companyId)) continue;
    seen.add(row.companyId);
    out.push(row);
  }
  return out.map((row) => ({ ...row, displayName: siblings.find((s) => s.companyId === row.companyId)?.displayName ?? row.companyId }));
}

/**
 * Grupos con más de una empresa y dispersión de caja real — para elegir ejemplos de demo sin
 * hardcodear IDs a mano. Los datos sintéticos traen algún cash_position disparatado (ver
 * docs/data-map.md / pipeline/config.py AMOUNT_OUTLIER_ABS): se acota a una banda razonable de
 * pyme antes de medir dispersión, si no el "más disperso" es siempre el más roto.
 */
export async function findCashPoolingCandidateGroup() {
  const rows = await db.execute<{ group_id: string; n: number; spread: number }>(sql`
    select c.group_id,
           count(*)::int as n,
           (max((s.signals->>'cash_position')::numeric) - min((s.signals->>'cash_position')::numeric))::float as spread
    from companies c
    join scores s on s.company_id = c.company_id and s.month = (select max(month) from scores s2 where s2.company_id = c.company_id)
    where c.group_id is not null
      and (s.signals->>'cash_position')::numeric between 0 and 5000000
    group by c.group_id
    having count(*) > 3
    order by spread desc
    limit 1
  `);
  return rows[0] ?? null;
}

export async function scoreStats() {
  const rows = await db.execute<{ month: string; avg: number; p20: number; p80: number; n: number }>(sql`
    select month,
           avg(score)::float as avg,
           percentile_cont(0.2) within group (order by score)::float as p20,
           percentile_cont(0.8) within group (order by score)::float as p80,
           count(*)::int as n
    from scores
    group by month
    order by month
  `);
  return rows;
}

export async function regimeBreakdown(month: string) {
  const rows = await db.execute<{ regime: string | null; n: number }>(sql`
    select regime, count(*)::int as n from scores where month = ${month} group by regime order by n desc
  `);
  return rows;
}

export type MonthPortfolioKpis = {
  month: string;
  portfolioScore: number;
  /** score medio de este mes menos el de hace 6 meses (media de delta_6m, ya calculado por empresa). null si no hay datos suficientes. */
  portfolioScoreDelta6m: number | null;
  improvingCompanies: number;
  deterioratingCompanies: number;
  newAlerts: number;
};

/**
 * KPIs de cartera por mes, para el widget "Embat · Salud financiera de la cartera" de /datos
 * (móvil por meses, animado en el cliente). Trae todos los meses de una vez — son ~9 filas, no
 * hace falta ir a la base en cada cambio de mes. `regime` ya viene calculado por el pipeline
 * (docs/CONTRATO_DATOS.md); "deteriorando" cuenta solo `deteriorating`, no `dip` (bache puntual,
 * no deterioro, según el propio contrato). "Alertas nuevas" excluye las de tipo `improvement`
 * (son informativas, no alertas).
 */
export async function portfolioKpisByMonth(): Promise<{ months: MonthPortfolioKpis[]; defaultMonth: string | null }> {
  const scoreRows = await db.execute<{
    month: string;
    avg: number;
    delta6m: number | null;
    improving: number;
    deteriorating: number;
  }>(sql`
    select month,
           avg(score)::float as avg,
           avg(delta_6m)::float as delta6m,
           count(*) filter (where regime = 'improving')::int as improving,
           count(*) filter (where regime = 'deteriorating')::int as deteriorating
    from scores
    group by month
    order by month
  `);

  const alertRows = await db.execute<{ month: string; n: number }>(sql`
    select month, count(*)::int as n
    from alerts
    where type != 'improvement'
    group by month
  `);
  const alertsByMonth = new Map(alertRows.map((r) => [r.month, r.n]));

  const [maxAlertRow] = await db.execute<{ month: string | null }>(sql`select max(month) as month from alerts`);

  return {
    months: scoreRows.map((r) => ({
      month: r.month,
      portfolioScore: r.avg,
      portfolioScoreDelta6m: r.delta6m,
      improvingCompanies: r.improving,
      deterioratingCompanies: r.deteriorating,
      newAlerts: alertsByMonth.get(r.month) ?? 0,
    })),
    defaultMonth: maxAlertRow?.month ?? null,
  };
}

export type RegimeCode = "i" | "s" | "d" | "p";
const REGIME_CODE: Record<string, RegimeCode> = { improving: "i", stable: "s", deteriorating: "d", dip: "p" };

export type CompanyScorePoint = { score: number; regime: RegimeCode | null };
export type CompanyScoreSeries = { companyId: string; displayName: string; points: (CompanyScorePoint | null)[] };

/**
 * Serie mes a mes de TODAS las empresas (score + régimen), para el gráfico animado de distribución
 * de /datos (una vez a la base, no una consulta por mes al mover el slider). `months` fija el orden
 * — debe ser el mismo array que ya devuelve `portfolioKpisByMonth().months.map(m => m.month)`, para
 * que el índice del slider apunte a la misma posición en ambos sitios.
 */
export async function companyScoreSeries(months: string[]): Promise<CompanyScoreSeries[]> {
  const rows = await db.execute<{ company_id: string; display_name: string; month: string; score: number; regime: string | null }>(sql`
    select c.company_id, c.display_name, s.month, s.score, s.regime
    from scores s
    join companies c on c.company_id = s.company_id
    order by c.company_id, s.month
  `);

  const byCompany = new Map<string, { displayName: string; byMonth: Map<string, CompanyScorePoint> }>();
  for (const r of rows) {
    let entry = byCompany.get(r.company_id);
    if (!entry) {
      entry = { displayName: r.display_name, byMonth: new Map() };
      byCompany.set(r.company_id, entry);
    }
    entry.byMonth.set(r.month, { score: r.score, regime: r.regime ? (REGIME_CODE[r.regime] ?? null) : null });
  }

  return Array.from(byCompany.entries()).map(([companyId, { displayName, byMonth }]) => ({
    companyId,
    displayName,
    points: months.map((m) => byMonth.get(m) ?? null),
  }));
}
