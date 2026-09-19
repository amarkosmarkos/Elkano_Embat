import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanies, getCompanyDetail, getGroup, getGroupIds } from "@/lib/data";
import type { PoolingCard } from "@/lib/types";
import { fmtEur, fmtEurShort, fmtInt, fmtPct, tierOf } from "@/lib/format";
import { FlowChart } from "@/components/charts/FlowChart";
import { Card, CompanyLink, Delta, Kpi, PageHeader, ScorePill, TierBadge, TrendTag } from "@/components/ui";

export const dynamicParams = false;

export function generateStaticParams() {
  return getGroupIds().map((id) => ({ id }));
}

export default async function GrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = getGroup(id);
  if (!g) notFound();

  const all = getCompanies();
  const members = g.members.map((mid) => all.find((c) => c.id === mid)).filter((c): c is NonNullable<typeof c> => !!c);

  // Propuestas: del primer miembro cuya ficha tenga cards.pooling
  let pooling: PoolingCard | null = null;
  for (const m of g.members) {
    const d = getCompanyDetail(m);
    if (d?.cards.pooling) { pooling = d.cards.pooling; break; }
  }
  const drawnOf = (mid: string) => pooling?.members.find((m) => m.id === mid)?.drawn ?? 0;
  const nodes = members.map((m) => ({ id: m.id, score: Math.round(m.score), cash: m.cash }));
  const proposals = pooling?.proposals ?? [];
  const totalProposed = proposals.reduce((a, p) => a + p.amount, 0);
  const saving = pooling?.saving_yearly ?? 0;
  const avg = members.length ? members.reduce((a, m) => a + m.score, 0) / members.length : 0;

  return (
    <>
      <PageHeader
        step={4}
        title={`Grupo ${g.id}`}
        subtitle={`${g.size} empresas con la misma matriz. Unas tienen caja parada y otras pagan intereses por una póliza: el pooling mueve el dinero dentro del grupo con un límite por empresa que depende de su score.`}
        right={
          <span className={`text-[12px] font-semibold rounded-full px-3 py-1 ${g.pooling ? "bg-ok-bg text-ok" : "bg-navy-100 text-ink-2"}`}>
            {g.pooling ? "Pooling recomendado" : "Sin pooling"}
          </span>
        }
      />

      <div className="grid grid-cols-5 gap-3">
        <Kpi label="Excedente (caja positiva)" value={fmtEurShort(g.surplus)} hint="suma de saldos positivos" accent="text-ok" />
        <Kpi label="Dispuesto en pólizas" value={fmtEurShort(g.drawn)} hint="deuda a corto que cuesta interés" accent="text-bad" />
        <Kpi label="Descubierto" value={fmtEurShort(g.overdraft)} hint="suma de saldos negativos" accent={g.overdraft > 0 ? "text-bad" : "text-ink-2"} />
        <Kpi label="Neteable" value={fmtEurShort(g.nettable)} hint="lo que podría cruzarse dentro del grupo" />
        <Kpi label="Ahorro anual" value={fmtEur(saving)} hint={`propuesto ${fmtEurShort(totalProposed)} al ${proposals[0] ? fmtPct(proposals[0].rate_internal) : "—"} interno`} accent="text-ok" />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_480px] gap-4 items-start">
        <Card kicker="Miembros" title={`${fmtInt(members.length)} empresas · score medio ${Math.round(avg)}`} className="overflow-hidden">
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
              {members.map((m) => (
                <tr key={m.id}>
                  <td><CompanyLink id={m.id} className="font-semibold" /></td>
                  <td className="text-right"><ScorePill score={m.score} tier={m.tier} /> <span className="text-[11px]"><Delta value={m.delta3} suffix="" /></span></td>
                  <td><TierBadge tier={m.tier} /></td>
                  <td><TrendTag trend={m.trend} /></td>
                  <td className={`text-right num ${m.cash < 0 ? "text-bad" : "text-ok"}`}>{fmtEur(Math.max(0, m.cash))}</td>
                  <td className="text-right num">{drawnOf(m.id) ? fmtEur(drawnOf(m.id)) : <span className="text-ink-3">—</span>}</td>
                  <td className="text-right num text-bad">{m.cash < 0 ? fmtEur(-m.cash) : <span className="text-ink-3">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card kicker="Propuestas" title="Quién aporta y quién recibe" right={<span className="text-[11px] text-ink-2">grosor ∝ importe</span>}>
          <FlowChart nodes={nodes} proposals={proposals} width={448} />
          {proposals.length > 0 && (
            <ul className="mt-3 divide-y divide-line text-[12px]">
              {proposals.map((p, i) => (
                <li key={i} className="py-1.5 flex items-start justify-between gap-3">
                  <div>
                    <CompanyLink id={p.from} /> → <CompanyLink id={p.to} />
                    <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: tierOf(nodes.find((n) => n.id === p.to)?.score ?? 50) === "verde" ? "#15803d" : tierOf(nodes.find((n) => n.id === p.to)?.score ?? 50) === "ambar" ? "#b45309" : "#b91c1c" }} />
                    <div className="text-ink-2">{p.reason}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="num font-semibold">{fmtEur(p.amount)}</div>
                    <div className="text-ink-3">límite {fmtEurShort(p.limit)} · {fmtPct(p.rate_internal)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 text-[12px] text-ink-2">
        La regla es simple: una empresa recibe como máximo un porcentaje de lo que tiene dispuesto (80 % si está verde, 50 % en ámbar, 30 % en rojo) y el interés interno sustituye al de la póliza.
        {" "}<Link href="/monitor/" className="text-navy hover:underline">Siguiente: el monitor →</Link>
      </div>
    </>
  );
}
