import type { Store } from "@/lib/data/store";
import { buildSeries, DEFAULT_SETTINGS, type EntityBase, type SeriesRow, type Snapshot } from "@/lib/cashpool";

export type PoolGroup = { group_id: string; n: number; n_cur: number; curs: string };

/** Grupos con más de una filial, ordenados por nº de divisas y tamaño (selector del producto de cash pooling). */
export function poolingGroups(store: Store, minSize = 2, limit = 40): PoolGroup[] {
  const out: PoolGroup[] = [];
  for (const [gid, ids] of store.groups) {
    if (ids.length < minSize) continue;
    const curs = new Set(ids.map((i) => store.byId.get(i)?.currency ?? "EUR"));
    out.push({ group_id: gid, n: ids.length, n_cur: curs.size, curs: [...curs].sort().join(" · ") });
  }
  return out.sort((a, b) => b.n_cur - a.n_cur || b.n - a.n).slice(0, limit);
}

/** Filiales de un grupo + su serie mensual: score v3 real, explicación del pipeline y caja real reconstruida. */
export function groupSeries(store: Store, groupId: string): { base: EntityBase[]; rows: SeriesRow[] } {
  const ids = store.groups.get(groupId) ?? [];
  const base: EntityBase[] = ids.map((id) => {
    const c = store.byId.get(id);
    return { companyId: id, currency: c?.currency ?? "EUR", country: c?.country ?? null };
  });
  const rows: SeriesRow[] = [];
  for (const id of ids) {
    const c = store.byId.get(id);
    if (!c) continue;
    store.months.forEach((m, i) => {
      const s = c.scores[i];
      if (s == null) return;
      rows.push({ companyId: id, month: m, score: s, cashLocal: store.cash.get(`${id}|${m}`) ?? null, explanation: null });
    });
  }
  return { base, rows };
}

/** Foto del pooling de un grupo en un mes (motor lib/cashpool.ts, supuestos por defecto). */
export function groupSnapshot(store: Store, groupId: string, month: string): Snapshot | null {
  const { base, rows } = groupSeries(store, groupId);
  if (rows.length === 0) return null;
  return buildSeries(base, rows, DEFAULT_SETTINGS).find((s) => s.month === month) ?? null;
}
