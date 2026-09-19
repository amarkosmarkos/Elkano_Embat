/** Accesores tipados sobre eda/eda_data.json (resultados agregados del EDA, ~70 bloques). */
export type KN = { k: string | number; n: number; o?: number };

export interface Eda {
  generated_at: string;
  snapshot: string;
  meta: { rows: Record<string, number> };
  companies: { group_size_hist: { n: number; groups: number }[]; currency: KN[]; country_norm: KN[]; erp: KN[]; onboarding_cum: { k: string; cum: number }[]; coverage: KN[]; coverage_combo: KN[]; multicurrency_groups: number };
  products: { banking_type: KN[]; banking_bank_top: KN[]; banking_bank_distinct: number; debt_type: { k: string; n: number; granted: number; outstanding: number; companies: number }[]; debt_bank_top: { k: string; n: number; outstanding: number }[]; debt_util_hist: KN[]; debt_outstanding_hist: KN[]; debt_company_top: { k: string; n: number; outstanding: number }[] };
  balances: { by_type: { k: string; family: string; n: number; total: number; med: number; neg_share: number }[]; hist: KN[]; currency_share: { k: string; n: number; total: number }[]; concentration: number[]; outliers: { product_id: string; company_id: string; type: string; balance: number }[] };
  transactions: { monthly: { k: string; n: number; inflow: number; outflow: number; net: number; companies: number }[]; weekday: { k: number; n: number; vol: number }[]; dom: { k: number; n: number; inflow: number; outflow: number }[]; category: { k: string; n: number; net: number; vol: number; in_share: number; med: number }[]; uncategorized_monthly: { k: string; share: number }[]; outliers_top: { company_id: string; date: string; amount: number; category: string }[]; placeholders: KN[]; round_amounts: number; fx_share: number; cp_coverage: { id: number; desc: number; either: number; distinct_id: number }; desc_distinct: number; per_company_hist: KN[] };
  invoices: { monthly: { k: string; n: number; receivable: number; payable: number; companies: number }[]; status: { k: string; n: number; vol: number }[]; document_type: { k: string; n: number; vol: number }[]; terms: KN[]; late_payment: KN[]; on_time_share: number; overdue_aging: { k: string; n: number; pending: number; o: number }[]; overdue_monthly: { k: string; overdue_share: number; paid_share: number }[]; dates_out_of_range: Record<string, number>; currency: KN[]; outliers_n: number; cp_concentration: number[] };
  cross: { cp_overlap: number[]; match: number[]; match_sign: number; match_lag: { k: string; cobrar: number; pagar: number }[] };
  debt_schedule: { interest_type: KN[]; frequency: KN[]; rate_hist: { k: number; n: number }[]; periods_hist: KN[]; remaining: KN[]; next_payment: KN[]; next_payment_past: number; settlement_orphan: number };
  quality: Record<string, number>;
}

export const eda = (o: Record<string, unknown>) => o as unknown as Eda;
