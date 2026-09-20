"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import styles from "./ContentSlides.module.css";
import { PresentationIcon } from "./PresentationIcons";
import { CompanyBoat } from "./CompanyBoat";
import { DemoSlide } from "./DemoSlide";
import { demoMedia } from "@/lib/presentation";
import { useDemoMode } from "@/lib/demo-mode";

type Block = { figure: string; name: string; text: string; accent?: boolean };
export type SlideContent = {
  title: string; accent?: string; subtitle: string; boat?: "a" | "b";
  flow: Block[];
  proof: { heading: string; text: string; button: string; figures: [string, string][] };
  method: { heading: string; paragraphs: string[]; notes?: { heading: string; items: string[] }[]; links?: [string, string][]; source: string };
};

// Case figures: Elkano_Embat_auditoria/output/caso_A_B.md, August 2026, checked against the apps/web engines.
const caseSource = "Fuente: Elkano_Embat_auditoria/output/caso_A_B.md, agosto de 2026, verificado contra apps/web/lib/cashpool.ts y apps/web/lib/products/marketplace/portfolio.ts.";

const products: SlideContent[] = [
  {
    title: "Conectar capital", accent: "con quien lo necesita.",
    subtitle: "Una empresa aporta capital. El score ayuda a seleccionar receptores y a repartir la exposición entre empresas y grupos.",
    flow: [
      { figure: "01", name: "elegir prestamista", text: "Revisar salud, liquidez, estabilidad e historial. El índice de capacidad orienta; no es un saldo en euros." },
      { figure: "02", name: "configurar la cartera", text: "Fijar capital, perfil de riesgo, score mínimo y límites por empresa y grupo." },
      { figure: "03", name: "repartir la exposición", text: "Ordenar por score, trayectoria y estabilidad. Excluir al prestamista y su grupo; penalizar perfiles parecidos." },
    ],
    proof: { heading: "Una cartera propuesta con importes, reserva y concentración visibles.", text: "Tres perfiles de riesgo para configurarla: conservador, equilibrado y crecimiento.", button: "Qué está implementado", figures: [] },
    method: { heading: "Qué está implementado en el prototipo", paragraphs: [
      "La rama del equipo ya contiene selección de prestamistas, receptores y cartera, monitor y centro de acciones. Esta slide explica ese flujo; no ejecuta el motor.",
      "Prototipo de asignación. El importe lo configura el usuario. No se formalizan préstamos ni se mueve dinero.",
    ], links: [["Marketplace con Harbor Foods como prestamista", "/productos/marketplace?lender=COMP_0354"]], source: "Fuente: apps/web/lib/products/marketplace/portfolio.ts en la rama feat/marketplace-lenders-borrowers." },
  },
  {
    title: "Una filial tiene caja. Otra paga intereses.",
    subtitle: "Antes de buscar dinero fuera, revisamos si el grupo puede cubrir esa necesidad con su propia liquidez.",
    flow: [
      { figure: "66.049 €", name: "necesidad antes del plan", text: "Brecha hasta las reservas del escenario. No es deuda bancaria observada." },
      { figure: "46 %", name: "cobertura interna propuesta", text: "30.666 € cubiertos con propuestas entre filiales que nadie ha rechazado.", accent: true },
      { figure: "35.383 €", name: "necesidad residual", text: "Requiere revisión o financiación adicional. Rechazar una propuesta no la elimina." },
    ],
    proof: { heading: "Qué puede resolver el cash pooling", text: "15 de 16 filiales con saldo válido y 11.285.126 € de saldos positivos conocidos. Estas cifras dependen del escenario y no forman parte del score.", button: "Supuestos y alcance", figures: [["4.674.885 €", "movilizables"], ["70 %", "del mayor aportante"]] },
    method: { heading: "Cómo se calcula", paragraphs: [
      "Redistribuir caja no crea liquidez para el conjunto. Medimos el margen con la caja reconstruida y reservamos liquidez para las necesidades de cada filial. El score y su trayectoria determinan si una filial está disponible, limitada o necesita revisión. Solo se cruzan saldos en la misma moneda.",
      "Comparamos el ahorro: al interés bancario evitado le restamos el coste de oportunidad y la comisión, y proponemos operaciones con ahorro neto positivo.",
      "Supuestos del escenario: 30 días, financiación al 6 % y depósito al 2 %. Ahorro neto estimado en 30 días: 81 €, con el plan no rechazado y ningún ahorro realizado. De los 11.285.126 € de saldos positivos conocidos, 1.858.835 € quedan retenidos hasta la reserva y 4.751.406 € por límites o revisión; 4.674.885 € son movilizables, comisiones incluidas.",
      "Tipos, comisiones y reservas son supuestos ajustables. Aprobar una propuesta simula la operación; no ordena una transferencia bancaria. Los datos son sintéticos y los límites de crédito no están validados.",
    ], links: [["Cash pooling del grupo de Atlas Motors, agosto de 2026", "/productos/cash-pooling?group=GROUP_0081"]], source: "Fuentes: apps/web/lib/cashpool.ts y la pantalla Capacidad de apoyo interno de la plataforma, captura del 19 de septiembre de 2026." },
  },
  {
    title: "Seguro de crédito", accent: "continuo.",
    subtitle: "El riesgo de Harbor Foods no es su caja, son sus clientes. La póliza sigue cada mes el score de cada cliente y actualiza la tarifa del siguiente periodo.",
    flow: [
      { figure: "3,01 M€", name: "pendientes de cobro", text: "333 facturas de 24 clientes. DSO de 60 días." },
      { figure: "1,00 M€", name: "ya vencidos", text: "Un tercio de lo pendiente. El 23,2 % de sus cobros llega tarde." },
      { figure: "35 %", name: "en un solo cliente", text: "1,06 M€ en una contraparte; los tres primeros clientes suman el 70 %.", accent: true },
    ],
    proof: { heading: "La prima, como escenario con supuestos visibles.", text: "El módulo de seguro actual no contiene a los clientes de Harbor Foods: los estados y la tarifa se presentan como escenario. La prima cambia para el siguiente periodo, nunca hacia atrás.", button: "Método y alcance", figures: [["24", "clientes"], ["60 días", "de cobro medio"]] },
    method: { heading: "Cómo funciona la póliza", paragraphs: [
      "Cada cliente se vincula con su trayectoria de score y cada mes se actualizan score, alerta, componentes y eventos observados. Tres estados: estable (score de 60 o más, sin alerta, caída a tres meses menor de 7 puntos), vigilancia (alerta o caída de 7 puntos o más) y revisión (evento activo, score bajo 40 o caída de 15 puntos o más).",
      "La calibración asigna a cada tramo de score una frecuencia histórica de estrés a seis meses. Un supuesto explícito convierte ese estrés en impago asegurado, y el motor calcula la tarifa indicada aplicando credibilidad gradual y límites de movimiento. Una alerta no rechaza a ningún cliente; cada decisión guarda score, componentes, supuestos, fecha y revisor.",
      "Los umbrales son política de demostración. El módulo de la plataforma trabaja con una cartera de demo de 48 empresas y 848 observaciones; las cifras de esta slide son las facturas de cliente reales de Harbor Foods en el dataset, y la prima que se derive de ellas es un escenario, no una tarifa calculada por el módulo.",
    ], links: [["Módulo de seguro de la plataforma", "/productos/seguro"]], source: "Fuentes: insurance/docs/PRODUCTO.md, insurance/README.md y Elkano_Embat_auditoria/output/caso_A_B.md." },
  },
];

const cases: Record<"a" | "b", SlideContent> = {
  a: {
    title: "Atlas Motors", boat: "a",
    subtitle: "Empresa A. Un barco mediano con una vía de agua en agosto: le entró la mitad de lo habitual. Elkano no la castiga por un mal mes.",
    flow: [
      { figure: "67", name: "de score en agosto", text: "Sube 9 puntos en el trimestre. Sin alerta activa y 15 meses de historial entre 48 y 69." },
      { figure: "32.109 €", name: "de caja, desde 266.852 €", text: "En agosto entran 379.073 €, la mitad de lo habitual, y salen 613.816 €. Medio mes de pagos." },
      { figure: "176.000 €", name: "cubiertos de 202.634 €", text: "Primero su grupo por cash pooling, después la red por marketplace.", accent: true },
    ],
    proof: { heading: "Su grupo le cubre al 2 % en vez del 6 % del banco, con revisión.", text: "151.900 € por cash pooling de Iris Labs y Kite Fabrics, limitado al 75 % y con revisión; 479 € de ahorro en 30 días. Más 24.024 € de Harbor Foods al 15,10 %.", button: "Notas y enlaces", figures: [["151.900 €", "cash pooling"], ["24.024 €", "marketplace"]] },
    method: { heading: "Atlas Motors, para el presentador", paragraphs: [
      "Atlas Motors tiene un score de 67 y sube 9 puntos en el trimestre. En agosto le entró la mitad de lo habitual y su caja pasó de 267.000 a 32.000 €: medio mes de pagos. Elkano no la castiga por un mal mes. Su grupo le cubre 152.000 € al 2 % en vez del 6 % del banco, con revisión, y la red le presta 24.000 más al precio que marca su score.",
      "COMP_0228, GROUP_0081 con 12 filiales. Cuatro clientes activos con un índice de concentración de 0,87 y el 25,8 % de cobros vencidos. Señal de estrés activa: coste de financiación disparado. Reserva del motor 234.743 €, necesidad 202.634 €; política limitada por la mejora de 6 puntos o más. Caja tras el plan: 184.009 €. Ahorro de 479 €: 749 € de interés bancario evitado al 6 %, menos 250 € de coste de oportunidad al 2 % y 20 € de comisiones.",
    ], notes: [{ heading: "Decir antes de que lo pregunten", items: [
      "La caja cayó un 88 % en un mes, y se enseña. La diferencia con un caso malo: score y score fuera de tiempo coinciden, 15 meses estables, la causa está en los flujos, y el motor limita al 75 % y exige revisión.",
      "Iris Labs, el donante principal, pasó de score 6 a 61 en tres meses. Por eso la propuesta requiere revisión; Kite Fabrics, con 15 meses estables, es el segundo donante.",
      "La PD del 41,7 % del marketplace es frecuencia de estrés a 6 meses, no probabilidad de impago.",
      "Los 479 € de ahorro son un mes de diferencial de tipos. El producto es evitar el descubierto y decidir quién presta y cuánto.",
      "Atlas Motors paga tarde el 20,9 % de sus facturas. No va en la slide; es coherente con su tensión de caja y con la señal de coste disparado.",
    ] }], links: [
      ["Cash pooling del grupo, agosto de 2026: dos propuestas a Atlas Motors, 151.900 €, requiere revisión", "/productos/cash-pooling?group=GROUP_0081"],
      ["Marketplace con Harbor Foods como prestamista: receptores, perfil Rendimiento, ticket 10.000 €, agosto de 2026; Atlas Motors en la posición 6", "/productos/marketplace?lender=COMP_0354"],
    ], source: caseSource },
  },
  b: {
    title: "Harbor Foods", boat: "b",
    subtitle: "Empresa B. Un barco grande y sano, con 1.732.309 € de caja y dos años de runway: pone su caja a trabajar y protege lo que le deben.",
    flow: [
      { figure: "80", name: "de score en agosto", text: "16 meses entre 60 y 85 y nunca ha tenido alerta. Paga a tiempo: solo el 6,7 % tarde." },
      { figure: "330.000 €", name: "puestos a trabajar", text: "La mitad de su caja mínima anual. Perfil Rendimiento: 18 receptoras al 15,08 %, una de ellas Atlas Motors." },
      { figure: "6.198 €", name: "netos en seis meses", text: "24.888 € de interés bruto, menos 13.712 € de pérdida esperada y 4.978 € de comisión. El 3,76 %.", accent: true },
    ],
    proof: { heading: "Y protege lo que le deben con el seguro de crédito.", text: "Un tercio de sus cobros está vencido y un solo cliente es el 35 %. Con el perfil Equilibrado ganaría 4.839 € netos, el 2,93 %, con menos pérdida esperada.", button: "Notas y enlaces", figures: [["1,00 M€", "vencidos"], ["35 %", "un solo cliente"]] },
    method: { heading: "Harbor Foods, para el presentador", paragraphs: [
      "Harbor Foods está sana: score 80, dos años de runway. Pone 330.000 € a trabajar en 18 empresas, una de ellas Atlas Motors. Y protege lo que le deben: un tercio de sus cobros está vencido y un solo cliente es el 35 %.",
      "COMP_0354, GROUP_0220. Score fuera de tiempo 84,47. Caja mínima de 12 meses 669.764 €. Embudo del marketplace: 1.282 empresas con score, 6 excluidas por ser de su grupo, 257 con alerta, 85 con estrés, 237 sin historial suficiente, 168 bajo el score mínimo, 80 bajo el retorno objetivo, 449 elegibles.",
      "Cierre: no todas las empresas necesitan lo mismo. Unas necesitan margen para recuperarse, otras rentabilizar lo que tienen y proteger lo que les deben. El score las distingue y la red las conecta.",
    ], notes: [{ heading: "Decir antes de que lo pregunten", items: [
      "Elegir Rendimiento es decisión del prestamista. La demo enseña el precio: 6.198 frente a 4.839 € netos, a cambio de más pérdida esperada.",
      "La PD siempre etiquetada como frecuencia de estrés a 6 meses, no como impago.",
      "El seguro se presenta como escenario con supuestos visibles: el módulo actual no contiene a los clientes de Harbor Foods.",
    ] }], links: [
      ["Marketplace con Harbor Foods como prestamista: el capital pasa solo a 330.000 €", "/productos/marketplace?lender=COMP_0354"],
      ["Módulo de seguro de la plataforma", "/productos/seguro"],
    ], source: caseSource },
  },
};

const Arrow = () => <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-7-7 7 7-7 7"/></svg>;

function SlideBody({ item }: { item: SlideContent }) {
  const [notes, setNotes] = useState(false);
  return <main className={styles.slide} data-company-slide={item.boat}>
    <div className={styles.content}>
      <header className={`${styles.header} ${item.boat ? styles.headerWithBoat : ""}`}>
        <h1>{item.title}{item.accent && <> <span className={styles.accent}>{item.accent}</span></>}</h1>
        {item.boat && <div className={styles.headerBoat}><CompanyBoat company={item.boat} compact/></div>}
        <p className={styles.subtitle}>{item.subtitle}</p>
      </header>

      <div className={styles.flow}>
        {item.flow.map((block, i) => <Fragment key={block.name}>
          {i > 0 && <Arrow/>}
          <section className={`${styles.step} ${block.accent ? styles.result : ""}`} aria-label={`${block.figure} ${block.name}`}>
            <p className={styles.figure}>{block.figure}</p>
            <h2>{block.name}</h2>
            <p>{block.text}</p>
          </section>
        </Fragment>)}
      </div>

      <section className={styles.validation} aria-label={item.proof.heading}>
        <div className={styles.proof}>
          <h2>{item.proof.heading}</h2>
          <p>{item.proof.text}</p>
          <button type="button" onClick={() => setNotes(n => !n)} aria-expanded={notes}>{item.proof.button}<PresentationIcon name="right"/></button>
        </div>
        {item.proof.figures.length > 0 && <ul className={styles.results}>{item.proof.figures.map(([value, label]) => <li key={label}><strong>{value}</strong><span>{label}</span></li>)}</ul>}
      </section>
    </div>

    {notes && <aside className={styles.method} aria-label={item.method.heading}>
      <button type="button" onClick={() => setNotes(false)} aria-label={`Cerrar ${item.method.heading.toLowerCase()}`}><PresentationIcon name="close"/></button>
      <h2>{item.method.heading}</h2>
      {item.method.paragraphs.map(text => <p key={text.slice(0, 40)}>{text}</p>)}
      {item.method.notes?.map(group => <Fragment key={group.heading}>
        <h3>{group.heading}</h3>
        <ul>{group.items.map(text => <li key={text.slice(0, 40)}>{text}</li>)}</ul>
      </Fragment>)}
      {item.method.links && <>
        <h3>En la plataforma</h3>
        <ul className={styles.links}>{item.method.links.map(([label, href]) => <li key={href}><Link href={href}>{label}<PresentationIcon name="arrowRight"/></Link></li>)}</ul>
      </>}
      <p className={styles.source}>{item.method.source}</p>
    </aside>}
  </main>;
}

export function ProductSlide({ number }: { number: number }) {
  const [demo] = useDemoMode();
  const route = `/producto/${number}`;
  const media = demoMedia[route];
  if (demo && media) return <DemoSlide route={route} {...media}/>;
  return <SlideBody item={products[number - 1]}/>;
}

export function CaseSlide({ company }: { company: "a" | "b" }) {
  return <SlideBody item={cases[company]}/>;
}
