"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MONTH_COOKIE } from "@/lib/data/monthCookie";
import MonthScrubber from "./MonthScrubber";

const PLAY_MS = 900;
const REFRESH_DEBOUNCE_MS = 150;

/**
 * Igual que el scrubber de la página Mapa, pero para páginas que calculan su contenido en el
 * servidor a partir del mes (movimientos, bandeja): al cambiar de mes escribe la cookie global
 * y refresca los server components para que carguen el mes elegido.
 */
export default function MonthScrubberSync({ months, initialIdx }: { months: string[]; initialIdx: number }) {
  const [idx, setIdx] = useState(initialIdx);
  const [playing, setPlaying] = useState(false);
  const router = useRouter();
  const mounted = useRef(false);

  useEffect(() => { setIdx(initialIdx); }, [initialIdx]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => { if (i >= months.length - 1) { setPlaying(false); return i; } return i + 1; }), PLAY_MS);
    return () => clearInterval(t);
  }, [playing, months.length]);

  useEffect(() => {
    document.cookie = `${MONTH_COOKIE}=${months[idx]}; path=/; max-age=31536000; samesite=lax`;
    if (!mounted.current) { mounted.current = true; return; }
    const t = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [idx, months, router]);

  return (
    <MonthScrubber
      months={months}
      idx={idx}
      playing={playing}
      onScrub={(i) => { setPlaying(false); setIdx(i); }}
      onTogglePlay={() => setPlaying((p) => { if (!p && idx >= months.length - 1) setIdx(0); return !p; })}
    />
  );
}
