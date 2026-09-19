import { PageHeader } from "@/components/ui";
import { OpsTable } from "@/components/OpsTable";

export default function OperacionesPage() {
  return (
    <>
      <PageHeader
        step={6}
        title="Operaciones ejecutadas"
        subtitle="Colocaciones, movimientos de pooling y avisos resueltos que el tesorero ha aprobado en esta sesión. El registro se guarda en este navegador, no en un servidor."
      />
      <OpsTable />
    </>
  );
}
