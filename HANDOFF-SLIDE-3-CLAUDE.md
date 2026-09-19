# Diseñar la slide 3 con Claude

## Encargo actual

Xuban pide: «le puedes hacer un handoff a claude para que diseñe la slide 3 con claude?». Quiere una revisión de diseño real e implementada, no una propuesta en texto. La slide se ha iterado varias veces sin convencerle. La última composición tiene un panel azul a la derecha; no está aprobada. Puedes replantearla dentro de las decisiones siguientes.

Trabaja en `/Users/xuban.ceccon/Documents/hackspain/Elkano_Embat`, checkout normal, rama `xubranch`. No crear otro worktree ni copiar el proyecto. Hay cambios locales de varios agentes: inspeccionar `git status` y conservarlos. Último commit compartido al preparar este relevo: `af7526f`. Este encargo se limita a diseñar la slide 3, conservando navegación y funcionalidad.

Conversación de origen: `codex session 01a0ba8b-1f50-74d2-a989-41f16e78003c`.

## Qué leer primero

1. `apps/web/DESIGN-EMBAT.md`, especialmente §9 «Diseño elegido para las slides de contenido».
2. `apps/web/components/CelestialScore.tsx` y `CelestialScore.module.css`.
3. `apps/web/app/calculo-score/page.tsx`, que monta ese componente.
4. `docs/score-slide-design.md`, para procedencia de datos y texturas.
5. `apps/web/app/embat-presentation.css`, `components/PresentationNav.tsx`, `PresentationBrand.tsx` y `PresentationIcons.tsx` para mantener la coherencia.

## Decisiones expresas de Xuban

- Una única slide. El argumento completo debe verse junto; nada de subslides, pestañas, pasos ocultos o carruseles automáticos.
- El mensaje principal es **SCORE VALIDADO**. Debe dominar sobre los Gini, que son evidencia secundaria.
- El flujo parte de **105 variables estadísticas**, pasa por el modelo y acaba en un **score de 0 a 100**. Comunicar la estimación del estado actual y de la tendencia futura.
- Quiere una cartulina azul oscuro rugosa. La textura debe verse; no ocultarla bajo una capa casi opaca. La textura actual es `public/images/score-navy-cardstock-v2.png`. Es un recurso disponible, no obliga a mantener exactamente el tratamiento actual.
- Después de probar caligrafía, la rechazó por desentonar. Usar **Manrope**, como el resto de la presentación. El documento explica que Haffer es la fuente de Embat y Manrope la sustituta autorizada aquí. Sin cursivas ni fuentes mezcladas, sin letras metalizadas, sin dorados, sin brillo.
- Pocos tamaños coherentes: referencia actual 52 px para titular/cifras protagonistas, 24 para encabezados/cifras secundarias y 18 para lectura, pesos 500/400. No volver a letra diminuta ni reducir todo para que quepa.
- Quitó explícitamente el rótulo «03 / CÓMO CALCULAMOS EL SCORE».
- Quitó las líneas separadoras horizontales. Separar con espacio.
- Primero pidió el diagrama de nodos, pero **después pidió quitarlo**. La orden más reciente manda: NO reintroducir red neuronal, conexiones o nodos.
- Flechas SVG normales y discretas sí están autorizadas. Evitar flechas Unicode y caracteres usados como iconos. Esto prevalece sobre cualquier frase genérica de «no arrows» que añada el script de handoff.
- No usar puntos centrados como separadores de texto en ninguna slide.
- Aplicar la skill `humanizer` al redactar. Mantener texto natural y hechos verificables. La frase exacta que pidió para la evidencia es **«Comprobado con Gini»**.

## Datos y límites que conservar

- 105 variables: 24 métricas base, 72 cambios/rachas y 9 columnas de estrés. El modelo añade percentiles. No decir «120 métricas conocidas».
- Modelo real: gradient boosting, combinación de estimaciones de estrés a 3 y 6 meses y suavizado mensual. No es una red neuronal.
- Mayor score significa menor estrés estimado. Es una estimación, no una certeza sobre el futuro.
- Gini: **0,54 a 1 mes; 0,44 a 3 meses; 0,38 a 6 meses**.
- Evaluación por grupos excluidos del entrenamiento. 1.282 empresas y 15.803 registros de empresa y mes. Comprobación temporal adicional a 3 meses.
- Fuente comprobada: `../team-review-main/output/03_validation/report_v3.md` y los generadores/evaluador de `../team-review-main/analytics/`.
- Datos sintéticos y eventos de estrés construidos con reglas. No hay etiquetas externas de quiebra. Los eventos incluyen facturas recibidas muy vencidas, pagos habituales ausentes, descubierto y aumento del coste financiero.
- «Validado» significa evaluado en ese contexto. A 6 meses Gini 0,379 y KS 0,268 no alcanzan los mínimos internos; lead time mediano 0 meses. También hay una limitación de disponibilidad histórica de snapshots de deuda. El score no es una probabilidad de impago calibrada para un único plazo.
- Estas precisiones ya están en «Método y alcance». Conservar el acceso a ellas, sin llenar la slide con un informe técnico ni convertir la afirmación principal en una certificación de producción.

## Estado visual actual

Ahora hay un titular arriba, 105 variables a la izquierda, una explicación textual del modelo en el centro y el resultado en un único panel azul Embat a la derecha. Debajo están Gini y el botón de método. Es la última tentativa, no una solución que debas preservar. Xuban ha señalado que el diseño parece pobre y pide tu criterio.

Mantener una composición clara y con intención, sin proliferar tarjetas, paneles, variantes tipográficas ni detalles decorativos. El contenido debe poder leerse desde una sala. El fondo es un medio, no el protagonista.

## Desarrollo y verificación

- Localhost actual: `http://localhost:4321/calculo-score/?present=1`.
- Next dev ya está ejecutándose. No reiniciarlo salvo necesidad. `.next-dev` está separado de `.next` para que `next build` no rompa el servidor.
- Comprobar 1280 × 720 y 1440 × 900 sin scroll de escritorio, y 390 px sin desbordamiento horizontal. La marca y el widget fijos no deben tapar contenido.
- Un Playwright funcional está en `/tmp/embat-style-study/node_modules/playwright`, con `chromium.launch({headless:true,channel:'chrome'})`. Se han tomado capturas así desde Node. No hace falta instalar otro navegador.
- Últimas capturas de la composición actual: `/tmp/score-composition-1280.png` y `/tmp/score-composition-1440.png`.
- TypeScript: `./apps/web/node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json` desde la raíz del repo. Build: `npm run build --prefix apps/web`.

## Cambios ajenos a preservar

El footer ya tiene «Elkano» y «Plataforma» centrados al mismo nivel, con subrayado absoluto que no altera la altura en hover. El widget mide 400 px, usa iconos SVG y muestra el contador una sola vez, por ejemplo `02 / 11 El problema`. Las flechas de teclado cambian de slide, no reproducen vídeos. Hay trabajo de otros agentes en productos, seguros, vídeos y casos: no restaurar ni sobrescribir esos archivos para rediseñar el score.

Empieza mirando la slide actual y la guía, diseña e implementa una alternativa más convincente, verifica las capturas y enséñasela a Xuban.
