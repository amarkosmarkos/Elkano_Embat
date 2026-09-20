"use client";

import { useState } from "react";
import styles from "./ContentSlides.module.css";
import { PresentationIcon } from "./PresentationIcons";

const gini=[["0,54","1 mes"],["0,44","3 meses"],["0,38","6 meses"]];

export function CelestialScore(){
  const [notes,setNotes]=useState(false);
  return <main className={`${styles.slide} ${styles.sea}`} data-celestial-score>
    <div className={styles.content}>
      <header className={styles.header}>
        <h1>SCORE VALIDADO</h1>
        <p className={styles.subtitle}>Estimamos cómo está una empresa y hacia dónde va.</p>
      </header>

      <div className={styles.flow}>
        <section className={styles.step} aria-label="105 variables estadísticas">
          <p className={styles.figure}>105</p>
          <h2>variables estadísticas</h2>
          <p>Pagos, liquidez y caja. Deuda y concentración. Cambios y rachas de cada métrica.</p>
        </section>
        <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg>
        <section className={styles.step} aria-label="Modelo predictivo a 3 y 6 meses">
          <p className={styles.figure}>3 y 6</p>
          <h2>meses de horizonte</h2>
          <p>Gradient boosting que aprende qué señales preceden al estrés: facturas vencidas, pagos ausentes, descubierto y coste financiero.</p>
        </section>
        <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg>
        <section className={`${styles.step} ${styles.result}`} aria-label="Score de salud financiera de cero a cien">
          <p className={styles.figure}>0 a 100</p>
          <h2>score de salud financiera</h2>
          <p>Cuanto más alto, menor estrés estimado. Una lectura del estado actual y de la tendencia.</p>
        </section>
      </div>

      <section className={styles.validation} aria-label="Resultados de la validación con el índice de Gini">
        <div className={styles.proof}>
          <h2>Comprobado con Gini</h2>
          <p>Con grupos de empresas que el modelo no había visto. 1.282 empresas y 15.803 registros mensuales.</p>
          <button type="button" onClick={()=>setNotes(n=>!n)} aria-expanded={notes}>Método y alcance<PresentationIcon name="right"/></button>
        </div>
        <ul className={styles.results}>{gini.map(([value,horizon])=><li key={horizon}><strong>{value}</strong><span>{horizon}</span></li>)}</ul>
      </section>
    </div>

    {notes&&<aside className={styles.method} aria-label="Método y alcance">
      <button type="button" onClick={()=>setNotes(false)} aria-label="Cerrar método y alcance"><PresentationIcon name="close"/></button>
      <h2>Cómo lo hemos validado</h2>
      <p>Partimos de 24 métricas financieras, 72 cambios y rachas, y 9 señales de estrés. Son 105 variables antes de añadir percentiles. El modelo combina estimaciones a 3 y 6 meses; suavizamos las variaciones de un mes a otro.</p>
      <p>Probamos si el score ordena las empresas según el estrés que aparece después. Para evaluarlo, dejamos fuera del entrenamiento grupos empresariales completos. Los datos son sintéticos. Definimos el estrés con reglas sobre pagos, facturas, descubierto y costes; no disponemos de una lista de quiebras. Gini = 2 × AUC − 1.</p>
      <p>Al combinar dos plazos y suavizar el resultado, el score no equivale a una probabilidad de impago calibrada para un plazo concreto. A seis meses, Gini 0,379 y KS 0,268 quedan por debajo de los mínimos internos. La anticipación mediana publicada es de 0 meses.</p>
      <p>También lo comprobamos en un periodo posterior, a tres meses. Algunos datos de deuda reflejan el saldo de la fecha de extracción; falta verificar qué información estaba disponible en cada mes del pasado. Estas pruebas todavía no bastan para dar por validado su uso financiero en producción.</p>
      <p className={styles.source}>Fuentes: analytics/scorers/v3_gbm.py y output/03_validation/report_v3.md.</p>
    </aside>}
  </main>;
}
