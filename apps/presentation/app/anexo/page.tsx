import { Fragment } from "react";
import styles from "@/components/ContentSlides.module.css";

const extras: [string, string, string][] = [
  ["10", "Dos empresas", "El dinero de Harbor Foods llega a Atlas Motors a través de Elkano."],
  ["11", "Atlas Motors", "Un mal mes. Recibe de su grupo por cash pooling y de la red por marketplace."],
  ["12", "Harbor Foods", "Sana. Presta a la red y asegura sus cobros."],
];

/** Divider between the pitch and the two worked cases. Everything after it is material for questions. */
export default function Anexo() {
  return <main className={`${styles.slide} ${styles.sea}`}>
    <div className={styles.content}>
      <header className={styles.header}>
        <h1>Anexo</h1>
        <p className={styles.subtitle}>Dos empresas del dataset, con cifras de agosto de 2026 verificadas contra el motor de la plataforma. Para las preguntas.</p>
      </header>
      <div className={styles.flow}>
        {extras.map(([n, name, text], i) => <Fragment key={n}>
          {i > 0 && <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg>}
          <section className={styles.step} aria-label={`${n} ${name}`}>
            <p className={styles.figure}>{n}</p>
            <h2>{name}</h2>
            <p>{text}</p>
          </section>
        </Fragment>)}
      </div>
    </div>
  </main>;
}
