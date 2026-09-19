# output/ · datos del reto y resultados del score

Esta carpeta mezcla tres cosas con destinos distintos:

| qué | dónde | ¿en el repo? |
|---|---|---|
| **Datos crudos del reto** (8 CSV, 646 MB) | `output/*.csv`, `data_dictionary.md` | **No.** Descomprimir `output_hackspain_data.zip` en la raíz del repo |
| **Preprocesado** (bronze/silver/gold en parquet, DuckDB, informe de calidad) | `output/01_preprocessed/` | **No.** Se regenera con `./pipeline/run.sh` (~1 min) |
| **Resultados del score y de su validación** | `output/02_score/`, `output/03_validation/` | **Sí** (12 MB), fichero a fichero en `.gitignore`. Es lo que hay que consumir desde producto |

Los datos son fijos (2024-09 → 2026-09, no llegan datos nuevos), así que el score está calculado de una vez para
todas las empresas y todos los meses: **la app no calcula nada, lee estos ficheros**. Cómo se construyen las
métricas y el score: [`analytics/README.md`](../analytics/README.md); fundamentos: [`docs/salud.md`](../docs/salud.md)
y [`docs/validacion_salud.md`](../docs/validacion_salud.md).

## `02_score/` · el score

Tres versiones con el **mismo contrato** (`company_id, month, score, score_version, c_<dimensión>, alert, explanation`).
Cada una tiene 15.803 filas = 1.282 empresas × sus meses (2025-02 → 2026-08). Una empresa empieza a tener score
en su 6º mes con movimientos; 4 de las 1.286 no llegan a 6 meses y no tienen score.

| fichero | versión | qué es | Gini h1 / h3 / h6 (OOS) |
|---|---|---|---|
| **`scores_v3.csv`** | `v3-gbm` | **el score a usar.** Gradient boosting sobre las 105 métricas; el score es literalmente 100 − P(evento de impago en 3–6 meses) | **0,54 / 0,44 / 0,38** |
| `scores_v2.csv` | `v2-gini` | fórmula transparente: pesos ∝ Gini univariante de cada métrica. Su `explanation` dice la métrica concreta ("colchon 1,93 → 0,85") | 0,43 / 0,36 / 0,35 |
| `scores_v1.csv` | `v1-scorecard` | scorecard literal de `docs/salud.md` §H (percentiles → dimensiones → pesos fijos). Referencia | 0,34 / 0,26 / 0,25 |
| `metrics_v1.parquet` | — | las **105 métricas por empresa y mes** con las que se calculan los tres (24 base A1–E4 + 72 de trayectoria `__delta_3m/__delta_12m/__racha` + 9 de estrés `S1…S8`, `n_stress`) | — |

### Columnas de `scores_v3.csv`

| columna | significado |
|---|---|
| `company_id`, `month` | empresa y mes de observación (`YYYY-MM`). El score usa solo datos ≤ fin de ese mes |
| `score` | 0–100, mayor = más sana. Publicado con suavizado 0,7·hoy + 0,3·mes anterior |
| `score_raw` | el mismo score sin suavizar |
| `score_version` | `v3-gbm` |
| `c_pago`, `c_liquidez`, `c_caja`, `c_deuda`, `c_concentracion` | puntos que suma (+) o resta (−) cada dimensión. La mayor en valor absoluto es "el porqué" del score |
| `alert` | 1 si la empresa está en el 20 % peor del mes |
| `explanation` | frase corta del cambio respecto al mes anterior ("bajó 31,1 pts: liquidez"); vacía el primer mes |
| `trained_without_fold`, `score_oot` | auditoría de la validación (fold excluido al entrenar; predicción out-of-time). **No mostrar** |

Columnas extra de las otras versiones: `v2` añade `n_metrics` (métricas disponibles para esa fila); `v1` añade
`dim_<dimensión>` (percentil medio de cada dimensión), `n_stress`, `trend_bonus` y `score_no_twin` (sin suavizar).

### Reglas de uso

- **Foto actual** de una empresa = su fila de `2026-08` (último mes completo; `2026-09` tiene un solo día y no existe).
- **Evolución** = sus filas ordenadas por `month`.
- Semáforo sugerido: **≥ 70 verde · 40–70 ámbar · < 40 rojo** (cuartiles del último mes: 53 / 67 / 77).
- Para explicar un cambio: `explanation` de v3 da la dimensión; la de v2, la métrica concreta.

## `03_validation/` · etiquetas y validación

| fichero | qué es |
|---|---|
| `events_v1.csv` | **la verdad contra la que se evalúa**: una fila por empresa y mes (22.230 filas, 2024-09 → 2026-08) con las cuatro reglas de impago y su agregado. Calculado con todos los datos, así que sirve para "qué pasó después" en demos, **no** como input del score |
| `splits.csv` | 1.286 empresas → `group_id` y `fold` (0–4). Los 5 folds se cortan **por grupo** para que empresas del mismo grupo no caigan en train y test a la vez |
| `labels_summary.json` | tasa de evento (19,1 %), tasa por regla, umbrales usados |
| `report_v{1,2,3}.md` / `.json` | evaluación de cada versión: criterios de aceptación, Gini/KS por horizonte, lead time, cura, OOS por fold, OOT, PSI, autocorrelación, univariante por métrica |
| `comparison.md` | las tres versiones en una tabla |

Columnas de `events_v1.csv`:

| columna | regla |
|---|---|
| `D1` | factura recibida vencida ≥ 90 días, sin pagar a fin de mes, de importe ≥ 25 % de las salidas mensuales y con < 6 meses de antigüedad |
| `D2` | falta el pago de nómina / seguridad social / impuestos que existía en los 6 meses anteriores |
| `D3` | saldo de cuenta corriente < 0 durante ≥ 5 días del mes |
| `D4` | intereses + comisiones > 3 × la mediana de 6 meses y > 2 % de las salidas |
| `event` | 1 si se cumple alguna de las cuatro |
| `cure` | 1 si la empresa sale del evento y se mantiene fuera |

### Lo que dice la validación de v3 (`report_v3.md`)

- Ordena bien a corto plazo (Gini h1 0,54) y peor a 6 meses (0,38, por debajo del mínimo de 0,40 del doc).
- Robusto: sin caída in-sample → out-of-sample (−0,001), sin caída out-of-time, PSI 0,07, autocorrelación 0,93.
- Punto débil: **lead time** — avisa a la vez que el evento, no antes (mediana 0 meses; 31 % de los casos con ≥ 2 meses de antelación).
- `alert` (20 % peor del mes): precisión 0,67 · recall 0,41 a 3 meses.

## Regenerar

```bash
./pipeline/run.sh                # todo lo que haga falta (~1 min); necesita los CSV del zip en output/
./pipeline/run.sh --from score   # solo score + validación (p. ej. tras tocar un scorer en analytics/)
```

Si se regeneran, **commitear los ficheros de esta lista** (los que no están en ella —`.pipeline_state.json`,
otros parquet, restos de versiones antiguas— siguen ignorados a propósito).
