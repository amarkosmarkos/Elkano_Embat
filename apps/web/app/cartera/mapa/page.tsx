import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { kpisSeries } from "@/lib/data/portfolio";
import { mapPoints } from "@/lib/data/mapa";
import CarteraMapa from "@/components/cartera/CarteraMapa";

export default async function MapaPage() {
  const store = await getStore();
  const { idx } = await currentMonth(store.months);
  return <CarteraMapa months={store.months} initialIdx={idx} kpis={kpisSeries(store)} points={mapPoints(store)} />;
}
