"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { MARKETPLACE_STEPS } from "@/components/shell/nav";
import { fmtMoney } from "@/lib/format";

/**
 * Cabecera del flujo: el modelo win-win-win con las cifras vivas de la operación en curso (o de la última
 * cerrada) y el stepper Prestamista → Receptores → Estructurar → Economía → Monitor.
 */
export default function FlowHeader() {
  const pathname = usePathname() ?? "";
  const { lenderId, byId, result, deals, activeDealId } = useMarketplace();
  const lender = lenderId ? byId.get(lenderId) ?? null : null;
  const deal = deals.find((d) => d.id === activeDealId) ?? deals[0] ?? null;
  const live = result ?? deal?.result ?? null;
  const eco = live?.economics ?? null;
  const n = live?.positions.length ?? 0;
  const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")} %`;
  const stepIdx = MARKETPLACE_STEPS.findIndex((s, i) => (i === 0 ? pathname === s.href : pathname.startsWith(s.href)));
  const isOps = pathname.startsWith("/productos/marketplace/operaciones");

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="card grid grid-cols-1 gap-px overflow-hidden bg-line-soft p-0 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <Party who="Empresa inversora" name={lender?.name ?? "Elige un prestamista"} what="Presta su tesorería ociosa" gets={eco ? `${fmtMoney(eco.lenderNet)} netos · ${pct(eco.netYield)} anual` : "obtiene rendimiento por su liquidez"} tone="good" icon="M12 3v18 M5 10l7-7 7 7" />
        <Arrow />
        <Party who="Embat" name="Marketplace de crédito" what="Puntúa, casa, estructura y vigila" gets={eco ? `${fmtMoney(eco.embatFee)} de comisión · 20 % del interés` : "obtiene una comisión por la operación"} tone="accent" icon="M12 2l9 5v10l-9 5-9-5V7l9-5z M12 12l9-5 M12 12v10 M12 12L3 7" center />
        <Arrow />
        <Party who={n > 0 ? `${n} empresas receptoras` : "Empresas receptoras"} name={live ? `${fmtMoney(eco?.amount ?? 0)} financiados` : "Sanas, con necesidad de capital"} what="Reciben financiación a un tipo que refleja su score" gets={eco ? `pagan ${pct(eco.avgRate)} anual · ${fmtMoney(eco.grossInterest)} de interés` : "obtienen financiación"} tone="pos" icon="M12 21V3 M5 14l7 7 7-7" />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {MARKETPLACE_STEPS.map((s, i) => {
          const on = i === stepIdx;
          const done = stepIdx > i;
          return (
            <Link key={s.href} href={s.href} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${on ? "border-line bg-white/[0.045] text-ink" : "border-transparent text-ink-mute hover:text-ink"}`}>
              <span className={`num flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${on ? "bg-ink text-panel" : done ? "bg-good/20 text-good" : "bg-panel-2 text-ink-mute"}`}>{done ? "✓" : s.n}</span>{s.label}
            </Link>
          );
        })}
        <span className="mx-1 h-5 w-px bg-line-soft" />
        <Link href="/productos/marketplace/operaciones" className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium ${isOps ? "border-line bg-white/[0.045] text-ink" : "border-transparent text-ink-mute hover:text-ink"}`}>Operaciones{deals.length > 0 && <span className="num rounded-full bg-panel-2 px-1.5 text-[11px] text-ink-dim">{deals.length}</span>}</Link>
      </div>
    </div>
  );
}

function Party({ who, name, what, gets, tone, icon, center }: { who: string; name: string; what: string; gets: string; tone: "good" | "accent" | "pos"; icon: string; center?: boolean }) {
  const c = tone === "good" ? "text-good" : tone === "pos" ? "text-pos" : "text-ink";
  return (
    <div className={`flex items-start gap-3 bg-panel p-4 ${center ? "md:items-center" : ""}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel-2 ${c}`}><svg viewBox="0 0 24 24" width={18} height={18} fill="none"><path d={icon} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      <div className="min-w-0">
        <div className="text-[12px] text-ink-mute">{who}</div>
        <div className="truncate text-[15px] font-semibold text-ink">{name}</div>
        <div className="text-[12px] text-ink-mute">{what}</div>
        <div className={`mt-1 text-[13px] font-medium ${c}`}>→ {gets}</div>
      </div>
    </div>
  );
}

function Arrow() {
  return <div className="hidden items-center justify-center bg-panel px-2 text-ink-mute md:flex"><svg viewBox="0 0 24 24" width={18} height={18} fill="none"><path d="M4 12h16 M13 5l7 7-7 7 M11 19l-7-7 7-7" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}
