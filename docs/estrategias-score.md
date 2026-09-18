# Estrategias y métricas para el score

Complementa a [salud-financiera.md](salud-financiera.md) (fundamentos) y [data-map.md](data-map.md) (columnas y avisos). Todo lo de aquí es calculable con los 8 CSV.

## 1. ELO de contrapartes (bureau de pago casero)

**Lo único del ELO que aporta señal nueva.** Un ELO empresa-vs-empresa no es posible (los `counterparty_id` no cruzan con `company_id`) y sería un percentil disfrazado.

**Idea.** Los 124.030 clientes/proveedores de `invoices` aparecen repetidos: 42.125 están en varias empresas. Cada factura emitida es un "partido" del cliente:

- gana si `payment_date ≤ due_date`,
- pierde si paga tarde o queda `overdue` / `pending` pasado el vencimiento,
- magnitud del resultado = días de retraso (o `pending_amount / amount`).

Como el mismo cliente se observa desde varias empresas, su rating se estima con más datos de los que tiene cualquier empresa sola. Es un bureau de comportamiento de pago construido con datos de tesorería.

**Para qué sirve.**

- **Calidad de cartera** de una empresa = media del rating de sus clientes ponderada por importe facturado. Detecta contagio: si tus clientes principales están pagando tarde *a otros*, tu caja se resiente en 2–3 meses aunque hoy te paguen. Ninguna otra señal del dataset anticipa eso.
- **Riesgo de proveedor**: lo mismo con facturas recibidas (si tú pagas tarde a proveedores que todo el mundo paga a tiempo, el problema eres tú).
- Producto por sí solo: Embat podría venderlo a todos sus clientes.

**Implementación mínima.** No hace falta ELO real: basta un rating bayesiano por contraparte = media suavizada de días de retraso (prior = media global, peso = nº facturas). ELO/Glicko solo añade que el rating pese más los partidos recientes; se consigue igual con una media exponencial. Usar ELO si queda bien en el pitch; matemáticamente es lo mismo.

**Comprobar antes de invertir:** distribución de nº de empresas por `counterparty_id` en invoices; si la mediana es 1, la señal cruzada es débil y solo vale el rating dentro de cada empresa.

## 2. Métricas de estrés (etiqueta proxy)

No hay etiqueta. Estos eventos son observables en los datos y nadie discutiría que son estrés. Se calculan por empresa y mes.

| # | Evento | Cálculo | Fuente |
|---|---|---|---|
| E1 | **Caja en negativo** | saldo reconstruido (suma acumulada de `amount` por `product_id` tipo `checking`, anclada a `balances.balance` en 2026-09-01) < 0 algún día del mes, o saldo mínimo < 0,5 × salidas del mes | transactions, balances |
| E2 | **Coste financiero disparado** | suma de `amount` con `category` ∈ {`interest_charge`, `fee`} en el mes > 2 × mediana de los 6 meses anteriores | transactions |
| E3 | **Impuestos / nóminas tarde o ausentes** | mes sin salida `tax` o `payroll` cuando los 6 anteriores la tenían, o pagada > 15 días después de su día habitual | transactions |
| E4 | **Líneas de crédito al límite** | `outstanding / granted` > 0,9 en `lineofcredit` / `confirming` / `factoring` | debt_products |
| E5 | **Cobros vencidos** | importe `overdue` / importe emitido en los últimos 90 días > 0,3 | invoices (`amount` > 0) |
| E6 | **Pago propio tardío** | mediana(`payment_date − due_date`) en facturas recibidas > 15 días, y creciendo 3 meses seguidos | invoices (`amount` < 0) |
| E7 | **Devoluciones / impagados** | nº de `category` ∈ {`payment_refund`, devoluciones de recibo} > 0 y creciente | transactions |
| E8 | **Caja neta negativa sostenida** | neto operativo < 0 tres meses seguidos | transactions |

**Etiqueta de deterioro** en el mes m: ≥ 2 eventos activos, o E1 solo.
**Etiqueta de mejora**: salir de estrés (de ≥ 2 eventos a 0 durante 3 meses) o neto operativo creciendo ≥ 3 meses con E5/E6 bajando.

**Uso.** Entrenar un modelo con features del mes t para predecir deterioro / mejora en t+3 … t+6. El score es la probabilidad; la anticipación es el horizonte del modelo (sale medida de serie); SHAP da la explicación. Con 24 meses × 1.286 empresas hay ~15 ventanas por empresa. Es el diseño de *early warning* que exige la EBA a los bancos.

**Cuidado**: E1 depende de reconstruir el saldo, y ~0,5 % de `product_id` no cruzan; E3 depende de que `category` esté informada (25 % es `-`): recuperar categoría desde `description` primero.

## 3. Métricas más relevantes (features del score)

Por empresa y mes. Normalizar contra el conjunto (percentil) salvo donde se indique. Ordenadas por poder predictivo esperado según la literatura de cash-flow lending.

### Comportamiento de pago (lo más predictivo)

| Métrica | Cálculo | Fuente |
|---|---|---|
| **Days beyond terms (propio)** | mediana(`payment_date − due_date`) en facturas recibidas pagadas en el mes | invoices `amount` < 0 |
| **% pagos fuera de plazo** | nº facturas recibidas con `payment_date > due_date` / total pagadas | invoices |
| **Regularidad tax / payroll** | desviación del día del mes en que sale `tax` / `payroll` respecto a su mediana histórica; flag de mes ausente | transactions |
| **DSO** | mediana(`payment_date − issuance_date`) en facturas emitidas cobradas | invoices `amount` > 0 |
| **% importe vencido (aging)** | `pending_amount` con `status = overdue` / emitido últimos 90 d; buckets 30/60/90 | invoices |

### Liquidez

| Métrica | Cálculo | Fuente |
|---|---|---|
| **Saldo mínimo mensual / salidas mensuales** | min(saldo reconstruido) / Σ salidas del mes | transactions, balances |
| **Runway** | saldo fin de mes / media de salidas netas de los 3 meses anteriores (meses) | transactions |
| **Días en negativo** | nº días con saldo reconstruido < 0 | transactions |
| **Liquidez disponible en líneas** | Σ (`granted − outstanding`) de líneas / salidas mensuales | debt_products |

### Generación de caja

| Métrica | Cálculo | Fuente |
|---|---|---|
| **Neto operativo mensual** | Σ `amount` excluyendo `transfer`, disposiciones y amortizaciones de deuda, intragrupo | transactions |
| **Tendencia a 3 y 6 meses** | pendiente de regresión del neto operativo | derivada |
| **Volatilidad** | coef. de variación del neto operativo en 12 meses | derivada |
| **Cobros / pagos** | Σ entradas `collection` + `bulk_collection` / Σ salidas `payment` | transactions |
| **Crecimiento de cobros interanual** | cobros del mes / cobros del mismo mes año anterior (solo desde 2025-09) | transactions |

### Deuda

| Métrica | Cálculo | Fuente |
|---|---|---|
| **% dispuesto de líneas** | `outstanding / granted` en `lineofcredit`, `confirming`, `factoring` | debt_products |
| **Servicio de deuda / caja generada** | Σ cuotas estimadas (`outstanding_balance / periodos restantes` + interés) / neto operativo | debt_schedule_config, debt_products |
| **Coste financiero / salidas** | Σ `interest_charge` + `fee` / Σ salidas | transactions |
| **Deuda total / cobros anuales** | Σ `outstanding` / Σ cobros 12 meses | debt_products, transactions |
| **Vencimientos próximos** | cuota de los próximos 3 meses (`next_payment_date`) / saldo | debt_schedule_config |

### Concentración y cartera

| Métrica | Cálculo | Fuente |
|---|---|---|
| **Top-5 clientes** | share del importe facturado a los 5 mayores `counterparty_id` en 12 meses | invoices |
| **Herfindahl de cobros** | Σ (share_i)² sobre contrapartes emisoras | invoices |
| **Rating de cartera** | media ponderada del rating de contrapartes (§1) | invoices |
| **Nº clientes activos** | contrapartes con factura emitida en el mes, y su tendencia | invoices |

### Trayectoria (transversal)

Para cada métrica anterior: valor actual, delta vs. 3 meses, delta vs. 12 meses (mismo mes), y nº de meses consecutivos empeorando. Estas derivadas son las que separan 45 → 65 de 82 → 68.

## 4. Otras estrategias (resumen)

- **Detector de drift**: distancia robusta (z-score por señal) de este mes a los 12 anteriores de la propia empresa. Barato; es el "monitor que avisa" del bonus.
- **HMM de 2–3 regímenes** (sano / tensión / deterioro): la probabilidad del régimen es el score y la matriz de transición separa bache de caída. Más tuning.
- **Runway / supervivencia**: meses hasta caja 0 con vencimientos de deuda; vendible a la propia empresa y a circulante; solo cubre deterioro.
- **Clases latentes sobre tendencias**: GMM sobre vectores de pendientes para recuperar los arquetipos con que se generó el dataset sintético. Exploratorio: si los clusters salen limpios, sabemos qué mide el leaderboard.
- **Texto**: clasificar `description` para recuperar el 25 % de `category = "-"` y detectar léxico de estrés (devolución, impago, reclamación, demora, aplazamiento).

## Recomendación

| Capa | Qué | Cubre |
|---|---|---|
| Scorecard aditivo | métricas de §3 en percentiles con pesos | explicabilidad, quién está sano |
| Modelo de estrés a 3–6 m (§2) + rating de cartera (§1) | probabilidad de deterioro / mejora | generalización, anticipación medida, dos direcciones |
| Detector de drift | alerta por cambio de patrón | monitor, bache vs. caída |

Score final = scorecard ajustado por la probabilidad del modelo. Explicación = contribuciones del scorecard + SHAP.
