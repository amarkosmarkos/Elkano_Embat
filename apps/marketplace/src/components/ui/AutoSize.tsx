import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/format";

/** Measures its box (driven by the parent layout) and renders children at that exact pixel size. */
export function AutoSize({ children, className }: { children: (width: number, height: number) => ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: Math.floor(el.clientWidth), h: Math.floor(el.clientHeight) });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx("relative h-full w-full min-h-0 min-w-0", className)}>
      <div className="absolute inset-0">{size.w > 10 && size.h > 10 ? children(size.w, size.h) : null}</div>
    </div>
  );
}
