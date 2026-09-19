import PageHeader from "@/components/shell/PageHeader";
import { NAV } from "@/components/shell/nav";

export default function ScoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Score · v3 GBM" title="El score, trazado" lead={<>Un número de 0 a 100 que se lee literal: <span className="text-ink">score = 100 − probabilidad (%) de un evento de impago en los próximos 3–6 meses</span>. Aquí se abre entero: de dónde sale, contra qué se valida y dónde falla.</>} tabs={NAV[4].children} />
      {children}
    </>
  );
}
