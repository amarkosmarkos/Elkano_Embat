import Link from "next/link";
import { Card } from "@/components/ui/Card";

const WINDOWS = [
  { t: "Por la caja", n: "2.460 M€", d: "en cuenta corriente, y 535 M€ llevan un año sin moverse en 312 empresas.", href: "/productos/tesoreria", cta: "Colocación de excedentes", color: "#e5e5e5" },
  { t: "Por la deuda", n: "1.900 M€", d: "deben 378 empresas; 163 no cubren las cuotas del próximo trimestre con lo que tienen.", href: "/productos/tesoreria/cuotas", cta: "Alerta de cuotas", color: "#f87171" },
  { t: "Por lo que cobran", n: "88 %", d: "del saldo pendiente de cobro hoy ya está vencido, sobre 3.900 M€ facturados en euros.", href: "/analisis/facturas", cta: "Facturas", color: "#3b82f6" },
  { t: "Por cómo pagan", n: "½", d: "de los euros a proveedores se pagan tarde; 115 empresas han empezado a estirar en seis meses.", href: "/productos/tesoreria/pagos", cta: "Recomendación de pagos", color: "#f59e0b" },
  { t: "Por el banco", n: "283 M€", d: "en comisiones, con diferencias de siete veces entre bancos comparables por el mismo servicio.", href: "/analisis/bancos", cta: "Bancos", color: "#34d399" },
  { t: "Por el grupo", n: "97 de 179", d: "grupos tienen una filial sobrada de caja mientras otra tira de póliza el mismo día.", href: "/productos/cash-pooling", cta: "Cash pooling", color: "#a855f7" },
  { t: "Por los recibos devueltos", n: "×3", d: "las empresas afectadas cada mes se han triplicado en dos años.", href: "/analisis/senal?m=devoluciones", cta: "Señal: devoluciones", color: "#ef4444" },
];

export default function VentanasPage() {
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-[13.5px] text-ink-dim">Se puede mirar el rastro por muchas ventanas, y cada una cuenta una historia distinta. Siete ventanas, siete verdades parciales: ningún financiero puede mirar las siete cada mañana. ¿Y si todo esto cupiera en un solo número? <span className="text-ink-mute">Cifras del pitch, calculadas sobre el dataset del reto.</span></p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {WINDOWS.map((w) => (
          <Link key={w.t} href={w.href} className="card group flex flex-col p-5 transition-transform hover:-translate-y-0.5">
            <div className="eyebrow" style={{ color: w.color }}>{w.t}</div>
            <div className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-ink">{w.n}</div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-dim">{w.d}</p>
            <div className="mt-auto pt-4 text-[11.5px] text-accent opacity-80 group-hover:opacity-100">{w.cta} →</div>
          </Link>
        ))}
        <Link href="/score/arbol" className="card-hi flex flex-col justify-center p-5">
          <div className="eyebrow text-accent">La respuesta</div>
          <div className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-ink">1 número</div>
          <p className="mt-3 text-[12.5px] text-ink-dim">24 métricas, 5 dimensiones, 105 columnas. Un score por empresa y por mes, que se explica.</p>
          <div className="mt-auto pt-4 text-[11.5px] text-accent">Ver el árbol del score →</div>
        </Link>
      </div>
    </div>
  );
}
