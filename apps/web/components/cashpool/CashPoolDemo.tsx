"use client";

import { useMemo, useState } from "react";
import type { GroupSibling } from "@/lib/recommend";
import type { PoolProposal } from "@/lib/cashpool";
import { eur } from "@/lib/format";
import { band } from "@/components/ScoreBadge";

const BAND_FILL = { good: "#2f9e6e", warn: "#b8890f", bad: "#d6455a" } as const;

type Status = "pendiente" | "aprobada" | "rechazada";

export default function CashPoolDemo({ siblings, proposals: initial }: { siblings: GroupSibling[]; proposals: PoolProposal[] }) {
  const [status, setStatus] = useState<Record<string, Status>>(() => Object.fromEntries(initial.map((p) => [p.id, "pendiente" as Status])));
  const [mode, setMode] = useState<"bilateral" | "fondo">("fondo");

  const approvedTotal = initial.filter((p) => status[p.id] === "aprobada").reduce((s, p) => s + p.amount, 0);
  const pending = initial.filter((p) => status[p.id] === "pendiente").length;

  const setOne = (id: string, s: Status) => setStatus((prev) => ({ ...prev, [id]: s }));
  const approveAll = () => setStatus(Object.fromEntries(initial.map((p) => [p.id, "aprobada" as Status])));

  return (
    <div className="flex flex-col gap-8">
      {/* -------- cabecera con el toggle de modelo -------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-line bg-panel p-5">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ink-mute">Modelo de reparto</div>
          <div className="mt-1 text-sm text-ink-dim">
            {mode === "fondo"
              ? "Fondo común, estilo Mondragón Corporation: todos aportan a un fondo intercooperativo; quien lo necesita saca de ahí, según su score."
              : "Bilateral: cada filial con caja presta directamente a la que la necesita — más simple, menos redistributivo."}
          </div>
        </div>
        <div className="flex gap-2 font-mono text-xs">
          <button
            onClick={() => setMode("fondo")}
            className={`rounded-sm border px-3 py-1.5 ${mode === "fondo" ? "border-accent text-accent" : "border-line text-ink-mute"}`}
          >
            fondo común
          </button>
          <button
            onClick={() => setMode("bilateral")}
            className={`rounded-sm border px-3 py-1.5 ${mode === "bilateral" ? "border-accent text-accent" : "border-line text-ink-mute"}`}
          >
            bilateral
          </button>
        </div>
      </div>

      <GroupFlowMap siblings={siblings} proposals={initial} status={status} mode={mode} />

      {/* -------- cola del gestor -------- */}
      <div className="rounded-sm border border-line bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5">
          <div>
            <div className="font-display text-lg font-bold">Bandeja de esta mañana</div>
            <div className="text-xs text-ink-mute">{pending} propuestas pendientes · {eur(approvedTotal)} ya movidos hoy</div>
          </div>
          {pending > 0 && (
            <button onClick={approveAll} className="rounded-sm bg-accent px-4 py-2 font-mono text-xs font-medium text-[#03181f]">
              aprobar todas
            </button>
          )}
        </div>
        <div className="flex flex-col divide-y divide-line-soft">
          {initial.map((p) => (
            <ProposalRow key={p.id} p={p} status={status[p.id]} onApprove={() => setOne(p.id, "aprobada")} onReject={() => setOne(p.id, "rechazada")} />
          ))}
          {initial.length === 0 && <div className="p-6 text-sm text-ink-mute">Sin desajustes de caja detectados hoy en este grupo.</div>}
        </div>
      </div>
    </div>
  );
}

function ProposalRow({ p, status, onApprove, onReject }: { p: PoolProposal; status: Status; onApprove: () => void; onReject: () => void }) {
  const urgencyColor = p.urgency === "alta" ? "text-bad border-bad" : p.urgency === "media" ? "text-warn border-warn" : "text-ink-mute border-line";
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 p-5 ${status !== "pendiente" ? "opacity-50" : ""}`}>
      <div className="min-w-[240px]">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{p.fromName}</span>
          <span className="text-ink-mute">→</span>
          <span className="font-semibold">{p.toName}</span>
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${urgencyColor}`}>{p.urgency}</span>
        </div>
        <div className="mt-1 font-mono text-xs text-ink-mute">
          {p.fromName} tiene {eur(p.fromCash)} en caja · {p.toName} score {p.toScore}
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="text-right">
          <div className="font-mono text-lg font-semibold text-accent">{eur(p.amount)}</div>
          <div className="font-mono text-[10px] text-ink-mute">{p.rate}% interno/año</div>
        </div>
        {status === "pendiente" ? (
          <div className="flex gap-2">
            <button onClick={onApprove} className="rounded-sm border border-good px-3 py-1.5 font-mono text-xs text-good">
              aprobar
            </button>
            <button onClick={onReject} className="rounded-sm border border-line px-3 py-1.5 font-mono text-xs text-ink-mute">
              rechazar
            </button>
          </div>
        ) : (
          <span className={`font-mono text-xs ${status === "aprobada" ? "text-good" : "text-bad"}`}>{status}</span>
        )}
      </div>
    </div>
  );
}

function GroupFlowMap({
  siblings,
  proposals,
  status,
  mode,
}: {
  siblings: GroupSibling[];
  proposals: PoolProposal[];
  status: Record<string, Status>;
  mode: "bilateral" | "fondo";
}) {
  const W = 720,
    H = 380,
    cx = W / 2,
    cy = H / 2,
    R = 150;
  const nodes = useMemo(() => {
    return siblings.map((s, i) => {
      const angle = (i / siblings.length) * Math.PI * 2 - Math.PI / 2;
      // datos sintéticos traen algún cash_position disparatado (miles de millones) sin filtrar:
      // se acota antes de calcular el radio para que un outlier no rompa el mapa
      const raw = s.signals?.cash_position ?? 0;
      const cash = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 3_000_000) : 0;
      const r = Math.max(9, Math.min(28, Math.sqrt(cash) / 22));
      return { ...s, x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle), r };
    });
  }, [siblings]);
  const byId = Object.fromEntries(nodes.map((n) => [n.companyId, n]));
  const active = proposals.filter((p) => status[p.id] !== "rechazada");

  return (
    <div className="rounded-sm border border-line bg-panel-2 p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Mapa de caja del grupo">
        {mode === "fondo" && active.length > 0 && (
          <circle cx={cx} cy={cy} r={22} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="3 3" />
        )}
        {mode === "fondo" &&
          active.length > 0 &&
          [
            "FCI" /* fondo intercooperativo, estilo Mondragón */,
          ].map(() => (
            <text key="fci" x={cx} y={cy + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9} fill="var(--color-accent)">
              FCI
            </text>
          ))}

        {active.map((p) => {
          const a = byId[p.fromId],
            b = byId[p.toId];
          if (!a || !b) return null;
          const approved = status[p.id] === "aprobada";
          const stroke = approved ? "var(--color-good)" : "var(--color-accent)";
          if (mode === "fondo") {
            return (
              <g key={p.id} opacity={approved ? 1 : 0.55}>
                <path d={`M${a.x},${a.y} Q${cx},${cy} ${cx},${cy}`} fill="none" stroke={stroke} strokeWidth={1.4} strokeDasharray="4 3" />
                <path d={`M${cx},${cy} Q${cx},${cy} ${b.x},${b.y}`} fill="none" stroke={stroke} strokeWidth={1.4} strokeDasharray="4 3" />
              </g>
            );
          }
          const mx = (a.x + b.x) / 2,
            my = (a.y + b.y) / 2 - 24;
          return (
            <path key={p.id} d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} fill="none" stroke={stroke} strokeWidth={1.6} strokeDasharray="4 3" opacity={approved ? 1 : 0.55} />
          );
        })}

        {nodes.map((n) => (
          <g key={n.companyId}>
            <circle cx={n.x} cy={n.y} r={n.r} fill={BAND_FILL[band(n.score)]} opacity={0.85} />
            <text x={n.x} y={n.y - n.r - 5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={8.5} fill="var(--color-ink-dim)">
              {n.displayName.length > 14 ? n.displayName.slice(0, 13) + "…" : n.displayName}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex gap-4 font-mono text-[10px] text-ink-mute">
        <span>● tamaño = caja</span>
        <span>● color = score (verde/ámbar/rojo)</span>
        <span>┄ línea = propuesta activa</span>
      </div>
    </div>
  );
}
