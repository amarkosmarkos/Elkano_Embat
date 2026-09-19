import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { mapPoints } from "@/lib/data/mapa";
import HeatPanel from "@/components/cartera/HeatPanel";

export default async function CalorPage() {
  const store = await getStore();
  const { idx } = await currentMonth(store.months);
  return <HeatPanel months={store.months} idx={idx} points={mapPoints(store)} />;
}
