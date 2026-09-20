"use client";

import Link from "next/link";
import type { PoolingMember, PoolingProposal, Tier, Trend } from "@/lib/types";
import { fmtEur, fmtEurShort, fmtInt, fmtPct, tierOf, TIER_COLOR } from "@/lib/format";
import { POOLING_SAVING_RATE, poolingOf, useOps, type PoolingOp } from "@/lib/ops";
import { FlowChart } from "@/components/charts/FlowChart";
import { CompanyLink, Delta, Kpi, ScorePill, TierBadge, TrendTag } from "@/components/ui";

export type LiveMember = PoolingMember & { cash0: number; drawn0: number; sent: number; received: number };

/** Estado vivo del pooling de un grupo: propuestas ejecutadas, cifras de cada miembro tras los movimientos y totales. */
function usePooling(groupId: string, members: PoolingMember[], proposals: PoolingProposal[]) {
  const { ops, add, remove } = useOps();
  const executed = poolingOf(ops, groupId);
  const opFor = (p: PoolingProposal): PoolingOp | undefined => executed.find((o) => o.from === p.from && o.to === p.to);

  const live: LiveMember[] = members.map((m) => {
    const sent = executed.filter((o) => o.from === m.id).reduce((a, o) => a + o.amount, 0);
    const received = executed.filter((o) => o.to === m.id).reduce((a, o) => a + o.amount, 0);
    return { ...m, cash0: m.cash, drawn0: m.drawn, sent, received, cash: m.cash - sent + received, drawn: Math.max(0, m.drawn - received) };
  });
  const moved = executed.reduce((a, o) => a + o.amount, 0);
  const saving = moved * POOLING_SAVING_RATE;
  const pending = proposals.filter((p) => !opFor(p));

  const approve = (p: PoolingProposal) => {
    if (opFor(p)) return;
    add({ kind: "pooling", group_id: groupId, from: p.from, to: p.to, amount: p.amount, rate_internal: p.rate_internal });
  };
  const approveAll = () => pending.forEach(approve);
  const undo = (p: PoolingProposal) => {
    const o = opFor(p);
    if (o) remove(o.id);
  };
  return { executed, opFor, live, moved, saving, pending, approve, approveAll, undo };
}

function ApproveButton({ done, onApprove, onUndo, small }: { done: boolean; onApprove: () => void; onUndo: () => void; small?: boolean }) {
  const pad = small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]";
  return done ? (
    <span className="inline-flex items-center gap-2">
      <span className={`rounded border bg-ok text-white border-ok font-semibold ${pad}`}>Ejecutado ✓</span>
      <button type="button" onClick={onUndo} className="text-[11px] text-navy hover:underline">Deshacer</button>
    </span>
  ) : (
    <button type="button" onClick={onApprove} className={`rounded border bg-navy text-white border-navy hover:bg-navy-700 font-semibold transition-colors ${pad}`}>
      Aprobar
    </button>
  );
}

function Totals({ moved, saving, total }: { moved: number; saving: number; total: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-[12px]">
      <div className="rounded bg-navy-100/60 px-2 py-1.5">
        <div className="kicker">Movido dentro del grupo</div>
        <div className="num font-semibold text-navy text-[14px]">{fmtEur(moved)}<span className="text-ink-3 font-normal text-[11px]"> de {fmtEurShort(total)}</span></div>
      </div>
      <div className="rounded bg-ok-bg/60 px-2 py-1.5">
        <div className="kicker">Ahorro anual estimado</div>
        <div className="num font-semibold text-ok text-[14px]">{fmtEur(Math.round(saving))}<span className="text-ink-3 font-normal text-[11px]">, {fmtPct(POOLING_SAVING_RATE)}</span></div>
      </div>
    </div>
  );
}

/** Producto 2, Cash pooling (ficha de empresa): propuestas con «Aprobar» por fila, totales vivos y enlace al grupo. */
export function PoolingCard({
  groupId,
  members,
  proposals,
  savingYearly,
  highlightId,
  emptyText,
}: {
  groupId: string | null;
  members: PoolingMember[];
  proposals: PoolingProposal[];
  savingYearly: number;
  highlightId?: string;
  emptyText: string;
}) {
  const { opFor, live, moved, saving, pending, approve, approveAll, undo } = usePooling(groupId ?? "", members, proposals);
  const total = proposals.reduce((a, p) => a + p.amount, 0);
  const allDone = groupId !== null && proposals.length > 0 && pending.length === 0;
  const me = highlightId ? live.find((m) => m.id === highlightId) : undefined;

  return (
    <section className={`card p-4 flex flex-col gap-3 ${allDone ? "border-ok bg-ok-bg/30" : ""}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="kicker">Producto 2, Cash pooling</div>
          <h3 className="text-[15px] font-semibold text-ink leading-tight">{groupId ? `Netear dentro de ${groupId}` : "Cash pooling"}</h3>
        </div>
        {groupId && pending.length > 0 && (
          <button
            type="button"
            onClick={approveAll}
            className="shrink-0 rounded px-3 py-1.5 text-[12px] font-semibold border bg-navy text-white border-navy hover:bg-navy-700 transition-colors"
          >
            Aprobar todas{pending.length < proposals.length ? ` (${pending.length})` : ""}
          </button>
        )}
        {allDone && <span className="shrink-0 rounded px-3 py-1.5 text-[12px] font-semibold border bg-ok text-white border-ok">Ejecutado ✓</span>}
      </header>

      {!groupId ? (
        <p className="text-[13px] text-ink-2">{emptyText}</p>
      ) : (
        <>
          <div className="text-2xl font-bold text-navy num leading-tight">Ahorro {fmtEur(savingYearly)} / año</div>
          {me && (
            <div className="flex items-baseline justify-between text-[12px] text-ink-2 border-b border-line pb-2">
              <span>Caja de {me.id}</span>
              <span className="num font-semibold text-ink">
                {fmtEur(me.cash)}
                {me.drawn0 > 0 && <span className="text-ink-3 font-normal">, dispuesto {fmtEurShort(me.drawn)}</span>}
              </span>
            </div>
          )}
          <ul className="text-[12px] space-y-1.5">
            {proposals.map((p, i) => {
              const o = opFor(p);
              const mine = p.from === highlightId || p.to === highlightId;
              return (
                <li key={i} className={`rounded border px-2 py-1.5 ${o ? "border-ok/50 bg-ok-bg/40" : mine ? "border-navy/40 bg-navy-100/40" : "border-line"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span><CompanyLink id={p.from} /> → <CompanyLink id={p.to} /></span>
                    <span className="flex items-center gap-2">
                      <span className="num font-semibold">{fmtEurShort(p.amount)}</span>
                      <ApproveButton small done={!!o} onApprove={() => approve(p)} onUndo={() => undo(p)} />
                    </span>
                  </div>
                  <div className="text-ink-2 mt-0.5">{p.reason}, límite {fmtEurShort(p.limit)}, {fmtPct(p.rate_internal)}</div>
                </li>
              );
            })}
            {proposals.length === 0 && <li className="text-ink-2">Grupo con pooling activo, sin propuestas este mes.</li>}
          </ul>
          <Totals moved={moved} saving={saving} total={total} />
          <div className="text-[12px] text-ink-2 border-t border-line pt-2">
            <Link href={`/grupo/${groupId}/`} className="text-navy font-medium hover:underline">Ver el grupo completo →</Link>
          </div>
        </>
      )}
    </section>
  );
}

export type GroupMemberRow = PoolingMember & { tier: Tier; trend: Trend; delta3: number };

/** Página de grupo: KPIs, tabla de miembros, diagrama de flujos y lista de propuestas, todo vivo sobre el almacén de operaciones. */
export function GroupPoolingPanel({
  groupId,
  members,
  proposals,
  savingYearly,
  surplus: surplus0,
  drawn: drawn0,
  overdraft,
  nettable,
}: {
  groupId: string;
  members: GroupMemberRow[];
  proposals: PoolingProposal[];
  savingYearly: number;
  surplus: number;
  drawn: number;
  overdraft: number;
  nettable: number;
}) {
  const { opFor, live, moved, saving, pending, approve, approveAll, undo } = usePooling(groupId, members, proposals);
  const byId = new Map(live.map((m) => [m.id, m]));
  const rows = members.map((m) => ({ ...m, ...byId.get(m.id)! }));
  // KPIs: base de groups.json más el efecto de las operaciones ejecutadas
  const surplus = surplus0 + live.reduce((a, m) => a + (Math.max(0, m.cash) - Math.max(0, m.cash0)), 0);
  const drawn = Math.max(0, drawn0 - live.reduce((a, m) => a + (m.drawn0 - m.drawn), 0));
  const totalProposed = proposals.reduce((a, p) => a + p.amount, 0);
  const avg = members.length ? members.reduce((a, m) => a + m.score, 0) / members.length : 0;
  const nodes = live.map((m) => ({ id: m.id, score: Math.round(m.score), cash: m.cash }));
  const dot = (id: string) => TIER_COLOR[tierOf(byId.get(id)?.score ?? 50)];

  return (
    <>
      <div className="grid grid-cols-5 gap-3">
        <Kpi label="Excedente (caja positiva)" value={fmtEurShort(surplus)} hint="suma de saldos positivos" accent="text-ok" />
        <Kpi label="Dispuesto en pólizas" value={fmtEurShort(drawn)} hint={moved > 0 ? `tras netear ${fmtEurShort(moved)}` : "deuda a corto que cuesta interés"} accent="text-bad" />
        <Kpi label="Descubierto" value={fmtEurShort(overdraft)} hint="suma de saldos negativos" accent={overdraft > 0 ? "text-bad" : "text-ink-2"} />
        <Kpi label="Neteable" value={fmtEurShort(nettable)} hint="lo que podría cruzarse dentro del grupo" />
        <Kpi
          label="Ahorro anual"
          value={fmtEur(Math.round(moved > 0 ? saving : savingYearly))}
          hint={
            moved > 0
              ? `ejecutado ${fmtEurShort(moved)} de ${fmtEurShort(totalProposed)} al ${fmtPct(POOLING_SAVING_RATE)}`
              : `propuesto ${fmtEurShort(totalProposed)} al ${proposals[0] ? fmtPct(proposals[0].rate_internal) : "-"} interno`
          }
          accent="text-ok"
        />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_480px] gap-4 items-start">
        <section className="card p-4 overflow-hidden">
          <header className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="kicker">Miembros</div>
              <h2 className="text-[15px] font-semibold text-ink leading-tight">{fmtInt(members.length)} empresas, score medio {Math.round(avg)}</h2>
            </div>
            {moved > 0 && <span className="text-[11px] text-ok font-medium">cifras tras {fmtEurShort(moved)} neteados</span>}
          </header>
          <table className="tbl tbl-compact w-full">
            <thead>
              <tr>
                <th>Empresa</th>
                <th className="text-right">Score</th>
                <th>Tramo</th>
                <th>Tendencia</th>
                <th className="text-right">Caja</th>
                <th className="text-right">Dispuesto</th>
                <th className="text-right">Descubierto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td><CompanyLink id={m.id} className="font-semibold" /></td>
                  <td className="text-right"><ScorePill score={m.score} tier={m.tier} /> <span className="text-[11px]"><Delta value={m.delta3} suffix="" /></span></td>
                  <td><TierBadge tier={m.tier} /></td>
                  <td><TrendTag trend={m.trend} /></td>
                  <td className={`text-right num ${m.cash < 0 ? "text-bad" : "text-ok"}`}>
                    {fmtEur(Math.max(0, m.cash))}
                    {m.sent > 0 && <div className="text-[10px] text-ink-3">−{fmtEurShort(m.sent)} aportados</div>}
                    {m.received > 0 && <div className="text-[10px] text-ink-3">+{fmtEurShort(m.received)} recibidos</div>}
                  </td>
                  <td className="text-right num">
                    {m.drawn ? fmtEur(m.drawn) : <span className="text-ink-3">-</span>}
                    {m.received > 0 && m.drawn0 > 0 && <div className="text-[10px] text-ok">antes {fmtEurShort(m.drawn0)}</div>}
                  </td>
                  <td className="text-right num text-bad">{m.cash < 0 ? fmtEur(-m.cash) : <span className="text-ink-3">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={`card p-4 ${proposals.length > 0 && pending.length === 0 ? "border-ok bg-ok-bg/30" : ""}`}>
          <header className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="kicker">Propuestas</div>
              <h2 className="text-[15px] font-semibold text-ink leading-tight">Quién aporta y quién recibe</h2>
            </div>
            {pending.length > 0 ? (
              <button
                type="button"
                onClick={approveAll}
                className="shrink-0 rounded px-3 py-1.5 text-[12px] font-semibold border bg-navy text-white border-navy hover:bg-navy-700 transition-colors"
              >
                Aprobar todas{pending.length < proposals.length ? ` (${pending.length})` : ""}
              </button>
            ) : proposals.length > 0 ? (
              <span className="shrink-0 rounded px-3 py-1.5 text-[12px] font-semibold border bg-ok text-white border-ok">Ejecutado ✓</span>
            ) : (
              <span className="text-[11px] text-ink-2">grosor ∝ importe</span>
            )}
          </header>
          <FlowChart nodes={nodes} proposals={proposals} width={448} />
          {proposals.length > 0 && (
            <ul className="mt-3 divide-y divide-line text-[12px]">
              {proposals.map((p, i) => {
                const o = opFor(p);
                return (
                  <li key={i} className={`py-2 flex items-start justify-between gap-3 ${o ? "opacity-90" : ""}`}>
                    <div>
                      <CompanyLink id={p.from} /> → <CompanyLink id={p.to} />
                      <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: dot(p.to) }} />
                      <div className="text-ink-2">{p.reason}</div>
                      <div className="mt-1"><ApproveButton small done={!!o} onApprove={() => approve(p)} onUndo={() => undo(p)} /></div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="num font-semibold">{fmtEur(p.amount)}</div>
                      <div className="text-ink-3">límite {fmtEurShort(p.limit)}, {fmtPct(p.rate_internal)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {proposals.length > 0 && <div className="mt-3"><Totals moved={moved} saving={saving} total={totalProposed} /></div>}
        </section>
      </div>
    </>
  );
}
