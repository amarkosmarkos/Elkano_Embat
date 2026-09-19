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
- `components/Escena.tsx`: escenas y CTA de cierre en el worktree.
- `components/Nav.tsx`, `Shell.tsx`, `ui.tsx`: navegación y componentes de la aplicación.
- `app/plataforma/page.tsx`: entrada propuesta en el worktree; reutiliza el dashboard existente.

Este commit documenta el diseño. Los cambios de botón y ruta pueden permanecer sin commit en el worktree; no asumir que esta documentación los publica.

## 8. Criterios de revisión

1. Navy, blanco y azul construyen la jerarquía; violeta queda reservado a un contexto específico.
2. Tipografía de peso medio, radios pequeños y márgenes generosos en superficies comerciales.
3. Una acción principal por bloque, con destino funcional y foco visible.
4. Cada afirmación o cifra procede del dataset o de contenido validado del proyecto.
5. Capturas de desktop y móvil revisadas después de cargar fuentes y animaciones.
6. Presentación y plataforma comparten marca, con densidad apropiada a cada uso.
7. Distinguir siempre valores medidos de decisiones adaptadas para Elkano.
