# Evaluación · v3-gbm vs events_v1

Generado 2026-09-18T22:40:14 · 15,803 filas (empresa, mes) · 1282 empresas · 9,020 pares con y_6 · tasa de evento 20.4% (h1 20.7% · h3 33.1% · h6 46.3%)

## Criterios de aceptación

| métrica | valor | mínimo | bueno | estado |
|---|---:|---:|---:|---|
| Gini h6 | 0.379 | 0.4 | 0.55 | **FALLA** |
| Gini h6 > mejor dimensión | True | True | True | **bueno** |
| KS h6 | 0.268 | 0.3 | 0.45 | **FALLA** |
| Lead time mediano (meses) | 0.000 | 1.0 | 2.0 | **FALLA** |
| Gini de mejora | 0.035 | 0.2 | 0.35 | **FALLA** |
| Caída in-sample → OOS | -0.001 | 0.08 | 0.05 | **bueno** |
| Caída → OOT (h6, o h3 si no hay h6) | -0.052 | 0.08 | 0.05 | **bueno** |
| PSI 12 meses (máx.) | 0.068 | 0.25 | 0.1 | **bueno** |
| Autocorrelación lag 1 | 0.934 | 0.75–0.97 | 0.8–0.95 | **bueno** |

## Poder de ordenación por horizonte

| | h1 | h3 | h6 |
|---|---:|---:|---:|
| Gini | 0.540 | 0.439 | 0.379 |
| KS | 0.418 | 0.324 | 0.268 |
| Gini solo nuevos eventos (empresa sin evento en t) | 0.244 | 0.218 | 0.203 |

**Lead time**: mediana 0.000 meses (p25 0.000 · p75 3.000) sobre 497 empresas con evento; 0.308 avisadas antes o en el evento, 0.312 con ≥ 2 meses de antelación.

**Gini de mejora** (Δscore 3 m vs cura en 6 m): 0.035 sobre 1367 filas en evento.

**OOS** por fold (h6): [0.4566, 0.4286, 0.3676, 0.3609, 0.2824] · media 0.379 · caída -0.001

**OOT**: entreno …2026-02 → test 2026-03…: Gini h6 – (train 0.379); h3 test 0.496 vs train 0.444. y_6 necesita 6 meses de futuro: en el periodo de test solo hay h1/h3; la caída OOT se mide con h3

**PSI**: 2025-06_vs_2026-06: 0.068 · 2025-07_vs_2026-07: 0.068 · 2025-08_vs_2026-08: 0.050 · **Autocorrelación lag 1**: 0.934 (media por empresa 0.542)

**Alertas**: 20.0% de filas · precisión h3 0.674 · recall h3 0.407

## Univariante (Gini h6 de cada dimensión / contribución)

| columna | Gini |
|---|---:|
| c_liquidez | 0.200 |
| c_pago | 0.097 |
| c_deuda | 0.047 |
| c_caja | -0.030 |
| c_concentracion | 0.021 |

### Métricas (Gini h6 · signo + = menor valor ⇒ evento)

| métrica | Gini | cobertura |
|---|---:|---:|
| colchon | +0.250 | 93% |
| dias_negativo | -0.210 | 99% |
| runway | +0.205 | 99% |
| pct_pago_tarde | -0.149 | 48% |
| retraso_pago | -0.130 | 48% |
| pct_cobro_vencido | -0.129 | 47% |
| rating_cartera | -0.102 | 47% |
| coste_financiero | -0.088 | 94% |
| dso | -0.085 | 36% |
| servicio_deuda | -0.076 | 3% |
| deuda_cobros | -0.075 | 26% |
| credito_disponible | -0.065 | 14% |
| volatilidad | +0.057 | 100% |
| crecimiento_cobros | -0.055 | 40% |
| hhi | +0.048 | 54% |
| clientes_activos | -0.047 | 55% |
| top5_clientes | +0.031 | 54% |
| pct_dispuesto | +0.028 | 13% |
| tendencia_6m | +0.024 | 99% |
| ratio_cobros_pagos | -0.020 | 82% |
| neto_operativo | -0.009 | 97% |
| devoluciones | -0.004 | 100% |
| falta_regular | +0.002 | 92% |
| tendencia_3m | -0.001 | 97% |

Débiles (|Gini| < 0,05): falta_regular, devoluciones, neto_operativo, tendencia_3m, tendencia_6m, ratio_cobros_pagos, pct_dispuesto, top5_clientes, hhi, clientes_activos
Pares correlacionados (|ρ| > 0,8): retraso_pago~pct_pago_tarde (0.81); top5_clientes~hhi (0.89)

## Calibración por decil de score

| decil | n | score | evento h1 | h3 | h6 |
|---:|---:|---|---:|---:|---:|
| 1 | 1581 | 0–30 | 78.6% | 86.4% | 91.5% |
| 2 | 1580 | 30–48 | 29.5% | 47.2% | 61.4% |
| 3 | 1580 | 48–57 | 20.7% | 35.2% | 50.9% |
| 4 | 1580 | 57–63 | 14.9% | 30.0% | 46.0% |
| 5 | 1581 | 63–68 | 14.2% | 28.6% | 41.1% |
| 6 | 1580 | 68–71 | 13.8% | 27.5% | 43.0% |
| 7 | 1580 | 71–75 | 11.1% | 23.7% | 38.8% |
| 8 | 1580 | 75–78 | 8.2% | 18.2% | 32.8% |
| 9 | 1580 | 78–81 | 8.0% | 17.3% | 29.9% |
| 10 | 1581 | 81–97 | 7.3% | 15.9% | 25.2% |

**Filiales**: correlación de score entre empresas del mismo grupo 0.289 (5846 pares).

## Casos

Falsos negativos (score alto, evento en ≤ 3 meses): COMP_1045 (2025-10, 95), COMP_0712 (2026-04, 93), COMP_1027 (2026-05, 92), COMP_0376 (2026-01, 92), COMP_0636 (2026-04, 90), COMP_0062 (2026-04, 90), COMP_0246 (2025-02, 89), COMP_1032 (2025-06, 89), COMP_1037 (2026-04, 89), COMP_0456 (2026-05, 88)

Falsos positivos (score bajo, 6 meses sin evento): COMP_1250 (2026-02, 18), COMP_1236 (2025-12, 18), COMP_1122 (2025-06, 19), COMP_1188 (2025-08, 19), COMP_0076 (2025-03, 20), COMP_1001 (2025-06, 20), COMP_0862 (2025-05, 20), COMP_0637 (2025-06, 21), COMP_0460 (2025-07, 23), COMP_0803 (2025-10, 26)
