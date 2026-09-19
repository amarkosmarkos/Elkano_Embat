export const eur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";

/** Los datos sintéticos traen algún importe disparatado sin filtrar (ver pipeline/config.py
 * AMOUNT_OUTLIER_ABS) — cualquier cifra de caja/importe que venga de signals debe pasar por aquí
 * antes de usarse para tamaños, recomendaciones o cálculos, o un solo outlier rompe la página. */
export const sane = (n: number | null | undefined, cap = 5_000_000): number | null => {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.min(Math.max(n, -cap), cap);
};
export const pct = (n: number) => (n * 100).toFixed(0) + "%";
export const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${names[Number(mo) - 1]} ${y.slice(2)}`;
};
