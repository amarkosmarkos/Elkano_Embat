"use client";

import { useCallback, useEffect, useState } from "react";

/** Libro de operaciones ejecutadas en la demo (localStorage). Lo escriben los tres productos. */
export type Op =
  | { id: string; at: string; kind: "colocacion"; companyId: string; company: string; amount: number; months: number; rate: number; yieldYear: number; product: string }
  | { id: string; at: string; kind: "prestamo"; groupId: string; fromId: string; from: string; toId: string; to: string; amount: number; rate: number; savingYear: number }
  | { id: string; at: string; kind: "aviso"; companyId: string; company: string; title: string }
  | { id: string; at: string; kind: "pago"; companyId: string; company: string; title: string; amount: number };

const KEY = "xray_ops";

/** Omit distributivo sobre la unión: cada tipo de operación sin id/at. */
export type NewOp = Op extends infer O ? (O extends Op ? Omit<O, "id" | "at"> & { id?: string } : never) : never;

function read(): Op[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Op[]) : [];
  } catch {
    return [];
  }
}

export function useOps() {
  const [ops, setOps] = useState<Op[]>([]);
  useEffect(() => {
    setOps(read());
    const on = () => setOps(read());
    window.addEventListener("xray-ops", on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener("xray-ops", on); window.removeEventListener("storage", on); };
  }, []);
  const write = useCallback((next: Op[]) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new Event("xray-ops"));
  }, []);
  const add = useCallback((op: NewOp) => {
    const full = { ...op, id: op.id ?? `${op.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString() } as Op;
    write([full, ...read()]);
  }, [write]);
  const remove = useCallback((id: string) => write(read().filter((o) => o.id !== id)), [write]);
  const clear = useCallback(() => write([]), [write]);
  return { ops, add, remove, clear };
}
