import { PageHeader } from "@/components/ui";
import { OpsTable } from "@/components/OpsTable";

export default function OperacionesPage() {
  return (
    <>
      <PageHeader
        step={6}
        title="Operaciones ejecutadas"
        subtitle="Todo lo que el tesorero ha aprobado en esta sesión: colocaciones, movimientos de pooling y avisos resueltos. Se guarda en el navegador; no hay backend."
      />
      <OpsTable />
    </>
  );
}
