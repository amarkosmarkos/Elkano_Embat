import { getStore } from "@/lib/data/store";
import { Card } from "@/components/ui/Card";
import { BarChart } from "@/components/charts/BarChart";
import { Pill } from "@/components/ui/Pill";

const DESC: Record<string, { name: string; what: string; why: string }> = {
  "v1-scorecard": { name: "v1 · scorecard", what: "Literal de salud.md §H: percentiles → media por dimensión → pesos 0,30 / 0,25 / 0,20 / 0,15 / 0,10 · −5 por alarma · +10 por tendencia · suavizado.", why: "Comprueba que el circuito funciona y fija el Gini a superar. Flojo, pero honesto." },
  "v2-gini": { name: "v2 · ∝ Gini", what: "Fuera las métricas con |Gini| < 0,05 (12 de 24) y una de cada par redundante; pesos proporcionales al Gini univariante; sin penalizaciones.", why: "Fórmula transparente que cualquiera puede leer. Su explicación dice la métrica concreta." },
  "v3-gbm": { name: "v3 · GBM ★", what: "Gradient boosting sobre las 105 columnas + percentiles, un modelo por fold (por grupo) y por horizonte. Cada empresa se puntúa con un modelo que nunca la vio.", why: "Aprende combinaciones («colchón bajo y tendencia negativa» es peor que la suma). Es el que se publica." },
};

export default async function VersionesPage() {
  const store = await getStore();
  const rows = store.comparison;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {rows.map((r) => {
          const d = DESC[r.version];
          const best = r.version === "v3-gbm";
          return (
            <div key={r.version} className={`${best ? "card-hi" : "card"} p-5`}>
              <div className="flex items-center justify-between"><div className="text-[18px] font-semibold text-ink">{d?.name ?? r.version}</div>{best && <Pill tone="accent">publicado</Pill>}</div>
              <p className="mt-2 text-[12.5px] text-ink-dim">{d?.what}</p>
              <p className="mt-1.5 text-[12px] text-ink-mute">{d?.why}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[["h1", r.gini_h1], ["h3", r.gini_h3], ["h6", r.gini_h6]].map(([h, v]) => <div key={h as string} className="rounded-xl bg-panel-2 p-2.5 text-center"><div className="eyebrow">Gini {h}</div><div className="num font-semibold mt-1 text-[20px] text-ink">{(v as number).toFixed(2)}</div></div>)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Poder de ordenación por horizonte" sub="Gini a 1, 3 y 6 meses (out-of-sample por grupo). Debe decaer suavemente: si solo ve lo inminente, constata en vez de anticipar.">
          <BarChart categories={["Gini h1", "Gini h3", "Gini h6", "KS h6", "OOS medio"]} series={rows.map((r, i) => ({ id: r.version, label: DESC[r.version]?.name ?? r.version, color: ["#a1a1a1", "#3b82f6", "#e5e5e5"][i], values: [r.gini_h1, r.gini_h3, r.gini_h6, r.ks_h6, r.oos_mean] }))} yMax={0.6} fmt={(v) => v.toFixed(1)} />
          <div className="mt-2 flex gap-4 text-[11px] text-ink-mute">{rows.map((r, i) => <span key={r.version} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: ["#a1a1a1", "#3b82f6", "#e5e5e5"][i] }} />{DESC[r.version]?.name}</span>)}</div>
        </Card>
        <Card title="Tabla completa" sub="output/03_validation/comparison.md">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="text-left text-[12px] font-medium text-ink-mute"><th className="py-2">versión</th><th className="text-right">h1</th><th className="text-right">h3</th><th className="text-right">h6</th><th className="text-right">h6 nuevos</th><th className="text-right">KS h6</th><th className="text-right">lead</th><th className="text-right">cura</th><th className="text-right">OOS</th><th className="text-right">autocorr</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.version} className="num border-t border-line-soft text-ink-dim"><td className="py-2 text-ink">{r.version}</td><td className="text-right">{r.gini_h1.toFixed(3)}</td><td className="text-right">{r.gini_h3.toFixed(3)}</td><td className="text-right">{r.gini_h6.toFixed(3)}</td><td className="text-right">{r.gini_h6_new.toFixed(3)}</td><td className="text-right">{r.ks_h6.toFixed(3)}</td><td className="text-right">{r.lead_time.toFixed(1)}</td><td className="text-right">{r.gini_cure.toFixed(3)}</td><td className="text-right">{r.oos_mean.toFixed(3)}</td><td className="text-right">{r.autocorr.toFixed(3)}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-3 text-[11.5px] text-ink-mute">«h6 nuevos» = Gini solo sobre empresas sin evento en t: mide anticipar, no constatar. Ahí el techo no está en el score, está en la definición del evento (D1 y D3 son estados que duran meses).</p>
        </Card>
      </div>
    </div>
  );
}
