import PageHeader from "@/components/shell/PageHeader";
import { NAV } from "@/components/shell/nav";

export default function AnalisisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Análisis de datos" title="Lo que dicen 3,47 millones de filas" lead="El universo del reto por dentro: 1.286 empresas en 250 grupos, 2,56 M de movimientos, 898 k facturas, 8.226 productos, 24 meses. Cada pestaña es una ventana distinta sobre el mismo rastro." tabs={NAV[3].children} />
      {children}
    </>
  );
}
