/** Donut de proporciones con leyenda. */
export function Donut({ parts, size = 150, thickness = 18, center, centerSub }: { parts: { label: string; value: number; color: string }[]; size?: number; thickness?: number; center?: React.ReactNode; centerSub?: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={thickness} />
          {parts.map((p, i) => {
            const len = (c * p.value) / total;
            const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={thickness} strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-acc} />;
            acc += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[24px] font-semibold leading-none text-ink">{center}</div>
          {centerSub && <div className="mt-1 text-[12px] text-ink-mute">{centerSub}</div>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-[12px]">
        {parts.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            <span className="text-ink-dim">{p.label}</span>
            <span className="num ml-auto pl-4 text-ink">{Math.round((100 * p.value) / total)} %</span>
          </div>
        ))}
      </div>
    </div>
  );
}
