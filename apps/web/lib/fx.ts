// Tipos de cambio y geografía de referencia para cash-pooling.
//
// ORIGEN DE CADA TIPO (unidades de divisa por 1 EUR):
//   dataset   → mediana de invoices.exchange_rate sobre facturas contabilizadas en EUR (n ≥ 3)
//   peg       → paridad fija por ley/tratado (exacta)
//   reference → aproximación 2026 para divisas sin muestra en el dataset; marcado como tal en UI
//
// cash_position en scores.signals viene en DIVISA LOCAL (el fixture no convirtió a EUR aunque el
// contrato lo decía): TODO lo que compare caja entre filiales pasa por toEur().

export type FxSource = "dataset" | "peg" | "reference";

export type CurrencyInfo = {
  perEur: number;
  source: FxSource;
  country: string; // ISO-2 por defecto para esa divisa (para EUR se usa companies.country si existe)
  name: string;
};

export const FX: Record<string, CurrencyInfo> = {
  EUR: { perEur: 1, source: "peg", country: "ES", name: "euro" },
  USD: { perEur: 1.16, source: "dataset", country: "US", name: "dólar" },
  GBP: { perEur: 0.86, source: "dataset", country: "GB", name: "libra" },
  CHF: { perEur: 0.93, source: "dataset", country: "CH", name: "franco suizo" },
  DKK: { perEur: 7.47, source: "dataset", country: "DK", name: "corona danesa" },
  NOK: { perEur: 11.0, source: "dataset", country: "NO", name: "corona noruega" },
  SEK: { perEur: 11.11, source: "dataset", country: "SE", name: "corona sueca" },
  PLN: { perEur: 4.27, source: "dataset", country: "PL", name: "złoty" },
  CAD: { perEur: 1.58, source: "dataset", country: "CA", name: "dólar canadiense" },
  MXN: { perEur: 21.39, source: "dataset", country: "MX", name: "peso mexicano" },
  BRL: { perEur: 6.05, source: "dataset", country: "BR", name: "real" },
  AED: { perEur: 4.28, source: "dataset", country: "AE", name: "dírham" },
  AUD: { perEur: 1.62, source: "dataset", country: "AU", name: "dólar australiano" },
  CLP: { perEur: 1073, source: "dataset", country: "CL", name: "peso chileno" },
  COP: { perEur: 4348, source: "dataset", country: "CO", name: "peso colombiano" },
  PEN: { perEur: 3.91, source: "dataset", country: "PE", name: "sol" },
  AOA: { perEur: 1073, source: "dataset", country: "AO", name: "kwanza" },
  XOF: { perEur: 655.957, source: "peg", country: "SN", name: "franco CFA" },
  BAM: { perEur: 1.95583, source: "peg", country: "BA", name: "marco bosnio" },
  INR: { perEur: 100, source: "reference", country: "IN", name: "rupia" },
  NZD: { perEur: 1.9, source: "reference", country: "NZ", name: "dólar neozelandés" },
  GHS: { perEur: 17, source: "reference", country: "GH", name: "cedi" },
  ARS: { perEur: 1500, source: "reference", country: "AR", name: "peso argentino" },
};

/** Plaza financiera de referencia por país — donde "vive" la tesorería, no el centroide geométrico. */
export const GEO: Record<string, { lat: number; lon: number; name: string }> = {
  ES: { lat: 40.42, lon: -3.7, name: "España" },
  PT: { lat: 38.72, lon: -9.14, name: "Portugal" },
  FR: { lat: 48.86, lon: 2.35, name: "Francia" },
  DE: { lat: 50.11, lon: 8.68, name: "Alemania" },
  IT: { lat: 45.46, lon: 9.19, name: "Italia" },
  NL: { lat: 52.37, lon: 4.9, name: "Países Bajos" },
  BE: { lat: 50.85, lon: 4.35, name: "Bélgica" },
  AT: { lat: 48.21, lon: 16.37, name: "Austria" },
  GB: { lat: 51.51, lon: -0.13, name: "Reino Unido" },
  CH: { lat: 47.37, lon: 8.54, name: "Suiza" },
  DK: { lat: 55.68, lon: 12.57, name: "Dinamarca" },
  NO: { lat: 59.91, lon: 10.75, name: "Noruega" },
  SE: { lat: 59.33, lon: 18.07, name: "Suecia" },
  PL: { lat: 52.23, lon: 21.01, name: "Polonia" },
  BA: { lat: 43.86, lon: 18.41, name: "Bosnia" },
  US: { lat: 40.71, lon: -74.01, name: "Estados Unidos" },
  CA: { lat: 43.65, lon: -79.38, name: "Canadá" },
  MX: { lat: 19.43, lon: -99.13, name: "México" },
  CO: { lat: 4.71, lon: -74.07, name: "Colombia" },
  PE: { lat: -12.05, lon: -77.04, name: "Perú" },
  BR: { lat: -23.55, lon: -46.63, name: "Brasil" },
  CL: { lat: -33.45, lon: -70.67, name: "Chile" },
  AR: { lat: -34.6, lon: -58.38, name: "Argentina" },
  AE: { lat: 25.2, lon: 55.27, name: "Emiratos" },
  IN: { lat: 19.08, lon: 72.88, name: "India" },
  MY: { lat: 3.14, lon: 101.69, name: "Malasia" },
  AU: { lat: -33.87, lon: 151.21, name: "Australia" },
  NZ: { lat: -36.85, lon: 174.76, name: "Nueva Zelanda" },
  AO: { lat: -8.84, lon: 13.23, name: "Angola" },
  GH: { lat: 5.6, lon: -0.19, name: "Ghana" },
  SN: { lat: 14.69, lon: -17.44, name: "Senegal" },
};

export function toEur(amount: number | null | undefined, currency: string | null | undefined): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  const fx = FX[currency ?? "EUR"];
  if (!fx) return null;
  return amount / fx.perEur;
}

/** País a pintar: el real si lo trae el CSV, si no el de la divisa (para EUR → España, el default del dataset). */
export function resolveCountry(country: string | null | undefined, currency: string | null | undefined): { iso: string; inferred: boolean } {
  if (country && GEO[country]) return { iso: country, inferred: false };
  const iso = FX[currency ?? "EUR"]?.country ?? "ES";
  return { iso, inferred: true };
}

/** Coste de mover dinero entre divisas: spread de mercado orientativo sobre el importe (0 si misma divisa). */
export function fxSpread(from: string, to: string): number {
  if (from === to) return 0;
  const exotic = (c: string) => !["EUR", "USD", "GBP", "CHF", "DKK", "NOK", "SEK", "CAD", "AUD", "NZD"].includes(c);
  if (exotic(from) || exotic(to)) return 0.012; // 1,2 % — divisa emergente/controlada
  return 0.004; // 0,4 % — par G10
}
