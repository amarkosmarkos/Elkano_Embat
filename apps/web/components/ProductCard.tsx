import Link from "next/link";
import type { Recommendation } from "@/lib/recommend";

const FIT_COLOR = (fit: number) => (fit >= 70 ? "text-good border-good" : fit >= 45 ? "text-warn border-warn" : "text-ink-mute border-line");

/** Tarjeta de producto recomendado para una empresa concreta — usa la razón que da el motor de reglas. */
export function RecommendationCard({ r }: { r: Recommendation }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-lg font-semibold tracking-tight text-ink">{r.title}</h4>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${FIT_COLOR(r.fit)}`}>encaje {r.fit}</span>
      </div>
      <p className="text-sm text-ink-dim">{r.reason}</p>
    </div>
  );
}

export function ProductSummaryCard({
  num,
  title,
  desc,
  statValue,
  statLabel,
  href,
}: {
  num: string;
  title: string;
  desc: string;
  statValue: string;
  statLabel: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-line bg-panel p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="font-mono text-[11px] font-medium tracking-wide text-accent">{num}</div>
      <h3 className="text-xl font-semibold tracking-tight text-ink group-hover:text-accent">{title}</h3>
      <p className="text-sm text-ink-dim">{desc}</p>
      <div className="mt-auto border-t border-line-soft pt-3">
        <div className="font-mono text-xl font-semibold text-ink">{statValue}</div>
        <div className="text-[11px] text-ink-mute">{statLabel}</div>
      </div>
    </Link>
  );
}
