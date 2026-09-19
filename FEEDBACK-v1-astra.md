# Feedback a la V1 y cambio de estructura

La V1 está muy bien hecha: el componente Escena, el recorrido con teclado, las seis escenas con Seedance. El plano de Zarpar es de película. Lo que cambia ahora es el guion, no la técnica. Pasamos de "seis escenas y catorce paradas" a nueve secciones que se recorren con scroll, en este orden. Una sección es animación pura, web pura o híbrida.

## Qué se queda, qué cambia, qué se hace de cero

| Sección nueva | Tipo | Escena V1 que se reutiliza | Qué hay que hacer |
|---|---|---|---|
| 1. Intro: quiénes somos y por qué este track | Híbrida | Zarpar, tal cual el vídeo | Quitar las siete ventanas de esta escena. Dejar dos capas de texto: quiénes somos (el texto actual) y por qué hemos elegido el track (texto nuevo, abajo) |
| 2. El problema: patrones en los datos | Híbrida | Estrellas, tal cual el vídeo | Sustituir la constelación de cinco dimensiones y el 45 por varias constelaciones que se dibujan una tras otra, cada una una forma de leer los datos, y al final una constelación con la forma del logo de Embat |
| Transición día a noche | Animación pura | La isla, tal cual | Quitar todo el texto. Queda como puente de tres segundos entre el barco de día y el cielo de noche. Si sobra, se corta sin más |
| 3. Cálculo del score | Web pura | Nada | Página placeholder: título "Cálculo del score", tres contenedores vacíos con subtítulo. La rellena nuestro quant |
| 4. El cofre | Animación pura | El cofre, solo la imagen | Vídeo nuevo: el cofre se abre, dentro hay tres papiros, uno se desenrolla. Sin texto encima |
| 5, 6, 7. Línea de productos | Web pura, una por producto | Los componentes que ya operan | Tres páginas: colocación de excedentes, cash pooling, monitor. Cada una con la explicación y la demo real embebida |
| 8. Dos empresas | Híbrida | Nada | Vídeo nuevo: isla grande con ciudad y muchos barquitos amarrados, cada barco es una empresa. Al lado, dos empresas y qué productos les recomendamos |
| 9. Fin | Animación pura | Cierre, tal cual | Cambiar el texto: "Gracias por escuchar" grande, los nombres pequeños. Quitar la frase de Agicap |
| El puerto | Se retira del recorrido | Puerto | Su contenido (quién paga y los totales) se reparte: quién paga va al final de cada página de producto, los totales al final de la sección 8 |

## Textos nuevos

Sección 1, por qué este track: "Porque el dinero deja rastro y casi nadie lo lee. Embat ve el rastro de 400 empresas cada día y nos ha dado el de 1.286 para probar que se puede leer antes de que sea evidente."

Sección 2, constelaciones. Cada una se dibuja sobre las estrellas con líneas finas y lleva una etiqueta corta. Cinco bastan, del `overview.json`: por la caja, por la deuda, por lo que cobran, por cómo pagan, por el grupo. Cada etiqueta: título en pequeño, valor en verde, frase. Cuando la quinta está dibujada, todas se apagan y aparece: "¿Y si hubiera una manera más directa de entender la salud de una empresa?". Entonces se dibuja la constelación con la forma del símbolo de Embat, el mismo de las velas, y debajo "Siguiente: cálculo del score". El símbolo es poligonal: traza el PNG de `blender/assets/embat-user-flag.png` a un polígono de pocos vértices y dibújalo con estrellas en los vértices y líneas entre ellas.

Sección 9: "Gracias por escuchar." y debajo "Luken · Nagore · Markos · David · Xuban · HackSpain 2026 · Reto X Ray de Embat".

## Vídeos

- **Se quedan sin tocar:** Zarpar, Estrellas, Isla, Cierre.
- **Nuevo, cofre:** partir del fotograma actual del cofre. Blender: la tapa se abre y dentro hay tres papiros enrollados; uno sale y se desenrolla hacia cámara. 6 a 8 segundos. Luego Seedance con la misma referencia. Uso con scroll: el papiro desenrollado es el último fotograma y da paso a los productos.
- **Nuevo, isla con ciudad:** una isla más grande que la actual, con una ciudad pequeña y un puerto con muchos barquitos amarrados, vistos desde el aire con el barco de Embat entrando. El puerto actual sirve de base si se le añaden barcos y se aleja la cámara. Fotograma fijo o vídeo corto de 6 segundos. Espacio libre en el tercio derecho para las dos empresas.
- **Se retira:** el puerto como escena propia.

## Web

- Rutas nuevas: `/calculo-score`, `/producto/1`, `/producto/2`, `/producto/3`. Las páginas de la app (`/score`, `/empresa`, `/grupo`, `/monitor`, `/operaciones`) siguen existiendo y enlazadas desde los productos, pero salen del recorrido con flechas.
- Recorrido nuevo en `lib/presentation.ts`: escena 1, isla, escena 3, calculo-score, escena 4, producto 1, producto 2, producto 3, escena 8 (isla con ciudad), escena 6.
- Páginas de producto: título, el párrafo de `human-text-only.md`, la demo real (ExcedentesCard con los datos de COMP_0054; GroupPoolingPanel con GROUP_0067; MonitorList), y al final una línea de quién paga y por qué.
- Sección 8, las dos empresas: empresa A, COMP_0054, score 71 estable, 15 millones parados, recomendación colocación de excedentes con el importe de su tarjeta. Empresa B, COMP_0407 del grupo GROUP_0067, score 56 cayendo, 438.000 dispuestos en póliza, recomendación cash pooling con el límite al 50% y aviso del monitor. Comprueba en los JSON que las tarjetas de las dos existen; si B no encaja, elige otra del mismo grupo con score en ámbar y póliza dispuesta. Cierra con los totales: 535 millones parados en 312 empresas, 85 millones neteables hoy, 182 empresas avisadas antes del impago.
- Placeholders: donde no haya contenido final, contenedor con borde punteado y el título de lo que irá. Nada de texto inventado.

## Orden de trabajo

1. Recorrido y rutas nuevas con placeholders, para que Xuban pueda ensayar el flujo hoy.
2. Sección 1 y 9, que son cambios de texto.
3. Sección 2, constelaciones y logo.
4. Páginas de producto con las demos embebidas.
5. Vídeo del cofre.
6. Vídeo de la isla con ciudad y sección 8.

Cada paso: enseñar, iterar, commit en xubranch.
