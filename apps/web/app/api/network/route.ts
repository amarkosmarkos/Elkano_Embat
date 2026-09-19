import { getStore } from "@/lib/data/store";

export const dynamic = "force-static";

/** Índice de la red para el marketplace (cliente): score, alertas, estrés, contribuciones y foto actual por empresa. */
export async function GET() {
  const store = await getStore();
  const companies = store.companies.map((c) => ({ ...c, cash: store.months.map((m) => store.cash.get(`${c.id}|${m}`) ?? null) }));
  const body = JSON.stringify({ months: store.months, asOf: store.meta.asOf, companies });
  return new Response(body, { headers: { "content-type": "application/json", "cache-control": "private, max-age=60" } });
}
