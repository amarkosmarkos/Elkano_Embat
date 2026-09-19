import { getStore } from "@/lib/data/store";
import { Card } from "@/components/ui/Card";
import { Calibration } from "@/components/charts/Calibration";

export default async function CalibracionPage() {
  const store = await getStore();
  const rows = store.reports.v3.calibration_h6;
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Card title="Calibración por decil de score" sub="% de empresas-mes con evento de impago en los siguientes 1 / 3 / 6 meses, por decil de score. Da significado al número: score 0–30 ⇒ 91 % de evento a 6 meses.">
        <Calibration rows={rows} />
      </Card>
      <Card title="Tabla" sub="report_v3.json · calibration_h6">
        <table className="w-full text-[12px]">
          <thead><tr className="text-left text-[12px] font-medium text-ink-mute"><th className="py-1.5">decil</th><th>score</th><th className="text-right">n</th><th className="text-right">h1</th><th className="text-right">h3</th><th className="text-right">h6</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.decile} className="num border-t border-line-soft text-ink-dim"><td className="py-1.5 text-ink">D{r.decile}</td><td>{Math.round(r.score_min)}–{Math.round(r.score_max)}</td><td className="text-right">{r.n}</td><td className="text-right">{(r.event_h1 * 100).toFixed(0)} %</td><td className="text-right">{(r.event_h3 * 100).toFixed(0)} %</td><td className="text-right text-ink">{(r.event_h6 * 100).toFixed(0)} %</td></tr>)}</tbody>
        </table>
        <p className="mt-3 text-[11.5px] text-ink-mute">Monótona en los tres horizontes: a menor score, más evento. El decil 1 concentra el riesgo; del 5 al 10 la pendiente se aplana porque el 46 % de los pares tiene evento en 6 meses (D1 y D3 son pegajosos).</p>
      </Card>
    </div>
  );
}
