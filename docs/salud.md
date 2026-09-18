# Salud financiera: métricas y métodos

El score de salud es una combinación de métricas calculadas **por empresa y por mes**. Este doc lista cada métrica con su fórmula y de qué columnas sale.

**Definición de empresa sana**: genera caja de forma estable, cobra a tiempo, paga a tiempo, tiene colchón de liquidez y su deuda es proporcional a la caja que genera. Y su tendencia en esas cinco cosas es plana o mejora.

## Convenciones

| Término | Significado |
|---|---|
| `mes` | mes natural. Todo se calcula con datos de ese mes o anteriores |
| entradas | `transactions.amount > 0` |
| salidas | `transactions.amount < 0` (se usa el valor absoluto) |
| factura emitida | `invoices.amount > 0` (nos deben) |
| factura recibida | `invoices.amount < 0` (debemos) |
| saldo | suma acumulada de `amount` por cuenta `checking`, desde el primer movimiento |
| mediana_6m | mediana de los 6 meses anteriores |
| pct(x) | percentil de x entre todas las empresas ese mes (0 = peor, 100 = mejor) |

---

## A. Comportamiento de pago (lo que más predice)

### A1. Días de retraso propio
Cuántos días tarde pagamos a proveedores.
```
retraso = mediana( payment_date − due_date )   sobre facturas recibidas pagadas en el mes
```
Datos: `invoices` con `amount < 0`. Lectura: > 15 días y subiendo = estrés.

### A2. % de pagos fuera de plazo
```
pct_tarde = nº facturas recibidas con payment_date > due_date / nº facturas recibidas pagadas
```
Datos: `invoices`.

### A3. Regularidad de nóminas, SS e impuestos
Si un mes falta el pago que siempre estaba, es la alarma más temprana que existe.
```
falta_X = 1 si no hay salida con category = X este mes y sí la hubo en los 6 anteriores
X ∈ { salary, social_security, tax }
```
Datos: `transactions.category`.

### A4. DSO (días que tardan en cobrarnos)
```
DSO = mediana( payment_date − issuance_date )   sobre facturas emitidas cobradas en el mes
```
Datos: `invoices` con `amount > 0`.

### A5. % de cobros vencidos
```
vencido = Σ pending_amount de facturas emitidas con due_date < fin de mes y sin cobrar
pct_vencido = vencido / Σ amount emitido en los últimos 90 días
```
Datos: `invoices`. Ojo: no usar `status`, es el estado a fecha de extracción. Vencida en el mes t = `due_date < t` y (`payment_date > t` o vacío).

### A6. Devoluciones de cobros
Recibos de clientes que vuelven impagados.
```
devoluciones = nº movimientos con category = collection_refund en el mes
```
Datos: `transactions`.

---

## B. Liquidez

### B1. Colchón de caja
```
colchon = saldo_minimo_del_mes / salidas_del_mes
```
Lectura: < 0 = descubierto; < 0,5 = justo; > 2 = holgado.

### B2. Runway (meses de vida)
```
runway = saldo_fin_de_mes / media( salidas − entradas, 3 meses )   si salidas > entradas
```
Si entradas ≥ salidas, runway = ∞ (poner un tope, p. ej. 24).

### B3. Días en negativo
```
dias_negativo = nº días del mes con saldo < 0
```

### B4. Crédito disponible
```
disponible = Σ (granted − outstanding) en lineofcredit, confirming, factoring / salidas_del_mes
```
Datos: `debt_products`. Nota: `granted` y `outstanding` vienen en negativo; usar valor absoluto.

---

## C. Generación de caja

### C1. Caja neta operativa
Entradas menos salidas, quitando lo que no es negocio.
```
neto = Σ amount   excluyendo category ∈ { transfer, debt_repayment, investment_deployment, investment_return, cash_withdrawal }
```
Datos: `transactions`.

### C2. Tendencia de la caja neta
Pendiente de la recta que ajusta los últimos N meses.
```
tendencia_3m = pendiente( neto, últimos 3 meses )
tendencia_6m = pendiente( neto, últimos 6 meses )
```
Normalizar dividiendo por las salidas medias para que sea comparable entre empresas.

### C3. Volatilidad
```
volatilidad = desviación_típica( neto, 12 meses ) / media( |neto|, 12 meses )
```

### C4. Ratio cobros / pagos
```
ratio = Σ entradas con category ∈ { collection, bulk_collection, pos_settlement } / Σ salidas con category ∈ { payment, bulk_payment, utility }
```

### C5. Crecimiento interanual de cobros
```
crecimiento = cobros_mes / cobros_mismo_mes_año_anterior − 1
```
Solo disponible desde 2025-09.

---

## D. Deuda

### D1. % dispuesto de líneas
```
dispuesto = Σ |outstanding| / Σ |granted|   en lineofcredit, confirming, factoring
```
Lectura: > 0,9 = sin margen.

### D2. Servicio de deuda sobre caja
```
cuota_mensual = Σ ( outstanding_balance / total_periodos_restantes ) + interés mensual
servicio = cuota_mensual / neto (C1) medio 6 meses
```
Datos: `debt_schedule_config` (solo 87 productos) y `debt_products`. Lectura: > 1 = la caja no cubre la deuda.

### D3. Coste financiero
```
coste = Σ salidas con category ∈ { interest_charge, fee } / salidas_del_mes
```

### D4. Deuda sobre cobros
```
deuda_cobros = Σ |outstanding| / Σ cobros 12 meses
```

---

## E. Concentración y cartera

### E1. Top-5 clientes
```
top5 = Σ importe facturado a los 5 mayores counterparty_id / Σ importe facturado   (12 meses)
```
Datos: `invoices` con `amount > 0`.

### E2. Índice Herfindahl
```
HHI = Σ ( share_i )²   para cada counterparty_id emisor
```
Lectura: 1 = un solo cliente; < 0,1 = diversificado.

### E3. Rating de contrapartes (bureau casero)
Cada cliente aparece en varias empresas (42.125 contrapartes compartidas). Su comportamiento de pago se estima con todas.
```
rating_c = ( Σ retrasos de c en todas las empresas + k · retraso_global ) / ( nº facturas de c + k )
```
`k` = peso del prior (p. ej. 5). Es una media suavizada: si un cliente tiene pocas facturas, tira hacia la media global.
```
rating_cartera = Σ ( rating_c × importe facturado a c ) / Σ importe facturado
```
Lectura: la cartera de una empresa se deteriora *antes* de que ella lo note en su caja.

### E4. Nº de clientes activos
```
activos = nº counterparty_id con factura emitida en el mes
```
Su tendencia importa más que el nivel.

---

## F. Trayectoria (se aplica a cualquier métrica)

Para cada métrica M:
```
delta_3m  = M_t − M_{t−3}
delta_12m = M_t − M_{t−12}
racha     = nº meses consecutivos en que M empeora
```
Esto es lo que separa 45 → 65 de 82 → 68 cuando hoy valen lo mismo.

---

## G. Métricas de estrés (eventos)

Señales binarias, 1 si ocurre en el mes. Sirven como features y como base de la etiqueta de validación.

| Id | Evento | Regla |
|---|---|---|
| S1 | Descubierto | `dias_negativo ≥ 5` |
| S2 | Coste financiero disparado | `coste_mes > 3 × mediana_6m(coste)` y `> 2 % de salidas` |
| S3 | Falta nómina / SS / impuesto | `falta_salary ∨ falta_social_security ∨ falta_tax` |
| S4 | Líneas al límite | `dispuesto > 0,9` |
| S5 | Cobros vencidos | `pct_vencido > 0,3` |
| S6 | Paga tarde y a peor | `retraso > 15` y `racha(retraso) ≥ 3` |
| S7 | Devoluciones | `devoluciones > 0` y `racha ≥ 2` |
| S8 | Caja negativa sostenida | `neto < 0` tres meses seguidos |

---

## H. Cómo se combinan en el score

1. Cada métrica se convierte a percentil entre empresas ese mes, orientado a "más = mejor":
   ```
   p_i = pct( M_i )       (o 100 − pct( M_i ) si menos es mejor)
   ```
2. Score por dimensión = media de sus métricas:
   ```
   pago = media( p_A1 … p_A6 )      liquidez = media( p_B1 … p_B4 )   …
   ```
3. Score total = suma ponderada:
   ```
   score = w_pago · pago + w_liq · liquidez + w_caja · caja + w_deuda · deuda + w_conc · concentracion
   Σ w = 1
   ```
   Pesos iniciales: pago 0,30 · liquidez 0,25 · caja 0,20 · deuda 0,15 · concentración 0,10. Se ajustan con el Gini univariante (ver [validacion_salud.md](validacion_salud.md)).
4. Penalización por trayectoria y estrés:
   ```
   score = score − 5 · nº eventos S activos + 10 · tendencia_6m normalizada (acotado a ±10)
   ```
5. Suavizado para que un mes malo no lo hunda:
   ```
   score_final_t = 0,7 · score_t + 0,3 · score_final_{t−1}
   ```
6. Explicación: la contribución de cada dimensión es `w_d · (dim_t − dim_{t−1})`. La mayor en valor absoluto es "por qué ha cambiado".
