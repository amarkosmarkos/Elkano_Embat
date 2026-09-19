import PageHeader from "@/components/shell/PageHeader";
import { TESORERIA_TABS } from "@/components/shell/nav";

export default function TesoreriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Producto 03 · Tesorería" title="El score aplicado a uno mismo" lead="Cuánta liquidez puede arriesgar una empresa depende de hacia dónde va. Si el score dice sólida y mejorando, coloca casi todo su suelo; si se tuerce, la propuesta se acorta antes de que lo note en el banco. Lo mismo para las cuotas y para cuándo pagar." tabs={TESORERIA_TABS} />
      {children}
    </>
  );
}
