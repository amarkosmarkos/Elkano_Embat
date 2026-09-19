import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { rowsAt } from "@/lib/data/portfolio";
import { assessProvider, assessReceiver } from "@/lib/score/derived";
import { groupSnapshot } from "@/lib/products/pooling";
import { cuota, excedente, pagos } from "@/lib/products/tesoreria";
import DecisionCards from "@/components/productos/DecisionCards";

export default async function DecisionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const c = store.byId.get(id);
  if (!c) notFound();
  const sorted = rowsAt(store, idx).map((r) => r.score).sort((a, b) => a - b);
  const provider = assessProvider(c, idx, sorted);
  const receiver = assessReceiver(c, idx);
  const snap = c.group ? groupSnapshot(store, c.group, month) : null;
  const pool = snap ? {
    groupId: c.group as string,
    role: snap.entities.find((e) => e.companyId === id)?.role ?? null,
    entity: snap.entities.find((e) => e.companyId === id) ?? null,
    proposals: snap.proposals.filter((p) => p.fromId === id || p.toId === id).map((p) => ({ ...p, from: snap.entities.find((e) => e.companyId === p.fromId)?.displayName ?? p.fromId, to: snap.entities.find((e) => e.companyId === p.toId)?.displayName ?? p.toId })),
    totals: snap.totals,
  } : null;
  return <DecisionCards company={{ id, name: c.name, score: c.scores[idx] }} month={month} provider={provider} receiver={receiver} pool={pool} exc={excedente(store, c, idx)} cuo={cuota(store, c, idx)} pag={pagos(store, c, idx)} />;
}
