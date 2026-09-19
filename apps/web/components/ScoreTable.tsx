"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanySummary, Tier, Trend } from "@/lib/types";
import { fmtEurShort, fmtInt } from "@/lib/format";
import { Bell, Delta, ScorePill, TrendTag } from "@/components/ui";

type SortKey = "id" | "group_id" | "score" | "delta6" | "trend" | "alert" | "cash";
type Chip = "sano" | "mejorando" | "torciendo" | "alerta" | null;

const CHIPS: { key: Exclude<Chip, null>; label: string; hint: string }[] = [
  { key: "sano", label: "Quién está sano", hint: "verde y estable" },
  { key: "mejorando", label: "Quién está mejorando", hint: "tendencia al alza" },
  { key: "torciendo", label: "Quién empieza a torcerse", hint: "verde o ámbar, pero cayendo" },
  { key: "alerta", label: "En alerta", hint: "alarma activa este mes" },
];

export function ScoreTable({ companies }: { companies: CompanySummary[] }) {
  const router = useRouter();
  const [tier, setTier] = useState<Tier | "">("");
  const [trend, setTrend] = useState<Trend | "">("");
  const [alert, setAlert] = useState<"" | "1" | "0">("");
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<Chip>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [limit, setLimit] = useState(100);

  const rows = useMemo(() => {
    let r = companies;
    if (chip === "sano") r = r.filter((c) => c.tier === "verde" && c.trend === "estable");
    if (chip === "mejorando") r = r.filter((c) => c.trend === "mejora");
    if (chip === "torciendo") r = r.filter((c) => c.tier !== "rojo" && c.trend === "empeora");
    if (chip === "alerta") r = r.filter((c) => c.alert === 1);
    if (tier) r = r.filter((c) => c.tier === tier);
    if (trend) r = r.filter((c) => c.trend === trend);
    if (alert) r = r.filter((c) => String(c.alert) === alert);
    if (q.trim()) {
      const s = q.trim().toUpperCase();
      r = r.filter((c) => c.id.toUpperCase().includes(s) || (c.group_id ?? "").toUpperCase().includes(s));
    }
    const trendRank: Record<Trend, number> = { mejora: 2, estable: 1, empeora: 0 };
    return [...r].sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (sortKey) {
        case "trend": va = trendRank[a.trend]; vb = trendRank[b.trend]; break;
        case "group_id": va = a.group_id ?? ""; vb = b.group_id ?? ""; break;
        default: va = a[sortKey] as string | number; vb = b[sortKey] as string | number;
      }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return a.id < b.id ? -1 : 1;
    });
  }, [companies, chip, tier, trend, alert, q, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(k); setSortDir(k === "id" || k === "group_id" ? 1 : -1); }
  };
  const Th = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={`cursor-pointer hover:text-navy ${className}`} onClick={() => toggleSort(k)}>
      {children} <span className="text-ink-3">{sortKey === k ? (sortDir === 1 ? "↑" : "↓") : ""}</span>
    </th>
  );
  const clearAll = () => { setChip(null); setTier(""); setTrend(""); setAlert(""); setQ(""); };
  const selectCls = "border border-line rounded px-2 py-1 text-[12px] bg-white text-ink";

  return (
    <div className="card overflow-hidden">
      <div className="p-3 border-b border-line flex flex-wrap items-center gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            title={c.hint}
            onClick={() => setChip(chip === c.key ? null : c.key)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium border transition-colors ${
              chip === c.key ? "bg-navy text-white border-navy" : "bg-white text-navy border-line hover:border-navy"
            }`}
          >
            {c.label}
          </button>
        ))}
        <span className="flex-1" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar id…"
          className={`${selectCls} w-32 font-mono`}
        />
        <select value={tier} onChange={(e) => setTier(e.target.value as Tier | "")} className={selectCls}>
          <option value="">Tramo: todos</option>
          <option value="verde">Verde</option>
          <option value="ambar">Ámbar</option>
          <option value="rojo">Rojo</option>
        </select>
        <select value={trend} onChange={(e) => setTrend(e.target.value as Trend | "")} className={selectCls}>
          <option value="">Tendencia: todas</option>
          <option value="mejora">Mejora</option>
          <option value="estable">Estable</option>
          <option value="empeora">Empeora</option>
        </select>
        <select value={alert} onChange={(e) => setAlert(e.target.value as "" | "1" | "0")} className={selectCls}>
          <option value="">Alerta: todas</option>
          <option value="1">Con alerta</option>
          <option value="0">Sin alerta</option>
        </select>
        {(chip || tier || trend || alert || q) && (
          <button type="button" onClick={clearAll} className="text-[12px] text-ink-2 hover:text-navy underline">Limpiar</button>
        )}
      </div>
      <div className="px-3 py-1.5 text-[11px] text-ink-2 border-b border-line bg-surface">
        {fmtInt(rows.length)} empresas · ordenado por {sortKey} · clic en una fila para abrir la ficha
      </div>
      <table className="tbl w-full">
        <thead>
          <tr>
            <Th k="id">Empresa</Th>
            <Th k="group_id">Grupo</Th>
            <Th k="score" className="text-right">Score</Th>
            <Th k="delta6" className="text-right">Δ 6 m</Th>
            <Th k="trend">Tendencia</Th>
            <Th k="alert" className="text-center">Alerta</Th>
            <th>Por qué</th>
            <Th k="cash" className="text-right">Caja</Th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map((c) => (
            <tr key={c.id} className="cursor-pointer" onClick={() => router.push(`/empresa/${c.id}/`)}>
              <td className="font-mono text-[12px] text-navy font-semibold">{c.id}</td>
              <td className="font-mono text-[11px] text-ink-2">{c.group_id ?? "—"}{c.group_size > 1 ? <span className="text-ink-3">·{c.group_size}</span> : null}</td>
              <td className="text-right"><ScorePill score={c.score} tier={c.tier} /></td>
              <td className="text-right"><Delta value={c.delta6} suffix="" /></td>
              <td><TrendTag trend={c.trend} /></td>
              <td className="text-center"><Bell on={c.alert === 1} /></td>
              <td className="text-ink-2 max-w-[230px] truncate" title={c.explanation}>{c.explanation}</td>
              <td className={`text-right num ${c.cash < 0 ? "text-bad" : ""}`}>{fmtEurShort(c.cash)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="text-center text-ink-2 py-6">Ninguna empresa cumple los filtros.</td></tr>
          )}
        </tbody>
      </table>
      {rows.length > limit && (
        <div className="p-3 text-center border-t border-line">
          <button type="button" onClick={() => setLimit((l) => l + 200)} className="text-[12px] text-navy font-medium hover:underline">
            Mostrar más ({fmtInt(rows.length - limit)} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
