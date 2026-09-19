"use client";

import { useState, type ReactNode } from "react";

/** Tarjeta de decisión con botón «Aprobar» que sólo cambia de estado en local (demo). */
export function DecisionCard({
  kicker,
  title,
  headline,
  children,
  footer,
  disabled,
  emptyText,
}: {
  kicker: string;
  title: string;
  headline?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  disabled?: boolean;
  emptyText?: string;
}) {
  const [approved, setApproved] = useState(false);
  return (
    <section className={`card p-4 flex flex-col gap-3 ${approved ? "border-ok bg-ok-bg/30" : ""}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="kicker">{kicker}</div>
          <h3 className="text-[15px] font-semibold text-ink leading-tight">{title}</h3>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => setApproved((a) => !a)}
            className={`shrink-0 rounded px-3 py-1.5 text-[12px] font-semibold border transition-colors ${
              approved ? "bg-ok text-white border-ok" : "bg-navy text-white border-navy hover:bg-navy-700"
            }`}
          >
            {approved ? "Aprobado ✓" : "Aprobar"}
          </button>
        )}
      </header>
      {disabled ? (
        <p className="text-[13px] text-ink-2">{emptyText ?? "No aplica para esta empresa."}</p>
      ) : (
        <>
          {headline && <div className="text-2xl font-bold text-navy num leading-tight">{headline}</div>}
          {children}
          {footer && <div className="text-[12px] text-ink-2 border-t border-line pt-2">{footer}</div>}
        </>
      )}
    </section>
  );
}
