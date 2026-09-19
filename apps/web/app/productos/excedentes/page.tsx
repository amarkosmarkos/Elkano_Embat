export default function ExcedentesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <div className="mb-3 font-mono text-[11.5px] uppercase tracking-widest text-ink-mute">Producto 01</div>
      <h1 className="font-display text-4xl font-extrabold">Colocación de excedentes</h1>
      <p className="mt-6 text-ink-dim">
        Una empresa tiene excedente cuando su caja lleva meses sin bajar de cierto nivel: si nunca ha bajado de
        300.000 € en todo el año, ese dinero podría estar en un depósito a plazo o un fondo monetario ganando
        interés sin que la empresa dejara de pagar nada. Hoy se queda parado. Embat muestra el saldo y la
        previsión de caja, pero no calcula cuánto es seguro inmovilizar, no propone colocarlo y no lo mueve.
      </p>
      <p className="mt-4 text-ink-dim">
        Nuestro producto es el score aplicado a uno mismo. Cuánta liquidez puede arriesgar una empresa depende de
        hacia dónde va: si el score dice que está sólida, estable y mejorando, puede colocar casi todo su suelo de
        caja; si empieza a torcerse, la propuesta se acorta o desaparece antes de que la empresa lo note en el
        banco. El financiero ve importe, plazo y producto, aprueba con un clic, y Embat ordena el traspaso y
        concilia el vencimiento.
      </p>
      <div className="mt-8 rounded-sm border border-line bg-panel p-6">
        <div className="font-mono text-3xl font-semibold text-accent">535 M€ · 312 empresas</div>
        <div className="mt-1 text-sm text-ink-mute">
          llevan 12 meses sin bajar de su suelo de caja (209 de ellas sin ningún producto de inversión) — al 2,5%
          son ~13 M€/año que hoy nadie gana.
        </div>
      </div>
    </main>
  );
}
