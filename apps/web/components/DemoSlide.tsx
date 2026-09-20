"use client";

import styles from "./ContentSlides.module.css";
import { demoMedia, loomEmbed, presentation } from "@/lib/presentation";

/** Demo slides are numbered 1, 2, 3 in presentation order. */
export const demoNumber = (route: string) => presentation.map(([r]) => r as string).filter(r => demoMedia[r]).indexOf(route) + 1;

/** Title and background for a demo slide. The recording itself is drawn by DemoPlayers, which persists across slides. */
export function DemoSlide({ route, loom, title }: { route: string; loom: string; title: string }) {
  return <main className={`${styles.slide} ${styles.sea} ${styles.demo}`}>
    <div className={styles.content}>
      <header className={styles.header}><h1><span className={styles.accent}>{demoNumber(route)}</span> {title}</h1></header>
      {!loomEmbed(loom) && <div className={styles.demoMissing}><h2>Falta el vídeo de Loom</h2><p>Pega el enlace en <code>apps/web/lib/presentation.ts</code>, en <code>demoMedia</code>. El modo demo lo mostrará aquí debajo del título.</p></div>}
    </div>
  </main>;
}
