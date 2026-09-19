// Carga data/*.json (el contrato de docs/CONTRATO_DATOS.md) en Postgres. Idempotente: trunca
// y vuelve a insertar. Uso: pnpm --filter web db:seed (con Postgres arriba y el esquema ya creado
// con `pnpm --filter web db:push`).
//
// Importante sobre el origen de estos datos: son el "score de reglas" que describe
// CONTRATO_DATOS.md como plan B ("mientras no lleguen los ficheros reales, tools/make_fixtures.py
// genera estos JSON") — NO el score validado v3-GBM del pipeline real (analytics/, Gini 0.55/0.44/0.38).
// El script que generó estos JSON no está en el repo; lo que sí está versionado desde ahora es su
// salida (data/*.json) y este loader, así que al menos es reproducible a partir de aquí.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../lib/db/schema";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "..", "..", "..", "data"); // repo-root/data

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf8"));
}

async function insertChunked<T>(rows: T[], fn: (chunk: T[]) => Promise<unknown>, size = 1000) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL (revisa apps/web/.env.local)");
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  const companies = loadJson<Record<string, unknown>[]>("companies.json");
  const scores = loadJson<Record<string, unknown>[]>("scores.json");
  const predictions = loadJson<Record<string, unknown>[]>("predictions.json");
  const anticipation = loadJson<Record<string, unknown>[]>("anticipation.json");
  const explanations = loadJson<Record<string, unknown>[]>("explanations.json");
  const alerts = loadJson<Record<string, unknown>[]>("alerts.json");

  console.log(`companies ${companies.length} · scores ${scores.length} · predictions ${predictions.length} · anticipation ${anticipation.length} · explanations ${explanations.length} · alerts ${alerts.length}`);

  // orden: companies antes que scores (FK) · trunca todo primero para que sea repetible
  await client`truncate table scores, predictions, anticipation, explanations, alerts, companies, demo_state cascade`;

  await insertChunked(companies as unknown as (typeof schema.companies.$inferInsert)[], (chunk) =>
    db.insert(schema.companies).values(
      chunk.map((c) => ({
        companyId: c.company_id, groupId: c.group_id, displayName: c.display_name, sectorHint: c.sector_hint,
        currency: c.currency, hasErp: c.has_erp, hasDebt: c.has_debt, firstMonth: c.first_month,
        lastMonth: c.last_month, nMonths: c.n_months,
      })) as never,
    ),
  );

  await insertChunked(scores as never[], (chunk) =>
    db.insert(schema.scores).values(
      (chunk as Record<string, never>[]).map((s) => ({
        companyId: s.company_id, month: s.month, score: s.score, confidence: s.confidence,
        delta1m: s.delta_1m, delta3m: s.delta_3m, delta6m: s.delta_6m, regime: s.regime,
        subscores: s.subscores, signals: s.signals,
      })) as never,
    ),
  );

  if (predictions.length) {
    await insertChunked(predictions as never[], (chunk) =>
      db.insert(schema.predictions).values(
        (chunk as Record<string, never>[]).map((s) => ({
          companyId: s.company_id, month: s.month, score: s.score, confidence: s.confidence,
          subscores: s.subscores, signals: s.signals,
        })) as never,
      ),
    );
  }

  await insertChunked(anticipation as never[], (chunk) =>
    db.insert(schema.anticipation).values(
      (chunk as Record<string, never>[]).map((a) => ({
        id: `${a.company_id}-${a.event_month}`, companyId: a.company_id, eventMonth: a.event_month,
        eventType: a.event_type, detectedMonth: a.detected_month, leadMonths: a.lead_months,
      })) as never,
    ),
  );

  await insertChunked(explanations as never[], (chunk) =>
    db.insert(schema.explanations).values(
      (chunk as Record<string, never>[]).map((e) => ({
        companyId: e.company_id, month: e.month, headline: e.headline, summary: e.summary,
        drivers: e.drivers, recommendations: e.recommendations,
      })) as never,
    ),
  );

  await insertChunked(alerts as never[], (chunk) =>
    db.insert(schema.alerts).values(
      (chunk as Record<string, never>[]).map((a) => ({
        alertId: a.alert_id, companyId: a.company_id, month: a.month, type: a.type,
        severity: a.severity, title: a.title, message: a.message, leadMonths: a.lead_months,
      })) as never,
    ),
  );

  // arranque del "reloj" de la demo en el primer mes — se avanza a mano durante la presentación
  const firstMonth = (scores as { month: string }[]).map((s) => s.month).sort()[0] ?? "2024-09";
  await db.insert(schema.demoState).values({ id: 1, visibleUntil: firstMonth });

  console.log(`listo · demo_state.visible_until = ${firstMonth}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
