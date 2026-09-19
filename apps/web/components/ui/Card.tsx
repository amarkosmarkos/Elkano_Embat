export function Card({ children, className = "", title, sub, right, hi }: { children: React.ReactNode; className?: string; title?: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; hi?: boolean }) {
  return (
    <section className={`${hi ? "card-hi" : "card"} p-6 ${className}`}>
      {(title || right) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <div className="text-[16px] font-semibold leading-tight text-ink">{title}</div>}
            {sub && <div className="mt-1 text-[14px] text-ink-mute">{sub}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-[14px] text-ink-mute">{children}</div>;
}
