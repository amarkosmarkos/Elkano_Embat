/** Mini-serie SVG. Acepta nulls (huecos). `responsive` estira el ancho al contenedor manteniendo `width`/`height` como sistema de coordenadas. */
export function Sparkline({ values, width = 120, height = 32, color = "var(--color-accent-2)", fill = true, min, max, marker, responsive = false }: { values: (number | null)[]; width?: number; height?: number; color?: string; fill?: boolean; min?: number; max?: number; marker?: number; responsive?: boolean }) {
  const vals = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (vals.length < 2) return <svg width={responsive ? "100%" : width} height={height} viewBox={responsive ? `0 0 ${width} ${height}` : undefined} />;
  const lo = min ?? Math.min(...vals);
  const hi = max ?? Math.max(...vals);
  const span = hi - lo || 1;
  const n = values.length;
  const x = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * (width - 2) + 1);
  const y = (v: number) => height - 2 - ((v - lo) / span) * (height - 4);
  let d = "";
  let open = false;
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(v)) { open = false; return; }
    d += `${open ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    open = true;
  });
  const lastIdx = values.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop() ?? 0;
  const lastV = values[lastIdx] as number;
  const area = fill ? `${d.replace(/M/g, "L").replace(/^L/, "M")} L${x(lastIdx).toFixed(1)},${height} L${x(values.findIndex((v) => v != null)).toFixed(1)},${height} Z` : "";
  return (
    <svg width={responsive ? "100%" : width} height={height} viewBox={responsive ? `0 0 ${width} ${height}` : undefined} preserveAspectRatio="none" className="overflow-visible">
      {fill && <path d={area} fill={color} opacity={0.12} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      {marker != null && values[marker] != null && <circle cx={x(marker)} cy={y(values[marker] as number)} r={2.6} fill={color} />}
      {marker == null && <circle cx={x(lastIdx)} cy={y(lastV)} r={2.4} fill={color} />}
    </svg>
  );
}
