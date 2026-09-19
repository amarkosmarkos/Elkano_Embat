import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { alertsAt } from "@/lib/data/portfolio";
import Bandeja from "@/components/cartera/Bandeja";

export default async function BandejaPage() {
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const alerts = await alertsAt(store, idx);
  return <Bandeja alerts={alerts} month={month} months={store.months} initialIdx={idx} />;
}
