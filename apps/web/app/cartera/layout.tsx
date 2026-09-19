import PageHeader from "@/components/shell/PageHeader";
import { NAV } from "@/components/shell/nav";

export default function CarteraLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        eyebrow="Cartera · 1.282 empresas"
        title="La red, mes a mes"
        lead="Un punto por empresa. Arrastra el mes y mira quién se mueve: el score en horizontal, la dirección en vertical, el semáforo en color."
        tabs={NAV[0].children}
      />
      {children}
    </>
  );
}
