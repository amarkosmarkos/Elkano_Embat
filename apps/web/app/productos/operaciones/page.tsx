import PageHeader from "@/components/shell/PageHeader";
import { NAV } from "@/components/shell/nav";
import OpsTable from "@/components/productos/OpsTable";

export default function OperacionesPage() {
  return (
    <>
      <PageHeader eyebrow="Productos · libro" title="Operaciones" lead="Todo lo ejecutado en la demo, en los tres productos y en la bandeja del monitor. Vive en este navegador; «Vaciar» lo reinicia antes de grabar." tabs={NAV[5].children} />
      <OpsTable />
    </>
  );
}
