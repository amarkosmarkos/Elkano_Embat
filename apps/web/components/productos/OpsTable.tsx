"use client";

import { useOps, type Op } from "@/lib/ops";
import { Card, Empty } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Pill } from "@/components/ui/Pill";
import { eur } from "@/lib/format";

const KIND: Record<Op["kind"], { label: string; tone: "good" | "accent" | "warn" | "neutral" }> = { colocacion: { label: "Colocación", tone: "good" }, prestamo: { label: "Préstamo interno", tone: "accent" }, aviso: { label: "Aviso resuelto", tone: "warn" }, pago: { label: "Pago", tone: "neutral" } };

export default function OpsTable() {
  const { ops, remove, clear } = useOps();
  const sum = (k: Op["kind"], f: (o: Op) => number) => ops.filter((o) => o.kind === k).reduce((s, o) => s + f(o), 0);
  const colocado = sum("colocacion", (o) => (o.kind === "colocacion" ? o.amount : 0));
  const neteado = sum("prestamo", (o) => (o.kind === "prestamo" ? o.amount : 0));
  const rend = sum("colocacion", (o) => (o.kind === "colocacion" ? o.yieldYear : 0));
  const ahorro = sum("prestamo", (o) => (o.kind === "prestamo" ? o.savingYear : 0));
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Colocado a plazo" value={eur(colocado)} tone="good" sub={`${ops.filter((o) => o.kind === "colocacion").length} colocaciones`} />
        <Kpi label="Neteado en grupo" value={eur(neteado)} tone="accent" sub={`${ops.filter((o) => o.kind === "prestamo").length} préstamos internos`} />
        <Kpi label="Rendimiento / año" value={eur(rend)} sub="al 2,5 %" />
        <Kpi label="Intereses ahorrados / año" value={eur(ahorro)} sub="tipo interno vs banco" />
      </div>
      <Card title={`Libro · ${ops.length} operaciones`} right={<button type="button" onClick={clear} disabled={ops.length === 0} className="rounded-lg border border-line px-3 py-1 text-[11.5px] text-ink-dim hover:text-bad disabled:opacity-30">Vaciar</button>}>
        {ops.length === 0 ? <Empty>Nada ejecutado todavía. Aprueba una colocación, un préstamo interno o resuelve un aviso.</Empty> : (
          <div className="divide-y divide-line-soft">
            {ops.map((o) => (
              <div key={o.id} className="grid grid-cols-[130px_minmax(0,1fr)_130px_130px_60px] items-center gap-3 py-2.5 text-[12.5px]">
                <Pill tone={KIND[o.kind].tone}>{KIND[o.kind].label}</Pill>
                <div className="min-w-0 text-ink">
                  {o.kind === "colocacion" && <>{o.company} · {o.product} a {o.months} meses al {o.rate} %</>}
                  {o.kind === "prestamo" && <>{o.from} → {o.to} · {o.groupId} · tipo interno {o.rate} %</>}
                  {o.kind === "aviso" && <>{o.company} · {o.title}</>}
                  {o.kind === "pago" && <>{o.company} · {o.title}</>}
                </div>
                <span className="num text-right text-ink">{o.kind === "colocacion" || o.kind === "prestamo" || o.kind === "pago" ? eur(o.amount) : ""}</span>
                <span className="num text-right text-[11px] text-ink-mute">{new Date(o.at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <button type="button" onClick={() => remove(o.id)} className="text-right text-[11px] text-ink-mute hover:text-bad">Deshacer</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
