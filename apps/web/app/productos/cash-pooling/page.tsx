import { findCashPoolingCandidateGroup, getGroupLatestScores } from "@/lib/queries";
import { buildProposals } from "@/lib/cashpool";
import { eur } from "@/lib/format";
import CashPoolDemo from "@/components/cashpool/CashPoolDemo";

// TODO(producto): esta página es de Luken. La bandeja del gestor y el mapa de caja son un primer
// borrador funcional sobre un grupo real — a partir de aquí, a por las "ideas locas" del final.
export default async function CashPoolingPage() {
  const candidate = await findCashPoolingCandidateGroup();
  const groupId = candidate?.group_id ?? null;
  const siblings = groupId ? await getGroupLatestScores(groupId) : [];
  const proposals = buildProposals(siblings);
  const totalCash = siblings.reduce((s, x) => s + (x.signals?.cash_position ?? 0), 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Producto 02</div>
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        El grupo ya tiene el dinero. Solo hay que moverlo.
      </h1>
      <p className="mt-5 max-w-2xl text-ink-dim">
        Un grupo empresarial suele tener la caja repartida: una filial acumula excedente mientras otra dispone de
        una póliza de crédito o entra en descubierto, y el grupo acaba pagando intereses al banco por dinero que
        ya tiene. Es literalmente cómo funciona el <b className="text-ink">Fondo Central Intercooperativo de
        Mondragón Corporation</b>: cada cooperativa aporta una parte de su excedente a un fondo común, y las que
        lo necesitan sacan de ahí en vez de pedir a un banco externo. Aquí es lo mismo, pero automático y mes a
        mes en vez de una vez al año — con el score decidiendo cuánto y a qué tipo.
      </p>

      {groupId ? (
        <>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 rounded-2xl border border-line bg-panel px-6 py-4 text-xs text-ink-mute shadow-sm">
            <span>
              grupo de demo: <span className="font-mono text-accent">{groupId}</span>
            </span>
            <span>{siblings.length} filiales</span>
            <span>{eur(totalCash)} de caja conjunta</span>
          </div>

          <div className="mt-8">
            <CashPoolDemo siblings={siblings} proposals={proposals} />
          </div>
        </>
      ) : (
        <p className="mt-8 text-sm text-ink-mute">Sin conexión a Postgres o sin grupos multi-empresa — arranca `docker compose up -d`.</p>
      )}

      {/* --------------------------------------------------------------- ideas locas / backlog */}
      <section className="mt-20 border-t border-line-soft pt-12">
        <div className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Backlog · ideas para llevar esto más lejos</div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Por dónde seguir</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {IDEAS.map((idea) => (
            <div key={idea.t} className="rounded-2xl border border-dashed border-line p-5">
              <div className="text-base font-semibold text-ink">{idea.t}</div>
              <p className="mt-2 text-sm text-ink-dim">{idea.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const IDEAS = [
  {
    t: "Simulador \"qué pasaría si\"",
    d: "Un slider para bajarle 10 puntos al score de una filial y ver en vivo cómo se reduce su límite de pool — momento fuerte de demo: el score no es un informe, es una palanca.",
  },
  {
    t: "Briefing de las 8:00",
    d: "En vez de una bandeja fría, un resumen hablado tipo \"esta noche el sistema ha revisado 22 filiales, 3 necesitan cobertura\" — como un morning brief, pero de tesorería de grupo.",
  },
  {
    t: "Devengo e IVA entre filiales",
    d: "Ledger visible de intereses acumulados por el préstamo interno + el asiento contable que se generaría en cada ERP — la parte aburrida pero es la que hace el producto vendible de verdad.",
  },
  {
    t: "Límite que respira con el score",
    d: "El importe máximo que una filial puede pedir al fondo no es fijo: sube cuando su score mejora dos meses seguidos, baja en cuanto entra en \"deterioro oculto\" — sin esperar a que falle un pago.",
  },
  {
    t: "Modo \"aviso, no pido permiso\"",
    d: "Para transferencias pequeñas y de bajo riesgo (ambas empresas en verde), autoaprobar y solo notificar — el gestor revisa de verdad las que importan, no las 40 triviales.",
  },
  {
    t: "Comparador con banco externo",
    d: "Al lado de cada propuesta, cuánto costaría lo mismo en una póliza bancaria — para que aprobar sea obviamente mejor, no un acto de fe.",
  },
];
