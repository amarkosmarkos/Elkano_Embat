# Elkano X-Ray · plataforma

Dashboard común sobre el score v3: cartera, empresas, grupos, análisis de datos, trazabilidad del score y los tres
productos, con un tema oscuro (navy + madera). Next.js 15 · React 19 · Tailwind v4 · SVG/canvas propios, sin librería de gráficos.

```bash
pnpm install
pnpm --filter web dev        # http://localhost:4321  (no necesita Postgres)
```

## De dónde salen los datos

La app **no calcula nada ni necesita base de datos**: lee ficheros del repo en memoria una vez por proceso (`lib/data/store.ts`).

| fichero | qué aporta |
|---|---|
| `apps/marketplace/public/data/network.json` + `companies/<id>.json` | el score v3 real, 5 contribuciones, 24 métricas × 24 meses, trayectoria, 8 alarmas, explicaciones v3/v2 (salida de `apps/marketplace/etl/build_dataset.py`) |
| `data/companies.json`, `data/scores.json` | nombres, grupos, ERP/deuda y las **señales de tesorería** del contrato (caja, flujo, runway, DSO/DPO, deuda) para Caja, cash pooling y tesorería |
| `output/03_validation/*` | eventos de impago (D1–D4, cura), informes de validación, comparación de versiones |
| `eda/eda_data.json` | agregados del EDA para las pestañas de Análisis |

Si `apps/marketplace/public/data` no existe, regenéralo (necesita `output/companies.csv` y `output/groups.csv` del zip del reto):

```bash
docker run --rm -v "$PWD/output:/data:ro" -v "$PWD/apps/marketplace:/app" elkano-eda \
  python /app/etl/build_dataset.py --data /data --out /app/public/data
```

Variables opcionales: `XRAY_DATA_DIR` (otra carpeta con `network.json` + `companies/`), `XRAY_REPO_ROOT`,
`NEXT_PUBLIC_MARKETPLACE_URL` (por defecto `http://localhost:8080`, la app del marketplace embebida por iframe).

## Mes global

La cabecera fija el mes de observación (cookie `xray_month`); todas las pestañas lo respetan. El scrubber de Cartera › Mapa
lo mueve también.

## Directorio

```
/cartera        mapa · movimientos · calor · bandeja (monitor)
/empresas       explorador → /empresas/[id]: resumen · métricas · alarmas · caja · decisiones
/grupos         lista → /grupos/[id]
/analisis       universo · ventanas · señal · dimensiones · flujos · facturas · deuda · bancos · calidad
/score          árbol (1 → 5 → 24 → 105) · versiones · validación · calibración · evento · casos
/productos      01 marketplace (iframe) · 02 cash pooling · 03 tesorería (excedentes · cuotas · pagos) · operaciones
```

`lib/db`, `lib/queries.ts` y `scripts/seed.ts` son el camino Postgres anterior (contrato heurístico); la UI ya no los usa.
