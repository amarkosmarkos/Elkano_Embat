import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { rowsAt } from "@/lib/data/portfolio";
import PageHeader from "@/components/shell/PageHeader";
import CompanyTable from "@/components/empresas/CompanyTable";
import { monthLabelLong } from "@/lib/format";

export default async function EmpresasPage() {
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const rows = rowsAt(store, idx);
  return (
    <>
      <PageHeader eyebrow={`Empresas · ${monthLabelLong(month)}`} title="Explorador" lead="Todas las empresas con score en el mes observado. Filtra por semáforo, régimen, dimensión que manda o alarmas; ordena por cualquier columna; entra en la ficha." />
      <CompanyTable rows={rows} />
    </>
  );
}
