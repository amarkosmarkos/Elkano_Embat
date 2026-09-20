import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanies, getCompanyDetail, getGroup, getGroupIds } from "@/lib/data";
import type { PoolingCard } from "@/lib/types";
import { GroupPoolingPanel } from "@/components/PoolingCard";
import { PageHeader } from "@/components/ui";

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
  const rows = members.map((m) => ({ id: m.id, score: m.score, cash: m.cash, drawn: drawnOf(m.id), tier: m.tier, trend: m.trend, delta3: m.delta3 }));

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

      <GroupPoolingPanel
        groupId={g.id}
        members={rows}
        proposals={pooling?.proposals ?? []}
        savingYearly={pooling?.saving_yearly ?? 0}
        surplus={g.surplus}
        drawn={g.drawn}
        overdraft={g.overdraft}
        nettable={g.nettable}
      />

      <div className="mt-4 text-[12px] text-ink-2">
        Cada empresa recibe como máximo un porcentaje de lo que tiene dispuesto (80 % si está verde, 50 % en ámbar, 30 % en rojo) y el interés interno sustituye al de la póliza.
        {" "}<Link href="/monitor/" className="text-navy hover:underline">Siguiente: el monitor →</Link>
      </div>
    </>
  );
}
