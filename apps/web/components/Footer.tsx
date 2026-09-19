"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  // el producto de cash-pooling es una app aparte a pantalla completa: sin pie, sin scroll de sitio
  if (pathname?.startsWith("/productos/cash-pooling")) return null;
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 border-t border-line-soft px-4 py-8 text-[11px] tracking-wide text-ink-mute">
      <span>Elkano · X-Ray · Reto Embat · HackSpain 2026</span>
      <span>Datos sintéticos · ninguna fila corresponde a una empresa real</span>
    </footer>
  );
}
