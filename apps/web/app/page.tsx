import Link from "next/link";
import StatTile from "@/components/StatTile";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* ---------------------------------------------------------------- hero */}
      <section className="pt-14 pb-16">
        <div className="mb-4 flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-widest text-ink-mute">
          <span className="h-[7px] w-[7px] bg-accent shadow-[0_0_8px_var(--color-accent)]" /> HackSpain 2026 · Reto X-Ray · Embat
        </div>
        <h1 className="max-w-3xl font-display text-5xl font-extrabold leading-[1.02] sm:text-6xl">
          El saldo dice que está bien.
          <br />
          El rastro dice <span className="text-accent">otra cosa</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-dim">
          1.282 empresas, 24 meses de movimientos y facturas, leídas mes a mes por un score de salud financiera
          que se explica — y, encima, tres productos que se venden con él.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/score" className="rounded-sm bg-accent px-5 py-3 font-mono text-sm font-medium text-[#03181f]">
            Cómo calculamos el score →
          </Link>
          <Link href="/productos" className="rounded-sm border border-line px-5 py-3 font-mono text-sm text-ink">
            Ver los productos
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- quiénes somos */}
      <section className="border-t border-line-soft py-14">
        <div className="mb-2 font-mono text-[11.5px] uppercase tracking-widest text-ink-mute">Quiénes somos</div>
        <h2 className="font-display text-3xl font-extrabold">Equipo Elkano</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {["EHxuban11", "amarkosmarkos", "davidprz00", "iamLudok", "nagorelarranaga"].map((user) => (
            <a
              key={user}
              href={`https://github.com/${user}`}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col items-center gap-3 rounded-sm border border-line p-5 text-center transition-colors hover:border-accent"
            >
              <img
                src={`https://github.com/${user}.png`}
                alt={user}
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-full border border-line"
              />
              <span className="font-mono text-xs text-ink-dim group-hover:text-accent">@{user}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- por qué el track */}
      <section className="border-t border-line-soft py-14">
        <div className="mb-2 font-mono text-[11.5px] uppercase tracking-widest text-ink-mute">Por qué X-Ray</div>
        <h2 className="max-w-2xl font-display text-3xl font-extrabold">
          Porque el dinero de una empresa cuenta su historia todos los días, y casi nadie la lee a tiempo.
        </h2>
        <p className="mt-4 max-w-2xl text-ink-dim">
          {/* TODO(equipo): esta es la versión "genérica" — completar con la razón real y personal del equipo,
              no solo la del enunciado. */}
          Embat pide un score que lea el comportamiento financiero de una empresa mes a mes, en las dos
          direcciones, y que se explique — y, encima, un producto que alguien pague. Es un problema de datos real
          (2,6 M movimientos, 900 k facturas), con una respuesta que se puede vender el mismo día: a la propia
          empresa que genera los datos.
        </p>
      </section>

      {/* ---------------------------------------------------------------- dataset strip */}
      <section className="border-t border-line-soft py-10">
        <div className="flex flex-wrap gap-x-2 gap-y-4">
          <StatTile n="1.282" l="empresas activas" />
          <StatTile n="250" l="grupos empresariales" />
          <StatTile n="24" l="meses · sep 2024–sep 2026" />
          <StatTile n="2,56M" l="movimientos bancarios" />
          <StatTile n="898k" l="facturas emitidas y recibidas" />
          <StatTile n="3" l="productos encima del score" />
        </div>
      </section>
    </main>
  );
}
