# Elkano — Embat · HackSpain 2026

## Enunciado — Track Embat

> **Tesorería en tiempo real con IA para equipos financieros de medianas y grandes empresas.** Automatiza hasta el 80% del trabajo manual, con 400 clientes en Europa y una Serie B de 30M€ liderada por Cathay Innovation.
>
> Sponsor: <https://www.embat.io> · Track: <https://hackspain.com/tracks>

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Postgres (Docker) + Drizzle ORM
- Tailwind CSS v4

## Arrancar la plataforma

Requisitos: Node ≥ 22.12, pnpm 11.x.

```bash
pnpm install
pnpm dev                # http://localhost:4321
```

La plataforma (`apps/web`) lee el score real y las métricas directamente de los ficheros del repo — no necesita
Postgres. Qué lee cada pestaña y cómo regenerar el dataset: [`apps/web/README.md`](apps/web/README.md).
(`docker compose up -d` sigue levantando el Postgres del contrato heurístico para quien lo use.)

## Marketplace demo (frontend)

```bash
docker compose --profile marketplace up --build   # → http://localhost:8080
```

Credit marketplace built on the v3 score: network of qualified companies → lender / receiver profiles → portfolio
builder → monitoring over real score history → action center. Ver [`apps/marketplace/README.md`](apps/marketplace/README.md).

## Knowledge base

Documentación del reto y de los datos en [`docs/`](docs/README.md):

- [Reto X Ray](docs/reto-xray.md) — enunciado, requisitos de entrega, evaluación e ideas de producto.
- [Mapa de datos](docs/data-map.md) — relaciones entre CSV, volúmenes, tipos de columna y avisos de calidad ([versión visual](docs/data-map.html)).
- [Salud](docs/salud.md) — métricas con fórmula y cómo se combinan en el score.
- [Validación](docs/validacion_salud.md) — evento de impago, Gini, lead time, out-of-sample y criterios de aceptación.
- [EDA](eda/report.html) — análisis exploratorio completo con ~70 gráficos (`open eda/report.html`; regenerar con `./eda/run.sh`, ver [eda/README.md](eda/README.md)).
- [Pipeline](pipeline/README.md) — `./pipeline/run.sh`: RAW → preprocesamiento (bronze/silver/gold) → etiquetas → score → validación, con checkpoints en `output/0{1,2,3}_*` (solo re-ejecuta lo que cambió).
- [Analytics](analytics/README.md) — una función por métrica de `docs/salud.md`, tres generadores de score (v1 scorecard, v2 ∝ Gini, v3 GBM) y el evaluador de `docs/validacion_salud.md`.

Los datos crudos (`output/*.csv`, 646 MB) no van al repo: descomprimir `output_hackspain_data.zip` en la raíz.
**Los resultados del score sí van**: `output/02_score/scores_v3.csv` (+ v1, v2, las 105 métricas) y la validación en
`output/03_validation/`. Qué contiene cada fichero y cómo usarlo: [`output/README.md`](output/README.md).
