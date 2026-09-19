"use client";

import { useState, type CSSProperties } from "react";
import styles from "./CelestialScore.module.css";

function Ink({text,delay=0}:{text:string;delay?:number}){
  let index=0;
  return <span className={styles.ink} aria-label={text}>{text.split(" ").map((word,i)=><span key={i} className={styles.word} aria-hidden="true">{[...word].map((letter,j)=><span key={j} className={styles.letter} style={{"--delay":`${delay+(index++)*.018}s`} as CSSProperties}>{letter}</span>)}{i<text.split(" ").length-1?"\u00a0":""}</span>)}</span>;
}

export function CelestialScore(){
  const [notes,setNotes]=useState(false);
  return <main className={styles.slide} data-celestial-score>
    <header className={styles.header}>
      <p className={styles.eyebrow}>03 / CÓMO CALCULAMOS EL SCORE</p>
      <h1><Ink text="SCORE VALIDADO"/></h1>
      <p className={styles.subtitle}>Estimamos cómo está una empresa y hacia dónde va.</p>
    </header>
    <div className={styles.process}>
      <section className={styles.input} aria-label="105 variables estadísticas">
        <p className={styles.number}>01 / LOS DATOS</p>
        <h2><strong>105</strong><span>variables estadísticas</span></h2>
        <p className={styles.dimensions}>Pagos, liquidez y caja<br/>Deuda y concentración</p>
      </section>
      <svg className={styles.arrow} viewBox="0 0 70 20" aria-hidden="true"><path d="M1 10 H64 M54 3 L65 10 L54 17" pathLength="1"/></svg>
      <section className={styles.model} aria-label="Modelo predictivo">
        <p className={styles.number}>02 / EL MODELO</p>
        <h2>Modelo predictivo</h2>
        <p className={styles.detail}>Gradient boosting a 3 y 6 meses</p>
      </section>
      <svg className={styles.arrow} viewBox="0 0 70 20" aria-hidden="true"><path d="M1 10 H64 M54 3 L65 10 L54 17" pathLength="1"/></svg>
      <section className={styles.output} aria-label="Score de salud financiera de cero a cien">
        <p className={styles.number}>03 / EL RESULTADO</p>
        <h2><strong>0-100</strong><span>score de salud financiera</span></h2>
        <p className={styles.readings}>Cuanto más alto,<br/>menor estrés estimado.</p>
      </section>
    </div>
    <p className={styles.learning}>Comprobamos si después hubo señales de estrés.</p>
    <section className={styles.validation} aria-label="Resultados de la validación con el índice de Gini">
      <div className={styles.proof}><h2>Comprobado con Gini</h2><p>Con grupos que el modelo no había visto.</p></div>
      <div className={styles.results}>{[["0,54","1 mes"],["0,44","3 meses"],["0,38","6 meses"]].map(([value,horizon])=><div key={horizon}><strong>{value}</strong><span>{horizon}</span></div>)}</div>
    </section>
    <footer className={styles.evidence}><p>1.282 empresas y 15.803 registros mensuales</p><button onClick={()=>setNotes(n=>!n)} aria-expanded={notes}>Método y alcance {notes?"−":"+"}</button></footer>
    {notes&&<aside className={styles.method} aria-label="Método y alcance"><button onClick={()=>setNotes(false)} aria-label="Cerrar método y alcance">×</button><h2>Cómo lo hemos validado</h2><p>Partimos de 24 métricas financieras, 72 cambios y rachas, y 9 señales de estrés. Son 105 variables antes de añadir percentiles. El modelo combina estimaciones a 3 y 6 meses; suavizamos las variaciones de un mes a otro.</p><p>Probamos si el score ordena las empresas según el estrés que aparece después. Para evaluarlo, dejamos fuera del entrenamiento grupos empresariales completos. Los datos son sintéticos. Definimos el estrés con reglas sobre pagos, facturas, descubierto y costes; no disponemos de una lista de quiebras. Gini = 2 × AUC − 1.</p><p>Al combinar dos plazos y suavizar el resultado, el score no equivale a una probabilidad de impago calibrada para un plazo concreto. A seis meses, Gini 0,379 y KS 0,268 quedan por debajo de los mínimos internos. La anticipación mediana publicada es de 0 meses.</p><p>También lo comprobamos en un periodo posterior, a tres meses. Algunos datos de deuda reflejan el saldo de la fecha de extracción; falta verificar qué información estaba disponible en cada mes del pasado. Estas pruebas todavía no bastan para dar por validado su uso financiero en producción.</p><p className={styles.source}>Fuentes: analytics/scorers/v3_gbm.py y output/03_validation/report_v3.md.</p></aside>}
  </main>;
}
