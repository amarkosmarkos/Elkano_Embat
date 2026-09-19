import { ProductSummaryCard } from "@/components/ProductCard";

export default function ProductosPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-3 font-mono text-[11.5px] uppercase tracking-widest text-ink-mute">Producto</div>
      <h1 className="max-w-2xl font-display text-4xl font-extrabold">El score es el motor. Esto es lo que se vende.</h1>
      <p className="mt-4 max-w-2xl text-ink-dim">
        Tres decisiones que hoy se toman a ciegas y que con un score vivo se toman con criterio — sobre el propio
        dataset del reto. El comprador de las tres es el mismo: la empresa que ya le da los datos a Embat.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        <ProductSummaryCard
          num="01 · EXCEDENTES"
          title="Colocación de excedentes"
          desc="Si el score dice que una empresa está sólida y mejorando, el suelo de caja que lleva un año sin bajar puede colocarse a plazo."
          statValue="535 M€"
          statLabel="parados 12 meses en 312 empresas · 13 M€/año al 2,5%"
          href="/productos/excedentes"
        />
        <ProductSummaryCard
          num="02 · CASH POOLING"
          title="Cash pooling automático"
          desc="Dentro de un grupo, la filial con excedente presta y la que necesita pide — el score fija cuánto y a qué tipo, cada día."
          statValue="85 M€"
          statLabel="dispuestos en pólizas que otra filial del grupo podría cubrir"
          href="/productos/cash-pooling"
        />
        <ProductSummaryCard
          num="03 · MONITOR"
          title="Alerta de cuotas + pronto pago"
          desc="Suma cuotas, impuestos y nóminas de los próximos tres meses contra la caja prevista, y recomienda cuándo pagar."
          statValue="163 empresas"
          statLabel="no cubren el próximo trimestre de cuotas con su caja"
          href="/productos/monitor"
        />
      </div>
    </main>
  );
}
