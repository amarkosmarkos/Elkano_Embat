"use client";

// Almacén mínimo de operaciones "ejecutadas" en la demo. Vive en localStorage
// (clave elkano.ops.v1); no hay backend. SSR-safe: el servidor siempre ve [] y el
// cliente hidrata en el primer efecto de useSyncExternalStore.
import { useCallback, useSyncExternalStore } from "react";

export const OPS_KEY = "elkano.ops.v1";
export const START_MONTH = "2026-09";
/** Interés de póliza que sustituye el pooling: ahorro anual ≈ importe neteado × 5 %. */
export const POOLING_SAVING_RATE = 0.05;

export type PlacementOp = {
  id: string;
  kind: "placement";
  company_id: string;
  amount: number;
  horizon_months: number;
  rate: number;
  bank: string;
  start_month: string;
  maturity_month: string;
  yield_yearly: number;
  created_at: string;
};

export type PoolingOp = {
  id: string;
  kind: "pooling";
  group_id: string;
  from: string;
  to: string;
  amount: number;
  rate_internal: number;
  created_at: string;
};

export type AlertResolvedOp = {
  id: string;
  kind: "alert_resolved";
  company_id: string;
  alert_title: string;
  created_at: string;
};

export type Op = PlacementOp | PoolingOp | AlertResolvedOp;
export type NewOp =
  | Omit<PlacementOp, "id" | "created_at">
  | Omit<PoolingOp, "id" | "created_at">
  | Omit<AlertResolvedOp, "id" | "created_at">;

export const KIND_LABEL: Record<Op["kind"], string> = {
  placement: "Colocación",
  pooling: "Pooling",
  alert_resolved: "Aviso resuelto",
};

// ---------- store ----------
const EMPTY: Op[] = [];
let cache: Op[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function isOp(x: unknown): x is Op {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && (o.kind === "placement" || o.kind === "pooling" || o.kind === "alert_resolved");
}

function load() {
  loaded = true;
  try {
    const raw = window.localStorage.getItem(OPS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter(isOp) : EMPTY;
  } catch {
    cache = EMPTY;
  }
}

function persist() {
  try {
    window.localStorage.setItem(OPS_KEY, JSON.stringify(cache));
  } catch {
    // almacenamiento no disponible (modo privado, cuota…): seguimos sólo en memoria
  }
}

function emit() {
  for (const l of listeners) l();
}

function setOps(next: Op[]) {
  cache = next;
  persist();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === OPS_KEY) {
      load();
      emit();
    }
  };
  try {
    window.addEventListener("storage", onStorage);
  } catch {
    /* no window */
  }
  return () => {
    listeners.delete(cb);
    try {
      window.removeEventListener("storage", onStorage);
    } catch {
      /* no window */
    }
  };
}

function getSnapshot(): Op[] {
  if (!loaded && typeof window !== "undefined") load();
  return cache;
}

function getServerSnapshot(): Op[] {
  return EMPTY;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addOp(op: NewOp): Op {
  getSnapshot();
  const full = { ...op, id: newId(), created_at: new Date().toISOString() } as Op;
  setOps([...cache, full]);
  return full;
}

export function removeOp(id: string) {
  getSnapshot();
  setOps(cache.filter((o) => o.id !== id));
}

export function removeOps(pred: (o: Op) => boolean) {
  getSnapshot();
  setOps(cache.filter((o) => !pred(o)));
}

export function clearOps() {
  getSnapshot();
  setOps(EMPTY);
}

const subscribeNoop = () => () => {};

/** Hook: lista de operaciones (vacía en SSR y hasta hidratar) + acciones. */
export function useOps() {
  const ops = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const add = useCallback((op: NewOp) => addOp(op), []);
  const remove = useCallback((id: string) => removeOp(id), []);
  const clear = useCallback(() => clearOps(), []);
  return { ops, hydrated, add, remove, clear };
}

// ---------- helpers ----------
/** "2026-09" + 6 → "2027-03" */
export function addMonths(m: string, n: number): string {
  const [y, mm] = m.split("-").map((x) => parseInt(x, 10));
  const idx = y * 12 + (mm - 1) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export const placementsOf = (ops: Op[], companyId: string): PlacementOp[] =>
  ops.filter((o): o is PlacementOp => o.kind === "placement" && o.company_id === companyId);

export const poolingOf = (ops: Op[], groupId: string): PoolingOp[] =>
  ops.filter((o): o is PoolingOp => o.kind === "pooling" && o.group_id === groupId);

export const resolvedOf = (ops: Op[], companyId: string): AlertResolvedOp[] =>
  ops.filter((o): o is AlertResolvedOp => o.kind === "alert_resolved" && o.company_id === companyId);

export function totalsOf(ops: Op[]) {
  let placed = 0, netted = 0, yieldYearly = 0, resolved = 0;
  for (const o of ops) {
    if (o.kind === "placement") { placed += o.amount; yieldYearly += o.yield_yearly; }
    else if (o.kind === "pooling") netted += o.amount;
    else resolved += 1;
  }
  return { placed, netted, yieldYearly, savingYearly: netted * POOLING_SAVING_RATE, resolved };
}
