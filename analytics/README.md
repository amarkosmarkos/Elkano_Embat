# analytics · generador de score y evaluador

Implementación de [docs/salud.md](../docs/salud.md) (métricas y combinación), [docs/validacion_salud.md](../docs/validacion_salud.md)
(evento, Gini, leakage) y [docs/arquitectura-score.md](../docs/arquitectura-score.md) (loader / labels / splits / scorers / evaluator,
contratos de ficheros). Se ejecuta desde el pipeline (`./pipeline/run.sh`, pasos `labels` → `score` → `validate`) o suelto:

```bash
python -m analytics.run labels                    # → output/03_validation/events_v1.csv, splits.csv
python -m analytics.run score --version v1|v2|v3  # → output/02_score/scores_vN.csv (+ metrics_v1.parquet)
python -m analytics.run eval --scores output/02_score/scores_v3.csv   # → output/03_validation/report_v3.{json,md}, comparison.md
python -m analytics.run all
```

## Qué hay ya calculado y cómo se usa desde producto

Los datos son fijos (el zip del reto, 2024-09 → 2026-09): **no llegan datos nuevos**, así que las métricas y el score
están calculados de una vez para todas las empresas y todos los meses. La app no calcula nada: lee ficheros.

| fichero (en `output/`) | qué es | para qué |
|---|---|---|
| `02_score/scores_v3.csv` | **el score**: una fila por empresa y mes (15.803 filas, 1.282 empresas, hasta 2026-08) | ranking, semáforo, evolución, ficha de empresa |
| `02_score/scores_v2.csv` | mismo formato, versión fórmula transparente | explicaciones con la métrica concreta ("colchón 2,18 → −0,12") |
| `02_score/metrics_v1.parquet` | las 105 métricas por empresa y mes | pintar métricas concretas, gráficas de detalle |
| `03_validation/events_v1.csv` | el evento de impago por empresa y mes (D1–D4, cura) | "qué pasó después", para demos y para el jurado |
| `03_validation/report_v3.md`, `comparison.md` | la validación | argumentario: Gini, lead time, calibración |
| `01_preprocessed/gold/*.parquet` | datos limpios (movimientos, facturas, saldo diario, panel mensual) | todo lo que no sea score |

Columnas de `scores_v3.csv`:

| columna | significado |
|---|---|
| `company_id`, `month` | empresa y mes de observación (`YYYY-MM`). El score usa solo datos ≤ fin de ese mes |
| `score` | 0–100, mayor = más sana. Literal: 100 − probabilidad (%) de evento de impago en los próximos 3–6 meses |
| `c_pago`, `c_liquidez`, `c_caja`, `c_deuda`, `c_concentracion` | puntos que suma (+) o resta (−) cada dimensión. La mayor en valor absoluto es "el porqué" |
| `alert` | 1 si está en el 20 % peor del mes |
| `explanation` | frase corta del cambio respecto al mes anterior ("bajó 31,1 pts: liquidez") |
| `score_raw` | score sin suavizar (el publicado es 0,7·hoy + 0,3·mes anterior) |
| `trained_without_fold`, `score_oot` | auditoría de la validación; no mostrar |

Reglas de uso:

- **Foto actual** de una empresa = su fila de `2026-08` (último mes completo). `2026-09` no existe: tiene un solo día.
- **Evolución** = sus filas ordenadas por `month`. Empiezan en su 6º mes con movimientos; las empresas con menos de 6 meses de historia no tienen score (4 de 1.286).
- Semáforo sugerido: ≥ 70 verde · 40–70 ámbar · < 40 rojo (cuartiles del último mes: 53 / 67 / 77).
- Para explicar un cambio: usar `explanation` de v3 para la dimensión y la de v2 para la métrica concreta.
- Si hiciera falta recalcular (cambiar un umbral, una versión): `./pipeline/run.sh` y ~1 minuto. Nada de esto corre en la app.

Lo que **no** está hecho y hace falta según qué producto: el importador a Convex (el contrato del doc es cargar
`scores_vN.csv` tal cual) y, si algún día entrara una empresa nueva, persistir el modelo v3 (hoy se reentrena en cada
ejecución del pipeline).

## Una función por métrica

`metrics/__init__.py` es el registro: id del doc, nombre de columna, dimensión, orientación y función.
Cada función recibe un `Loaded` (loader.py) con **solo datos ≤ fin del mes t** y devuelve una Series por empresa.

| id | columna | dimensión | función |
|---|---|---|---|
| A1 | `retraso_pago` | pago | `pago.a1_retraso_pago` |
| A2 | `pct_pago_tarde` | pago | `pago.a2_pct_pago_tarde` |
| A3 | `falta_regular` | pago | `pago.a3_falta_regular` (y `regular_missing` para S3/D2) |
| A4 | `dso` | pago | `pago.a4_dso` |
| A5 | `pct_cobro_vencido` | pago | `pago.a5_pct_cobro_vencido` (punto en el tiempo, sin `status`) |
| A6 | `devoluciones` | pago | `pago.a6_devoluciones` |
| B1 | `colchon` | liquidez | `liquidez.b1_colchon` |
| B2 | `runway` | liquidez | `liquidez.b2_runway` |
| B3 | `dias_negativo` | liquidez | `liquidez.b3_dias_negativo` |
| B4 | `credito_disponible` | liquidez | `liquidez.b4_credito_disponible` |
| C1 | `neto_operativo` | caja | `caja.c1_neto_operativo` |
| C2 | `tendencia_3m`, `tendencia_6m` | caja | `caja.c2_tendencia_3m`, `caja.c2_tendencia_6m` |
| C3 | `volatilidad` | caja | `caja.c3_volatilidad` |
| C4 | `ratio_cobros_pagos` | caja | `caja.c4_ratio_cobros_pagos` |
| C5 | `crecimiento_cobros` | caja | `caja.c5_crecimiento_cobros` |
| D1 | `pct_dispuesto` | deuda | `deuda.d1_pct_dispuesto` |
| D2 | `servicio_deuda` | deuda | `deuda.d2_servicio_deuda` |
| D3 | `coste_financiero` | deuda | `deuda.d3_coste_financiero` |
| D4 | `deuda_cobros` | deuda | `deuda.d4_deuda_cobros` |
| E1 | `top5_clientes` | concentración | `concentracion.e1_top5_clientes` |
| E2 | `hhi` | concentración | `concentracion.e2_hhi` |
| E3 | `rating_cartera` | concentración | `concentracion.e3_rating_cartera` (+ `counterparty_rating`) |
| E4 | `clientes_activos` | concentración | `concentracion.e4_clientes_activos` |
| F | `<métrica>__delta_3m`, `__delta_12m`, `__racha` | — | `trayectoria.deltas`, `trayectoria.streaks` (para las 24) |
| G | `S1_descubierto` … `S8_caja_negativa`, `n_stress` | — | `estres.stress_events` |

Total: **105 columnas por empresa y mes** en `output/02_score/metrics_v1.parquet` (24 métricas + 72 de trayectoria + 9 de estrés).

## Convenciones que difieren del doc (medidas, no opinadas)

- **Saldo**: el doc dice "suma acumulada desde el primer movimiento". Con eso el saldo empieza en 0 y D3 marca
  descubierto en el 62 % de los meses (1.194 empresas). Se usa el saldo real reconstruido hacia atrás desde
  `balances.csv` (gold `product_day_balance`, verificado día a día): D3 = 9,3 %. El saldo real en t es información
  disponible en t, no fuga. `analytics/config.py: BALANCE_MODE`.
- **D1**: con "≥ 1 % de las salidas" y sin límite de antigüedad, D1 sale en el 27 % de los meses y es pegajoso
  (el ERP nunca marca pagadas 92 k facturas recibidas). Ajustado a ≥ 25 % de las salidas mensuales y vencida hace
  < 6 meses → D1 7,5 %, evento total **19,1 %** (rango esperado 5–20 %). `D1_MIN_SHARE_OUTFLOW`, `D1_MAX_AGE_DAYS`.
- **`payment_date`** solo es real cuando `status = 'paid'` (en el resto es un placeholder igual al vencimiento):
  el loader lo enmascara (`paid_at`) y además anula los pagos posteriores a fin de mes.
- **Contrapartes**: `counterparty_id` es único por empresa, así que el "bureau" de E3 no cruza empresas.

## Versiones del score

| versión | qué es | Gini h1 / h3 / h6 (OOS) | fichero |
|---|---|---|---|
| `v1-scorecard` | literal de salud.md §H: percentiles → dimensiones → pesos 0,30/0,25/0,20/0,15/0,10, −5·estrés, +10·tendencia, suavizado | 0,34 / 0,26 / 0,25 | `scorers/v1_scorecard.py` |
| `v2-gini` | validacion_salud.md §3.3: fuera |Gini| < 0,05 y pares |ρ| > 0,8; pesos ∝ Gini univariante; sin penalizaciones | 0,43 / 0,36 / 0,35 | `scorers/v2_gini.py` |
| `v3-gbm` | gradient boosting sobre las 105 columnas + percentiles, un modelo por fold (por grupo) y por horizonte (y_3, y_6); publica `trained_without_fold` y `score_oot` | 0,54 / 0,44 / 0,38 | `scorers/v3_gbm.py` |

Los tres cumplen el contrato de `scores.csv` (company_id, month, score, score_version, c_<dimensión>, alert, explanation).
El evaluador (`evaluate.py`) no lee datos crudos: solo scores, events y splits. `comparison.md` resume las versiones.
