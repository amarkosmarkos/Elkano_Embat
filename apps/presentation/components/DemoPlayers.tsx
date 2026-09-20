"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./ContentSlides.module.css";
import { demoMedia, loomEmbed, presentation } from "@/lib/presentation";
import { useDemoMode } from "@/lib/demo-mode";

const order = presentation.map(([route]) => route as string).filter(route => demoMedia[route] && loomEmbed(demoMedia[route].loom));

/** Persistent layer: the recordings load in the background as soon as demo mode is on, one at a time so they do not
 *  starve each other, starting with the current slide. Players survive slide changes, so opening a demo is instant. */
export function DemoPlayers() {
  const [demo] = useDemoMode();
  const path = (usePathname() ?? "").replace(/\/$/, "");
  const [mounted, setMounted] = useState<string[]>([]);
  const active = order.includes(path) ? path : null;

  useEffect(() => { if (!demo) setMounted([]); }, [demo]);
  // The current slide's player is always mounted; the first one otherwise seeds the chain.
  useEffect(() => {
    if (!demo) return;
    const first = active ?? order[0];
    if (first && !mounted.includes(first)) setMounted(m => [...m, first]);
  }, [demo, active, mounted]);

  if (!demo || !mounted.length) return null;
  const loadNext = () => {
    const next = order.find(route => !mounted.includes(route));
    if (next) window.setTimeout(() => setMounted(m => m.includes(next) ? m : [...m, next]), 2500);
  };
  return <div className={styles.demoLayer}>
    {mounted.map(route => {
      const media = demoMedia[route]; const src = loomEmbed(media.loom)!; const isActive = route === active;
      return <iframe key={route} className={`${styles.demoFrame} ${isActive ? "" : styles.demoHidden}`} src={src} title={media.title} onLoad={loadNext}
        allow="fullscreen; picture-in-picture" allowFullScreen aria-hidden={!isActive} tabIndex={isActive ? 0 : -1}/>;
    })}
  </div>;
}
