import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import OpsSummary from "@/components/productos/OpsSummary";

const PRODUCTS = [
  { n: "01", href: "/productos/marketplace", title: "Marketplace de crédito", desc: "Empresas con excedente de tesorería financian a empresas sanas con necesidad visible de capital. El score elige a quién, cuánto y con qué diversificación; el monitor vigila la cartera mes a mes y el centro de acciones propone pausar, reducir o aumentar.", stat: "0,54", statLabel: "Gini a 1 mes del score que lo mueve", sub: ["Prestamistas", "Receptores y cofre", "Ficha", "Monitor", "Acciones"] },
  { n: "02", href: "/productos/cash-pooling", title: "Cash pooling automático", desc: "Dentro de un grupo, la filial con excedente presta a la que tira de póliza; el score de la que pide fija el límite y el tipo interno. Cada día se lee la caja de todas, se detecta quién sobra y quién falta y se propone el movimiento concreto.", stat: "85 M€", statLabel: "dispuestos en pólizas que otra filial del grupo podría cubrir", sub: ["Mapa", "Cronología", "Bandeja", "Impacto", "Método"] },
  { n: "03", href: "/productos/tesoreria", title: "Tesorería con criterio", desc: "El score aplicado a uno mismo: cuánto suelo de caja se puede colocar a plazo, si las cuotas del trimestre están cubiertas, y cuándo pagar a cada proveedor. Tres decisiones que hoy se toman a ciegas.", stat: "535 M€", statLabel: "llevan 12 meses parados en 312 empresas · ~13 M€/año al 2,5 %", sub: ["Excedentes", "Cuotas", "Pagos"] },
];

export default function ProductosPage() {
  return (
    <>
      <PageHeader eyebrow="Productos" title="El score es el motor. Esto es lo que se vende." lead="Tres decisiones sobre el mismo número, con el mismo comprador: la empresa que ya le da los datos a Embat. Todo lo que se aprueba en cualquiera de los tres cae en el libro de operaciones." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {PRODUCTS.map((p) => (
          <Link key={p.n} href={p.href} className="card-hi group flex flex-col p-6 transition-transform hover:-translate-y-0.5">
            <div className="text-[12px] font-medium text-ink-mute">PRODUCTO {p.n}</div>
            <div className="mt-2 text-[18px] font-semibold leading-tight text-ink group-hover:text-accent">{p.title}</div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-dim">{p.desc}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">{p.sub.map((s) => <span key={s} className="rounded-lg border border-line-soft px-2.5 py-0.5 text-[11px] text-ink-mute">{s}</span>)}</div>
            <div className="mt-auto border-t border-line-soft pt-4"><div className="num font-semibold text-[26px] text-ink">{p.stat}</div><div className="text-[11.5px] text-ink-mute">{p.statLabel}</div></div>
          </Link>
        ))}
      </div>
      <div className="mt-5"><OpsSummary /></div>
    </>
  );
}
