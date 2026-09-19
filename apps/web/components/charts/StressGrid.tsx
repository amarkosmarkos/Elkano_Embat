import { STRESS_FLAGS, type StressFlag } from "@/lib/score/types";
import { STRESS } from "@/lib/score/meta";
import { monthLabel } from "@/lib/format";

/** Rejilla alarma × mes: celda encendida cuando la alarma S está activa. Debajo, los eventos D1–D4. */
export function StressGrid({ months, stress, events, marker }: { months: string[]; stress: Record<StressFlag, (0 | 1 | null)[]>; events?: { month: string; D1: number; D2: number; D3: number; D4: number }[]; marker?: string }) {
  const ev = new Map(events?.map((e) => [e.month, e]));
  const cell = (on: boolean | null, key: string, color: string, highlight: boolean) => (
    <div key={key} className={`h-5 rounded-[4px] ${highlight ? "ring-1 ring-accent/60" : ""}`} style={{ background: on ? color : on === null ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)" }} />
  );
  const cols = `160px repeat(${months.length}, minmax(0,1fr))`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid gap-1" style={{ gridTemplateColumns: cols }}>
        <div />
        {months.map((m, i) => <div key={m} className="num truncate text-center text-[9.5px] text-ink-mute">{i % 3 === months.length % 3 ? monthLabel(m) : ""}</div>)}
      </div>
      {STRESS_FLAGS.map((f) => (
        <div key={f} className="grid items-center gap-1" style={{ gridTemplateColumns: cols }}>
          <div className="truncate pr-2 text-[12px] text-ink-dim"><span className="num mr-1.5 text-[10px] text-accent">{STRESS[f].code}</span>{STRESS[f].label}</div>
          {months.map((m, i) => cell(stress[f]?.[i] == null ? null : stress[f][i] === 1, `${f}-${m}`, "#f59e0b", m === marker))}
        </div>
      ))}
      {events && (
        <>
          <div className="mt-2 grid items-center gap-1" style={{ gridTemplateColumns: cols }}>
            <div className="eyebrow">Evento (qué pasó)</div>
            {months.map((m) => <div key={m} />)}
          </div>
          {(["D1", "D2", "D3", "D4"] as const).map((d) => (
            <div key={d} className="grid items-center gap-1" style={{ gridTemplateColumns: cols }}>
              <div className="truncate pr-2 text-[12px] text-ink-dim"><span className="num mr-1.5 text-[10px] text-bad">{d}</span>{d === "D1" ? "Factura vencida 90 d" : d === "D2" ? "Falta nómina / SS / tax" : d === "D3" ? "Descubierto ≥ 5 d" : "Coste financiero disparado"}</div>
              {months.map((m) => { const e = ev.get(m); return cell(e ? e[d] === 1 : null, `${d}-${m}`, "#ef4444", m === marker); })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
