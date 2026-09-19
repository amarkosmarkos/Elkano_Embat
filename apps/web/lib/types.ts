export type Tier = "verde" | "ambar" | "rojo";
export type Trend = "mejora" | "empeora" | "estable";
export type Severity = "alta" | "media" | "baja";

export type Contrib = {
  pago: number;
  liquidez: number;
  caja: number;
  deuda: number;
  concentracion: number;
};
export const DIMS: (keyof Contrib)[] = ["pago", "liquidez", "caja", "deuda", "concentracion"];
export const DIM_LABEL: Record<keyof Contrib, string> = {
  pago: "Pago",
  liquidez: "Liquidez",
  caja: "Caja",
  deuda: "Deuda",
  concentracion: "Concentración",
};

export type Window = { key: string; title: string; value: string; detail: string };

export type Overview = {
  month_last: string;
  n_companies: number;
  n_groups: number;
  n_tx: number;
  n_invoices: number;
  months: number;
  windows: Window[];
  score_hist: { bucket: string; n: number }[];
  counts: {
    verde: number;
    ambar: number;
    rojo: number;
    mejorando: number;
    empeorando: number;
    alertas: number;
  };
};

export type CompanySummary = {
  id: string;
  group_id: string | null;
  group_size: number;
  country: string;
  currency: string;
  score: number;
  score_3m: number;
  score_6m: number;
  delta3: number;
  delta6: number;
  tier: Tier;
  trend: Trend;
  alert: 0 | 1;
  explanation: string;
  c: Contrib;
  cash: number;
  has_debt: boolean;
  first_month: string;
};

export type MonthRow = {
  m: string;
  score: number;
  c: Contrib;
  alert: 0 | 1;
  explanation: string;
  inflow: number;
  outflow: number;
  net: number;
  balance_eom: number;
  balance_min: number;
  dpo: number;
  dso: number;
  overdue_share: number;
  retraso_pago: number;
  devoluciones: number;
  servicio_deuda: number;
  runway: number;
};

export type EventRow = {
  m: string;
  event: 0 | 1;
  D1: 0 | 1;
  D2: 0 | 1;
  D3: 0 | 1;
  D4: 0 | 1;
  cure: 0 | 1;
};

export type Anticipation = {
  first_alert_month: string;
  first_event_month: string;
  lead_months: number;
};

export type CreditLine = { bank: string; granted: number; drawn: number };

export type Products = {
  n_bank: number;
  n_debt: number;
  banks: string[];
  has_investment: boolean;
  credit_lines: CreditLine[];
};

export type ExcedentesCard = {
  floor6: number;
  floor12: number;
  proposal: number;
  horizon_months: number;
  yield_yearly: number;
  rate: number;
  reason: string;
};

export type PoolingMember = { id: string; score: number; cash: number; drawn: number };
export type PoolingProposal = {
  from: string;
  to: string;
  amount: number;
  limit: number;
  rate_internal: number;
  reason: string;
};
export type PoolingCard = {
  group_id: string;
  members: PoolingMember[];
  proposals: PoolingProposal[];
  saving_yearly: number;
};

export type AlertCard = {
  type: string;
  severity: Severity;
  month: string;
  title: string;
  text: string;
  months_ahead: number;
};

export type CompanyDetail = {
  id: string;
  group_id: string | null;
  group_size: number;
  country: string;
  currency: string;
  months: MonthRow[];
  events: EventRow[];
  anticipation: Anticipation | null;
  explanation_v2: string;
  products: Products;
  cards: {
    excedentes: ExcedentesCard | null;
    pooling: PoolingCard | null;
    alertas: AlertCard[];
  };
};

export type Group = {
  id: string;
  size: number;
  members: string[];
  surplus: number;
  drawn: number;
  overdraft: number;
  nettable: number;
  pooling: boolean;
};
