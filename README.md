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

Requisitos: Node ≥ 22.12, pnpm 11.x, Docker.

```bash
git clone <repo> && cd Elkano_Embat
docker compose up -d   # Postgres en :5433, con las tablas y los datos de demo ya cargados
pnpm install
pnpm dev                # http://localhost:4321
```

Eso es todo — `docker compose up -d` deja Postgres listo con datos desde la primera vez (carga
`db/init/01_seed.sql.gz` solo). Si algo se lía, `docker compose down -v && docker compose up -d`
lo recrea desde cero.

Los datos son un score heurístico ("de reglas"), no el modelo real validado del pipeline
(`analytics/`, Gini 0,55/0,44/0,38 — ver [analytics/README.md](analytics/README.md)). Están también
en crudo en `data/*.json` (el contrato de [`docs/CONTRATO_DATOS.md`](docs/CONTRATO_DATOS.md)); si
cambian, `pnpm --filter web db:push && pnpm --filter web db:seed` los recarga y
`docker exec xray-db pg_dump -U xray -d xray --no-owner --no-privileges | gzip -9 > db/init/01_seed.sql.gz`
regenera el dump.

## Knowledge base

Documentación del reto y de los datos en [`docs/`](docs/README.md):

- [Reto X Ray](docs/reto-xray.md) — enunciado, requisitos de entrega, evaluación e ideas de producto.
- [Mapa de datos](docs/data-map.md) — relaciones entre CSV, volúmenes, tipos de columna y avisos de calidad ([versión visual](docs/data-map.html)).
- [Salud](docs/salud.md) — métricas con fórmula y cómo se combinan en el score.
- [Validación](docs/validacion_salud.md) — evento de impago, Gini, lead time, out-of-sample y criterios de aceptación.
- [EDA](eda/report.html) — análisis exploratorio completo con ~70 gráficos (`open eda/report.html`; regenerar con `./eda/run.sh`, ver [eda/README.md](eda/README.md)).
- [Pipeline](pipeline/README.md) — `./pipeline/run.sh`: RAW → preprocesamiento (bronze/silver/gold) → etiquetas → score → validación, con checkpoints en `output/0{1,2,3}_*` (solo re-ejecuta lo que cambió).
- [Analytics](analytics/README.md) — una función por métrica de `docs/salud.md`, tres generadores de score (v1 scorecard, v2 ∝ Gini, v3 GBM) y el evaluador de `docs/validacion_salud.md`.

Los datos (`output/`, 646 MB) no van al repo: descomprimir `output_hackspain_data.zip` en la raíz.
