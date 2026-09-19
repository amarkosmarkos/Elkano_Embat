import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { excedente, type Excedente } from "@/lib/products/tesoreria";
import ExcedentesList from "@/components/productos/ExcedentesList";

export default async function ExcedentesPage() {
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const items = store.companies.map((c) => excedente(store, c, idx)).filter((e): e is Excedente => !!e).sort((a, b) => b.amount - a.amount);
  return <ExcedentesList items={items} month={month} />;
}
