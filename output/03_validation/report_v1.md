# Evaluación · v1-scorecard vs events_v1

Generado 2026-09-18T22:40:13 · 15,803 filas (empresa, mes) · 1282 empresas · 9,020 pares con y_6 · tasa de evento 20.4% (h1 20.7% · h3 33.1% · h6 46.3%)

## Criterios de aceptación

| métrica | valor | mínimo | bueno | estado |
|---|---:|---:|---:|---|
| Gini h6 | 0.248 | 0.4 | 0.55 | **FALLA** |
| Gini h6 > mejor dimensión | False | True | True | **FALLA** |
| KS h6 | 0.176 | 0.3 | 0.45 | **FALLA** |
| Lead time mediano (meses) | 1.000 | 1.0 | 2.0 | **mínimo** |
| Gini de mejora | 0.006 | 0.2 | 0.35 | **FALLA** |
| Caída in-sample → OOS | 0.009 | 0.08 | 0.05 | **bueno** |
| Caída → OOT (h6, o h3 si no hay h6) | 0.047 | 0.08 | 0.05 | **bueno** |
| PSI 12 meses (máx.) | 0.040 | 0.25 | 0.1 | **bueno** |
| Autocorrelación lag 1 | 0.737 | 0.75–0.97 | 0.8–0.95 | **FALLA** |

## Poder de ordenación por horizonte

| | h1 | h3 | h6 |
|---|---:|---:|---:|
| Gini | 0.339 | 0.262 | 0.248 |
| KS | 0.253 | 0.197 | 0.176 |
| Gini sin features gemelas del evento | 0.261 | 0.194 | 0.197 |
| Gini solo nuevos eventos (empresa sin evento en t) | 0.111 | 0.102 | 0.128 |

**Lead time**: mediana 1.000 meses (p25 0.000 · p75 4.000) sobre 497 empresas con evento; 0.529 avisadas antes o en el evento, 0.413 con ≥ 2 meses de antelación.

**Gini de mejora** (Δscore 3 m vs cura en 6 m): 0.006 sobre 1367 filas en evento.

**OOS** por fold (h6): [0.4412, 0.1838, 0.1479, 0.2184, 0.2059] · media 0.239 · caída 0.009

**OOT**: entreno …2026-02 → test 2026-03…: Gini h6 – (train 0.248); h3 test 0.226 vs train 0.274. y_6 necesita 6 meses de futuro: en el periodo de test solo hay h1/h3; la caída OOT se mide con h3

**PSI**: 2025-06_vs_2026-06: 0.021 · 2025-07_vs_2026-07: 0.040 · 2025-08_vs_2026-08: 0.018 · **Autocorrelación lag 1**: 0.737 (media por empresa 0.492)

**Alertas**: 23.6% de filas · precisión h3 0.505 · recall h3 0.357

## Univariante (Gini h6 de cada dimensión / contribución)

| columna | Gini |
|---|---:|
| c_liquidez | 0.281 |
| dim_liquidez | 0.248 |
| c_pago | 0.144 |
| dim_pago | 0.112 |
| c_deuda | 0.099 |
| dim_deuda | 0.075 |
| dim_caja | -0.032 |
| c_concentracion | -0.026 |
| dim_concentracion | -0.020 |
| c_caja | -0.007 |

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
| 1 | 1581 | 2–31 | 49.2% | 59.4% | 69.8% |
| 2 | 1580 | 31–37 | 30.3% | 44.8% | 57.6% |
| 3 | 1580 | 37–41 | 23.2% | 36.0% | 53.1% |
| 4 | 1580 | 41–44 | 21.3% | 34.9% | 48.0% |
| 5 | 1581 | 44–47 | 17.2% | 29.8% | 46.1% |
| 6 | 1580 | 47–50 | 15.8% | 29.2% | 41.5% |
| 7 | 1580 | 50–53 | 14.8% | 27.4% | 42.6% |
| 8 | 1580 | 53–57 | 11.4% | 24.2% | 38.1% |
| 9 | 1580 | 57–62 | 12.5% | 23.6% | 35.9% |
| 10 | 1581 | 62–79 | 11.1% | 21.7% | 30.2% |

**Filiales**: correlación de score entre empresas del mismo grupo 0.198 (5846 pares).

## Casos

Falsos negativos (score alto, evento en ≤ 3 meses): COMP_0732 (2025-03, 76), COMP_0176 (2026-03, 75), COMP_0614 (2026-05, 75), COMP_0781 (2026-01, 74), COMP_1065 (2026-03, 74), COMP_0826 (2026-04, 74), COMP_0077 (2025-12, 74), COMP_1239 (2026-04, 74), COMP_0815 (2026-04, 73), COMP_1042 (2025-04, 73)

Falsos positivos (score bajo, 6 meses sin evento): COMP_1091 (2025-06, 13), COMP_1174 (2025-08, 18), COMP_0293 (2025-09, 18), COMP_0593 (2025-12, 19), COMP_0803 (2025-05, 19), COMP_0282 (2025-02, 19), COMP_0304 (2025-12, 19), COMP_1160 (2025-06, 19), COMP_0960 (2025-07, 20), COMP_0549 (2026-02, 20)
