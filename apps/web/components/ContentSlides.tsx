"use client";

import { useState } from "react";
import styles from "./ContentSlides.module.css";

const dimensions = [
  ["Pagos", "¿Cumple con sus pagos?", "Retrasos a proveedores, facturas pagadas tarde y ausencia de pagos habituales."],
  ["Liquidez", "¿Tiene margen para aguantar?", "Colchón de caja, días en descubierto, runway y crédito disponible."],
  ["Caja", "¿Genera caja de forma estable?", "Flujo operativo, evolución de cobros y volatilidad de los movimientos."],
  ["Deuda", "¿Cuánto le pesa financiarse?", "Crédito dispuesto, coste financiero y deuda respecto a los cobros."],
  ["Concentración", "¿De quién depende?", "Peso de sus principales clientes, concentración y comportamiento de su cartera."],
];

export function ScoreSlide() {
  const [active, setActive] = useState(0);
  return <main className={styles.slide}>
    <header><p className={styles.eyebrow}>03 / Cálculo del score</p><h1>Leer la salud de una empresa.<br/><span>Y cómo está cambiando.</span></h1><p className={styles.lead}>Movimientos, facturas, saldos y deuda se convierten en un score mensual de 0 a 100. Cuanto más alto, menor estrés estimado.</p></header>
    <div className={styles.scoreGrid}>
      <section className={styles.panel} aria-label="Dimensiones del score">
        <p className={styles.label}>24 métricas en cinco dimensiones</p>
        <div className={styles.tabs} role="tablist" aria-label="Dimensiones">{dimensions.map(([name],i)=><button key={name} id={`dim-${i}`} role="tab" aria-selected={active===i} aria-controls="dimension-detail" onClick={()=>setActive(i)}>{name}</button>)}</div>
        <div id="dimension-detail" role="tabpanel" aria-labelledby={`dim-${active}`} className={styles.dimension}><h2>{dimensions[active][1]}</h2><p>{dimensions[active][2]}</p></div>
        <div className={styles.trajectory}><span>La trayectoria también cuenta</span><strong>Nivel actual + cambios + rachas</strong><p>Comparamos cambios a 3 y 12 meses y añadimos señales de estrés. El panel reúne 105 variables antes de los percentiles que añade el modelo.</p></div>
      </section>
      <section className={styles.model} aria-label="Modelo y validación">
        <p className={styles.label}>Tres versiones, una misma evaluación</p>
        <div className={styles.version}><span>01</span><div><strong>Reglas financieras</strong><p>Una fórmula fija como referencia.</p></div></div>
        <div className={styles.version}><span>02</span><div><strong>Pesos medidos</strong><p>Más peso a las señales que mejor ordenan el riesgo.</p></div></div>
        <div className={styles.version}><span>03</span><div><strong>Modelo de gradient boosting</strong><p>Combina señales y horizontes de 3 y 6 meses. Suavizamos el resultado mensual.</p></div></div>
        <div className={styles.results}><div><strong>0,54</strong><span>Gini a 1 mes</span></div><div><strong>0,38</strong><span>Gini a 6 meses</span></div><p>Evaluación con grupos empresariales separados. Comprobación temporal adicional a 3 meses.</p></div>
      </section>
    </div>
    <details className={styles.notes}><summary>Qué estamos midiendo y cuáles son los límites</summary><p>No hay etiquetas de quiebra. Construimos eventos de estrés a partir de facturas recibidas muy vencidas, pagos habituales ausentes, descubierto y aumento del coste financiero. El score sirve para ordenar y seguir empresas; no es una probabilidad de impago calibrada a un único plazo. La anticipación mediana medida es de 0 meses: detectar antes nuevos problemas sigue siendo una limitación.</p><p>Fuente: analytics/scorers/v3_gbm.py y output/03_validation/report_v3.md.</p></details>
  </main>;
}

const products = [
  { section:"05", eyebrow:"Producto 01 / Marketplace de crédito", title:"Conectar capital disponible", accent:"con empresas que lo necesitan.", lead:"Una empresa aporta capital. El score ayuda a seleccionar receptores y a repartir la exposición entre empresas y grupos.", question:"¿A quién financiar y cuánto asignar?", steps:[
    ["Elegir prestamista", "Revisar salud, liquidez, estabilidad e historial. El índice de capacidad orienta la selección; no es un saldo disponible en euros."],
    ["Configurar la cartera", "Fijar capital, perfil de riesgo, score mínimo y límites por empresa y grupo."],
    ["Repartir la exposición", "Ordenar candidatos por score, trayectoria y estabilidad. Excluir al prestamista y su grupo y penalizar perfiles demasiado parecidos."],
  ], outcome:"Una cartera propuesta con importes, reserva y concentración visibles.", tags:["Conservador", "Equilibrado", "Crecimiento"], note:"Prototipo de asignación. El importe lo configura el usuario. No se formalizan préstamos ni se mueve dinero.", detail:"La rama del equipo ya contiene selección de prestamistas, receptores y cartera, monitor y centro de acciones. Esta slide explica ese flujo; no ejecuta el motor.", source:"apps/web/lib/products/marketplace/portfolio.ts" },
  { section:"06", eyebrow:"Producto 02 / Cash pooling", title:"Una filial tiene caja.", accent:"Otra está pagando por financiarse.", lead:"Antes de buscar dinero fuera, revisamos si el grupo puede cubrir esa necesidad con su propia liquidez.", question:"¿Qué transferencia tiene sentido para el grupo?", steps:[
    ["Medir el margen", "Usar la caja reconstruida y reservar liquidez para las necesidades de cada filial."],
    ["Aplicar la política", "El score y su trayectoria determinan si una filial está disponible, limitada o necesita revisión. Solo se cruzan saldos en la misma moneda."],
    ["Comparar el ahorro", "Restar al interés bancario evitado el coste de oportunidad y la comisión. Proponer operaciones con ahorro neto positivo."],
  ], outcome:"Cada propuesta explica quién aporta, quién recibe y cuánto ahorra el grupo.", tags:["Disponible", "Limitada", "Revisar"], note:"Tipos, comisiones y reservas son supuestos ajustables. Aprobar una propuesta simula la operación; no ordena una transferencia bancaria.", detail:"El motor del equipo incluye decisiones por propuesta, políticas por filial e historial de impacto. El score se combina con caja real reconstruida, no se usa como sustituto del saldo.", source:"apps/web/lib/cashpool.ts" },

];

export function ProductSlide({number}:{number:number}) {
  if(number===3)return <main className={styles.slide}><header><p className={styles.eyebrow}>07 / Producto 03</p><h1>Seguros de David</h1></header></main>;
  const item=products[number-1];
  return <main className={styles.slide}>
    <header><p className={styles.eyebrow}>{item.section} / {item.eyebrow}</p><h1>{item.title}<br/><span>{item.accent}</span></h1><p className={styles.lead}>{item.lead}</p></header>
    <section className={styles.productBody} aria-label={item.question}>
      <div className={styles.productIntro}><p className={styles.label}>La decisión</p><h2>{item.question}</h2><div className={styles.tags}>{item.tags.map(tag=><span key={tag}>{tag}</span>)}</div></div>
      <ol className={styles.steps}>{item.steps.map(([title,description],i)=><li key={title}><span className={styles.stepNumber}>0{i+1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
    </section>
    <div className={styles.outcome}><span>Resultado</span><p>{item.outcome}</p></div>
    <p className={styles.disclaimer}>{item.note}</p>
    <details className={styles.notes}><summary>Qué está implementado en el prototipo</summary><p>{item.detail}</p><p>Fuente: {item.source} en la rama feat/marketplace-lenders-borrowers.</p></details>
  </main>;
}
