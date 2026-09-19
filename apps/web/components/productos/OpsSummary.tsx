"use client";

import Link from "next/link";
import { useOps } from "@/lib/ops";
import { Card } from "@/components/ui/Card";
import { eur } from "@/lib/format";

export default function OpsSummary() {
  const { ops } = useOps();
  const colocado = ops.filter((o) => o.kind === "colocacion").reduce((s, o) => s + (o.kind === "colocacion" ? o.amount : 0), 0);
  const neteado = ops.filter((o) => o.kind === "prestamo").reduce((s, o) => s + (o.kind === "prestamo" ? o.amount : 0), 0);
  const rend = ops.reduce((s, o) => s + (o.kind === "colocacion" ? o.yieldYear : o.kind === "prestamo" ? o.savingYear : 0), 0);
  return (
    <Card title="Operaciones ejecutadas en esta demo" right={<Link href="/productos/operaciones" className="text-[11.5px] text-accent hover:underline">Ver el libro →</Link>}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Operaciones", String(ops.length)], ["Colocado a plazo", eur(colocado)], ["Neteado en grupo", eur(neteado)], ["Rendimiento + ahorro / año", eur(rend)]].map(([l, v]) => <div key={l} className="rounded-xl bg-panel-2 p-3.5"><div className="eyebrow">{l}</div><div className="num font-semibold mt-1 text-[20px] text-ink">{v}</div></div>)}
      </div>
    </Card>
  );
}
