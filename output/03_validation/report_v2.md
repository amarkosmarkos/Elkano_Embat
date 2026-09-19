# Evaluación · v2-gini vs events_v1

Generado 2026-09-18T22:40:13 · 15,803 filas (empresa, mes) · 1282 empresas · 9,020 pares con y_6 · tasa de evento 20.4% (h1 20.7% · h3 33.1% · h6 46.3%)

## Criterios de aceptación

| métrica | valor | mínimo | bueno | estado |
|---|---:|---:|---:|---|
| Gini h6 | 0.347 | 0.4 | 0.55 | **FALLA** |
| Gini h6 > mejor dimensión | True | True | True | **bueno** |
| KS h6 | 0.240 | 0.3 | 0.45 | **FALLA** |
| Lead time mediano (meses) | 1.000 | 1.0 | 2.0 | **mínimo** |
| Gini de mejora | 0.055 | 0.2 | 0.35 | **FALLA** |
| Caída in-sample → OOS | 0.009 | 0.08 | 0.05 | **bueno** |
| Caída → OOT (h6, o h3 si no hay h6) | 0.052 | 0.08 | 0.05 | **mínimo** |
| PSI 12 meses (máx.) | 0.035 | 0.25 | 0.1 | **bueno** |
| Autocorrelación lag 1 | 0.898 | 0.75–0.97 | 0.8–0.95 | **bueno** |

## Poder de ordenación por horizonte

| | h1 | h3 | h6 |
|---|---:|---:|---:|
| Gini | 0.433 | 0.362 | 0.347 |
| KS | 0.344 | 0.270 | 0.240 |
| Gini solo nuevos eventos (empresa sin evento en t) | 0.199 | 0.185 | 0.211 |

**Lead time**: mediana 1.000 meses (p25 0.000 · p75 4.000) sobre 497 empresas con evento; 0.384 avisadas antes o en el evento, 0.437 con ≥ 2 meses de antelación.

**Gini de mejora** (Δscore 3 m vs cura en 6 m): 0.055 sobre 1367 filas en evento.

**OOS** por fold (h6): [0.4876, 0.3303, 0.3484, 0.2926, 0.2296] · media 0.338 · caída 0.009

**OOT**: entreno …2026-02 → test 2026-03…: Gini h6 – (train 0.347); h3 test 0.324 vs train 0.376. y_6 necesita 6 meses de futuro: en el periodo de test solo hay h1/h3; la caída OOT se mide con h3

**PSI**: 2025-06_vs_2026-06: 0.035 · 2025-07_vs_2026-07: 0.023 · 2025-08_vs_2026-08: 0.032 · **Autocorrelación lag 1**: 0.898 (media por empresa 0.533)

**Alertas**: 19.4% de filas · precisión h3 0.619 · recall h3 0.359

## Univariante (Gini h6 de cada dimensión / contribución)

| columna | Gini |
|---|---:|
| c_liquidez | 0.324 |
| c_deuda | 0.106 |
| c_pago | -0.089 |
| c_concentracion | -0.067 |

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
| 1 | 1581 | 2–31 | 72.0% | 82.4% | 88.6% |
| 2 | 1580 | 31–40 | 24.3% | 37.3% | 53.3% |
| 3 | 1580 | 40–45 | 19.5% | 35.6% | 51.3% |
| 4 | 1580 | 45–48 | 15.6% | 31.3% | 47.4% |
| 5 | 1581 | 48–51 | 13.4% | 27.1% | 44.8% |
| 6 | 1580 | 51–55 | 13.6% | 26.3% | 42.0% |
| 7 | 1580 | 55–59 | 12.6% | 24.0% | 38.2% |
| 8 | 1580 | 59–63 | 13.7% | 25.2% | 38.0% |
| 9 | 1580 | 63–67 | 11.5% | 20.4% | 26.7% |
| 10 | 1581 | 67–88 | 9.7% | 18.7% | 27.2% |

**Filiales**: correlación de score entre empresas del mismo grupo 0.334 (5846 pares).

## Casos

Falsos negativos (score alto, evento en ≤ 3 meses): COMP_0889 (2026-04, 81), COMP_0147 (2025-03, 79), COMP_0790 (2026-04, 78), COMP_0374 (2026-04, 77), COMP_0106 (2025-04, 77), COMP_0609 (2026-02, 77), COMP_0229 (2025-03, 77), COMP_0882 (2025-03, 77), COMP_1065 (2026-04, 76), COMP_0732 (2025-03, 76)

Falsos positivos (score bajo, 6 meses sin evento): COMP_1033 (2025-12, 17), COMP_1015 (2025-04, 19), COMP_0585 (2025-09, 20), COMP_0282 (2025-03, 20), COMP_0186 (2026-01, 21), COMP_1001 (2025-06, 23), COMP_0076 (2025-10, 23), COMP_0978 (2025-02, 24), COMP_1166 (2025-09, 24), COMP_0630 (2025-09, 24)
