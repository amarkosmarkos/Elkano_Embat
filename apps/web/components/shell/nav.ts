export type NavItem = { href: string; label: string; children?: { href: string; label: string }[] };

/** Directorio de pestañas de la plataforma. La barra lateral y las sub-pestañas salen de aquí. */
export const NAV: NavItem[] = [
  {
    href: "/cartera",
    label: "Cartera",
    children: [
      { href: "/cartera/mapa", label: "Mapa" },
      { href: "/cartera/movimientos", label: "Movimientos" },
      { href: "/cartera/bandeja", label: "Bandeja" },
    ],
  },
  { href: "/empresas", label: "Empresas" },
  { href: "/grupos", label: "Grupos" },
  {
    href: "/analisis",
    label: "Análisis",
    children: [
      { href: "/analisis/universo", label: "Universo" },
      { href: "/analisis/ventanas", label: "Ventanas" },
      { href: "/analisis/senal", label: "Señal" },
      { href: "/analisis/dimensiones", label: "Dimensiones" },
      { href: "/analisis/flujos", label: "Flujos" },
      { href: "/analisis/facturas", label: "Facturas" },
      { href: "/analisis/deuda", label: "Deuda" },
      { href: "/analisis/bancos", label: "Bancos" },
      { href: "/analisis/calidad", label: "Calidad" },
    ],
  },
  {
    href: "/productos",
    label: "Productos",
    children: [
      { href: "/productos/marketplace", label: "01 · Marketplace" },
      { href: "/productos/cash-pooling", label: "02 · Cash pooling" },
      { href: "/productos/seguro", label: "03 · Seguro de crédito" },
    ],
  },
];

export const COMPANY_TABS = (id: string) => [
  { href: `/empresas/${id}`, label: "Resumen" },
  { href: `/empresas/${id}/metricas`, label: "Métricas" },
  { href: `/empresas/${id}/alarmas`, label: "Alarmas" },
  { href: `/empresas/${id}/caja`, label: "Caja" },
  { href: `/empresas/${id}/decisiones`, label: "Decisiones" },
];

export const MARKETPLACE_STEPS = [
  { href: "/productos/marketplace", label: "Prestamista", n: 1 },
  { href: "/productos/marketplace/receptores", label: "Receptores", n: 2 },
  { href: "/productos/marketplace/cierre", label: "Cierre", n: 3 },
  { href: "/productos/marketplace/monitor", label: "Monitor y acciones", n: 4 },
];
