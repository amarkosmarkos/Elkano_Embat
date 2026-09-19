import type { Store } from "./store";

/** Serie compacta por empresa para el mapa animado de la cartera (todo el histórico de una vez). */
export interface MapPoint { id: string; name: string; group: string | null; s: (number | null)[]; a: (0 | 1 | null)[]; n: (number | null)[] }

export function mapPoints(store: Store): MapPoint[] {
  return store.companies.map((c) => ({ id: c.id, name: c.name, group: c.group, s: c.scores, a: c.alerts, n: c.stress }));
}
