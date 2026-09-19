import { getStore } from "@/lib/data/store";

export const dynamic = "force-static";

/** Índice de la red para el marketplace (cliente): score, alertas, estrés, contribuciones y foto actual por empresa. */
export async function GET() {
  const store = await getStore();
  const body = JSON.stringify({ months: store.months, asOf: store.meta.asOf, companies: store.companies });
  return new Response(body, { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
}
