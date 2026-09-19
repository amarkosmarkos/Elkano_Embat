import { getStore } from "@/lib/data/store";
import { Card } from "@/components/ui/Card";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { Sparkline } from "@/components/ui/Sparkline";
import { scoreColor } from "@/lib/score/colors";
import { monthLabel } from "@/lib/format";

export default async function CasosPage() {
  const store = await getStore();
  const r = store.reports.v3;
  const List = ({ items, kind }: { items: { company_id: string; month: string; score: number }[]; kind: "fn" | "fp" }) => (
    <div className="flex flex-col divide-y divide-line-soft">
      {items.map((it) => {
        const c = store.byId.get(it.company_id);
        const ev = store.events.get(it.company_id) ?? [];
        const i = store.months.indexOf(it.month);
        const after = ev.filter((e) => e.month > it.month).slice(0, 6);
        const evAfter = after.filter((e) => e.event === 1).length;
        return (
          <div key={it.company_id + it.month} className="grid grid-cols-[minmax(0,1fr)_120px_56px_100px] items-center gap-3 py-2.5 text-[12.5px]">
            <div className="min-w-0">{c ? <CompanyLink id={c.id} name={c.name} /> : <span className="num">{it.company_id}</span>}<div className="text-[10.5px] text-ink-mute">observado en {monthLabel(it.month)}</div></div>
            {c ? <Sparkline values={c.scores} width={120} height={26} color={scoreColor(it.score)} min={0} max={100} marker={i >= 0 ? i : undefined} /> : <span />}
            <span className="num text-right text-[15px] text-ink">{it.score.toFixed(0)}</span>
            <span className={`num text-right text-[11.5px] ${kind === "fn" ? "text-bad" : "text-good"}`}>{kind === "fn" ? `${evAfter}/6 meses con evento` : `${evAfter}/6 meses con evento`}</span>
          </div>
        );
      })}
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card title="Peores falsos negativos" sub="score alto y evento en ≤ 3 meses: ¿qué señal faltó? Cada uno abre su ficha para verlo.">
        <List items={r.worst_false_negatives} kind="fn" />
      </Card>
      <Card title="Peores falsos positivos" sub="score bajo y 12 meses sin evento: ¿qué los salvó?">
        <List items={r.worst_false_positives} kind="fp" />
      </Card>
    </div>
  );
}
