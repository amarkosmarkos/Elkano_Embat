// Esquema Drizzle — refleja tal cual el Postgres ya levantado (docker-compose.yml, puerto 5433).
// `scores` es 1:1 con output/02_score/scores_v3.csv (el score real de analytics/, Gini 0.54/0.44/0.38):
// nada de signals/subscores/regime/confidence inventados — eso era del contrato viejo
// (docs/CONTRATO_DATOS.md), de antes de que existiera el pipeline de análisis. Si hace falta alguno
// de esos campos, se recalcula desde metrics_v1.parquet o gold/, no se resucita el esquema viejo.
import { pgTable, text, integer, real, boolean, primaryKey, index } from "drizzle-orm/pg-core";

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

// columnas tal cual output/02_score/scores_v3.csv (ver output/README.md). `score_oot` y
// `trained_without_fold` son auditoría de la validación — se guardan pero no se enseñan en la UI.
export const scores = pgTable(
  "scores",
  {
    companyId: text("company_id").notNull().references(() => companies.companyId),
    month: text("month").notNull(),
    scoreRaw: real("score_raw"),
    score: real("score").notNull(),
    scoreVersion: text("score_version"),
    cPago: real("c_pago"),
    cLiquidez: real("c_liquidez"),
    cCaja: real("c_caja"),
    cDeuda: real("c_deuda"),
    cConcentracion: real("c_concentracion"),
    trainedWithoutFold: integer("trained_without_fold"),
    scoreOot: real("score_oot"),
    alert: boolean("alert").notNull().default(false),
    explanation: text("explanation"),
    // único campo que no sale de scores_v3.csv: saldo bancario real a fin de mes (EUR), de
    // gold/company_month.parquet (tools/export_cash_position.py) — cash-pooling y "excedentes"
    // necesitan un importe real y el score no lo lleva. Es un hecho anterior al modelo, no cambia
    // aunque se reentrene v3. Puede ser null si la empresa no tiene cuenta corriente ese mes.
    cashPosition: real("cash_position"),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.month] }),
    index("scores_company_idx").on(t.companyId),
    index("scores_month_idx").on(t.month),
  ],
);
