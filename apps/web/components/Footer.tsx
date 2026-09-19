"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  // el producto de cash-pooling es una app aparte a pantalla completa: sin pie, sin scroll de sitio
  if (pathname?.startsWith("/productos/cash-pooling")) return null;
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-8 font-mono text-[11px] text-ink-mute">
      <span>ELKANO · X-RAY · RETO EMBAT · HACKSPAIN 2026</span>
      <span>DATOS SINTÉTICOS · NINGUNA FILA CORRESPONDE A UNA EMPRESA REAL</span>
    </footer>
  );
}
