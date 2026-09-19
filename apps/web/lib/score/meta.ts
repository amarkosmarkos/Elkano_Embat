import type { Dimension, MetricId, StressFlag } from "./types";

export const DIM_LABEL: Record<Dimension, string> = {
  pago: "Pago",
  liquidez: "Liquidez",
  caja: "Caja",
  deuda: "Deuda",
  concentracion: "Concentración",
};

export const DIM_QUESTION: Record<Dimension, string> = {
  pago: "¿Paga y le pagan a tiempo?",
  liquidez: "¿Tiene colchón?",
  caja: "¿Genera caja?",
  deuda: "¿La deuda es proporcional?",
  concentracion: "¿De quién depende?",
};

export const DIM_DESC: Record<Dimension, string> = {
  pago: "Retraso a proveedores, % de pagos tarde, falta de nómina/SS/impuestos, DSO, cobros vencidos, devoluciones.",
  liquidez: "Colchón de caja sobre salidas, runway en meses, días en negativo, crédito sin disponer.",
  caja: "Neto operativo, tendencia a 3 y 6 meses, volatilidad, ratio cobros/pagos, crecimiento interanual.",
  deuda: "% dispuesto de líneas, servicio de deuda sobre caja, coste financiero, deuda sobre cobros.",
  concentracion: "Peso del top-5 de clientes, índice Herfindahl, rating de la cartera, clientes activos.",
};

/** Pesos del scorecard v1 (docs/salud.md §H). En v3 el modelo decide; se enseñan como referencia. */
export const DIM_WEIGHT_V1: Record<Dimension, number> = { pago: 0.3, liquidez: 0.25, caja: 0.2, deuda: 0.15, concentracion: 0.1 };

export type Unit = "days" | "pct" | "x" | "months" | "count" | "ratio" | "index";

export interface MetricMeta {
  code: string;
  label: string;
  short: string;
  unit: Unit;
  higherIsBetter: boolean;
  dim: Dimension;
  desc: string;
  formula: string;
  needs: string;
}

export const METRICS: Record<MetricId, MetricMeta> = {
  retraso_pago: { code: "A1", label: "Retraso de pago propio", short: "Retraso pago", unit: "days", higherIsBetter: false, dim: "pago", desc: "Cuántos días tarde paga a sus proveedores. Más de 15 y subiendo = estrés.", formula: "mediana( payment_date − due_date ) sobre facturas recibidas pagadas en el mes", needs: "facturas recibidas pagadas este mes (ERP)" },
  pct_pago_tarde: { code: "A2", label: "% de pagos fuera de plazo", short: "% pagos tarde", unit: "pct", higherIsBetter: false, dim: "pago", desc: "De lo que pagó este mes, qué parte pagó después del vencimiento.", formula: "nº facturas recibidas con payment_date > due_date / nº pagadas", needs: "facturas recibidas pagadas este mes (ERP)" },
  falta_regular: { code: "A3", label: "Faltan pagos regulares", short: "Falta nómina/SS/tax", unit: "count", higherIsBetter: false, dim: "pago", desc: "Nómina, Seguridad Social o impuestos que no aparecen este mes habiendo aparecido los seis anteriores. La alarma más temprana.", formula: "Σ [ no hay salida de categoría X este mes y sí en los 6 anteriores ], X ∈ {salary, social_security, tax}", needs: "movimientos bancarios categorizados" },
  dso: { code: "A4", label: "DSO · días hasta cobrar", short: "DSO", unit: "days", higherIsBetter: false, dim: "pago", desc: "Cuánto tardan los clientes en pagarle. Un DSO que sube = financia a sus clientes con su caja.", formula: "mediana( payment_date − issuance_date ) sobre facturas emitidas cobradas en el mes", needs: "facturas emitidas cobradas este mes (ERP)" },
  pct_cobro_vencido: { code: "A5", label: "% de cobros vencidos", short: "Cobros vencidos", unit: "x", higherIsBetter: false, dim: "pago", desc: "Importe emitido vencido y sin cobrar a fin de mes sobre lo facturado en 90 días.", formula: "Σ pendiente vencido / Σ emitido últimos 90 días (vencida en t = due_date < t y sin pago ≤ t)", needs: "facturas emitidas en los últimos 90 días" },
  devoluciones: { code: "A6", label: "Devoluciones de recibos", short: "Devoluciones", unit: "count", higherIsBetter: false, dim: "pago", desc: "Recibos girados a clientes que el banco devuelve impagados.", formula: "nº movimientos con category = collection_refund en el mes", needs: "movimientos bancarios" },
  colchon: { code: "B1", label: "Colchón de caja", short: "Colchón", unit: "x", higherIsBetter: true, dim: "liquidez", desc: "En el peor día del mes, cuántos meses de pagos tenía en el banco. < 0 descubierto · < 0,5 justo · > 2 holgado. La métrica que más predice.", formula: "saldo_mínimo_del_mes / salidas_del_mes", needs: "cuenta corriente con movimientos este mes" },
  runway: { code: "B2", label: "Runway", short: "Runway", unit: "months", higherIsBetter: true, dim: "liquidez", desc: "Si quema caja, cuántos meses aguanta al ritmo de los últimos 3. Tope 24.", formula: "saldo_fin_de_mes / media( salidas − entradas, 3 meses ) si salidas > entradas; si no, 24", needs: "saldos y salidas" },
  dias_negativo: { code: "B3", label: "Días en negativo", short: "Días negativo", unit: "days", higherIsBetter: false, dim: "liquidez", desc: "Días del mes con el saldo agregado de cuentas corrientes por debajo de cero.", formula: "nº días del mes con saldo < 0", needs: "saldo diario reconstruido" },
  credito_disponible: { code: "B4", label: "Crédito disponible", short: "Crédito disp.", unit: "x", higherIsBetter: true, dim: "liquidez", desc: "Lo que queda sin usar en líneas, confirming y factoring, en meses de salidas.", formula: "Σ (granted − outstanding) en lineofcredit, confirming, factoring / salidas_del_mes", needs: "líneas revolving (póliza, confirming, factoring)" },
  neto_operativo: { code: "C1", label: "Caja neta operativa", short: "Neto operativo", unit: "x", higherIsBetter: true, dim: "caja", desc: "Entradas menos salidas del mes sin traspasos, deuda, inversiones ni retiradas. Normalizado por salidas medias.", formula: "Σ amount excluyendo {transfer, debt_repayment, investment_*, cash_withdrawal} / salidas medias", needs: "movimientos bancarios este mes" },
  tendencia_3m: { code: "C2", label: "Tendencia a 3 meses", short: "Tendencia 3m", unit: "index", higherIsBetter: true, dim: "caja", desc: "Pendiente de la recta que ajusta la caja neta de los últimos 3 meses.", formula: "pendiente( neto, últimos 3 meses ) / salidas medias", needs: "3 meses de caja neta" },
  tendencia_6m: { code: "C2", label: "Tendencia a 6 meses", short: "Tendencia 6m", unit: "index", higherIsBetter: true, dim: "caja", desc: "Lo mismo a 6 meses: menos sensible a un mes puntual. Bonus de trayectoria en v1.", formula: "pendiente( neto, últimos 6 meses ) / salidas medias", needs: "6 meses de caja neta" },
  volatilidad: { code: "C3", label: "Volatilidad", short: "Volatilidad", unit: "ratio", higherIsBetter: false, dim: "caja", desc: "Cuánto oscila la caja neta mes a mes respecto a su nivel medio.", formula: "desv_típica( neto, 12 meses ) / media( |neto|, 12 meses )", needs: "12 meses de caja neta" },
  ratio_cobros_pagos: { code: "C4", label: "Ratio cobros / pagos", short: "Cobros/pagos", unit: "x", higherIsBetter: true, dim: "caja", desc: "Por cada euro que paga a proveedores y suministros, cuántos cobra de clientes.", formula: "Σ entradas {collection, bulk_collection, pos_settlement} / Σ salidas {payment, bulk_payment, utility}", needs: "cobros y pagos categorizados" },
  crecimiento_cobros: { code: "C5", label: "Crecimiento interanual de cobros", short: "Crec. cobros", unit: "pct", higherIsBetter: true, dim: "caja", desc: "Cobros de este mes frente al mismo mes del año anterior. Quita la estacionalidad.", formula: "cobros_mes / cobros_mismo_mes_año_anterior − 1", needs: "cobros del mismo mes hace un año" },
  pct_dispuesto: { code: "D1", label: "% dispuesto de líneas", short: "% dispuesto", unit: "pct", higherIsBetter: false, dim: "deuda", desc: "Cuánto tiene usado de sus líneas sobre lo concedido. > 90 % = sin margen.", formula: "Σ |outstanding| / Σ |granted| en lineofcredit, confirming, factoring", needs: "líneas revolving" },
  servicio_deuda: { code: "D2", label: "Servicio de la deuda", short: "Servicio deuda", unit: "x", higherIsBetter: false, dim: "deuda", desc: "Cuota mensual estimada sobre la caja neta media de 6 meses. > 1 = la caja no cubre la deuda.", formula: "Σ ( outstanding / periodos_restantes ) + interés mensual, / neto medio 6m", needs: "cuadro de amortización (87 productos en el dataset)" },
  coste_financiero: { code: "D3", label: "Coste financiero", short: "Coste financ.", unit: "pct", higherIsBetter: false, dim: "deuda", desc: "Intereses y comisiones sobre el total de salidas del mes.", formula: "Σ salidas {interest_charge, fee} / salidas_del_mes", needs: "movimientos bancarios este mes" },
  deuda_cobros: { code: "D4", label: "Deuda sobre cobros", short: "Deuda/cobros", unit: "x", higherIsBetter: false, dim: "deuda", desc: "Toda la deuda dispuesta sobre lo cobrado en 12 meses: apalancamiento con caja real.", formula: "Σ |outstanding| / Σ cobros 12 meses", needs: "productos de deuda y 12 meses de cobros" },
  top5_clientes: { code: "E1", label: "Top-5 clientes", short: "Top-5", unit: "pct", higherIsBetter: false, dim: "concentracion", desc: "Qué parte de lo facturado en 12 meses va a sus 5 mayores clientes.", formula: "Σ facturado a los 5 mayores counterparty_id / Σ facturado (12 meses)", needs: "facturas emitidas (ERP)" },
  hhi: { code: "E2", label: "Índice Herfindahl", short: "HHI", unit: "index", higherIsBetter: false, dim: "concentracion", desc: "1 = un solo cliente; < 0,1 = diversificado.", formula: "Σ ( share_i )² por cliente", needs: "facturas emitidas (ERP)" },
  rating_cartera: { code: "E3", label: "Rating de la cartera", short: "Rating cartera", unit: "days", higherIsBetter: false, dim: "concentracion", desc: "Cuánto tarde pagan sus clientes, estimado con todas sus facturas y suavizado hacia la media. La cartera se deteriora antes que la caja.", formula: "Σ ( rating_c × facturado a c ) / Σ facturado; rating_c = ( Σ retrasos + k·retraso_global ) / ( n + k )", needs: "facturas emitidas a contrapartes" },
  clientes_activos: { code: "E4", label: "Clientes activos", short: "Clientes activos", unit: "count", higherIsBetter: true, dim: "concentracion", desc: "Clientes distintos con factura emitida en el mes. Importa la tendencia.", formula: "nº counterparty_id con factura emitida en el mes", needs: "facturas emitidas este mes (ERP)" },
};

export const METRIC_IDS = Object.keys(METRICS) as MetricId[];
export const METRICS_BY_DIM: Record<Dimension, MetricId[]> = {
  pago: ["retraso_pago", "pct_pago_tarde", "falta_regular", "dso", "pct_cobro_vencido", "devoluciones"],
  liquidez: ["colchon", "runway", "dias_negativo", "credito_disponible"],
  caja: ["neto_operativo", "tendencia_3m", "tendencia_6m", "volatilidad", "ratio_cobros_pagos", "crecimiento_cobros"],
  deuda: ["pct_dispuesto", "servicio_deuda", "coste_financiero", "deuda_cobros"],
  concentracion: ["top5_clientes", "hhi", "rating_cartera", "clientes_activos"],
};

export const STRESS: Record<StressFlag, { code: string; label: string; rule: string; why: string }> = {
  S1_descubierto: { code: "S1", label: "Descubierto", rule: "dias_negativo ≥ 5", why: "No es «poca caja», es «no hay caja»." },
  S2_coste_disparado: { code: "S2", label: "Coste financiero disparado", rule: "coste_mes > 3 × mediana_6m y > 2 % de salidas", why: "El banco ya te está cobrando el miedo." },
  S3_falta_regular: { code: "S3", label: "Falta nómina / SS / impuestos", rule: "falta_salary ∨ falta_social_security ∨ falta_tax", why: "Lo último que una empresa deja de pagar." },
  S4_lineas_limite: { code: "S4", label: "Líneas al límite", rule: "dispuesto > 0,9", why: "Ya no queda red." },
  S5_cobros_vencidos: { code: "S5", label: "Cobros vencidos", rule: "pct_vencido > 0,3", why: "Tus clientes te financian al revés." },
  S6_paga_tarde_peor: { code: "S6", label: "Paga tarde y a peor", rule: "retraso > 15 y racha(retraso) ≥ 3", why: "La racha importa más que el nivel." },
  S7_devoluciones: { code: "S7", label: "Devoluciones", rule: "devoluciones > 0 y racha ≥ 2", why: "Una vez es un error; dos, un problema." },
  S8_caja_negativa: { code: "S8", label: "Caja negativa sostenida", rule: "neto < 0 tres meses seguidos", why: "Ya no es un mes malo." },
};

export const EVENT_RULES = [
  { id: "D1", label: "Factura recibida vencida y grande", rule: "due_date ≤ m − 90 días, sin pagar a fin de m, importe ≥ 25 % de las salidas mensuales, < 6 meses de antigüedad", twin: "A1/A2" },
  { id: "D2", label: "Falta nómina / SS / impuestos", rule: "falta el pago de salary, social_security o tax que existía en los 6 meses anteriores", twin: "S3" },
  { id: "D3", label: "Descubierto ≥ 5 días", rule: "saldo checking < 0 durante ≥ 5 días del mes", twin: "S1" },
  { id: "D4", label: "Intereses y comisiones disparados", rule: "interest_charge + fee > 3 × mediana 6m y > 2 % de las salidas", twin: "S2" },
];

export function parseExplanation(e: string | null | undefined): { delta: number; dim: Dimension } | null {
  if (!e) return null;
  const m = /^(subió|bajó) ([\d.]+) pts: (\w+)$/.exec(e.trim());
  if (!m) return null;
  return { delta: Number(m[2]) * (m[1] === "bajó" ? -1 : 1), dim: m[3] as Dimension };
}

export function parseExplanationV2(e: string | null | undefined): { delta: number; metric: MetricId; from: number; to: number } | null {
  if (!e) return null;
  const m = /^(subió|bajó) ([\d.]+) pts: (\w+) ([-\d.]+) → ([-\d.]+)$/.exec(e.trim());
  if (!m) return null;
  return { delta: Number(m[2]) * (m[1] === "bajó" ? -1 : 1), metric: m[3] as MetricId, from: Number(m[4]), to: Number(m[5]) };
}
