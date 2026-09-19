import type { Store } from "@/lib/data/store";
import type { EntityBase, MonthRow } from "@/lib/cashpool";
import { snapshot, type Snapshot } from "@/lib/cashpool";
import { trend } from "@/lib/score/derived";

export type PoolGroup = { group_id: string; n: number; n_cur: number; curs: string };
export type PoolRow = { companyId: string; month: string; score: number; regime: string | null; cashLocal: number | null };

/** Grupos con varias filiales, ordenados por nº de divisas y tamaño (selector del producto de cash pooling). */
export function poolingGroups(store: Store, minSize = 3): PoolGroup[] {
  const out: PoolGroup[] = [];
  for (const [gid, ids] of store.groups) {
    if (ids.length < minSize) continue;
    const curs = new Set(ids.map((i) => store.fixtures.get(i)?.currency ?? "EUR"));
    out.push({ group_id: gid, n: ids.length, n_cur: curs.size, curs: [...curs].sort().join(" · ") });
  }
  return out.sort((a, b) => b.n_cur - a.n_cur || b.n - a.n);
}

/** Filiales de un grupo + su serie mensual (score v3 real, régimen derivado, caja de las señales). */
export function groupSeries(store: Store, groupId: string): { base: EntityBase[]; rows: PoolRow[] } {
  const ids = store.groups.get(groupId) ?? [];
  const base: EntityBase[] = ids.map((id) => {
    const fx = store.fixtures.get(id);
    const c = store.byId.get(id);
    return { companyId: id, displayName: c?.name ?? fx?.display_name ?? id, currency: fx?.currency ?? "EUR", country: fx?.country ?? c?.country ?? null };
  });
  const rows: PoolRow[] = [];
  for (const id of ids) {
    const c = store.byId.get(id);
    if (!c) continue;
    store.months.forEach((m, i) => {
      const s = c.scores[i];
      const sig = store.signals.get(`${id}|${m}`);
      if (s == null || !sig) return;
      rows.push({ companyId: id, month: m, score: s, regime: trend(c.scores, i), cashLocal: sig.cash_position });
    });
  }
  return { base, rows };
}

/** Foto del pooling de un grupo en un mes: roles, propuestas y totales (motor lib/cashpool.ts). */
export function groupSnapshot(store: Store, groupId: string, month: string): Snapshot | null {
  const { base, rows } = groupSeries(store, groupId);
  const byId = new Map<string, MonthRow>();
  for (const r of rows) if (r.month === month) byId.set(r.companyId, { month: r.month, score: r.score, regime: r.regime, cashLocal: r.cashLocal });
  if (byId.size === 0) return null;
  return snapshot(month, base, byId);
}
