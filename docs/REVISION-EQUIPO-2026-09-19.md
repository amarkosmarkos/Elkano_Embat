# Inventario del trabajo del equipo

Snapshot revisado: `origin/main` en `655091c`, marketplace en
`origin/feat/marketplace-lenders-borrowers` en `1d4f44a`, slides en
`origin/feat/slide3-sky-story` en `cdd8780`. La revisión de main se hizo en un
worktree separado para no reemplazar la presentación de xubranch.

Se han leído código, documentación e informes guardados. No se ha reentrenado
el modelo ni levantado la plataforma completa con Postgres. Las autorías que
se mencionan son las de Git, no una atribución de quién hizo cada idea.

## 1. Nagore: visualización de la cartera

Sus commits recientes modifican `/datos`, `PortfolioScrubber`, consultas,
formato de cifras, diseño y logo. La pantalla tiene:

- Selector de mes y reproducción automática del histórico.
- Score medio y cambio a seis meses.
- Empresas mejorando, deteriorando y alertas del mes.
- Distribución animada con un punto por empresa.
- Listas de las empresas que más suben y bajan entre meses.

Los datos llegan desde Postgres. El slider mueve el índice local sin volver a
consultar la base por cada mes. No es un nuevo modelo de scoring: es una forma
de explorar sus resultados. Fuente: `apps/web/components/datos/PortfolioScrubber.tsx`
y `apps/web/lib/queries.ts` en main.

## 2. Luken: plataforma y cash pooling

Next.js, Postgres y Drizzle, con rutas `/datos`, `/score`, `/empresas`,
`/empresas/[id]`, `/productos` y las tres páginas de producto.

El cash pooling sí tiene una aplicación interactiva completa:
selección de grupo y mes, filiales, propuestas, revisión de movimientos,
supuestos editables e historial de decisiones simuladas.

El motor limita por moneda, score, tendencia y reserva de liquidez. Usa cambios
por mes calendario y distingue mejora, estabilidad, bache y deterioro. Rechaza
datos desconocidos o fuera de rango. Calcula ahorro neto restando coste de
oportunidad y comisión. Solo propone movimientos rentables y controla que no
se sobrepasen los límites de aportantes y receptores.

He ejecutado los 15 tests de `apps/web/lib/cashpool.test.ts`: 15 pasan, 0 fallan.
Se compilaron a JavaScript temporal con TypeScript y se ejecutaron con node:test.
Esto verifica el motor, no toda la UI ni la conexión a Postgres.

Los tipos, plazos, comisiones y reserva mínima son supuestos configurables de
simulación, no condiciones bancarias contratadas. Aprobar no envía dinero real.

Las páginas `/productos/excedentes` y `/productos/monitor` de main contienen
explicación y cifras. No son demos operativas equivalentes al cash pooling.
La ficha de empresa recomienda productos mediante reglas en `lib/recommend.ts`.

## 3. Markos: marketplace

Aplicación separada en `apps/marketplace`, con Vite y React. La rama feature
tiene cambios que todavía no están todos en main:

- Lenders: seleccionar empresa que aporta capital, mapa y filtros.
- Borrowers: candidatos compatibles y construcción de una cartera para ese lender.
- Ficha: score, radar de dimensiones, histórico, 24 métricas, cambios a 3/12 meses,
  rachas, flags de estrés y tratamiento explícito de datos no medidos.
- Monitor: reproducción del histórico de la cartera y cambios por posición.
- Actions: reducir, pausar, revisar o aumentar posiciones; ejecución simulada y deshacer.
- Escenarios: bandas de cambios históricos de empresas con score y tendencia similares.

El asignador limita exposición y concentración por grupo, excluye al lender y
a su grupo, y penaliza perfiles parecidos usando similitud de contribuciones.
Esa similitud no es una correlación empírica de impagos. La capacidad calculada
es un índice de elegibilidad, no un saldo bancario disponible.

Los nombres comerciales son alias de presentación; el identificador real es
COMP_xxxx. El diseño del marketplace sigue siendo de mapa pirata y no coincide
todavía con la adaptación a la marca Embat de xubranch.

## 4. Pipeline cuantitativo y EDA

Los commits de este bloque aparecen a nombre de Markos. Hay un EDA HTML con
unas 70 gráficas; ingestión, limpieza con flags, capas bronze/silver/gold,
reconstrucción de saldos, panel mensual y 47 comprobaciones de calidad.

Hay 105 métricas: 24 base, 72 de trayectoria y 9 columnas de estrés. Cinco
dimensiones: pago, liquidez, caja, deuda y concentración. Los scores publicados
tienen 15.803 filas para 1.282 empresas; cuatro no tienen historia suficiente.

Las etiquetas no vienen de una lista externa de quiebras. Se construyen con
cuatro reglas: facturas grandes vencidas, ausencia de pagos habituales,
descubiertos y aumentos de intereses/comisiones. Son eventos de estrés definidos
por el equipo, no defaults bancarios certificados.

Tres versiones:

| Versión | Método | Gini h1 | Gini h3 | Gini h6 |
| --- | --- | ---: | ---: | ---: |
| v1 | Scorecard | 0,339 | 0,262 | 0,248 |
| v2 | Pesos según Gini univariante | 0,433 | 0,362 | 0,347 |
| v3 | Gradient boosting | 0,540 | 0,439 | 0,379 |

El v3 combina probabilidades de eventos a tres y seis meses, y suaviza el
resultado publicado. La validación excluye grupos completos al entrenar y
tiene una prueba temporal. Las contribuciones se obtienen suprimiendo métricas
de una dimensión: no son pesos fijos ni una descomposición necesariamente
aditiva a partir de 50 puntos.

## 5. Qué debe corregirse antes del pitch

1. El informe v3 da anticipación mediana de 0 meses. No respalda una afirmación
   general de cuatro meses de adelanto. El 31,2% con dos meses de antelación usa
   un denominador distinto del porcentaje avisado antes o en el evento; conviene
   aclararlo antes de usar ambas cifras juntas.
2. A seis meses, Gini 0,379 y KS 0,268 no pasan los mínimos del propio documento.
   El Gini de mejora es 0,035. El Gini para nuevos eventos h6 baja a 0,203.
3. No mezclar los pesos 30/25/20/15/10 del v1 con la explicación del v3. La página
   `/score` de main mezcla ambas narrativas y redondea algunos resultados de
   forma distinta al informe publicado.
4. El README principal aún dice que la base contiene un score heurístico, pero
   el seed actual importa scores_v3 y caja reconstruida. Hay documentación desactualizada.
5. `newAlerts` cuenta todas las filas con alerta en el mes, no solo las alertas
   que acaban de aparecer. El rótulo 'Alertas nuevas' debe revisarse.
6. Las bandas del marketplace usan históricos de todo el dataset, sin separación
   temporal propia para ese cálculo. Son escenarios descriptivos, no una segunda
   predicción validada fuera de muestra.
7. La recomendación de excedentes en main usa aproximadamente el 45% del saldo
   actual. No implementa por sí sola la promesa de calcular un suelo de caja de
   doce meses. Es una regla orientativa de producto.

## 6. Slides y presentación

SkyStory, en su rama específica, dibuja señales, constelaciones, score y logo
de Embat en canvas/SVG. Ya está fusionado en xubranch. El fondo de estrellas
del vídeo y los puntos dibujados siguen siendo capas independientes; falta
resolver su correspondencia visual.

La presentación de xubranch mantiene vídeos y navegación, mientras main tiene
la plataforma con base de datos. Un pull completo de main no equivale a enchufar
las demos: hay que resolver rutas compartidas, layout, estilos, dependencias y
la diferencia entre export estático y páginas dinámicas con Postgres.

Orden propuesto de integración: visualización de Nagore para explicar el score,
cash pooling como demo de decisiones internas, marketplace como demo de
financiación entre empresas, y luego ajustar el relato con los resultados reales
de validación. No se han modificado cálculos o reglas durante esta revisión.
