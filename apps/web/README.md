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
| `output/02_score/cash_position.csv` | **caja real** a fin de mes por empresa, reconstruida desde `balances.csv` + `transactions.csv` (`tools/export_cash_position.py`); alimenta Caja, Grupos y el cash pooling |
| `output/03_validation/*` | eventos de impago (D1–D4, cura), informes de validación, comparación de versiones |
| `eda/eda_data.json` | agregados del EDA para las pestañas de Análisis |

Si `apps/marketplace/public/data` no existe, regenéralo (necesita `output/companies.csv` y `output/groups.csv` del zip del reto):

```bash
docker run --rm -v "$PWD/output:/data:ro" -v "$PWD/apps/marketplace:/app" elkano-eda \
  python /app/etl/build_dataset.py --data /data --out /app/public/data
```

Variables opcionales: `XRAY_DATA_DIR` (otra carpeta con `network.json` + `companies/`), `XRAY_REPO_ROOT`.

## Mes global

La cabecera fija el mes de observación (cookie `xray_month`); todas las pestañas lo respetan. El scrubber de Cartera › Mapa
lo mueve también.

## Directorio

```
/cartera        mapa · movimientos · bandeja (monitor)
/empresas       explorador → /empresas/[id]: resumen · métricas · alarmas · caja · decisiones
/grupos         lista → /grupos/[id]
/analisis       universo · ventanas · señal · dimensiones · flujos · facturas · deuda · bancos · calidad
/score          árbol (1 → 5 → 24 → 105) · versiones · validación · calibración · evento · casos
/productos      01 marketplace (prestamistas · receptores y cartera · monitor · acciones) · 02 cash pooling (decisiones · filiales · historial)
```

## Productos

- **Marketplace** (`lib/products/marketplace/`, `components/marketplace/`): flujo por pasos Prestamista → Receptores →
  Estructurar → Economía y cierre → Monitor y acciones, más Operaciones (las cerradas). `pricing.ts` valora cada operación con
  la calibración medida del score (PD por decil a 1/3/6 meses): tipo = base + PD anual × LGD + margen por banda, comisión de
  Embat = 20 % del interés, rendimiento neto del prestamista tras pérdida esperada. `portfolio.ts` construye la cartera en
  función del perfil de riesgo, plazo, rentabilidad objetivo, capital real del prestamista (50 % de su suelo de caja), ticket,
  exposición, PD máxima y diversificación, con un embudo que explica cada descarte. El estado (prestamista, configuración,
  borrador, operaciones cerradas con sus acciones) vive en el navegador; la red se sirve en `/api/network`.
- **Cash pooling** (`lib/cashpool.ts`, `components/cashpool/CashPoolApp.tsx`, de Luken): motor con política por filial y
  propuestas con ahorro neto; `lib/products/pooling.ts` lo alimenta con el score v3 y la caja real. `pnpm test` corre sus tests.

`lib/db`, `lib/queries.ts` y `scripts/seed.ts` son el camino Postgres (mismos datos); la UI lee ficheros y no los usa.
