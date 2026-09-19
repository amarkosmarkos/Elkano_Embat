# Astra: la maqueta de la presentación de Elkano, escena a escena

## Quién eres y cómo trabajamos

Eres el director técnico de la presentación del equipo Elkano en HackSpain 2026, track X Ray de Embat. Dominas Blender y Next.js. Trabajas conmigo, Xuban, que hago el pegamento: grabo el vídeo final con Loom hablando encima de la web, integro el score y los productos que ha hecho el equipo, y decido qué se ve.

No vamos a hacerlo todo de golpe. Vamos a construir una maqueta completa de la presentación en Next.js, escena a escena, con renders rápidos de Blender como fondo. Cada escena se cierra contigo y conmigo antes de pasar a la siguiente. Cuando las seis estén en la web y funcionen, pasamos todos los renders por Seedance para el acabado de película, y los ficheros nuevos sustituyen a los viejos con el mismo nombre, sin tocar código. Ya hemos probado que Seedance convierte un render de Blender en un plano de película, así que la maqueta no tiene que ser bonita: tiene que tener la cámara, el timing y la composición correctos.

Reglas de trato:

- Una escena cada vez. Terminas, me enseñas, iteramos, commit, siguiente.
- Paciencia con el render. Previsualización a 800x450 con pocas muestras. La calidad la pone Seedance al final.
- Si algo del plan no cuadra con lo que ves en el repo, dímelo antes de cambiarlo.
- Nunca inventes cifras ni textos: están todos en este fichero y en pitch.md.
- Commits pequeños en la rama `xubranch`, mensajes claros, nada en `main`. No toques `analytics/`, `pipeline/`, `eda/`, `output/` ni los JSON de `apps/web/public/data/`.

## La historia que contamos

Embat nos ha dado el rastro financiero de 1.286 empresas en 250 grupos durante 24 meses: 2.556.437 movimientos y 897.894 facturas. Con eso hemos construido un score de salud financiera por empresa y mes, con cinco dimensiones (pago, liquidez, caja, deuda, concentración), y encima del score dos productos que Embat no tiene y que sus clientes necesitan: colocación de excedentes y cash pooling automático, más un monitor que avisa solo.

La metáfora es un barco. Nos subimos al barco de Embat, navegamos el mar de datos, y a nuestro paso aparecen las siete formas de mirar los datos. Llegamos a una isla y nos paramos a pensar: ¿y si todo cupiera en un solo número? De noche miramos las estrellas: cinco estrellas, una constelación, y en el centro el score. En la bodega abrimos un cofre: los productos. Llegamos a puerto: quién compra. Y el barco sigue navegando: cierre.

Equipo, para los créditos: Luken, Nagore, Markos, David y Xuban.

Cómo evalúa Embat, por si dudas entre dos opciones: la definición del score y sus dimensiones, qué producto se entrega y cómo lo usa el cliente, y cómo de monetizable es. Un modelo sencillo con un producto claro gana a uno sofisticado sin producto. La demo se graba, nadie va a meter datos nuevos.

## Lo que ya existe en el repo

Repo `amarkosmarkos/Elkano_Embat`, rama `xubranch`. App en `apps/web`: Next.js 15, App Router, React 19, Tailwind v4, TypeScript, export estático. Comandos desde la raíz, pnpm por npx:

```
npx --yes pnpm@11.25.0 install
npx --yes pnpm@11.25.0 --filter web dev        # http://localhost:4321
npx --yes pnpm@11.25.0 --filter web build      # export estático a apps/web/out, ~1 min, tiene que pasar siempre
```

Páginas hechas y funcionando con el score real:

| Ruta | Qué es |
|---|---|
| `/intro` | Escena 1 a medio hacer: vídeo del barco controlado por scroll, siete ventanas, capa final de la isla. Admite `?p=0.5` para saltar a un punto |
| `/` | Datos: cinco cifras y siete ventanas |
| `/score` | Histograma y tabla de 1.282 empresas con filtros y chips |
| `/empresa/[id]` | Ficha: score, dimensiones, qué se movió, gráficas de 24 meses, tarjetas de producto que operan de verdad, avisos |
| `/grupo/[id]` | Grupo: miembros, propuestas de pooling con botones de aprobar, flujo |
| `/monitor` | Avisos del mes con botón de resuelto |
| `/operaciones` | Todo lo aprobado en la demo, con totales y botón de vaciar |

Empresas del guion: COMP_0945 se tuerce de 72 a 45; COMP_0640 mejora de 52 a 82; COMP_0054 coloca 5,9 millones; GROUP_0067 netea 890.000 con tres préstamos internos; COMP_0636 dispara el monitor.

Ficheros que te interesan: `apps/web/app/intro/page.tsx` (la mecánica de scroll que vas a reutilizar), `apps/web/components/Nav.tsx` y `Shell.tsx` (barra y envoltorio; las escenas van sin barra), `apps/web/public/data/overview.json` (las siete ventanas con sus textos), `pitch.md` (guion hablado), `ESCENAS-astra.md` (especificación de los planos de Blender), `HANDOFF-astra.md` (contexto técnico largo). Blender: `blender/ELKANO-branded-sails.blend` en el proyecto hackspain, fuera del repo, es el barco con el símbolo de Embat en las velas. Vídeo actual: `apps/web/public/video/barco.mp4`, 13 segundos.

## Qué vas a construir en la web

Un componente `Escena` reutilizable en `apps/web/components/Escena.tsx`, y una ruta por escena bajo `apps/web/app/escena/[n]/page.tsx` o rutas con nombre, como prefieras, siempre estáticas. El componente:

- Recibe un fondo: `{ video: "/video/x.mp4" }` controlado por scroll, o `{ image: "/video/x.jpg" }` fijo.
- Recibe capas: cada una con `from` y `to` en 0..1 del recorrido, posición (izquierda abajo, derecha columna, centro), y contenido React. Aparecen y desaparecen con fundido y un pequeño desplazamiento.
- Altura del recorrido configurable (por defecto 600vh). Barra de progreso abajo. Parámetro `?p=` para saltar.
- Pantalla completa, sin barra de navegación. Fondo azul noche `#04101f` detrás de todo para que no haya blancos.
- Al llegar al final, un botón grande "Siguiente" con la ruta a la que sigue, y las flechas del teclado saltan a la ruta anterior o siguiente según este orden:

```
/escena/1 → /escena/2 → /escena/3 → /score → /empresa/COMP_0945 → /empresa/COMP_0640
→ /escena/4 → /empresa/COMP_0054 → /grupo/GROUP_0067 → /empresa/COMP_0636 → /monitor
→ /escena/5 → /operaciones → /escena/6
```

La navegación por teclado también funciona en las páginas de la app (mete el listener en `Shell.tsx`). Es para que yo no busque con el ratón mientras hablo.

## Las seis escenas, con texto exacto

Cada escena tiene su plano de Blender (maqueta, 800x450, luego Seedance) y sus capas. Los ficheros van a `apps/web/public/video/` con estos nombres; la maqueta lleva sufijo `-blender` y una copia sin sufijo es la que usa la web, así al final Seedance solo sustituye la copia.

### Escena 1: Zarpar

- **Plano:** barco de lado navegando de izquierda a derecha, cámara casi fija con travelling suave, mar tranquilo, día claro. Entra por la izquierda y termina centrado. 12 segundos. Sin cortes. `barco-largo.mp4`.
- **Capa 0 a 0,3, abajo izquierda:** "Somos Luken, Nagore, Markos, David y Xuban. Nos hemos subido al barco de Embat para navegar este mar: 1.286 empresas en 250 grupos, 24 meses, 2.556.437 movimientos y 897.894 facturas."
- **Cabecera fija, arriba izquierda:** "HackSpain 2026 · X Ray · Embat", "Elkano", "Un score que lee el rastro del dinero antes de que lo lea nadie".
- **Capas 0,18 a 0,85, columna derecha, una cada intervalo igual, se quedan apiladas:** las siete ventanas de `overview.json`: título, valor grande en verde, frase.
- **Siguiente:** /escena/2.

### Escena 2: La isla

- **Plano:** el barco llega frente a una isla y se detiene, la luz pasa de día a atardecer. 6 segundos. `isla.mp4` y último fotograma `isla.jpg`.
- **Capa 0 a 0,6:** nada, solo el plano.
- **Capa 0,6 a 1, centro, sobre capa oscura al 85%:** "Nos paramos a pensar" pequeño; "Siete ventanas, siete verdades parciales. Ningún financiero puede mirar las siete cada mañana." grande; "¿Y si todo esto cupiera en un solo número?" en verde.
- **Siguiente:** /escena/3.

### Escena 3: Las estrellas

- **Plano:** noche, cámara en cubierta mirando arriba, mástil y velas en un lateral, cielo estrellado limpio en dos tercios de la imagen. Fotograma `estrellas.jpg`, opcional `estrellas.mp4` de 4 segundos con titilar sutil.
- **Capa 0 a 0,5, dibujada en SVG sobre el cielo:** cinco estrellas que se encienden una a una con su nombre: Pago, Liquidez, Caja, Deuda, Concentración. Del 0,3 al 0,5 se unen con líneas finas formando una constelación.
- **Capa 0,5 a 0,8, centro de la constelación:** se enciende el número "45" grande, y debajo "COMP_0945 · agosto 2026". A su lado, pequeño, los cinco valores: Pago −22, Liquidez +11, Caja +11, Deuda −1, Concentración −27.
- **Capa 0,8 a 1, abajo:** "Una empresa, un número, cinco razones. Se calcula cada mes y lo importante no es el nivel sino la dirección: en febrero sacaba 72."
- **Siguiente:** /score.

### Escena 4: El cofre

- **Plano:** bodega o cubierta con un cofre de madera cerrado en primer plano, farol. Dos fotogramas: `cofre-cerrado.jpg` y `cofre-abierto.jpg`. Si el cofre no llega, un interior del barco con espacio vacío a la derecha y la web pone el cofre como icono.
- **Capa 0 a 0,3:** cofre cerrado y el texto "El score es el motor. Esto es lo que va encima."
- **Capa 0,3 a 1:** cambia a cofre abierto y salen tres tarjetas, una cada tramo, hacia la derecha: "Colocación de excedentes: cuánto es seguro inmovilizar y a qué plazo, y Embat lo ejecuta"; "Cash pooling automático: la filial sobrada presta a la que necesita, con límite por score"; "Monitor: levanta la mano solo cuando una empresa se mueve de verdad".
- **Siguiente:** /empresa/COMP_0054.

### Escena 5: El puerto

- **Plano:** barco llegando a un muelle con edificios lejanos, tres cuartos, amanecer. Fotograma `puerto.jpg`.
- **Capa 0 a 0,5, dos carteles a la derecha:** "La empresa: gana interés que hoy no gana, deja de pagar intereses por dinero que ya tiene y evita el descubierto de julio" y "Embat: dos módulos nuevos sobre 400 clientes, comisión por cada colocación, y una razón para que el financiero entre cada día".
- **Capa 0,5 a 1, abajo:** "Solo en este dataset: 535 millones parados en 312 empresas, 85 millones neteables hoy, 182 empresas avisadas antes del impago con cuatro meses de antelación."
- **Siguiente:** /operaciones.

### Escena 6: Cierre

- **Plano:** el barco alejándose hacia el horizonte, desde atrás, atardecer, 8 segundos, termina con el barco pequeño y el cielo grande. `cierre.mp4` y `cierre.jpg`. Este se reproduce solo, no con scroll.
- **Capa 0,5 a 1, centro:** "Elkano" grande; "Agicap vende estas decisiones como módulos sueltos, sin score. Embat las tendría sobre un número que lee el rastro antes que nadie."; debajo los cinco nombres y "HackSpain 2026 · Reto X Ray de Embat".
- **Siguiente:** ninguno.

## El bucle de trabajo, escena a escena

1. Blender: maqueta del plano según ESCENAS-astra.md, previsualización 800x450, pocas muestras. Exporta con `-blender` en el nombre y una copia sin sufijo.
2. Web: la ruta de la escena con el componente `Escena`, las capas con el texto exacto de arriba.
3. Enséñamelo: arranca el servidor, dame la URL de la escena y una captura a 1280 de ancho en dos o tres puntos del recorrido usando `?p=`. Para las escenas con vídeo, la captura headless no sirve por el sticky; usa capturas de un navegador real o descríbeme qué se ve.
4. Iteramos hasta que diga que está.
5. Commit: `feat(escena N): <nombre>` con los ficheros de vídeo incluidos.
6. Siguiente escena. Orden: 1, 3, 2, 6, 4, 5. La 1 ya está a medias; la 3 es la del score y la más importante después de la 1.

Al terminar las seis: pasa los seis planos por Seedance con el mismo prompt de estilo y la misma imagen de referencia del barco, controla tres fotogramas de cada clip parado, y sustituye las copias sin sufijo. Cero cambios de código. Si un clip sale mal, se queda la maqueta.

## Restricciones y verificación

- Todo el texto en español. Sin guiones largos ni flechas tipográficas en los textos.
- Sin dependencias nuevas. Gráficos en SVG a mano. Desktop a 1280 de ancho.
- Vídeos: 1280x720, 24 fps, h264 crf 23, yuv420p, faststart, sin audio, menos de 8 MB. Fotogramas JPG 1920x1080 calidad 90.
- Antes de cada commit: `npx --yes pnpm@11.25.0 --filter web build` pasa y `curl` de la ruta nueva devuelve 200.
- Reporte después de cada escena, cuatro líneas: qué has hecho, URL, qué dudas tienes, qué necesitas de mí.

Empieza por decirme en cinco líneas qué has entendido y por dónde vas a empezar, y arranca con la escena 1.
