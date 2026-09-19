"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { PRICING } from "@/lib/products/marketplace/pricing";
import { MARKETPLACE_STEPS } from "@/components/shell/nav";
import { fmtMoney } from "@/lib/format";

/**
 * Cabecera del flujo: en grande, cuánto dinero se necesita, cuánto se puede prestar y cuánto interés se queda
 * el intermediario (cifras vivas de la operación en curso o de la última cerrada) y el stepper de 4 pasos.
 */
export default function FlowHeader() {
  const pathname = usePathname() ?? "";
  const { lenderId, byId, result, deals, activeDealId, config } = useMarketplace();
  const lender = lenderId ? byId.get(lenderId) ?? null : null;
  const deal = deals.find((d) => d.id === activeDealId) ?? deals[0] ?? null;
  const live = result ?? deal?.result ?? null;
  const eco = live?.economics ?? null;
  const n = live?.positions.length ?? 0;
  const capital = lender ? config.capital : deal?.result.config.capital ?? null;
  const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")} %`;
  const stepIdx = MARKETPLACE_STEPS.findIndex((s, i) => (i === 0 ? pathname === s.href : pathname.startsWith(s.href)));

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="card grid grid-cols-1 gap-px overflow-hidden bg-line-soft p-0 md:grid-cols-3">
        <Big label="Se necesita" value={eco ? fmtMoney(eco.amount) : "—"} sub={eco ? `${n} empresas receptoras · ${live!.config.term} meses · pagan ${pct(eco.avgRate)} anual` : "sale de la cartera de receptoras del paso 2"} tone="pos" />
        <Big label="Se puede prestar" value={capital != null ? fmtMoney(capital) : "—"} sub={lender ? `tesorería desplegable de ${lender.name}` : deal ? `tesorería desplegable de ${deal.lenderName}` : "elige un prestamista en el paso 1"} tone="ink" />
        <Big label="Se queda Embat" value={eco ? fmtMoney(eco.embatFee) : "—"} sub={eco ? `${Math.round(PRICING.embatShare * 100)} % del interés que pagan las empresas · el prestamista se lleva ${fmtMoney(eco.lenderNet)} netos (${pct(eco.netYield)} anual)` : `${Math.round(PRICING.embatShare * 100)} % del interés que paguen las empresas`} tone="good" />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {MARKETPLACE_STEPS.map((s, i) => {
          const on = i === stepIdx;
          const done = stepIdx > i;
          return (
            <Link key={s.href} href={s.href} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${on ? "border-line bg-white/[0.045] text-ink" : "border-transparent text-ink-mute hover:text-ink"}`}>
              <span className={`num flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${on ? "bg-ink text-panel" : done ? "bg-good/20 text-good" : "bg-panel-2 text-ink-mute"}`}>{done ? "✓" : s.n}</span>{s.label}
              {s.n === 4 && deals.length > 0 && <span className="num rounded-full bg-panel-2 px-1.5 text-[11px] text-ink-dim">{deals.length}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Big({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "good" | "ink" | "pos" }) {
  const c = tone === "good" ? "text-good" : tone === "pos" ? "text-pos" : "text-ink";
  return (
    <div className="bg-panel px-5 py-4">
      <div className="text-[12px] font-medium uppercase tracking-wide text-ink-mute">{label}</div>
      <div className={`num mt-1 text-[38px] font-semibold leading-none tracking-tight ${c}`}>{value}</div>
      <div className="mt-1.5 text-[12.5px] text-ink-mute">{sub}</div>
    </div>
  );
}
