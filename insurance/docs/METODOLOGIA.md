# Metodología de precio y riesgo

## Señal utilizada

Se utiliza exclusivamente V4 (`Elkano_Embat`): score `v3-gbm`, contribuciones, alertas y eventos D1–D4. No se incorporan variables, predicciones o scores de V1, V2 o V3 de `HackSpain`.

El score V4 ordena riesgo de estrés financiero. La validación disponible muestra Gini 0,54/0,44/0,38 a 1/3/6 meses, pero el Gini de eventos nuevos a seis meses baja a 0,20 y la anticipación mediana es cero. Por eso el producto lo trata como señal de vigilancia cercana.

## Calibración

Cada score se asigna a la tasa de evento a seis meses observada en su decil. Esa tasa no es una PD de impago: D1–D4 forman un evento compuesto de estrés.

Se introduce un supuesto editable:

```text
PD_6m = frecuencia_estrés_6m × conversión_estrés_a_impago
PD_12m = 1 − (1 − PD_6m)²
```

El valor inicial de conversión es 18 %. No procede del dataset y se muestra como hipótesis comercial.

## Tarifa indicada

```text
pérdida_esperada = PD_12m × LGD × cobertura
tarifa_anual = pérdida_esperada + gastos + margen_de_capital
prima_mensual = exposición × tarifa_anual / 12
```

Supuestos iniciales:

| Supuesto | Valor |
|---|---:|
| Conversión de estrés a impago | 18 % |
| LGD | 55 % |
| Cobertura | 80 % |
| Gastos anuales | 0,45 % |
| Margen de capital | 0,35 % |
| Credibilidad del dato nuevo | 35 % |
| Movimiento mensual máximo | 20 % |

## Estabilidad

La tarifa indicada puede cambiar bruscamente al cruzar un tramo. La tarifa aplicada utiliza:

```text
tarifa_suavizada = 65 % × tarifa_anterior + 35 % × tarifa_indicada
```

Después se limita la variación a ±20 % mensual. Esto evita que un único mes traslade toda la volatilidad del score al asegurado.

## Cobertura de ventas nuevas

| Riesgo | Cobertura máxima propuesta |
|---|---:|
| score ≥ 70 y trayectoria normal | cobertura base |
| score < 70 o caída ≥ 4 puntos | 80 % |
| score < 55 o caída ≥ 8 puntos | 70 % |
| score < 40 o caída ≥ 15 puntos | 60 % |

La política no modifica facturas previamente aceptadas.

## Qué sería necesario para producción

- cartera real de exposiciones y límites;
- siniestros confirmados y recuperaciones;
- definición contractual de default;
- calibración por sector, país, tamaño y antigüedad;
- validación fuera de tiempo y por nuevos eventos;
- análisis de discriminación, calibración, estabilidad y sesgo;
- costes, reaseguro, capital y comisión reales;
- gobierno del modelo y revisión humana.
