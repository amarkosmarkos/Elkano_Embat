# Las 24 métricas, una a una

Qué mide cada una, por qué importa y cómo se lee. Todas se calculan **por empresa y por mes, solo con datos hasta ese mes**. La fórmula exacta está en [salud.md](salud.md); el código, en [`analytics/metrics/`](../analytics/metrics/) (una función por métrica).

Convención: *facturas emitidas* = las que nos deben (importe positivo); *facturas recibidas* = las que debemos (importe negativo).

---

## A · ¿Paga y le pagan a tiempo? (dimensión **pago**)

**1. Retraso de pago propio** (`retraso_pago`, A1)
Cuántos días tarde paga la empresa a sus proveedores: mediana de (fecha de pago − fecha de vencimiento) en las facturas recibidas que pagó este mes. Es la señal más usada en banca porque una empresa que empieza a pagar tarde está gestionando la caja a mano. Más de 15 días y subiendo = estrés. Menos es mejor.

**2. % de pagos fuera de plazo** (`pct_pago_tarde`, A2)
De las facturas que pagó este mes, qué porcentaje pagó después del vencimiento. Complementa a la anterior: el retraso mediano puede ser 2 días y aun así pagar tarde el 80 % de las veces. Menos es mejor.

**3. Faltan pagos regulares** (`falta_regular`, A3)
Cuenta cuántos de estos tres pagos —nómina, Seguridad Social, impuestos— **no aparecen este mes habiendo aparecido los seis meses anteriores**. Es la alarma más temprana que existe: una empresa paga esto hasta el último día que puede. 0 es normal; 1 o más, revisar ya. Menos es mejor.

**4. DSO: días hasta cobrar** (`dso`, A4)
Cuánto tardan los clientes en pagarle: mediana de (fecha de cobro − fecha de emisión) en las facturas emitidas que cobró este mes. Un DSO que sube significa que la empresa financia a sus clientes con su propia caja. Menos es mejor.

**5. % de cobros vencidos** (`pct_cobro_vencido`, A5)
Importe de facturas emitidas que ya han vencido y siguen sin cobrar a fin de mes, dividido por lo facturado en los últimos 90 días. Es el DSO visto desde el otro lado: lo que *no* está entrando. Se calcula a la fecha, sin usar el estado que trae el ERP (ese es el estado de hoy, no de entonces). Menos es mejor.

**6. Devoluciones de recibos** (`devoluciones`, A6)
Número de recibos girados a clientes que el banco devuelve impagados este mes. Una devolución es un error; varias, un cliente que no puede pagar. Menos es mejor.

## B · ¿Tiene colchón? (dimensión **liquidez**)

**7. Colchón de caja** (`colchon`, B1)
Saldo mínimo del mes dividido por las salidas del mes. Responde a "en el peor día del mes, ¿cuántos meses de pagos tenía en el banco?". Por debajo de 0 estuvo en descubierto; por debajo de 0,5 va justa; por encima de 2 va holgada. Más es mejor. *Es la métrica que más predice de las 24.*

**8. Runway** (`runway`, B2)
Si la empresa quema caja (salidas > entradas), cuántos meses aguanta con el saldo actual al ritmo de los últimos 3 meses. Si no quema caja, se pone el tope de 24 meses. Más es mejor.

**9. Días en negativo** (`dias_negativo`, B3)
Cuántos días del mes el saldo agregado de sus cuentas corrientes fue negativo. El colchón dice *cuánto*; esto dice *cuánto tiempo*. Menos es mejor.

**10. Crédito disponible** (`credito_disponible`, B4)
Lo que le queda sin usar en líneas de crédito, confirming y factoring, dividido por las salidas del mes. Es la red de seguridad: una empresa con colchón 0,3 pero dos meses de línea disponible no está en el mismo sitio que una sin línea. Más es mejor.

## C · ¿Genera caja? (dimensión **caja**)

**11. Caja neta operativa** (`neto_operativo`, C1)
Entradas menos salidas del mes, quitando lo que no es negocio: traspasos entre cuentas propias, amortización de deuda, inversiones y retiradas de efectivo. Normalizado por las salidas medias para comparar empresas de distinto tamaño. Más es mejor.

**12. Tendencia a 3 meses** (`tendencia_3m`, C2)
Pendiente de la recta que ajusta la caja neta de los últimos 3 meses. Dice si la caja va a mejor o a peor a corto plazo. Más es mejor.

**13. Tendencia a 6 meses** (`tendencia_6m`, C2)
Lo mismo a 6 meses: menos sensible al ruido de un mes puntual. Es la que se usa como bonus/penalización de trayectoria en el score v1. Más es mejor.

**14. Volatilidad** (`volatilidad`, C3)
Desviación típica de la caja neta en 12 meses dividida por su media en valor absoluto. Dos empresas con la misma caja media no son iguales si una la genera todos los meses y la otra en un mes de cada cuatro. Menos es mejor.

**15. Ratio cobros / pagos** (`ratio_cobros_pagos`, C4)
Cobros de clientes (incluidos remesas y TPV) divididos por pagos a proveedores y suministros, en el mes. Es el negocio puro, sin financiación ni impuestos: por cada euro que paga, ¿cuántos cobra? Más es mejor.

**16. Crecimiento interanual de cobros** (`crecimiento_cobros`, C5)
Cobros de este mes frente a los del mismo mes del año anterior. Quita la estacionalidad: septiembre contra septiembre. Solo existe desde el segundo año de datos. Más es mejor.

## D · ¿La deuda es proporcional? (dimensión **deuda**)

**17. % dispuesto de líneas** (`pct_dispuesto`, D1)
Cuánto tiene usado de sus líneas de crédito, confirming y factoring sobre lo concedido. Por encima del 90 % ya no tiene margen: la próxima tensión de caja no la absorbe el banco. Menos es mejor.

**18. Servicio de la deuda** (`servicio_deuda`, D2)
Cuota mensual estimada de sus préstamos (capital más intereses, a partir del cuadro de amortización) dividida por la caja neta media de 6 meses. Por encima de 1, la caja que genera no cubre lo que debe pagar de deuda. Solo está disponible para las empresas con cuadro de amortización (pocas). Menos es mejor.

**19. Coste financiero** (`coste_financiero`, D3)
Intereses y comisiones bancarias sobre el total de salidas del mes. Cuando se dispara suele ser porque el banco ha empezado a cobrar descubiertos, devoluciones o renovaciones caras. Menos es mejor.

**20. Deuda sobre cobros** (`deuda_cobros`, D4)
Toda la deuda dispuesta dividida por lo cobrado en 12 meses. Es el apalancamiento medido con caja real, no con balance contable. Menos es mejor.

## E · ¿De quién depende? (dimensión **concentración**)

**21. Top-5 clientes** (`top5_clientes`, E1)
Qué porcentaje de lo facturado en 12 meses va a sus 5 clientes más grandes. Una empresa sana con el 80 % en cinco clientes está a una llamada de dejar de serlo. Menos es mejor.

**22. Índice Herfindahl** (`hhi`, E2)
Suma de los cuadrados de la cuota de cada cliente. Es el top-5 pero continuo: 1 significa un solo cliente; por debajo de 0,1, cartera diversificada. Menos es mejor.

**23. Rating de la cartera** (`rating_cartera`, E3)
Un "bureau casero": para cada cliente se estima cuánto tarde paga, usando todas las facturas que le hemos visto, suavizado hacia la media global si tiene pocas. Luego se pondera por lo que la empresa le factura a cada uno. Lee la salud de *los clientes de la empresa*: su cartera se deteriora antes de que ella lo note en su caja. Menos días es mejor.

**24. Clientes activos** (`clientes_activos`, E4)
Número de clientes distintos con factura emitida en el mes. Importa más su tendencia que su nivel: perder clientes mes a mes es la forma más silenciosa de deteriorarse. Más es mejor.

---

## Y para cada una de las 24, tres columnas más

- **`__delta_3m`**: cuánto ha cambiado en 3 meses.
- **`__delta_12m`**: cuánto ha cambiado en 12 meses.
- **`__racha`**: cuántos meses seguidos lleva empeorando.

Porque dos empresas con el mismo valor hoy no son iguales si una viene de mejor y la otra de peor. Con estas 72 columnas, las 24 métricas y las 8 alarmas (S1–S8), cada empresa-mes queda descrita por **105 números**. Ese es el vector; el score es su resumen.

## Qué predice cada una (medido, Gini a 6 meses sobre el evento de impago)

Fuertes: colchón (0,26), runway (0,20), días en negativo (0,19), % pagos tarde (0,14), retraso de pago (0,13), % cobros vencidos (0,13), rating de cartera (0,11), DSO (0,09), coste financiero (0,09), deuda sobre cobros (0,07).

Débiles en este dataset (< 0,05): caja neta, tendencias, volatilidad, ratio cobros/pagos, crecimiento, % dispuesto, top-5, HHI, clientes activos, devoluciones, faltan pagos regulares. No es que no importen: es que, con el evento tal como está definido, no separan. Por eso la versión v2 del score las deja fuera y la v3 deja que el modelo decida.
