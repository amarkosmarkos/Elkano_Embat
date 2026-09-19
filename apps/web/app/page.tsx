import Link from "next/link";
import StatTile from "@/components/StatTile";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden pt-20 pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "var(--brand-gradient)", opacity: 0.16 }}
        />
        <div className="relative mb-5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">
          <span className="h-[6px] w-[6px] rounded-full bg-[image:var(--brand-gradient)]" /> HackSpain 2026 · Reto X-Ray · Embat
        </div>
        <h1 className="relative max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          El saldo dice que está bien.
          <br />
          El rastro dice{" "}
          <span className="bg-[image:var(--brand-gradient)] bg-clip-text text-transparent">otra cosa</span>.
        </h1>
        <p className="relative mt-6 max-w-2xl text-lg text-ink-dim">
          1.282 empresas, 24 meses de movimientos y facturas, leídas mes a mes por un score de salud financiera
          que se explica — y, encima, tres productos que se venden con él.
        </p>
        <div className="relative mt-9 flex flex-wrap gap-3">
          <Link
            href="/score"
            className="rounded-full bg-[image:var(--brand-gradient)] px-6 py-3 text-[15px] font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Cómo calculamos el score →
          </Link>
          <Link
            href="/productos"
            className="rounded-full border border-line px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-panel-2"
          >
            Ver los productos
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- quiénes somos */}
      <section className="border-t border-line-soft py-16">
        <div className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Quiénes somos</div>
        <h2 className="text-3xl font-bold tracking-tight text-ink">Equipo Elkano</h2>
        <p className="mt-4 max-w-2xl text-ink-dim">
          {/* TODO(equipo): sustituir por la bio real de cada uno — quién sois, qué rol jugáis, y una línea de
              por qué os pega el track (dato/riesgo, producto, o lo que sea real). No inventar aquí. */}
          [Completar: quiénes formáis el equipo — nombre, rol, una línea de por qué encajáis con este reto.]
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["[Nombre 1 — rol]", "[Nombre 2 — rol]", "[Nombre 3 — rol]"].map((placeholder) => (
            <div key={placeholder} className="rounded-2xl border border-dashed border-line p-5 text-sm text-ink-mute">
              {placeholder}
              <div className="mt-2 text-xs">Foto / bio corta / por qué este track</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- por qué el track */}
      <section className="border-t border-line-soft py-16">
        <div className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Por qué X-Ray</div>
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-ink">
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
