export default function MonitorPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Producto 03</div>
      <h1 className="text-4xl font-bold tracking-tight text-ink">Alerta de cuotas + recomendación de pagos</h1>
      <p className="mt-6 text-ink-dim">
        Una empresa con deuda tiene cuotas de préstamos, leasing y pólizas en fechas fijas, más impuestos y
        nóminas también en fechas fijas. Casi nadie las suma y las cruza con la caja prevista de ese mes. El
        monitor suma todo lo que viene en los próximos tres meses, lo compara con la caja prevista y avisa con
        meses de antelación — no espera a que le pregunten.
      </p>
      <p className="mt-4 text-ink-dim">
        Cada mes la empresa también decide cuándo pagar a proveedores. El monitor recomienda la fecha según el
        score: si sobra caja y la tendencia es buena, adelantar y pedir descuento por pronto pago; si falta, pagar
        el último día de plazo y nunca después — estirar el pago a proveedores es la primera señal de deterioro
        que ve un banco, y penaliza al propio score.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
          <div className="font-mono text-2xl font-semibold text-ink">163 empresas</div>
          <div className="mt-1 text-sm text-ink-mute">no cubren el próximo trimestre de cuotas con su caja (121 ni contando líneas sin disponer)</div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
          <div className="font-mono text-2xl font-semibold text-ink">2.300 M€/año</div>
          <div className="mt-1 text-sm text-ink-mute">se pagan 21 días antes de vencimiento sin pedir nada a cambio · 115 empresas ya estirando pagos</div>
        </div>
      </div>
    </main>
  );
}
