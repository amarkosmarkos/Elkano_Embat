# Plan para Astra: seis escenas de vídeo del barco

Tu trabajo es producir en Blender los seis planos que enlazan la presentación web de Elkano. La web ya existe en `apps/web` (Next.js, rama `xubranch`). Cada plano se usa de una de estas dos formas: como vídeo cuyo instante lo controla el scroll del usuario, o como fotograma fijo con texto encima. No hay que montar nada en la web: solo entregar los ficheros con los nombres y formatos de abajo. Entrega mañana a las 11:00, así que produce en el orden de prioridad y entrega cada plano en cuanto esté, no todos al final.

## Formato común

- 1280x720, 24 fps, sin audio.
- Vídeo: h264, crf 23, yuv420p, faststart. Cada fichero por debajo de 8 MB. Con ffmpeg: `-c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart -an`.
- Fotogramas: JPG calidad 90, 1920x1080, en el mismo directorio.
- Destino: `apps/web/public/video/`. Nombres exactos de la tabla.
- Escena de partida: `blender/ELKANO-branded-sails.blend`, el barco con el símbolo de Embat en las velas. Misma iluminación y mismo mar en todos los planos para que el montaje no salte.
- Cámara tranquila. Los textos de la web van a la derecha o abajo a la izquierda, así que el barco tiene que quedar centrado o algo a la izquierda y el cielo o el mar despejados a la derecha.

## Las seis escenas

| # | Nombre | Plano | Duración | Uso en la web | Fichero | Prioridad |
|---|---|---|---|---|---|---|
| 1 | Zarpar | Barco navegando de izquierda a derecha, visto de lado, cámara casi fija con un travelling suave que lo acompaña. Mar tranquilo, día claro. Empieza con el barco entrando por la izquierda y termina con el barco centrado. Debe poder pausarse en cualquier fotograma y quedar bonito, porque el scroll lo detiene donde quiere | 40 s | Vídeo controlado por scroll. Encima aparecen siete tarjetas de texto a la derecha | `barco-largo.mp4` | 1 |
| 2 | La isla | El barco llega frente a una isla o costa y se detiene. Cae la tarde: la luz pasa de día a atardecer en el propio plano. Termina en un fotograma estable con el barco fondeado | 6 s | Vídeo controlado por scroll y luego fotograma fijo con una capa oscura y texto | `isla.mp4` y `isla.jpg` (último fotograma) | 3 |
| 3 | Las estrellas | Noche. Cámara en cubierta mirando hacia arriba, el mástil y las velas en un lateral, cielo estrellado limpio ocupando dos tercios de la imagen. Sin nubes ni luna grande. Puede ser un fotograma o un plano de 4 segundos con las estrellas titilando muy sutil | 4 s o fijo | Fotograma. La web dibuja encima una constelación de cinco estrellas y el número del score | `estrellas.jpg` y opcional `estrellas.mp4` | 2 |
| 4 | El cofre | Interior de la bodega o la cubierta con un cofre de madera cerrado en primer plano, iluminado por un farol. Dos fotogramas: cofre cerrado y cofre abierto con luz saliendo del interior. Si un cofre modelado no llega, vale un plano corto del interior del barco con un espacio vacío a la derecha | fijo, dos imágenes | La web pone las tres tarjetas de producto saliendo del cofre al hacer scroll | `cofre-cerrado.jpg` y `cofre-abierto.jpg` | 5 |
| 5 | El puerto | El barco llegando a un muelle o a una costa con edificios lejanos, visto de frente o tres cuartos. Amanecer. Espacio libre a la derecha | fijo | Fotograma con dos carteles de texto encima | `puerto.jpg` | 6 |
| 6 | Cierre | El barco alejándose hacia el horizonte, visto desde atrás, atardecer. Termina en un fotograma con el barco pequeño y el cielo grande | 8 s | Vídeo controlado por scroll y luego fotograma con logo y nombres | `cierre.mp4` y `cierre.jpg` | 4 |

## Prioridad y plan de trabajo

1. **Zarpar** (40 s). Es el que sostiene el primer minuto del vídeo y sustituye al render de 13 s que hay ahora. Empieza por este.
2. **Estrellas** (fotograma). Es la escena del score y solo necesita una imagen. Sácala en cuanto Zarpar esté renderizando.
3. **Isla** (6 s). Si el cambio de luz no llega, un plano de día y la web oscurece.
4. **Cierre** (8 s). Si no hay tiempo, se usa Zarpar invertido y un fotograma.
5. **Cofre** y **Puerto**. Solo si sobra tiempo. Tienen sustituto: texto sobre el fotograma de la isla.

Renderiza a resolución de previsualización primero (800x450, pocas muestras) para validar cámara y timing, y sube a 1280x720 solo cuando el plano esté aprobado. Un plano en baja calidad entregado a tiempo vale más que uno perfecto a las 10:55.

## Cómo se usa cada plano en la web, para que sepas qué importa

- **Vídeo con scroll:** la página convierte la posición del scroll en el instante del vídeo. El usuario puede parar en cualquier fotograma. Por eso: sin cortes de plano dentro del fichero, sin movimientos bruscos de cámara, sin fundidos a negro al principio ni al final.
- **Fotograma:** la web pone texto y gráficos encima. Por eso: espacio despejado donde va el texto, contraste suficiente, nada importante en el tercio derecho ni en la esquina inferior izquierda.
- **Continuidad:** el barco y el mar tienen que ser reconociblemente los mismos en las seis escenas. Cambia la luz, no el barco.

## Entrega

Cada plano, en cuanto esté: fichero en `apps/web/public/video/`, commit en `xubranch` con el mensaje `assets: escena N <nombre>`, y una línea en el chat con el nombre, la duración y si es la versión de previsualización o la final.
