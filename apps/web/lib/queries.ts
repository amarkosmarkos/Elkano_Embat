import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import { companies, scores } from "./db/schema";

/**
 * `scores` no lleva `regime` (ver schema.ts: solo las columnas reales de scores_v3.csv). Se
 * calcula al vuelo con esta CTE: delta_1m/3m/6m por auto-join sobre el mes calendario (no la fila
 * anterior, por si hay huecos) y un umbral simple y documentado — el pipeline no clasifica
 * "régimen", es una lectura de producto sobre el score real. 'dip' = mal 1 mes suelto que no llega
 * a ser un deterioro sostenido a 3 meses (ver docs/CONTRATO_DATOS.md).
 */
const REGIMED_CTE = `
  with dated as (
    select company_id, month, score, to_date(month, 'YYYY-MM') as d from scores
  ), deltas as (
    select a.company_id, a.month, a.score,
      a.score - b1.score as delta_1m,
      a.score - b3.score as delta_3m,
      a.score - b6.score as delta_6m
    from dated a
    left join dated b1 on b1.company_id = a.company_id and b1.d = a.d - interval '1 month'
    left join dated b3 on b3.company_id = a.company_id and b3.d = a.d - interval '3 month'
    left join dated b6 on b6.company_id = a.company_id and b6.d = a.d - interval '6 month'
  ), regimed as (
    select *,
      case
        when delta_3m <= -6 then 'deteriorating'
        when delta_3m >= 6 then 'improving'
        when delta_1m <= -8 then 'dip'
        else 'stable'
      end as regime
    from deltas
  )
`;
const regimedCte = sql.raw(REGIMED_CTE);

export async function listCompanies(limit = 60) {
  return db.select().from(companies).orderBy(asc(companies.companyId)).limit(limit);
}

export async function getCompany(companyId: string) {
  const [co] = await db.select().from(companies).where(eq(companies.companyId, companyId)).limit(1);
  return co ?? null;
}

export async function getScoreSeries(companyId: string) {
  return db.select().from(scores).where(eq(scores.companyId, companyId)).orderBy(asc(scores.month));
}

export async function getLastScore(companyId: string) {
  const rows = await db.execute<{
    month: string; score: number; regime: string; c_deuda: number | null; cash_position: number | null;
  }>(sql`${regimedCte} select r.month, r.score, r.regime, s.c_deuda, s.cash_position
         from regimed r join scores s on s.company_id = r.company_id and s.month = r.month
         where r.company_id = ${companyId} order by r.month desc limit 1`);
  const row = rows[0];
  if (!row) return null;
  return { month: row.month, score: row.score, regime: row.regime, cDeuda: row.c_deuda, cashPosition: row.cash_position };
}

/** Texto real de `scores.explanation` ("bajó 31,1 pts: liquidez"), o null si ese mes no tiene
 * (el primer mes puntuado de cada empresa no tiene mes anterior con el que compararse). */
export async function getExplanation(companyId: string, month: string): Promise<{ text: string } | null> {
  const [row] = await db
    .select({ explanation: scores.explanation })
    .from(scores)
    .where(and(eq(scores.companyId, companyId), eq(scores.month, month)))
    .limit(1);
  if (!row?.explanation) return null;
  return { text: row.explanation[0].toUpperCase() + row.explanation.slice(1) };
}

/** "Alertas" = meses reales con `alert = true` (20% peor del mes, ver output/README.md), no una
 * tabla aparte con tipos inventados. severity es una lectura simple sobre el score. */
export async function getRecentAlerts(companyId: string, n = 5) {
  const rows = await db
    .select({ month: scores.month, score: scores.score, explanation: scores.explanation })
    .from(scores)
    .where(and(eq(scores.companyId, companyId), eq(scores.alert, true)))
    .orderBy(desc(scores.month))
    .limit(n);
  return rows.map((r) => ({
    key: `${companyId}-${r.month}`,
    month: r.month,
    severity: r.score < 40 ? "high" : "medium",
    title: r.explanation || `Entre el 20% peor del mes (${Math.round(r.score)} pts)`,
  }));
}

/** Última foto de cada empresa del mismo grupo (para cash-pooling: quién sobra, quién falta). */
export async function getGroupLatestScores(groupId: string, excludeCompanyId?: string) {
  const siblings = await db.select().from(companies).where(eq(companies.groupId, groupId));
  const ids = siblings.map((s) => s.companyId).filter((id) => id !== excludeCompanyId);
  if (ids.length === 0) return [];
  const last = await db
    .select({ companyId: scores.companyId, month: scores.month, score: scores.score, cashPosition: scores.cashPosition })
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
  return out;
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
           (max(s.cash_position) - min(s.cash_position))::float as spread
    from companies c
    join scores s on s.company_id = c.company_id and s.month = (select max(month) from scores s2 where s2.company_id = c.company_id)
    where c.group_id is not null
      and s.cash_position between 0 and 5000000
    group by c.group_id
    having count(*) > 3
    order by spread desc
    limit 1
  `);
  return rows[0] ?? null;
}

/** Grupos con varias filiales, ordenados por nº de divisas y tamaño — el selector de la demo de cash-pooling. */
export async function listPoolingGroups(limit = 40) {
  return db.execute<{ group_id: string; n: number; n_cur: number; curs: string }>(sql`
    select group_id, count(*)::int as n, count(distinct currency)::int as n_cur,
           string_agg(distinct currency, ' · ' order by currency) as curs
    from companies
    where group_id is not null
    group by group_id
    having count(*) > 1
    order by n_cur desc, n desc
    limit ${limit}
  `);
}

/** Todo lo que necesita la pantalla de cash-pooling de un grupo: filiales + su serie mensual completa. */
export async function getGroupSeries(groupId: string) {
  const base = await db
    .select({ companyId: companies.companyId, currency: companies.currency, country: companies.country })
    .from(companies)
    .where(eq(companies.groupId, groupId))
    .orderBy(asc(companies.companyId));
  const ids = base.map((b) => b.companyId);
  if (ids.length === 0) return { base: [], rows: [] };
  const rows = await db.select({
    companyId: scores.companyId,
    month: scores.month,
    score: scores.score,
    cashLocal: scores.cashPosition,
    explanation: scores.explanation,
  }).from(scores).where(inArray(scores.companyId, ids)).orderBy(asc(scores.month));
  return {
    base: base.map((b) => ({ ...b, currency: b.currency ?? "" })),
    rows,
  };
}

export async function scoreStats() {
  return db.execute<{ month: string; avg: number; p20: number; p80: number; n: number }>(sql`
    select month,
           avg(score)::float as avg,
           percentile_cont(0.2) within group (order by score)::float as p20,
           percentile_cont(0.8) within group (order by score)::float as p80,
           count(*)::int as n
    from scores
    group by month
    order by month
  `);
}

export async function regimeBreakdown(month: string) {
  return db.execute<{ regime: string | null; n: number }>(sql`
    ${regimedCte} select regime, count(*)::int as n from regimed where month = ${month} group by regime order by n desc
  `);
}

export type MonthPortfolioKpis = {
  month: string;
  portfolioScore: number;
  /** score medio de este mes menos el de hace 6 meses (media de delta_6m). null si no hay datos suficientes. */
  portfolioScoreDelta6m: number | null;
  improvingCompanies: number;
  deterioratingCompanies: number;
  newAlerts: number;
};

/**
 * KPIs de cartera por mes, para el widget "Embat · Salud financiera de la cartera" de /datos.
 * `regime` se calcula al vuelo (ver REGIMED_CTE) sobre el score real; "deteriorando" cuenta solo
 * `deteriorating`, no `dip` (bache puntual). "Alertas nuevas" = meses con `alert = true` (el 20%
 * peor del mes).
 */
export async function portfolioKpisByMonth(): Promise<{ months: MonthPortfolioKpis[]; defaultMonth: string | null }> {
  const scoreRows = await db.execute<{
    month: string;
    avg: number;
    delta6m: number | null;
    improving: number;
    deteriorating: number;
  }>(sql`
    ${regimedCte} select month,
           avg(score)::float as avg,
           avg(delta_6m)::float as delta6m,
           count(*) filter (where regime = 'improving')::int as improving,
           count(*) filter (where regime = 'deteriorating')::int as deteriorating
    from regimed
    group by month
    order by month
  `);

  const alertRows = await db.execute<{ month: string; n: number }>(sql`
    select month, count(*)::int as n from scores where alert = true group by month
  `);
  const alertsByMonth = new Map(alertRows.map((r) => [r.month, r.n]));

  const [maxAlertRow] = await db.execute<{ month: string | null }>(sql`select max(month) as month from scores where alert = true`);

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
export type CompanyScoreSeries = { companyId: string; points: (CompanyScorePoint | null)[] };

/**
 * Serie mes a mes de TODAS las empresas (score + régimen), para el gráfico animado de distribución
 * de /datos (una vez a la base, no una consulta por mes al mover el slider). `months` fija el orden
 * — debe ser el mismo array que ya devuelve `portfolioKpisByMonth().months.map(m => m.month)`, para
 * que el índice del slider apunte a la misma posición en ambos sitios.
 */
export async function companyScoreSeries(months: string[]): Promise<CompanyScoreSeries[]> {
  const rows = await db.execute<{ company_id: string; month: string; score: number; regime: string | null }>(sql`
    ${regimedCte} select company_id, month, score, regime from regimed order by company_id, month
  `);

  const byCompany = new Map<string, Map<string, CompanyScorePoint>>();
  for (const r of rows) {
    let byMonth = byCompany.get(r.company_id);
    if (!byMonth) {
      byMonth = new Map();
      byCompany.set(r.company_id, byMonth);
    }
    byMonth.set(r.month, { score: r.score, regime: r.regime ? (REGIME_CODE[r.regime] ?? null) : null });
  }

  return Array.from(byCompany.entries()).map(([companyId, byMonth]) => ({
    companyId,
    points: months.map((m) => byMonth.get(m) ?? null),
  }));
}

/** Empresas rankeadas por score del último mes, con régimen — para /empresas. */
export async function listCompaniesRanked(limit = 60) {
  const rows = await db.execute<{ company_id: string; group_id: string | null; score: number; regime: string | null }>(sql`
    ${regimedCte} select c.company_id, c.group_id, r.score, r.regime
    from companies c
    join regimed r on r.company_id = c.company_id and r.month = (select max(month) from scores s2 where s2.company_id = c.company_id)
    order by r.score desc
    limit ${limit}
  `);
  return rows.map((r) => ({ companyId: r.company_id, groupId: r.group_id, score: r.score, regime: r.regime }));
}
