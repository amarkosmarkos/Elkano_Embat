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
- `components/CelestialScore.tsx` y `CelestialScore.module.css`: referencia implementada para las slides de contenido.
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

## 9. Diseño elegido para las slides de contenido

Decisiones acordadas durante la revisión de la presentación, 19 de septiembre de 2026. Aplicar esta sección al score, las explicaciones de producto y los casos de las empresas A y B. Las escenas de vídeo mantienen su composición cinematográfica.

La referencia implementada es la slide 3: `components/CelestialScore.tsx` y `components/CelestialScore.module.css`. Reutilizar su lenguaje visual; no diseñar cada slide con una tipografía, una escala o unos iconos distintos. Estas decisiones sustituyen los experimentos anteriores de caligrafía, brillo y mezclas de fuentes.

### Tipografía: una familia y tres tamaños

Usar **Manrope**, ya alojada en el proyecto, en toda la slide. La fuente original de Embat es HafferSQXH; Manrope es la sustituta elegida para esta presentación. No descargar ni introducir otra fuente para una slide concreta.

| Uso | Escritorio | Peso | Regla |
| --- | --- | --- | --- |
| Titular y cifras protagonistas | 52 px, interlineado 1,2 | 500 | Un mensaje principal. Las cifras protagonistas pueden compartir este tamaño. |
| Títulos de bloque y cifras secundarias | 24 px, interlineado 1,5 | 500 | La misma jerarquía en todos los bloques. |
| Subtítulos, explicaciones, etiquetas y evidencia | 18 px, interlineado 1,5 | 400 | Texto legible durante una presentación, sin letra pequeña para hacer sitio. |

En móvil, el titular pasa a 38 px; bloques y texto mantienen 24 y 18 px. Se apila el contenido y se permite scroll vertical.

No usar cursivas, familias caligráficas, serif alternativas, texto metalizado ni gradientes dentro de las letras. No mezclar negritas de 700/900 con texto ligero. Reservar 500 para titulares y 400 para la lectura normal. Si falta sitio, acortar el texto o llevar el detalle a una explicación desplegable; no añadir tamaños intermedios ni reducir el cuerpo a 10–13 px.

### Fondo y color

Mantener los colores de Embat: navy `#050B2C`, blanco `#FFFFFF`, azul de acción `#3878F6` y texto secundario sobre oscuro `#D2D2DB`.

La slide del score conserva la cartulina azul rugosa aprobada: `public/images/score-navy-cardstock-v2.png`, con un velo navy ligero. La textura debe verse, pero el texto tiene prioridad. Puede reutilizarse en otras slides oscuras de contenido. Las slides claras pueden mantener el fondo blanco ya usado en la presentación, con texto navy. No añadir dorado, resplandores, nuevas paletas ni efectos decorativos al texto.

### Composición y espacio

- Una slide contiene la idea completa. No esconder partes del argumento en pasos automáticos o pestañas internas.
- Empezar directamente por el titular. No añadir un rótulo redundante como «03 / CÓMO CALCULAMOS EL SCORE»; la navegación ya indica la posición.
- Usar un área de contenido de hasta 1200 px y márgenes laterales generosos: `max(28px, 6vw)` en escritorio y 24 px en móvil.
- Separar bloques con espacio, no con líneas horizontales, bordes punteados o una tarjeta alrededor de cada párrafo.
- Para un flujo, alinear de izquierda a derecha los datos, el proceso y el resultado. Mantener la misma jerarquía en las tres columnas.
- Reservar espacio inferior para la marca y el widget. A 1280 × 720 y 1440 × 900, la slide debe caber sin scroll ni contenido tapado por los controles.

En la slide del score, «SCORE VALIDADO» es el mensaje principal. El flujo es 105 variables, modelo predictivo y score de 0 a 100. Los resultados de Gini son evidencia secundaria y se muestran con menor tamaño. No reintroducir el dibujo de red neuronal: se retiró a petición del usuario.

La composición actual destaca únicamente el resultado con una superficie azul Embat. Los datos y la explicación permanecen sobre el fondo, sin tarjetas. Así se distingue el destino del flujo sin añadir más estilos tipográficos. La evidencia queda debajo; no compite con el resultado.

### Flechas e iconos

Usar iconos SVG sencillos, de trazo uniforme y extremos redondeados. Para enlaces y controles, usar 18–24 px; las flechas entre bloques pueden medir 28 px. Referencia de trazo: 1,5–1,6 unidades en un `viewBox` de 24.

No usar caracteres Unicode como sustituto visual de flechas. La forma de un carácter depende de la fuente y no coincide con los demás controles. Reutilizar `PresentationIcons.tsx`; mantener las etiquetas accesibles y el foco visible.

### Texto

Aplicar la skill `humanizer` al redactar o revisar el contenido. Mantener las cifras y el alcance de las afirmaciones. Escribir frases que el presentador pueda decir en voz alta, como «Comprobado con Gini» o «Con grupos que el modelo no había visto».

No usar puntos centrados para separar conceptos. Utilizar comas, «y», frases completas o saltos de línea. Evitar lemas abstractos, frases de relleno y repetir lo mismo en el titular y en cada bloque.

Cuando una precisión técnica no quepa con letra legible, conservarla en «Método y alcance». En el score, ese apartado explica los eventos de estrés, los datos sintéticos, la validación por grupos y las limitaciones. El diagrama o la frase comercial no deben inventar una arquitectura, una cifra o una capacidad validada.

### Movimiento y navegación

El contenido esencial debe estar disponible al entrar. No ligarlo al progreso de un vídeo ni darle una larga animación de escritura. Si se usa una entrada, que sea breve y no cambie la geometría de la slide. Respetar movimiento reducido. Evitar brillo en nodos, partículas decorativas y animaciones que sigan consumiendo recursos cuando ya no aportan nada.

En el footer, centrar «Elkano» y «Plataforma» por su texto. Usar `line-height: 1` y alineación flex. Dibujar el subrayado de hover fuera del flujo, con un pseudo-elemento absoluto, para que no altere la altura ni la alineación.

El widget conserva el mismo ancho entre slides: 400 px en escritorio, limitado a 90 vw en móvil. Mantener fijas las posiciones de los controles. Mostrar el contador y el nombre una sola vez: «02 / 11 El problema», sin otro «2.» delante del título. Las flechas izquierda/derecha del teclado cambian de slide directamente. Los controles de reproducción tienen una función separada.

### Comprobación antes de dar una slide por terminada

1. Una sola familia tipográfica, tres niveles y solo pesos 400/500.
2. Ninguna cursiva, rótulo redundante, línea separadora o punto centrado en el contenido visible.
3. Flechas SVG coherentes, sin caracteres usados como iconos.
4. Sin scroll en escritorio a 1280 × 720 y 1440 × 900; sin desbordamiento horizontal a 390 px.
5. Contenido y controles separados, foco visible y navegación por teclado funcionando.
6. Cifras trazables y las precisiones técnicas conservadas donde corresponda.
