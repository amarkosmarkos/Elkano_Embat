"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Window = { key: string; title: string; value: string; detail: string };
type Overview = {
  n_companies: number;
  n_groups: number;
  n_tx: number;
  n_invoices: number;
  months: number;
  windows: Window[];
};

const fmt = new Intl.NumberFormat("es-ES");

/**
 * Intro: el barco de Embat navega el mar de datos. El scroll controla el instante del vídeo.
 * Tramo 0: mar de datos (elkano.html). Tramo 1: el barco avanza y aparecen las siete ventanas.
 * Tramo 2: la isla. El vídeo se detiene y sale la pregunta que lleva al score.
 */
export default function Intro() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [p, setP] = useState(0); // progreso 0..1 del scroll
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/data/overview.json").then((r) => r.json()).then(setOv).catch(() => setOv(null));
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = trackRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const prog = Math.min(1, Math.max(0, -rect.top / total));
        setP(prog);
        const v = videoRef.current;
        if (v && v.duration && !Number.isNaN(v.duration)) {
          // el vídeo cubre el tramo 0.12..0.85 del scroll; antes queda en el primer fotograma, después en el último
          const local = Math.min(1, Math.max(0, (prog - 0.12) / 0.73));
          const t = local * (v.duration - 0.05);
          if (Math.abs(v.currentTime - t) > 0.04) v.currentTime = t;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const windows = ov?.windows ?? [];
  // cada ventana aparece a lo largo del tramo 0.18..0.80
  const visible = (i: number) => p >= 0.18 + (i * 0.62) / Math.max(1, windows.length);
  const seaOpacity = Math.max(0, 1 - p / 0.12);
  const islandOpacity = Math.min(1, Math.max(0, (p - 0.86) / 0.1));

  return (
    <main className="bg-[#04101f] text-white">
      <div ref={trackRef} style={{ height: "900vh" }}>
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* Tramo 0: mar de datos */}
          <iframe
            src="/intro/elkano.html"
            title="Mar de datos"
            className="absolute inset-0 h-full w-full border-0"
            style={{ opacity: seaOpacity, pointerEvents: "none", transition: "opacity .3s" }}
          />

          {/* Tramo 1: el barco */}
          <video
            ref={videoRef}
            src="/video/barco.mp4"
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: 1 - seaOpacity, transition: "opacity .3s" }}
          />

          {/* Cabecera */}
          <div className="absolute left-10 top-8 z-10" style={{ opacity: p < 0.9 ? 1 : 0 }}>
            <div className="text-xs uppercase tracking-[0.3em] text-white/70">HackSpain 2026 · X Ray · Embat</div>
            <div className="mt-1 text-4xl font-semibold" style={{ fontFamily: "Georgia, serif" }}>
              Elkano
            </div>
            <div className="text-sm text-white/80">Un score que lee el rastro del dinero antes de que lo lea nadie.</div>
          </div>

          {/* Tramo 0: presentación */}
          <div
            className="absolute bottom-16 left-10 z-10 max-w-xl"
            style={{ opacity: seaOpacity, transition: "opacity .3s" }}
          >
            <p className="text-lg leading-relaxed text-white/90">
              Nos hemos subido al barco de Embat para navegar este mar:{" "}
              <b>{ov ? fmt.format(ov.n_companies) : "1.286"} empresas</b> en{" "}
              <b>{ov ? fmt.format(ov.n_groups) : "250"} grupos</b>, <b>{ov ? ov.months : 24} meses</b>,{" "}
              <b>{ov ? fmt.format(ov.n_tx) : "2.556.437"} movimientos</b> y{" "}
              <b>{ov ? fmt.format(ov.n_invoices) : "897.894"} facturas</b>. Cada ola es el flujo de caja real de una empresa.
            </p>
            <p className="mt-3 text-sm text-white/60">Baja para navegar ↓</p>
          </div>

          {/* Tramo 1: las siete ventanas */}
          <div className="absolute right-10 top-28 z-10 flex w-[420px] flex-col gap-3">
            {windows.map((w, i) => (
              <div
                key={w.key}
                className="rounded-xl border border-white/15 bg-[#0B1F3A]/80 px-5 py-3 backdrop-blur"
                style={{
                  opacity: visible(i) && islandOpacity < 0.5 ? 1 : 0,
                  transform: visible(i) ? "translateX(0)" : "translateX(40px)",
                  transition: "opacity .5s, transform .5s",
                }}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-xs uppercase tracking-widest text-white/60">{w.title}</div>
                  <div className="text-2xl font-semibold text-emerald-300">{w.value}</div>
                </div>
                <div className="mt-1 text-sm text-white/85">{w.detail}</div>
              </div>
            ))}
          </div>

          {/* Tramo 2: la isla */}
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#04101f]/85 px-10 text-center"
            style={{ opacity: islandOpacity, pointerEvents: islandOpacity > 0.8 ? "auto" : "none", transition: "opacity .4s" }}
          >
            <div className="text-sm uppercase tracking-[0.3em] text-white/60">Nos paramos a pensar</div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              Siete ventanas, siete verdades parciales. Ningún financiero puede mirar las siete cada mañana.
            </h1>
            <p className="mt-6 text-2xl text-emerald-300">¿Y si todo esto cupiera en un solo número?</p>
            <Link
              href="/score"
              className="mt-10 rounded-full bg-emerald-400 px-8 py-3 text-lg font-semibold text-[#04101f] hover:bg-emerald-300"
            >
              Ver el score →
            </Link>
          </div>

          {/* barra de progreso */}
          <div className="absolute bottom-0 left-0 z-30 h-1 bg-emerald-400" style={{ width: `${p * 100}%` }} />
        </div>
      </div>
    </main>
  );
}
