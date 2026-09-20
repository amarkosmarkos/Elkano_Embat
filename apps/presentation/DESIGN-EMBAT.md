# Embat — referencia visual para Elkano

Actualizado: 19 de septiembre de 2026. Objetivo: reproducir el lenguaje visual y comercial de Embat en la presentación y la futura plataforma Elkano.

## Fuentes y alcance

Inspección directa con Chromium de estilos calculados y variables CSS: [home](https://www.embat.io/), [tesorería](https://www.embat.io/treasury-management) y [pricing](https://www.embat.io/pricing). Home medida a 1440 y 390 px de ancho. También se consultó la [home española](https://www.embat.io/es) para estructura y tono comercial.

Referencia técnica: [CSS común del tema](https://www.embat.io/wp-content/themes/embat/assets/css/common.css). Los valores siguientes son una fotografía del sitio, no una especificación oficial permanente. No se ha inspeccionado la aplicación autenticada: las recomendaciones SaaS de este documento son una adaptación para Elkano.

## 1. Colores medidos

| Función / token del sitio | Valor |
| --- | --- |
| Texto principal / fondo inverso | `#050B2C` |
| Texto secundario | `#6E707C` |
| Texto terciario / títulos de módulos | `#42444C` |
| Fondo principal | `#FFFFFF` |
| Fondo secundario / hover neutro | `#F3F4F6` |
| Fondo terciario | `#FBFBFC` |
| Borde principal | `#E8E8ED` |
| Borde secundario | `#D2D2DB` |
| Acción / información | `#3878F6` |
| Acción hover / pressed | `#0338BB` / `#002A9B` |
| Azul claro | `#E7EFFF` |
| Acción inversa / hover | `#5C92FE` / `#A5C4FF` |
| Texto inverso principal / secundario | `#FFFFFF` / `#D2D2DB` |
| Superficie inversa secundaria | `#232845` |
| Borde inverso principal / secundario | `#373C56` / `#696D80` |
| Éxito / fondo suave | `#08AB39` / `#E7FFEE` |
| Aviso / fondo suave | `#DFB631` / `#FFF5DE` |
| Peligro / fondo suave | `#C2401F` / `#FFE7E0` |

TellMe tiene un tratamiento propio violeta–azul: `linear-gradient(275deg, #C357EC 4.22%, #9D4BDD 50%, #415DE6 95.78%)`. Es un acento de producto, no el fondo de cada tarjeta. Los presets genéricos de WordPress también aparecen en el CSS: su presencia no demuestra que formen parte del diseño visible.

Para Elkano, mantener el azul como acción y reservar verde/ámbar/rojo para significado financiero. Los colores de estado actuales de Elkano son distintos; no sustituirlos sin revisar legibilidad y contraste.

## 2. Tipografía

Fuente real: **HafferSQXH**, con fallback Arial/Verdana. Pesos observados: 400 y 500. El carácter viene de titulares geométricos de peso medio y mucho espacio, no de negritas extremas.

| Elemento | Medición desktop | Comportamiento |
| --- | --- | --- |
| H1 | 52 px / 62,4 px, peso 500 | Fluido, mínimo 32 px |
| H2 | 40 px / 48 px, peso 500 | Fluido, mínimo 24 px |
| H3 de producto | 28 px / 33,6 px, peso 500 | Fluido, mínimo 20 px |
| H3 de pricing | 18 px / 21,6 px, peso 500 | Variante compacta |
| Cuerpo | 18 px / 27 px | Peso normal |
| Botón | 16 px / 22 px, peso 500 | Cabecera: line-height 27 px |
| Escala auxiliar declarada | 16, 14, 12, 10 px | Según jerarquía |

A 390 px: H1 ≈33,41 px y H2 ≈25,13 px; no son tamaños móviles fijos. Fórmulas originales:

```css
--h1: clamp(2rem, 2rem + ((1vw - 0.2rem) * 2.016), 3.25rem);
--h2: clamp(1.5rem, 1.5rem + ((1vw - 0.2rem) * 1.613), 2.5rem);
--h3: clamp(1.25rem, 1.25rem + ((1vw - 0.2rem) * 0.806), 1.75rem);
```

El sitio aplica `text-wrap: balance` a títulos y `pretty` a párrafos. Elkano usa **Manrope**, alojada en `public/fonts/` con licencia OFL. Es una sustitución, no la fuente exacta. Mantenerla mientras no haya un archivo autorizado de Haffer disponible.

## 3. Geometría y ritmo

Tokens medidos: ancho amplio **1312 px**, lectura **960 px**, separación de bloques **24 px**, margen lateral base **24 px**. El espacio de sección (`--block-space`) es **120 px** a 1440 y **56 px** a 390. Cada bloque puede añadir su propio espaciado.

Radios declarados: **2, 3, 4, 6, 8 y 12 px**. Botones de 4 px; módulos grandes pueden usar 12 px. Evitar convertir todas las superficies en cápsulas.

Sombras de niveles declarados: `0 1px 4px #00000017`, `0 3px 12px #00000017`, `0 8px 16px #00000017` (alpha aproximada de 0,09). Son herramientas puntuales: las secciones se distinguen sobre todo por fondo, espacio y borde.

## 4. Componentes comerciales

### Cabecera

La home comienza con navegación clara sobre el hero oscuro y un CTA blanco. Encima aparece una franja de anuncio azul muy pálido con enlace y cierre. **Corrección de la nota anterior: la cabecera no es siempre blanca.** El CSS contempla una transición de cabecera fija a fondo claro y texto oscuro.

La navegación agrupa producto, recursos y empresa; el menú de producto relaciona categorías, nombres y descripciones cortas. Login y demo son acciones separadas. En Elkano, separar volver a la presentación de entrar o navegar por la plataforma.

### Hero

Mensaje principal a la izquierda, visual de producto a la derecha, fondo navy con iluminación azul suave. Un titular, una explicación breve y una acción principal. La fila de logos actúa como prueba social debajo. Usar datos y capturas reales de Elkano para demostrar valor; los logos de clientes de Embat no son prueba social de nuestro proyecto.

### Botones y enlaces

- Primario: azul, blanco, radio 4 px, padding **12 × 24 px** en home.
- Variante grande: padding **16 × 24 px** en la página de tesorería.
- CTA de cabecera observado: blanco/navy, padding **13,6 × 24 px**.
- Secundario: borde fino y fondo claro/transparente según contexto.
- Enlace de sección: texto con flecha de **16 px**, gap **8 px**, sin caja.
- Los enlaces tienen transición común de **300 ms**; Elkano usa actualmente 180 ms.

Para el cierre: `Ir a la plataforma` con flecha, una sola acción dominante y una frase secundaria breve. El botón implementado en el worktree usa 17 px/700, radio 6 y sombra: es una adaptación más enfática, no una réplica exacta. Para máxima fidelidad, usar 16 px/500, radio 4 y sombra mínima.

### Bloques, tarjetas y pruebas

La home encadena hero, prueba social, capacidades por flujo de trabajo, sección IA oscura, conectividad, testimonios y medios. Tesorería añade beneficios, escenarios por tipo de empresa, resultados y preguntas frecuentes. Pricing organiza capacidades en módulos, evitando una simple lista plana.

Patrón reutilizable: resultado concreto → explicación corta → evidencia visual → enlace al detalle. Alternar superficies blancas y navy para marcar capítulos. Usar capturas de producto, diagramas de conexiones y cifras con contexto. Los testimonios identifican persona, cargo y empresa; no añadir testimonios ficticios al prototipo.

## 5. Movimiento y responsive

El CSS contiene entradas con opacidad, desplazamiento vertical y, en algunas imágenes, blur/saturación. Hay transiciones de navegación y tratamiento de movimiento reducido. Las capturas hechas justo en `DOMContentLoaded` pueden mostrar zonas vacías mientras termina la entrada: esperar a que el contenido aparezca antes de comparar.

Breakpoints presentes en CSS común: 760, 900, 1026, 1100 y 1181 px, con reglas adicionales específicas. No representan un único sistema universal de componentes.

Recomendación Elkano: apilar columnas en móvil, conservar 24 px de margen cuando haya espacio, permitir wrapping de CTA y mantener navegación usable con teclado. En tablas SaaS, scroll horizontal dentro de la tabla, no de toda la página. Verificar 390, 768 y 1440 px, zoom 200% y movimiento reducido. Estas son reglas de implementación propuestas, no resultados de una auditoría de accesibilidad de Embat.

## 6. Aplicación a nuestra plataforma

La web comercial inspira la marca; una aplicación de tesorería necesita más densidad. Propuesta:

| Área | Aplicación Elkano |
| --- | --- |
| Navegación | Superficie estable, sección activa azul claro, enlaces claramente etiquetados |
| Cabecera de página | Título navy, contexto temporal y acción principal azul |
| KPIs | Fondo blanco, borde tenue, cifra dominante y etiqueta secundaria |
| Tablas | Filas legibles, cifras alineadas y tabulares, hover suave |
| Filtros | Controles compactos con estados activo, foco y deshabilitado |
| Riesgo | Color más etiqueta/icono; significado comprensible sin color |
| Estados vacíos | Qué falta y una acción real; ninguna métrica inventada |
| Detalle | Datos y explicación antes de recomendar una operación |

Mantener titulares comerciales de 32–52 px en portada; proponer 24–32 px en páginas de trabajo y 13–16 px para controles/tablas. Esta escala de aplicación es nuestra adaptación, no una medición del producto autenticado de Embat.

## 7. Mapa del código y estado

- `app/globals.css`: tokens Tailwind, tipografía, tablas y tarjetas comunes.
- `app/embat-presentation.css`: adaptación visual de la presentación.
- `components/PresentationBrand.tsx`: identidad Elkano.
- `components/Escena.tsx`: escenas y CTA de cierre.
- `components/Nav.tsx`, `Shell.tsx`, `ui.tsx`: navegación y componentes de la aplicación.
- `app/plataforma/page.tsx`: entrada a la plataforma; reutiliza el dashboard existente.
- `components/ContentSlides.module.css`: hoja compartida por todas las slides de contenido. La usan `CelestialScore.tsx` (score), `ContentSlides.tsx` (productos) y `app/caso/[company]/page.tsx` (casos A y B).
- `components/PresentationIcons.tsx`: iconos SVG compartidos del recorrido.

La sección 9 recoge las decisiones del proyecto para las slides de contenido. Son una adaptación de la referencia de Embat, no una especificación de su aplicación autenticada.

## 8. Criterios de revisión

1. Navy, blanco y azul construyen la jerarquía; violeta queda reservado a un contexto específico.
2. Tipografía de peso medio, radios pequeños y márgenes generosos en superficies comerciales.
3. Una acción principal por bloque, con destino funcional y foco visible.
4. Cada afirmación o cifra procede del dataset o de contenido validado del proyecto.
5. Capturas de desktop y móvil revisadas después de cargar fuentes y animaciones.
6. Presentación y plataforma comparten marca, con densidad apropiada a cada uso.
7. Distinguir siempre valores medidos de decisiones adaptadas para Elkano.

## 9. Sistema de las slides de contenido

Decidido en la revisión del 19 de septiembre de 2026 y aplicado primero a la slide 3. La misma noche se extendió a los tres productos (`components/ContentSlides.tsx`) y a los casos A y B (`app/caso/[company]/page.tsx`); las tres comparten `components/ContentSlides.module.css`. Las escenas de vídeo conservan su composición cinematográfica.

La idea es simple: una slide cuenta una sola idea, con una familia tipográfica, tres tamaños y una retícula que se repite de arriba abajo. Lo que no cabe con letra legible se acorta o pasa a un desplegable. No se compensa con tarjetas, líneas ni efectos.

### Escala tipográfica

Manrope en todo, ya alojada en el proyecto. Haffer es la fuente de Embat; Manrope es la sustituta autorizada en esta presentación. No se añade ninguna otra fuente, ni cursivas, ni texto metalizado, ni gradientes en las letras.

| Nivel | Escritorio | Móvil | Peso | Interlineado | Uso |
| --- | --- | --- | --- | --- | --- |
| Protagonista | 52 px | 38 px | 500 | 1,2 | El titular y las cifras que sostienen el argumento. Comparten tamaño. |
| Bloque | 24 px | 24 px | 500 | 1,5 | Nombre de cada bloque, cifras secundarias, título del desplegable. |
| Lectura | 18 px | 18 px | 400 | 1,5 | Subtítulo, explicaciones, etiquetas y evidencia. |

Letter-spacing de -0,035 em en el nivel protagonista y -0,025 em en el de bloque. Cifras con `font-variant-numeric: tabular-nums`. Blanco para lo que se lee primero (titular, cifras, nombres de bloque); `--embat-inverse` (#D2D2DB) para las explicaciones. El azul `--embat-blue-inverse` (#5C92FE) se reserva para una sola cosa por slide, el destino del argumento. En el score es la cifra «0 a 100».

Si falta sitio, se acorta el texto o se lleva el detalle al desplegable. No se crean tamaños intermedios ni se baja el cuerpo a 10 o 13 px.

### Fondo

Colores de Embat: navy `#050B2C`, blanco, azul de acción `#3878F6`, `#D2D2DB` para texto secundario sobre oscuro. Las slides oscuras de contenido usan la cartulina rugosa `public/images/score-navy-cardstock-v2.png` con un velo navy ligero (gradiente de 105º entre `#050b2c66` y `#050b2c28`). La textura tiene que verse; el texto tiene prioridad. Las slides claras mantienen el blanco con texto navy. Sin dorados, resplandores, partículas ni paletas nuevas.

### Retícula

Una sola retícula de cinco columnas para toda la slide: dato, flecha, proceso, flecha, resultado (`1fr 28px 1fr 28px 1fr`, separación de 32 px, ancho máximo 1200 px, márgenes `max(28px, 6vw)`). Las tres filas de la slide se cuelgan de esa retícula:

1. Cabecera: el titular ocupa las cinco columnas y cabe en una línea; si no cabe, se acorta el texto. El subtítulo va debajo, en las columnas de dato y proceso, a 12 px y con un ancho máximo de 720 px. El acento azul puede ir en la cola del titular («con quien lo necesita.») cuando la slide no tiene una cifra de destino.
2. Flujo: tres bloques con la misma estructura, cifra protagonista, nombre del bloque y explicación. Las cifras comparten línea base y las flechas se centran sobre esa línea, no sobre el bloque entero.
3. Evidencia: el enunciado y el desplegable a la izquierda, ocupando dato y proceso (máximo 720 px); las cifras de evidencia en la columna de resultado, sin partir nunca una cifra. Si no hay cifras, la columna queda vacía.

Así la columna de la derecha forma una línea vertical con el resultado y su prueba, y la lectura de izquierda a derecha coincide con el flujo del argumento. Las filas se separan con 56 px de espacio (44 px si la ventana mide menos de 800 px de alto). El conjunto se centra verticalmente en la pantalla, dejando 112 px libres abajo para la marca y el widget.

Prohibido: rótulos de sección redundantes («03 / CÓMO CALCULAMOS EL SCORE»), líneas separadoras, bordes punteados, tarjetas o paneles de color alrededor de un bloque, diagramas de nodos o redes, pestañas, pasos ocultos y carruseles. La navegación ya indica en qué slide estamos.

En móvil (hasta 750 px) todo se apila en una columna, las flechas giran 90º y se permite scroll vertical. Nada puede desbordar en horizontal a 390 px.

### Flechas e iconos

Iconos SVG de `PresentationIcons.tsx`: trazo 1,5 a 1,6 sobre un `viewBox` de 24, extremos redondeados, `currentColor`. Flechas de flujo a 28 px; iconos de control y de enlace a 18 px. Ningún carácter de texto hace de icono: ni flechas Unicode, ni «+», «−» o «×». El desplegable abre con un chevron y cierra con el icono `close`.

### Texto

Pasar la skill `humanizer`. Frases que el presentador pueda decir en voz alta, en el orden en que las diría. Sin puntos centrados como separador; se usan comas, «y», puntos o saltos de línea. Sin lemas abstractos ni repetir el titular en cada bloque.

Las cifras salen de una fuente comprobada y se citan igual en la slide y en el desplegable. En el score: 105 variables (24 métricas, 72 cambios y rachas, 9 columnas de estrés), gradient boosting, estimación a 3 y 6 meses, Gini 0,54, 0,44 y 0,38, 1.282 empresas y 15.803 registros. Las limitaciones (datos sintéticos, grupos excluidos, Gini a 6 meses por debajo del mínimo, anticipación mediana de 0 meses) viven en «Método y alcance». Ni la slide ni el desplegable inventan una arquitectura, una cifra o una capacidad validada.

### Movimiento y controles

El contenido está completo al entrar. Sin animaciones de escritura, sin ligar el texto al progreso de un vídeo. Si hay entrada, es breve, respeta `prefers-reduced-motion` y no cambia la geometría. Nada sigue consumiendo recursos cuando ya no aporta nada.

Dos modos, elegidos con la casilla «Modo demo» del índice del widget y recordados en el navegador: presentación (por defecto) y demo, que sustituye las slides listadas en `demoMedia` (`lib/presentation.ts`) por el nombre del producto a 52 px y su grabación de Loom debajo, 16:9, centrada sobre el mismo fondo y sin tapar marca ni widget. Los reproductores viven en una capa fija (`DemoPlayers.tsx`) que se monta desde `Shell`, así se cargan en segundo plano al activar el modo y sobreviven al cambio de slide. El resto de slides no cambia.

Footer: «Elkano» y «Plataforma» centrados por su texto, `line-height: 1`, subrayado de hover como pseudo-elemento absoluto para que no altere la altura. Widget: 432 px en escritorio, 90 vw en móvil, posición fija entre slides, contador y nombre una sola vez («02 / 11 El problema»), y un botón de pantalla completa en el extremo derecho. Las flechas del teclado cambian de slide; los controles de reproducción son otra función.

### Lista de comprobación

1. Una familia, tres tamaños, pesos 400 y 500. Un solo acento azul por slide.
2. Sin rótulo redundante, líneas, tarjetas, nodos, cursivas ni puntos centrados.
3. Flechas e iconos SVG; ningún carácter usado como icono.
4. Sin scroll a 1280 × 720 ni a 1440 × 900; sin desbordamiento horizontal a 390 px.
5. Marca y widget no tapan contenido. Foco visible. Teclado funcionando.
6. Cifras trazables; limitaciones conservadas en el desplegable.
