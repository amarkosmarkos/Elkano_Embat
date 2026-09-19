/** Schema of the JSON produced by etl/build_dataset.py — real pipeline fields only. */

export type Dimension = "pago" | "liquidez" | "caja" | "deuda" | "concentracion";
export const DIMENSIONS: Dimension[] = ["pago", "liquidez", "caja", "deuda", "concentracion"];

export type StressFlag =
  | "S1_descubierto" | "S2_coste_disparado" | "S3_falta_regular" | "S4_lineas_limite"
  | "S5_cobros_vencidos" | "S6_paga_tarde_peor" | "S7_devoluciones" | "S8_caja_negativa";

export type MetricId =
  | "retraso_pago" | "pct_pago_tarde" | "falta_regular" | "dso" | "pct_cobro_vencido" | "devoluciones"
  | "colchon" | "runway" | "dias_negativo" | "credito_disponible"
  | "neto_operativo" | "tendencia_3m" | "tendencia_6m" | "volatilidad" | "ratio_cobros_pagos" | "crecimiento_cobros"
  | "pct_dispuesto" | "servicio_deuda" | "coste_financiero" | "deuda_cobros"
  | "top5_clientes" | "hhi" | "rating_cartera" | "clientes_activos";

export type CardMetricId =
  | "colchon" | "runway" | "dias_negativo" | "neto_operativo" | "tendencia_6m" | "retraso_pago"
  | "pct_pago_tarde" | "dso" | "pct_cobro_vencido" | "pct_dispuesto" | "credito_disponible"
  | "crecimiento_cobros" | "hhi" | "clientes_activos" | "volatilidad" | "deuda_cobros";

export type Components = Record<Dimension, number | null>;

export interface LatestSnapshot {
  month: string;
  score: number;
  scoreRaw: number;
  alert: 0 | 1;
  explanation: string | null;
  explanationV2: string | null;
  components: Components;
  metrics: Record<CardMetricId, number | null>;
  stress: Record<StressFlag, 0 | 1 | null>;
  nStress: number | null;
}

export interface CompanyIndex {
  id: string;
  /** deterministic display alias (dataset is anonymised) */
  name: string;
  group: string | null;
  groupSize: number | null;
  country: string | null;
  currency: string | null;
  erp: string | null;
  firstMonth: string;
  lastMonth: string;
  nScored: number;
  /** aligned to NetworkMeta.months; null = not scored that month */
  scores: (number | null)[];
  alerts: (0 | 1 | null)[];
  stress: (number | null)[];
  components: Record<Dimension, (number | null)[]>;
  latest: LatestSnapshot;
}

export interface NetworkMeta {
  asOf: string;
  months: string[];
  scoreVersion: string;
  generatedAt: string;
  sources: string[];
  nCompanies: number;
  nRows: number;
  dimensions: Dimension[];
  stressFlags: StressFlag[];
  note: string;
}

export interface NetworkData {
  meta: NetworkMeta;
  companies: CompanyIndex[];
}

export interface CompanyDetail {
  id: string;
  months: string[];
  score: number[];
  scoreRaw: number[];
  scoreV2: (number | null)[];
  alert: (0 | 1)[];
  explanation: (string | null)[];
  explanationV2: (string | null)[];
  components: Record<Dimension, (number | null)[]>;
  metrics: Record<MetricId, (number | null)[]>;
  stress: Record<StressFlag, (0 | 1 | null)[]>;
  nStress: (number | null)[];
}
