// Esquema Drizzle — refleja tal cual el Postgres ya levantado (docker-compose.yml, puerto 5433).
// Todo lo que hay aquí es trazable a un CSV real del reto (output_hackspain_data/) o al score
// real de analytics/ (output/02_score/scores_v3.csv) — nada inventado (ver auditoría de
// data/*.json, borrado). No hay display_name, sector_hint, has_erp, has_debt ni fechas de alta:
// esos campos no tienen fuente real que se use en la app hoy.
import { pgTable, text, integer, real, boolean, primaryKey, index } from "drizzle-orm/pg-core";

// companies.csv (crudo): company_id, group_id, country, currency — literal, sin cálculo.
export const companies = pgTable("companies", {
  companyId: text("company_id").primaryKey(),
  groupId: text("group_id"),
  currency: text("currency").default("EUR"),
  country: text("country"), // ISO-2 real (solo ~230/1286 lo traen); null = desconocido, NO se inventa
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
    // único campo que no sale de scores_v3.csv: saldo real de caja a fin de mes (EUR), reconstruido
    // desde balances.csv + transactions.csv (tools/export_cash_position.py, mismo método que
    // documenta analytics/README.md). Cash-pooling y "excedentes" necesitan un importe real y el
    // score no lo lleva. Puede ser null si la empresa no tiene cuenta corriente con historia ese mes.
    cashPosition: real("cash_position"),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.month] }),
    index("scores_company_idx").on(t.companyId),
    index("scores_month_idx").on(t.month),
  ],
);
