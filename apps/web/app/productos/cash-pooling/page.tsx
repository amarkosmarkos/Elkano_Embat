import { getStore } from "@/lib/data/store";
import { groupSeries, poolingGroups } from "@/lib/products/pooling";
import CashPoolApp from "@/components/cashpool/CashPoolApp";

export const dynamic = "force-dynamic";

/** Producto 02 (Luken): la misma app de cinco pantallas, ahora alimentada por el score v3 real y las señales de caja del contrato, sin Postgres. */
export default async function CashPoolingPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams;
  const store = await getStore();
  const groups = poolingGroups(store);
  const groupId = group && store.groups.has(group) ? group : groups[0]?.group_id;
  if (!groupId) return <p className="text-[13px] text-ink-mute">Sin grupos.</p>;
  const { base, rows } = groupSeries(store, groupId);
  const list = groups.some((g) => g.group_id === groupId) ? groups : [{ group_id: groupId, n: base.length, n_cur: new Set(base.map((b) => b.currency)).size, curs: "" }, ...groups];
  return <div className="-mx-7 -mt-6"><CashPoolApp groupId={groupId} base={base} rows={rows} groups={list} /></div>;
}
