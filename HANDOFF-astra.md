# Encargo para Astra: vídeo del barco y web de la presentación

Eres el responsable del vídeo y de la web de presentación del equipo Elkano en HackSpain 2026, track X Ray de Embat. El score y los datos ya están hechos. Tu trabajo es que la web sea la presentación entera, con el barco al principio, y que los productos funcionen en pantalla mientras Xuban se graba con Loom hablando encima. Entrega mañana a las 11:00. Trabaja con autonomía, no preguntes salvo bloqueo real, y reporta al final con lo hecho, lo no hecho y la URL desplegada.

## 1. Qué se entrega y cómo se evalúa

La entrega es un formulario con nombre, descripción, repo público, URL de demo y URL de vídeo de cinco minutos. Embat evalúa tres cosas a partes iguales: la definición del score y sus dimensiones, qué producto se entrega y cómo lo usa el cliente, y cómo de monetizable es. La demo corre sobre datos precalculados; nadie va a meter datos nuevos. Un modelo sencillo con un producto claro gana a uno sofisticado sin producto.

## 2. Estado del repo

Repo `amarkosmarkos/Elkano_Embat`, rama `xubranch`. Trabaja ahí y haz commits pequeños con mensajes claros. No toques `main`, ni `analytics/`, ni `pipeline/`, ni `eda/`, ni `output/`.

```
apps/web/                      Next.js 15, App Router, React 19, Tailwind v4, TypeScript, export estático
  app/intro/page.tsx           0. Barco: scroll controla el vídeo, aparecen las siete ventanas, isla final
  app/page.tsx                 1. Datos: cinco cifras y siete ventanas
  app/score/page.tsx           2. Score: histograma, tabla con filtros y chips
  app/empresa/[id]/page.tsx    3. Ficha: score, dimensiones, qué se movió, gráficas, tarjetas de producto, avisos
  app/grupo/[id]/page.tsx      4. Grupo: miembros, propuestas de pooling, flujo aportan → reciben
  app/monitor/page.tsx         5. Monitor: avisos del mes
  components/                  Nav, Shell, ScoreTable, DecisionCard, charts (SVG a mano)
  lib/data.ts                  lee public/data/*.json en build; lib/types.ts es el esquema
  public/data/                 overview.json, companies.json, groups.json, company/COMP_xxxx.json (1.282)
  public/video/barco.mp4       render actual del barco, 13 s, 1280x720, 4 MB
  public/intro/elkano.html     el mar de datos (canvas, autocontenido, con sus dos .js al lado)
  scripts/build_demo_data.py   regenera public/data desde output/ (no hace falta tocarlo)
pitch.md                       guion de cinco minutos con las empresas reales de la demo
human-text-only.md             los productos explicados en prosa
```

Comandos, desde la raíz del repo. pnpm no está en el PATH, se usa por npx:

```
npx --yes pnpm@11.25.0 install
npx --yes pnpm@11.25.0 --filter web dev        # http://localhost:4321
npx --yes pnpm@11.25.0 --filter web build      # export estático a apps/web/out (1.535 páginas, ~1 min)
```

El build tiene que pasar siempre. `next.config.mjs` lleva `output: "export"` y `trailingSlash: true`; las rutas dinámicas usan `generateStaticParams` leyendo `companies.json` y `groups.json`. Sin dependencias nuevas salvo necesidad clara. Sin Convex, aunque siga en package.json.

Puede haber trabajo sin commitear en `apps/web` de una pasada anterior que hacía que las tarjetas de producto operen de verdad (fichero `lib/ops.ts`, componentes `ExcedentesCard.tsx` y `PoolingCard.tsx`, página `app/operaciones/page.tsx`). Mira `git status` al empezar. Si está, revísalo, haz que el build pase y commitea. Si no está, lo haces tú según el punto 5.

## 3. Datos que lee la web

Esquema en `apps/web/lib/types.ts`. Lo esencial:

- `companies.json`: por empresa `score` 0 a 100, `score_3m`, `score_6m`, `delta3`, `delta6`, `tier` verde/ambar/rojo (70 y 40), `trend` mejora/empeora/estable (±5 puntos a seis meses), `alert`, `explanation`, `c` con las cinco dimensiones (pago, liquidez, caja, deuda, concentracion), `cash`.
- `company/COMP_xxxx.json`: `months[]` con score, dimensiones, entradas, salidas, saldo fin de mes y mínimo, DPO, DSO, retraso a proveedores, devoluciones; `events[]` de impago; `anticipation` con meses de antelación; `products` con bancos y líneas; `cards.excedentes` (suelo de caja, propuesta, plazo, rendimiento), `cards.pooling` (miembros y propuestas con límite y tipo interno), `cards.alertas` (cuotas, proveedores, recibos, score).
- `groups.json`: miembros, excedente, dispuesto, descubierto, neteable, ahorro anual.
- `overview.json`: cifras globales y las siete ventanas.

Empresas del guion: COMP_0945 se tuerce de 72 a 45, COMP_0640 mejora de 52 a 82, COMP_0054 coloca 5,9 millones, GROUP_0067 netea 890.000 con tres préstamos internos, COMP_0636 dispara el monitor.

## 4. Guion de la web, que es el vídeo

| Tiempo | Ruta | Pantalla | Voz |
|---|---|---|---|
| 0:00 a 0:15 | /intro | Mar de datos, luego el barco con las velas de Embat | Somos Luken, Nagore, Markos, David y Xuban. Nos hemos subido al barco de Embat para navegar este mar: 1.286 empresas, 24 meses, dos millones y medio de movimientos |
| 0:15 a 0:55 | /intro | El barco avanza y a su paso aparecen las siete ventanas, una cada cinco segundos | Las siete frases de la sección 1 de pitch.md |
| 0:55 a 1:05 | /intro | El barco llega a la isla, se para, fundido | Siete ventanas, siete verdades parciales. Nos paramos a pensar: ¿y si todo cupiera en un solo número? |
| 1:05 a 2:05 | /score y /empresa/COMP_0945, luego /empresa/COMP_0640 | Score, ficha con la caída y las dimensiones, luego la que mejora | Sección 2 de pitch.md, con la antelación de cuatro meses |
| 2:05 a 3:20 | /empresa/COMP_0054, /grupo/GROUP_0067, /empresa/COMP_0636 | Aprobar la colocación, aprobar los préstamos internos, ver los avisos | Secciones 3 y 4 |
| 3:20 a 3:50 | / o /operaciones | Totales: 535 millones parados, 85 neteables, lo ejecutado en la demo | Sección 5, comprador y dinero |
| 3:50 a 4:05 | /cierre | Barco navegando, logo, nombres | Cierre |

## 5. Tareas, en orden de prioridad

### A. Blender: dos planos nuevos

1. Plano lateral largo del barco navegando de izquierda a derecha, mar tranquilo, velas con el símbolo de Embat, 40 segundos, 1280x720, 24 fps. Cámara casi fija con un travelling muy suave para que las tarjetas de texto tengan sitio a la derecha. Sin música. Exporta h264, crf 23, yuv420p, faststart, sin audio, menos de 8 MB, a `apps/web/public/video/barco-largo.mp4`.
2. Plano de la isla, 6 segundos: el barco llega a una costa o fondea frente a una isla y se detiene. Mismos parámetros, a `apps/web/public/video/isla.mp4`. Si no llega, un fotograma fijo del barco de perfil en `apps/web/public/video/isla.jpg` y el fundido lo hace la web.
3. Un fotograma limpio del barco para el cierre en `apps/web/public/video/cierre.jpg`.

Los blend y scripts están en la carpeta `blender/` del proyecto hackspain, junto al repo, no dentro. `ELKANO-branded-sails.blend` es el que tiene las velas con el logo.

### B. Web: intro y cierre

- En `app/intro/page.tsx` sustituye `barco.mp4` por `barco-largo.mp4` y ajusta los umbrales para que las siete ventanas aparezcan repartidas a lo largo del vídeo, una cada cinco segundos de scroll aproximadamente. La página ya convierte el scroll en `currentTime` del vídeo y admite `?p=0.5` para saltar a un punto del viaje; úsalo para capturas.
- Tramo final: cuando el vídeo largo termina, corta al plano de la isla o al fotograma, y sobre él la frase "Siete ventanas, siete verdades parciales. ¿Y si todo esto cupiera en un solo número?" con el botón a /score. Ya existe la capa, solo hay que enchufar el vídeo o la imagen.
- Nueva ruta `/cierre`: fotograma del barco a pantalla completa, logo Elkano, los cinco nombres, los totales (535 M€ parados en 312 empresas, 85 M€ neteables hoy, 182 empresas con alerta antes del impago, mediana cuatro meses) y una línea: "Agicap vende estas decisiones como módulos sueltos. Embat las tendría sobre un score que nadie tiene." Añádela a la barra como paso 7.
- Navegación con teclado entre pasos: flecha derecha e izquierda saltan de ruta en el orden de la barra. Es para que Xuban no tenga que buscar con el ratón mientras habla.

### C. Web: productos que funcionan de verdad

Si no está hecho, implementa esto con estado local en el navegador, persistido en localStorage, sin backend:

- `lib/ops.ts`: almacén de operaciones ejecutadas con un hook `useOps()` que expone la lista, añadir, quitar y vaciar. Tipos: colocación (empresa, importe, plazo, tipo, banco, mes de inicio, vencimiento, rendimiento anual), préstamo interno (grupo, de, a, importe, tipo interno) y aviso resuelto (empresa, título). Todo acceso a localStorage en try/catch y seguro en SSR.
- `ExcedentesCard.tsx` en la ficha: importe editable hasta el suelo de doce meses, plazo 3, 6 o 12 meses, botón "Aprobar colocación". Al aprobar, la tarjeta pasa a ejecutada: "Depósito de X a N meses en <banco>, vence <mes>, rendimiento estimado Y al año", con "Deshacer". Encima, "Caja disponible" que baja con lo colocado.
- `PoolingCard.tsx` en ficha y grupo: cada propuesta con su botón "Aprobar" y un "Aprobar todas". Al aprobar, los saldos de las filiales cambian en pantalla: la que presta baja su caja, la que recibe baja lo dispuesto. Totales de movido y ahorro anual al 5% que se actualizan.
- Monitor: botón "Resuelto" por aviso, con un toggle para mostrar los resueltos.
- `/operaciones`: tabla de todo lo ejecutado, más reciente primero, con totales de colocado, neteado, rendimiento y ahorro, y botón "Vaciar" para reiniciar antes de grabar. Paso 6 de la barra.

### D. Despliegue

Vercel, proyecto nuevo, raíz `apps/web`, comando de build `npx --yes pnpm@11.25.0 build`, directorio de salida `out`. Comprueba que `/intro/`, `/score/`, `/empresa/COMP_0945/`, `/grupo/GROUP_0067/` y `/operaciones/` abren en la URL pública. Pon la URL en el reporte y en `README.md` de la rama.

## 6. Restricciones

- Todo el texto de la web en español, sin guiones largos ni flechas tipográficas en prosa.
- Estilo: el que ya hay. Blanco, azul marino 0B1F3A, semáforo verde, ámbar y rojo, gráficas en SVG sin librerías. Desktop a 1280 de ancho, que es lo que se graba.
- No cambies el esquema de los JSON ni los regeneres. Si necesitas un campo nuevo, calcúlalo en el cliente a partir de lo que hay.
- No inventes cifras. Las que hay en pitch.md y en overview.json son las buenas.
- Si algo del guion no cabe en el tiempo, prioriza en este orden: productos funcionando, despliegue, intro con el vídeo largo, cierre, teclado.

## 7. Verificación antes de reportar

```
npx --yes pnpm@11.25.0 --filter web build
cd apps/web/out && python3 -m http.server 4399
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4399/intro/
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --window-size=1280,900 \
  --virtual-time-budget=4000 --screenshot=/tmp/intro.png "http://localhost:4399/intro/?p=0.5"
```

Mira las capturas. Si algo se solapa o se corta, arréglalo antes de reportar.

## 8. Reporte final

Cinco líneas: URL pública, commits hechos, qué funciona de la lista del punto 5, qué no y por qué, y qué debe hacer Xuban antes de grabar (por ejemplo, vaciar operaciones y abrir /intro).
