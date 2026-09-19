import { getGroupSeries, listPoolingGroups } from "@/lib/queries";
import CashPoolApp from "@/components/cashpool/CashPoolApp";

export const dynamic = "force-dynamic"; // depende de ?group=

export const metadata = { title: "Cash pooling automático · Elkano X-Ray" };

// Página de producto de Luken. Se comporta como una app aparte a pantalla completa (ver
// components/Footer.tsx): toda la lógica de negocio vive en lib/cashpool.ts (motor) y lib/fx.ts
// (divisas); las cinco pantallas (mapa, cronología, bandeja, impacto, método) en CashPoolApp.tsx.
export default async function CashPoolingPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams;
  const groups = await listPoolingGroups();
  const groupId = group && groups.some((g) => g.group_id === group) ? group : groups[0]?.group_id;
  const { base, rows } = groupId ? await getGroupSeries(groupId) : { base: [], rows: [] };

  if (!groupId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-sm text-ink-mute">Sin conexión a Postgres — arranca `docker compose up -d`.</p>
      </main>
    );
  }

  return <CashPoolApp groupId={groupId} base={base} rows={rows} groups={groups} />;
}
