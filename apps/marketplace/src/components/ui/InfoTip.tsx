import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cx } from "@/lib/format";

/** Small ⓘ that shows an explanation on hover. */
export function InfoTip({ children, className, side = "left" }: { children: ReactNode; className?: string; side?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={cx("relative inline-flex", className)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label="Info" className="flex h-5 w-5 items-center justify-center rounded-full border border-line-strong text-muted transition hover:border-accent hover:text-accent"><Info size={11} /></button>
      {open && (
        <div className={cx("absolute top-6 z-30 w-72 rounded-[4px] border border-line-strong bg-[#f4e6c6] p-3 text-left text-[11.5px] leading-snug text-fg shadow-xl", side === "left" ? "right-0" : "left-0")}>
          {children}
        </div>
      )}
    </span>
  );
}
