import Link from "next/link";
import { db } from "@/lib/db/client";
import { companies, scores } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { ScoreChip } from "@/components/ScoreBadge";

async function listWithLastScore(limit: number) {
  const lastMonth = (await db.execute<{ m: string }>(sql`select max(month) as m from scores`))[0]?.m;
  return db
    .select({ companyId: companies.companyId, displayName: companies.displayName, groupId: companies.groupId, score: scores.score, regime: scores.regime })
    .from(companies)
    .leftJoin(scores, sql`${scores.companyId} = ${companies.companyId} and ${scores.month} = ${lastMonth}`)
    .orderBy(desc(scores.score))
    .limit(limit);
}

export default async function EmpresasPage() {
  const rows = await listWithLastScore(60);
  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Explorador</div>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-ink">Empresas</h1>
      <p className="mt-4 max-w-2xl text-ink-dim">
        60 de las 1.282, ordenadas por score del último mes. Entra en cualquiera para ver su trayectoria, su
        explicación y los productos que le recomendaría el sistema.
      </p>
      <div className="mt-8 overflow-hidden rounded-2xl border border-line shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-line-soft bg-panel-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
          <span>Empresa</span>
          <span>Régimen</span>
          <span>Score</span>
        </div>
        <div className="divide-y divide-line-soft bg-panel">
          {rows.map((r) => (
            <Link key={r.companyId} href={`/empresas/${r.companyId}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-panel-2">
              <div>
                <div className="text-sm font-medium text-ink">{r.displayName}</div>
                <div className="font-mono text-[10.5px] text-ink-mute">{r.companyId}{r.groupId ? ` · ${r.groupId}` : ""}</div>
              </div>
              <span className="text-xs text-ink-mute">{r.regime ?? "—"}</span>
              <ScoreChip score={r.score} />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
