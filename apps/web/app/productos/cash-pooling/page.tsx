import { getStore } from "@/lib/data/store";
import { buildSeries } from "@/lib/cashpool";
import { groupSeries, poolingGroups } from "@/lib/products/pooling";
import CashPoolApp from "@/components/cashpool/CashPoolApp";

export const dynamic = "force-dynamic"; // depende de ?group=

export const metadata = { title: "Cash pooling · Elkano X-Ray" };

/**
 * Producto 02 (Luken): motor lib/cashpool.ts (política por filial, propuestas con ahorro neto, supuestos
 * ajustables) y las vistas de decisiones, filiales e historial en CashPoolApp.tsx. Aquí se alimenta con el
 * score v3 y la caja real del store en vez de Postgres. Sin grupo pedido, abre el primero con propuestas.
 */
export default async function CashPoolingPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams;
  const store = await getStore();
  let groups = poolingGroups(store);
  // un grupo pedido por enlace (ficha, grupos) se abre aunque no esté entre los 40 del selector
  if (group && store.groups.has(group) && !groups.some((g) => g.group_id === group)) {
    const ids = store.groups.get(group)!;
    groups = [{ group_id: group, n: ids.length, n_cur: new Set(ids.map((i) => store.byId.get(i)?.currency ?? "EUR")).size, curs: "" }, ...groups];
  }
  const requested = groups.find((g) => g.group_id === group);
  let groupId = requested?.group_id ?? groups[0]?.group_id;
  let data = groupId ? groupSeries(store, groupId) : { base: [], rows: [] };
  if (!requested) {
    for (const candidate of groups) {
      const candidateData = candidate.group_id === groupId ? data : groupSeries(store, candidate.group_id);
      if (buildSeries(candidateData.base, candidateData.rows).at(-1)?.proposals.length) {
        groupId = candidate.group_id;
        data = candidateData;
        break;
      }
    }
  }
  if (!groupId) return <p className="text-[14px] text-ink-mute">Sin grupos con más de una filial.</p>;
  return <CashPoolApp key={groupId} groupId={groupId} base={data.base} rows={data.rows} groups={groups} />;
}
