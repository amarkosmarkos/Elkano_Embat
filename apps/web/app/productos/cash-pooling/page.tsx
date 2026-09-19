import { getGroupSeries, listPoolingGroups } from "@/lib/queries";
import { buildSeries } from "@/lib/cashpool";
import CashPoolApp from "@/components/cashpool/CashPoolApp";

export const dynamic = "force-dynamic"; // depende de ?group=

export const metadata = { title: "Cash pooling · Elkano X-Ray" };

// Página de producto de Luken. Se comporta como una app aparte a pantalla completa (ver
// components/Footer.tsx): toda la lógica de negocio vive en lib/cashpool.ts (motor) y lib/fx.ts
// (divisas); las vistas de decisiones, filiales e historial en CashPoolApp.tsx.
export default async function CashPoolingPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams;
  const groups = await listPoolingGroups();
  const requested = groups.find((g) => g.group_id === group);
  let groupId = requested?.group_id ?? groups[0]?.group_id;
  let data = groupId ? await getGroupSeries(groupId) : { base: [], rows: [] };
  if (!requested) {
    for (const candidate of groups) {
      const candidateData = candidate.group_id === groupId ? data : await getGroupSeries(candidate.group_id);
      if (buildSeries(candidateData.base, candidateData.rows).at(-1)?.proposals.length) {
        groupId = candidate.group_id;
        data = candidateData;
        break;
      }
    }
  }
  const { base, rows } = data;

  if (!groupId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-sm text-ink-mute">Sin conexión a Postgres — arranca `docker compose up -d`.</p>
      </main>
    );
  }

  return <CashPoolApp key={groupId} groupId={groupId} base={base} rows={rows} groups={groups} />;
}
