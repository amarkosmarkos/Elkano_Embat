export type NavItem = { href: string; label: string; children?: { href: string; label: string }[] };

/** Directorio de pestañas de la plataforma. La barra lateral y las sub-pestañas salen de aquí. */
export const NAV: NavItem[] = [
  {
    href: "/cartera",
    label: "Cartera",
    children: [
      { href: "/cartera/mapa", label: "Mapa" },
      { href: "/cartera/movimientos", label: "Movimientos" },
      { href: "/cartera/calor", label: "Calor" },
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
    href: "/score",
    label: "Score",
    children: [
      { href: "/score/arbol", label: "Árbol" },
      { href: "/score/versiones", label: "Versiones" },
      { href: "/score/validacion", label: "Validación" },
      { href: "/score/calibracion", label: "Calibración" },
      { href: "/score/evento", label: "Evento" },
      { href: "/score/casos", label: "Casos" },
    ],
  },
  {
    href: "/productos",
    label: "Productos",
    children: [
      { href: "/productos/marketplace", label: "01 · Marketplace" },
      { href: "/productos/cash-pooling", label: "02 · Cash pooling" },
      { href: "/productos/tesoreria", label: "03 · Tesorería" },
      { href: "/productos/operaciones", label: "Operaciones" },
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

export const TESORERIA_TABS = [
  { href: "/productos/tesoreria", label: "Excedentes" },
  { href: "/productos/tesoreria/cuotas", label: "Cuotas" },
  { href: "/productos/tesoreria/pagos", label: "Pagos" },
];
