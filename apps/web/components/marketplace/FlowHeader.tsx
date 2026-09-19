"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { PRICING } from "@/lib/products/marketplace/pricing";
import { NEED_MAX, NEED_MIN, POTENTIAL_TERM } from "@/lib/products/marketplace/potential";
import { MARKETPLACE_STEPS } from "@/components/shell/nav";
import { fmtMoney } from "@/lib/format";

/**
 * Cabecera del flujo. Solo en el paso 1, el potencial del mercado en grande: cuánta financiación necesitan las
 * candidatas, cuánto podrían prestar entre todas las empresas cualificadas y el beneficio potencial para Embat.
 * En todos los pasos, el stepper.
 */
export default function FlowHeader() {
  const pathname = usePathname() ?? "";
  const { potential, deals } = useMarketplace();
  const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")} %`;
  const stepIdx = MARKETPLACE_STEPS.findIndex((s, i) => (i === 0 ? pathname === s.href : pathname.startsWith(s.href)));
  const p = potential;

  return (
    <div className="mb-6 flex flex-col gap-4">
      {stepIdx === 0 && (
        <div className="card grid grid-cols-1 gap-px overflow-hidden bg-line-soft p-0 md:grid-cols-3">
          <Big label="Financiación que se necesita" value={p ? fmtMoney(p.demand) : "—"} tone="pos" sub={p ? `${p.borrowers} empresas sanas con necesidad de capital` : "cargando…"} how={p ? `Un mes de salidas de caja por candidata (caja real ÷ colchón), entre ${fmtMoney(NEED_MIN)} y ${fmtMoney(NEED_MAX)}; ${p.withData} de ${p.borrowers} con dato de caja.` : ""} />
          <Big label="Capital que se podría prestar" value={p ? fmtMoney(p.supply) : "—"} tone="ink" sub={p ? `${p.lenders} empresas cualificadas como prestamistas` : "cargando…"} how={p ? `Suma de la tesorería desplegable de cada una: 50 % de su suelo de caja real de 12 meses (score ≥ 75, sin alarmas, ≥ 100 k€); ${p.lendersWithCash} de ${p.lenders} con dato de caja.` : ""} />
          <Big label="Beneficio potencial para Embat" value={p ? fmtMoney(p.embatFee) : "—"} tone="good" sub={p ? `${Math.round(PRICING.embatShare * 100)} % del interés si se casan ${fmtMoney(p.matched)} a ${POTENTIAL_TERM} meses` : "cargando…"} how={p ? `min(necesidad, capital) = ${fmtMoney(p.matched)} × tipo medio ${pct(p.avgRate)} × ${POTENTIAL_TERM}/12 = ${fmtMoney(p.grossInterest)} de interés; Embat el ${Math.round(PRICING.embatShare * 100)} %, los prestamistas ${fmtMoney(p.lenderNet)} netos.` : ""} />
        </div>
      )}
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

function Big({ label, value, sub, how, tone }: { label: string; value: string; sub: string; how: string; tone: "good" | "ink" | "pos" }) {
  const c = tone === "good" ? "text-good" : tone === "pos" ? "text-pos" : "text-ink";
  return (
    <div className="bg-panel px-5 py-4">
      <div className="text-[12px] font-medium uppercase tracking-wide text-ink-mute">{label}</div>
      <div className={`num mt-1 text-[38px] font-semibold leading-none tracking-tight ${c}`}>{value}</div>
      <div className="mt-1.5 text-[13px] text-ink">{sub}</div>
      {how && <div className="mt-2 border-t border-line-soft pt-2 text-[11.5px] leading-snug text-ink-mute">{how}</div>}
    </div>
  );
}
