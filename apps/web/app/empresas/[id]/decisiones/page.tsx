import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { rowsAt } from "@/lib/data/portfolio";
import { assessProvider, assessReceiver } from "@/lib/score/derived";
import { groupSnapshot } from "@/lib/products/pooling";
import DecisionCards from "@/components/productos/DecisionCards";

export default async function DecisionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const c = store.byId.get(id);
  if (!c) notFound();
  const sorted = rowsAt(store, idx).map((r) => r.score).sort((a, b) => a - b);
  const withCash = { ...c, cash: store.months.map((m) => store.cash.get(`${id}|${m}`) ?? null) };
  const provider = assessProvider(withCash, idx, sorted);
  const receiver = assessReceiver(c, idx);
  const snap = c.group ? groupSnapshot(store, c.group, month) : null;
  const me = snap?.entities.find((e) => e.companyId === id) ?? null;
  const pool = snap && me ? {
    groupId: c.group as string,
    entity: { role: me.role, policy: me.policy, reason: me.reason, cashEur: me.cashEur, spareEur: me.spareEur, needEur: me.needEur, receiveLimitEur: me.receiveLimitEur, reserveEur: me.reserveEur },
    proposals: snap.proposals.filter((p) => p.fromId === id || p.toId === id).map((p) => ({ id: p.id, fromId: p.fromId, toId: p.toId, amountEur: p.amountEur, netSavingEur: p.netSavingEur, days: p.days, requiresReview: p.requiresReview })),
    totals: snap.totals,
  } : null;
  return <DecisionCards company={{ id, name: c.name }} provider={provider} receiver={receiver} pool={pool} />;
}
