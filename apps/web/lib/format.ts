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
export const monthLabelLong = (m: string) => {
  const [y, mo] = m.split("-");
  const names = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const name = names[Number(mo) - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
};

const scoreFmt = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatScore = (n: number) => scoreFmt.format(n);
export const formatSignedScore = (n: number) => `${n >= 0 ? "+" : "-"}${scoreFmt.format(Math.abs(n))}`;
export const formatCount = (n: number) => new Intl.NumberFormat("es-ES").format(n);
