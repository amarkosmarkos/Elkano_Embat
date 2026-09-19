import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { groupSeries, poolingGroups, poolingOverview } from "@/lib/products/pooling";
import CashPoolApp from "@/components/cashpool/CashPoolApp";
import CashPoolGroups from "@/components/cashpool/CashPoolGroups";

export const dynamic = "force-dynamic"; // depende de ?group=

export const metadata = { title: "Cash pooling · Elkano X-Ray" };

/**
 * Producto 02 (Luken): motor lib/cashpool.ts (política por filial, propuestas con ahorro neto, supuestos
 * ajustables) y las vistas de decisiones, filiales e historial en CashPoolApp.tsx. Aquí se alimenta con el
 * score v3 y la caja real del store en vez de Postgres. Sin grupo pedido, compara todos los grupos.
 */
export default async function CashPoolingPage({ searchParams }: { searchParams: Promise<{ group?: string; month?: string }> }) {
  const { group, month: requestedMonth } = await searchParams;
  const store = await getStore();
  if (!store.months.length) return <p className="py-12 text-sm text-ink-mute">Sin meses disponibles para comparar grupos.</p>;
  const month = requestedMonth && store.months.includes(requestedMonth) ? requestedMonth : (await currentMonth(store.months)).month;
  if (!group) {
    const { groups, totals } = poolingOverview(store, month);
    return <CashPoolGroups key={month} groups={groups} totals={totals} month={month} months={store.months} />;
  }
  if (!store.groups.has(group)) notFound();
  let groups = poolingGroups(store, 2, Infinity);
  // un grupo pedido por enlace (ficha, grupos) se abre aunque solo tenga una filial
  if (group && store.groups.has(group) && !groups.some((g) => g.group_id === group)) {
    const ids = store.groups.get(group)!;
    groups = [{ group_id: group, n: ids.length, n_cur: new Set(ids.map((i) => store.byId.get(i)?.currency ?? "EUR")).size, curs: "" }, ...groups];
  }
  const data = groupSeries(store, group);
  return <CashPoolApp key={`${group}|${month}`} groupId={group} base={data.base} rows={data.rows} groups={groups} initialMonth={month} />;
}
