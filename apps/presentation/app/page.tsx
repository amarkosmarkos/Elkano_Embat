import Link from "next/link";
import { getOverview } from "@/lib/data";
import { fmtInt, fmtMonthLong } from "@/lib/format";
import { Kpi, PageHeader } from "@/components/ui";

const WINDOW_ICONS: Record<string, string> = {
  caja: "€",
  cobros: "⇦",
  pagos: "⇨",
  deuda: "%",
  nominas: "§",
  bancos: "▤",
  clientes: "⧉",
};

export default function DatosPage() {
  const o = getOverview();
  return (
    <>
      <PageHeader
        step={1}
        title="Visión de los datos"
        subtitle={`Extractos bancarios y facturas de ${fmtInt(o.n_companies)} empresas conectadas a Embat, ${o.months} meses hasta ${fmtMonthLong(o.month_last)}. Un tesorero sigue su empresa, pero no puede revisar las ${fmtInt(o.n_companies)}.`}
      />

      <div className="grid grid-cols-5 gap-3">
        <Kpi label="Empresas" value={fmtInt(o.n_companies)} hint="con cuentas bancarias conectadas" />
        <Kpi label="Grupos" value={fmtInt(o.n_groups)} hint="empresas con matriz o hermanas" />
        <Kpi label="Movimientos bancarios" value={fmtInt(o.n_tx)} hint="cobros, pagos, cuotas, comisiones" />
        <Kpi label="Facturas" value={fmtInt(o.n_invoices)} hint="emitidas y recibidas, con vencimiento" />
        <Kpi label="Meses" value={fmtInt(o.months)} hint={`hasta ${fmtMonthLong(o.month_last)}`} />
      </div>

      <div className="mt-8 mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-navy">Siete formas de leer los datos</h2>
        <span className="text-[12px] text-ink-2">Cada una muestra una parte de la empresa</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {o.windows.map((w, i) => (
          <div key={w.key} className="card p-4 flex flex-col gap-1 min-h-[132px]">
            <div className="flex items-center justify-between">
              <span className="kicker">{String(i + 1).padStart(2, "0")}, {w.title}</span>
              <span className="w-7 h-7 rounded-full bg-navy-100 text-navy inline-flex items-center justify-center text-[13px] font-bold">{WINDOW_ICONS[w.key] ?? ""}</span>
            </div>
            <div className="text-3xl font-bold text-navy num leading-tight mt-1">{w.value}</div>
            <div className="text-[13px] text-ink-2 leading-snug">{w.detail}</div>
          </div>
        ))}
        <div className="rounded-lg bg-navy text-white p-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">La pregunta</div>
            <p className="text-[17px] font-semibold leading-snug mt-2">
              Siete ventanas, siete verdades parciales. ¿Y si todo esto cupiera en un solo número?
            </p>
          </div>
          <Link href="/score/" className="mt-4 inline-flex items-center justify-center gap-2 bg-white text-navy font-semibold rounded px-4 py-2 text-[13px] hover:bg-navy-100">
            Ver el score <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="kicker">Qué entendemos por problemas de tesorería</div>
          <p className="text-[13px] text-ink-2 mt-1 leading-snug">
            En tesorería tiene una definición concreta: quedarse sin caja, dejar de pagar o que te dejen de pagar. El análisis busca anticipar esas situaciones.
          </p>
        </div>
        <div className="card p-4">
          <div className="kicker">Qué mira un tesorero</div>
          <p className="text-[13px] text-ink-2 mt-1 leading-snug">
            Cinco cosas: genera caja de forma estable, cobra a tiempo, paga a tiempo, tiene colchón y su deuda es proporcional. Más una sexta que sólo vemos nosotros: la concentración.
          </p>
        </div>
        <div className="card p-4">
          <div className="kicker">Qué sale de aquí</div>
          <p className="text-[13px] text-ink-2 mt-1 leading-snug">
            Un score 0-100 por empresa y mes (100 − probabilidad de que le pase algo malo), desglosado en cinco dimensiones y con una frase que lo explica.
          </p>
        </div>
      </div>
    </>
  );
}
