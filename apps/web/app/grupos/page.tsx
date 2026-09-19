import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { groupsAt } from "@/lib/data/portfolio";
import { groupSnapshot } from "@/lib/products/pooling";
import PageHeader from "@/components/shell/PageHeader";
import { Kpi } from "@/components/ui/Kpi";
import { Card } from "@/components/ui/Card";
import { scoreScale } from "@/lib/score/colors";
import { fmtMoney, formatCount, monthLabelLong } from "@/lib/format";

export default async function GruposPage() {
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const groups = groupsAt(store, idx).filter((g) => g.n > 1).sort((a, b) => b.n - a.n || (b.mean ?? 0) - (a.mean ?? 0));
  const snaps = new Map(groups.map((g) => [g.id, groupSnapshot(store, g.id, month)]));
  const withBoth = groups.filter((g) => { const s = snaps.get(g.id); return s && s.totals.surplusEur > 0 && s.totals.deficitEur > 0; });
  const totalSurplus = [...snaps.values()].reduce((s, x) => s + (x?.totals.surplusEur ?? 0), 0);
  const totalDeficit = [...snaps.values()].reduce((s, x) => s + (x?.totals.deficitEur ?? 0), 0);
  const cols = "grid-cols-[130px_60px_minmax(0,1fr)_70px_90px_70px_100px_100px]";
  return (
    <>
      <PageHeader eyebrow={`Grupos · ${monthLabelLong(month)}`} title="Intercompañía" lead="Los grupos con más de una filial: cómo se reparte el score y la caja dentro de cada uno, y dónde una filial sobra mientras otra tira de póliza." />
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Grupos con ≥ 2 filiales" value={formatCount(groups.length)} sub={`${formatCount(groups.reduce((s, g) => s + g.n, 0))} empresas`} />
        <Kpi label="Con sobra y falta a la vez" value={formatCount(withBoth.length)} tone="accent" sub="candidatos a cash pooling" />
        <Kpi label="Prestable dentro de grupo" value={fmtMoney(totalSurplus)} tone="good" sub="suma de filiales con excedente" />
        <Kpi label="Necesidad cubrible" value={fmtMoney(totalDeficit)} tone="warn" sub="suma de filiales en déficit" />
      </div>
      <Card className="p-0">
        <div className={`grid ${cols} gap-3 border-b border-line-soft bg-panel-2/60 px-5 py-2.5 text-[12px] font-medium text-ink-mute`}>
          <span>Grupo</span><span className="text-right">Filiales</span><span>Scores de las filiales</span><span className="text-right">Media</span><span className="text-right">Rango</span><span className="text-right">20 % peor</span><span className="text-right">Prestable</span><span className="text-right">Falta</span>
        </div>
        <div className="divide-y divide-line-soft">
          {groups.map((g) => {
            const s = snaps.get(g.id);
            return (
              <Link key={g.id} href={`/grupos/${g.id}`} className={`grid ${cols} items-center gap-3 px-5 py-2.5 text-[12.5px] transition-colors hover:bg-panel-2`}>
                <span className="num text-ink">{g.id}</span>
                <span className="num text-right text-ink-dim">{g.scored}/{g.n}</span>
                <span className="flex flex-wrap gap-1">{[...g.members].sort((a, b) => b.score - a.score).map((m) => <span key={m.id} className="num rounded-md px-1.5 py-0.5 text-[10.5px] text-panel" style={{ background: scoreScale(m.score) }} title={m.name}>{m.score.toFixed(0)}</span>)}</span>
                <span className="num text-right text-ink">{g.mean == null ? "—" : g.mean.toFixed(0)}</span>
                <span className="num text-right text-ink-mute">{g.min == null ? "—" : `${g.min.toFixed(0)}–${g.max?.toFixed(0)}`}</span>
                <span className={`num text-right ${g.nAlert > 0 ? "text-bad" : "text-ink-mute"}`}>{g.nAlert}</span>
                <span className="num text-right text-good">{s && s.totals.surplusEur > 0 ? fmtMoney(s.totals.surplusEur) : "—"}</span>
                <span className="num text-right text-warn">{s && s.totals.deficitEur > 0 ? fmtMoney(s.totals.deficitEur) : "—"}</span>
              </Link>
            );
          })}
        </div>
      </Card>
    </>
  );
}
