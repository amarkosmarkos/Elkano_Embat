import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { ProviderAssessment, ReceiverAssessment } from "@/lib/score/derived";
import { eur, fmtMoney } from "@/lib/format";

type PoolInfo = {
  groupId: string;
  entity: { role: string; policy: string; reason: string; cashEur: number | null; spareEur: number; needEur: number; receiveLimitEur: number; reserveEur: number };
  proposals: { id: string; fromId: string; toId: string; amountEur: number; netSavingEur: number; days: number; requiresReview: boolean }[];
  totals: { surplusEur: number; deficitEur: number; unknown: number };
};

const POLICY: Record<string, { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  available: { label: "disponible", tone: "good" },
  limited: { label: "limitada", tone: "warn" },
  review: { label: "revisar", tone: "bad" },
  none: { label: "sin acción", tone: "neutral" },
};

/** Las dos decisiones de producto aplicadas a esta empresa, con enlace a cada app. */
export default function DecisionCards({ company, provider, receiver, pool }: { company: { id: string; name: string }; provider: ProviderAssessment; receiver: ReceiverAssessment; pool: PoolInfo | null }) {
  const List = ({ items, tone }: { items: string[]; tone: "good" | "bad" | "neutral" }) => (
    <ul className="mt-2 flex flex-col gap-1 text-[13px] text-ink-dim">{items.map((r) => <li key={r} className="flex gap-2"><span className={tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink-mute"}>{tone === "good" ? "✓" : tone === "bad" ? "✕" : "·"}</span>{r}</li>)}</ul>
  );
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card title="01 · Marketplace de crédito" sub="¿Puede prestar? ¿Es candidata a recibir financiación?" right={<Link href={`/productos/marketplace?lender=${company.id}`} className="text-[13px] text-ink hover:underline">Abrir en el marketplace →</Link>}>
        <div className="rounded-lg bg-panel-2 p-4">
          <div className="flex items-center justify-between"><span className="text-[14px] font-medium text-ink">Prestamista</span><Pill tone={provider.qualified ? "good" : "neutral"}>{provider.qualified ? `cualificada · capacidad ${provider.capacity}` : "no cualifica"}</Pill></div>
          {provider.blockers.length > 0 && <List items={provider.blockers} tone="bad" />}
          <List items={provider.reasons.slice(0, 4)} tone="good" />
        </div>
        <div className="mt-3 rounded-lg bg-panel-2 p-4">
          <div className="flex items-center justify-between"><span className="text-[14px] font-medium text-ink">Receptora de financiación</span><Pill tone={receiver.eligible ? (receiver.fit >= 50 ? "good" : "warn") : "neutral"}>{receiver.eligible ? `encaje ${receiver.fit} · necesidad ${receiver.need}` : "no elegible"}</Pill></div>
          {receiver.risks.length > 0 && <List items={receiver.risks} tone="bad" />}
          {receiver.needSignals.length > 0 && <List items={receiver.needSignals} tone="neutral" />}
          <List items={receiver.strengths.slice(0, 3)} tone="good" />
        </div>
      </Card>

      <Card title="02 · Cash pooling" sub={pool ? `grupo ${pool.groupId} · prestable ${fmtMoney(pool.totals.surplusEur)} · falta ${fmtMoney(pool.totals.deficitEur)}` : "sin grupo: no aplica"} right={pool && <Link href={`/productos/cash-pooling?group=${pool.groupId}`} className="text-[13px] text-ink hover:underline">Abrir el grupo →</Link>}>
        {!pool ? <p className="text-[14px] text-ink-mute">La empresa no pertenece a ningún grupo del dataset, o no tiene caja reconstruida este mes.</p> : (
          <>
            <div className="rounded-lg bg-panel-2 p-4">
              <div className="flex items-center justify-between"><span className="text-[14px] font-medium text-ink">Política este mes</span><span className="flex gap-1.5"><Pill tone={pool.entity.role === "surplus" ? "good" : pool.entity.role === "deficit" ? "bad" : "neutral"}>{pool.entity.role === "surplus" ? "sobra" : pool.entity.role === "deficit" ? "falta" : pool.entity.role === "unknown" ? "sin dato" : "neutral"}</Pill><Pill tone={POLICY[pool.entity.policy]?.tone ?? "neutral"}>{POLICY[pool.entity.policy]?.label ?? pool.entity.policy}</Pill></span></div>
              <p className="mt-2 text-[13px] text-ink-dim">{pool.entity.reason}</p>
              <div className="num mt-2 text-[13px] text-ink-mute">Caja {fmtMoney(pool.entity.cashEur)} · reserva {fmtMoney(pool.entity.reserveEur)}{pool.entity.spareEur > 0 ? ` · puede prestar ${fmtMoney(pool.entity.spareEur)}` : ""}{pool.entity.receiveLimitEur > 0 ? ` · puede recibir ${fmtMoney(pool.entity.receiveLimitEur)}` : ""}</div>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {pool.proposals.length === 0 && <p className="text-[13px] text-ink-mute">Sin propuestas que la impliquen este mes.</p>}
              {pool.proposals.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-line-soft p-3.5 text-[13px]">
                  <div><div className="num text-ink">{p.fromId} → {p.toId}</div><div className="text-ink-mute">{p.days} días · ahorro neto {eur(Math.round(p.netSavingEur))}{p.requiresReview ? " · requiere revisión" : ""}</div></div>
                  <div className="num text-[18px] font-semibold text-ink">{eur(p.amountEur)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
