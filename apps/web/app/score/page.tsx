const DIMS = [
  { w: "30%", t: "Pago", d: "Retraso a proveedores, % tarde, cobros vencidos, devoluciones — y la alarma más temprana: falta la nómina, la SS o Hacienda." },
  { w: "25%", t: "Liquidez", d: "Colchón de caja, días en negativo, runway y crédito disponible sin usar." },
  { w: "20%", t: "Caja", d: "Neto operativo, tendencia a 3 y 6 meses, volatilidad, crecimiento de cobros." },
  { w: "15%", t: "Deuda", d: "% dispuesto de líneas, servicio de deuda sobre caja, coste financiero, deuda sobre cobros." },
  { w: "10%", t: "Concentración", d: "Peso de los 5 mayores clientes, índice Herfindahl, cartera activa." },
];

const VERSIONS = [
  { name: "v1 · scorecard", desc: "Percentiles → dimensiones → pesos a ojo. El punto de partida.", g1: "0.35", g3: "0.27", g6: "0.25" },
  { name: "v2 · ∝ Gini", desc: "Pesos fijados por lo que cada métrica predice de verdad. Fórmula legible, sin caja negra.", g1: "0.44", g3: "0.37", g6: "0.35" },
  { name: "v3 · GBM ★", desc: "Modelo sobre 105 columnas, out-of-sample por grupo. El que se publica.", g1: "0.55", g3: "0.44", g6: "0.38", best: true },
];

export default function ScorePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-3 font-mono text-[11.5px] uppercase tracking-widest text-ink-mute">Método</div>
      <h1 className="max-w-2xl font-display text-4xl font-extrabold">24 métricas. 5 dimensiones. Un número.</h1>
      <p className="mt-4 max-w-2xl text-ink-dim">
        Cada métrica se convierte en percentil frente al resto de empresas ese mes, se agrupa en cinco dimensiones y
        se combina en un score — penalizado por alarmas de estrés, empujado por la tendencia, suavizado para que un
        mes malo no lo hunda. <span className="text-ink">score = 100 − probabilidad (%) de un evento de impago en los próximos 3–6 meses.</span>
      </p>

      <div className="mt-10 grid grid-cols-1 gap-px border border-line-soft bg-line-soft sm:grid-cols-2 lg:grid-cols-5">
        {DIMS.map((d) => (
          <div key={d.t} className="flex flex-col gap-2 bg-panel p-5">
            <div className="font-mono text-xl text-accent">{d.w}</div>
            <div className="font-display text-base font-bold">{d.t}</div>
            <div className="text-xs leading-relaxed text-ink-dim">{d.d}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-16 font-display text-2xl font-extrabold">Trayectoria, no foto</h2>
      <p className="mt-3 max-w-2xl text-ink-dim">
        Cada métrica lleva además su cambio a 3 y 12 meses, y cuántos meses seguidos lleva empeorando (la racha) —
        72 columnas más. Es lo que separa una empresa que pasa de 45 a 65 puntos de otra que va de 82 a 68: hoy
        pueden valer casi lo mismo, pero van en direcciones opuestas.
      </p>

      <h2 className="mt-16 font-display text-2xl font-extrabold">El evento: qué es &quot;le fue mal&quot;</h2>
      <p className="mt-3 max-w-2xl text-ink-dim">
        Nadie da una lista de empresas que quiebran. Se define con cuatro reglas sobre lo que la empresa debe:
        factura recibida vencida y grande (D1), falta la nómina/SS/impuesto que siempre pagaba (D2), 5+ días del
        mes en descubierto (D3), intereses y comisiones disparados (D4). El evento se mide siempre en los meses
        <em> siguientes</em>, nunca en el mismo mes que la métrica — si no, el número sería trampa.
      </p>

      <h2 className="mt-16 font-display text-2xl font-extrabold">Tres versiones, cada una mejor que la anterior</h2>
      <div className="mt-6 overflow-x-auto rounded-sm border border-line">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-soft font-mono text-[11px] uppercase tracking-wide text-ink-mute">
              <th className="px-4 py-3 text-left font-normal">Versión</th>
              <th className="px-4 py-3 text-left font-normal">Qué es</th>
              <th className="px-4 py-3 text-right font-normal">Gini h1</th>
              <th className="px-4 py-3 text-right font-normal">Gini h3</th>
              <th className="px-4 py-3 text-right font-normal">Gini h6</th>
            </tr>
          </thead>
          <tbody>
            {VERSIONS.map((v) => (
              <tr key={v.name} className={`border-b border-line-soft last:border-none ${v.best ? "bg-panel" : ""}`}>
                <td className="px-4 py-3 font-mono font-semibold text-accent">{v.name}</td>
                <td className="px-4 py-3 text-ink-dim">{v.desc}</td>
                <td className={`px-4 py-3 text-right font-mono ${v.best ? "text-accent" : ""}`}>{v.g1}</td>
                <td className={`px-4 py-3 text-right font-mono ${v.best ? "text-accent" : ""}`}>{v.g3}</td>
                <td className={`px-4 py-3 text-right font-mono ${v.best ? "text-accent" : ""}`}>{v.g6}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-2xl text-xs text-ink-mute">
        Gini: si cojo una empresa que tuvo un evento y otra que no, cuántas veces la primera tenía peor score. 0 =
        moneda al aire · 1 = perfecto · 0,4–0,6 = lo que consigue un banco con datos de pymes. Medido fuera de
        muestra (por grupo, nunca entrena con la empresa que puntúa) y fuera de tiempo (entrena con el pasado,
        prueba con lo último).
      </p>
    </main>
  );
}
