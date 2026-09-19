// Esquema Drizzle — refleja tal cual el Postgres ya levantado (docker-compose.yml, puerto 5433),
// que sigue el contrato de ../../../docs/CONTRATO_DATOS.md. No lo cambies sin migrar la base real:
// esto es un *mapeo* del esquema existente, no la fuente de verdad de la forma de los datos.
import { pgTable, text, integer, real, boolean, jsonb, primaryKey, index } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  companyId: text("company_id").primaryKey(),
  groupId: text("group_id"),
  displayName: text("display_name").notNull(),
  sectorHint: text("sector_hint"),
  currency: text("currency").default("EUR"),
  country: text("country"), // ISO-2 real del CSV crudo (solo 230/1286 lo traen); null = desconocido, NO se inventa
  hasErp: boolean("has_erp").default(false),
  hasDebt: boolean("has_debt").default(false),
  firstMonth: text("first_month"),
  lastMonth: text("last_month"),
  nMonths: integer("n_months"),
});

// signals: cash_position, net_cash_flow, runway_months, dso_days, dpo_days, overdue_ar_ratio,
// overdue_ap_ratio, debt_utilization, debt_service_ratio, inflow_volatility, top_customer_share
// subscores: liquidity, collections, payments, debt, activity (0-100 o null)
export const scores = pgTable(
  "scores",
  {
    companyId: text("company_id").notNull().references(() => companies.companyId),
    month: text("month").notNull(),
    score: integer("score").notNull(),
    confidence: real("confidence"),
    delta1m: integer("delta_1m"),
    delta3m: integer("delta_3m"),
    delta6m: integer("delta_6m"),
    regime: text("regime"), // improving · stable · deteriorating · dip
    subscores: jsonb("subscores").$type<Record<string, number | null>>(),
    signals: jsonb("signals").$type<Record<string, number | null>>(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.month] }),
    index("scores_company_idx").on(t.companyId),
    index("scores_month_idx").on(t.month),
  ],
);

// mismo esquema que scores; test oculto del reto (60-80 empresas nunca vistas)
export const predictions = pgTable(
  "predictions",
  {
    companyId: text("company_id").notNull(),
    month: text("month").notNull(),
    score: integer("score").notNull(),
    confidence: real("confidence"),
    subscores: jsonb("subscores").$type<Record<string, number | null>>(),
    signals: jsonb("signals").$type<Record<string, number | null>>(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.month] })],
);

export const anticipation = pgTable("anticipation", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  eventMonth: text("event_month").notNull(),
  eventType: text("event_type").notNull(), // deterioration · improvement
  detectedMonth: text("detected_month").notNull(),
  leadMonths: integer("lead_months").notNull(),
});

export type Driver = {
  signal: string;
  label: string;
  direction: "better" | "worse" | "neutral";
  impact: number;
  from: number;
  to: number;
  since: string;
};
export type Recommendation = { action: string; urgency: "high" | "medium" | "low"; expected_impact: string };

export const explanations = pgTable(
  "explanations",
  {
    companyId: text("company_id").notNull(),
    month: text("month").notNull(),
    headline: text("headline").notNull(),
    summary: text("summary").notNull(),
    drivers: jsonb("drivers").$type<Driver[]>(),
    recommendations: jsonb("recommendations").$type<Recommendation[]>(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.month] })],
);

export const alerts = pgTable(
  "alerts",
  {
    alertId: text("alert_id").primaryKey(),
    companyId: text("company_id").notNull(),
    month: text("month").notNull(),
    type: text("type").notNull(), // regime_change · threshold · anomaly · improvement
    severity: text("severity").notNull(), // high · medium · info
    title: text("title").notNull(),
    message: text("message").notNull(),
    leadMonths: integer("lead_months"),
  },
  (t) => [index("alerts_company_idx").on(t.companyId), index("alerts_month_idx").on(t.month)],
);

// fila única: hasta qué mes "existe" el dato durante la demo — se avanza en vivo para simular tiempo real
export const demoState = pgTable("demo_state", {
  id: integer("id").primaryKey().default(1),
  visibleUntil: text("visible_until").notNull(),
});
