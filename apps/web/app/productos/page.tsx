import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";

const PRODUCTS = [
  { n: "03", href: "/productos/seguro", title: "Seguro de crédito dinámico", desc: "Revisa el riesgo de los clientes asegurados, configura las condiciones de cobertura y explica cómo evoluciona su prima.", stat: "48", statLabel: "empresas en cartera", sub: ["Cartera", "Pólizas", "Informe de prima"] },
  { n: "01", href: "/productos/marketplace", title: "Marketplace de crédito", desc: "Empresas con excedente de tesorería financian a empresas sanas con necesidad visible de capital. El score elige a quién, cuánto y con qué diversificación; el monitor vigila la cartera mes a mes y el centro de acciones propone pausar, reducir o aumentar.", stat: "0,54", statLabel: "Gini a 1 mes del score que lo mueve", sub: ["Prestamistas", "Receptores y cartera", "Monitor", "Acciones"] },
  { n: "02", href: "/productos/cash-pooling", title: "Salud de grupo y cash pooling", desc: "Compara grupos por necesidad de caja, capital movilizable y ahorro neto estimado. Elige uno, revisa su salud y decide cómo redistribuir liquidez entre sus filiales.", stat: "Caja → ahorro", statLabel: "elige un grupo · revisa su salud · decide el plan", sub: ["Grupos", "Salud y caja", "Decisiones", "Historial e impacto"] },
];

export default function ProductosPage() {
  return (
    <>
      <PageHeader eyebrow="Productos" title="El score es el motor. Esto es lo que se vende." lead="Financiación, liquidez entre filiales y seguimiento del riesgo asegurado a partir del mismo score." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {PRODUCTS.toSorted((a,b)=>a.n.localeCompare(b.n)).map((p) => (
          <Link key={p.n} href={p.href} className="card group flex flex-col p-6 transition-colors hover:bg-panel-2">
            <div className="text-[12px] font-medium text-ink-mute">PRODUCTO {p.n}</div>
            <div className="mt-2 text-[20px] font-semibold leading-tight text-ink">{p.title}</div>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-mute">{p.desc}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">{p.sub.map((s) => <span key={s} className="rounded-lg border border-line-soft px-2.5 py-0.5 text-[12px] text-ink-mute">{s}</span>)}</div>
            <div className="mt-auto border-t border-line-soft pt-4"><div className="num text-[24px] font-semibold text-ink">{p.stat}</div><div className="text-[13px] text-ink-mute">{p.statLabel}</div></div>
          </Link>
        ))}
      </div>
    </>
  );
}
