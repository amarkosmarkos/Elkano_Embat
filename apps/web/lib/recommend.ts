// Motor de recomendación: reglas explícitas, no una caja negra — cada producto dice con qué dato
// concreto se ha activado. "empresa → 2-3 productos recomendados" sale de aquí, no a mano. Todo lo
// que entra aquí es real: score/regime/c_deuda de scores_v3.csv, cash_position reconstruido desde
// balances.csv+transactions.csv (tools/export_cash_position.py) — nada de nombres inventados, las
// "hermanas" de grupo se identifican por company_id.
import { eur, sane } from "./format";

export type ProductId = "excedentes" | "cash-pooling" | "monitor";

export type GroupSibling = { companyId: string; score: number; cashPosition: number | null };

export type RecoInput = {
  score: number | null;
  regime: string | null;
  cashPosition: number | null;
  /** contribución de la dimensión deuda al score este mes (scores.c_deuda) — negativa = pesa en contra. */
  cDeuda: number | null;
  recentAlerts: { severity: string; title: string }[];
  groupSiblings: GroupSibling[]; // ya excluye a la propia empresa
};

export type Recommendation = {
  product: ProductId;
  title: string;
  fit: number; // 0-100, solo para ordenar — no se enseña como "el" número
  reason: string;
  detail?: string;
};

const PRODUCT_TITLE: Record<ProductId, string> = {
  excedentes: "Colocación de excedentes",
  "cash-pooling": "Cash pooling automático",
  monitor: "Monitor de cuotas y pronto pago",
};

export function recommend(input: RecoInput): Recommendation[] {
  const { score, regime, cashPosition, cDeuda, recentAlerts, groupSiblings } = input;
  const out: Recommendation[] = [];

  // ---- 1. Colocación de excedentes: caja alta y score que aguanta -------------------------------
  const cash = sane(cashPosition);
  if (cash !== null && cash > 60_000) {
    const scoreOk = score === null ? 0.5 : Math.min(1, Math.max(0, (score - 50) / 35));
    const fit = Math.round(100 * (0.7 * Math.min(1, cash / 400_000) + 0.3 * scoreOk));
    const safe = Math.round(cash * 0.45); // estimación orientativa: mitad del suelo de caja, redondeado a la baja
    out.push({
      product: "excedentes",
      title: PRODUCT_TITLE.excedentes,
      fit,
      reason: `Caja de ${eur(cash)} — hay margen para inmovilizar parte sin tocar el circulante.`,
      detail: `Estimación orientativa: ~${eur(safe)} colocables a plazo sin bajar del colchón de seguridad.`,
    });
  }

  // ---- 2. Cash pooling: compararse con las hermanas del mismo grupo ----------------------------
  if (groupSiblings.length > 0) {
    const withCash = groupSiblings
      .map((s) => ({ s, cash: sane(s.cashPosition) }))
      .filter((x): x is { s: GroupSibling; cash: number } => x.cash != null);
    if (withCash.length > 0) {
      const sorted = [...withCash].sort((a, b) => b.cash - a.cash);
      const richest = sorted[0];
      const myCash = cash ?? 0;
      const groupMedianScore = median(groupSiblings.map((s) => s.score));
      const scoreGap = score !== null ? groupMedianScore - score : 0;
      const cashGap = richest.cash - myCash;

      if ((score !== null && scoreGap > 12) || (cashGap > 80_000 && myCash < richest.cash * 0.3)) {
        // recibe: va peor que el grupo, o su caja es una fracción pequeña de la de la hermana más solvente
        const fit = Math.round(60 + Math.min(35, scoreGap) + Math.min(15, cashGap / 20_000));
        out.push({
          product: "cash-pooling",
          title: PRODUCT_TITLE["cash-pooling"],
          fit: Math.min(98, fit),
          reason: `${richest.s.companyId}, del mismo grupo, tiene ${eur(richest.cash)} en caja — ${(cashGap / 1000).toFixed(0)}k€ más que esta empresa. El grupo ya tiene el colchón; solo falta moverlo.`,
          detail: "Rol: recibe. El tipo interno lo fija su score frente al del grupo.",
        });
      } else if (myCash > 150_000 && sorted.length > 1) {
        const poorest = sorted[sorted.length - 1];
        const poorestGap = myCash - poorest.cash;
        if (poorestGap > 80_000) {
          const fit = Math.round(50 + Math.min(30, poorestGap / 15_000));
          out.push({
            product: "cash-pooling",
            title: PRODUCT_TITLE["cash-pooling"],
            fit: Math.min(95, fit),
            reason: `${poorest.s.companyId}, del mismo grupo, va ${poorest.s.score < (score ?? 100) ? "peor" : "más justa de caja"} — esta empresa tiene margen para prestarle a tipo interno en vez de que pida a un banco.`,
            detail: "Rol: aporta. El límite que puede prestar lo fija su propio score.",
          });
        }
      }
    }
  }

  // ---- 3. Monitor de cuotas y pronto pago: deterioro, score bajo, alertas o deuda que pesa -------
  const highAlerts = recentAlerts.filter((a) => a.severity === "high");
  const debtDrag = cDeuda !== null && cDeuda < -8 ? Math.abs(cDeuda) : 0;
  if (regime === "deteriorating" || (score !== null && score < 58) || highAlerts.length > 0 || debtDrag > 0) {
    const fit =
      (regime === "deteriorating" ? 35 : 0) +
      (score !== null ? Math.max(0, 45 - score) : 20) +
      highAlerts.length * 12 +
      Math.min(20, debtDrag);
    out.push({
      product: "monitor",
      title: PRODUCT_TITLE.monitor,
      fit: Math.min(97, Math.round(30 + fit)),
      reason:
        highAlerts.length > 0
          ? `${highAlerts.length} alerta(s) activa(s) este trimestre — "${highAlerts[0].title}".`
          : regime === "deteriorating"
            ? "El score lleva varios meses cayendo: conviene ver las cuotas de los próximos 3 meses contra la caja prevista antes de que apriete."
            : debtDrag > 0
              ? `La deuda está restando ${debtDrag.toFixed(1)} pts al score este mes: conviene revisar el servicio de la deuda antes de que apriete.`
              : `Score de ${score} pts: margen justo para encajar impuestos, nóminas y cuotas del trimestre.`,
    });
  }

  // si nada disparó ninguna regla (empresa muy sana y sin grupo), ofrecer excedentes como opción por defecto
  if (out.length === 0) {
    out.push({
      product: "excedentes",
      title: PRODUCT_TITLE.excedentes,
      fit: 40,
      reason: "Sin señales de estrés ni caja ociosa detectada este mes — candidata a revisar en el próximo cierre.",
    });
  }

  return out.sort((a, b) => b.fit - a.fit).slice(0, 3);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
