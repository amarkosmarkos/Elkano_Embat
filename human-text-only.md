# Productos encima del score

Texto para humanos. Sin código, sin tablas.

## Cómo lo leemos

El track pide un score de salud financiera que lea el comportamiento de cada empresa mes a mes, en las dos direcciones, y que se explique. Y encima del score, un producto que alguien pague. El comprador obvio es la propia empresa, con Embat como canal. El score es una señal de riesgo viva, un rating que se actualiza cada mes en lugar de una vez al año. Los productos que van encima son decisiones que hoy se toman a ciegas y que con el score se toman con criterio.

Vendemos dos decisiones y un monitor. Las dos decisiones son qué hacer con la caja que sobra. El monitor es el sistema levantando la mano cuando una empresa se mueve de verdad.

## PRODUCTO1: Colocación de excedentes

Una empresa tiene excedente cuando su caja lleva meses sin bajar de cierto nivel: si nunca ha bajado de 300.000 euros en todo el año, esos 300.000 podrían estar en un depósito a plazo o en un fondo monetario ganando interés sin que la empresa dejara de pagar nada. Hoy ese dinero se queda parado. Embat muestra el saldo y la previsión de caja, pero no calcula cuánto es seguro inmovilizar, no propone colocarlo y no lo mueve. Agicap tampoco: registra las colocaciones que el financiero ya ha hecho y le deja simularlas, pero la colocación se hace fuera de la herramienta. Nuestro producto es el score aplicado a uno mismo. Cuánta liquidez puede arriesgar una empresa depende de hacia dónde va: si el score dice que está sólida, estable y mejorando, puede colocar casi todo su suelo de caja a plazo; si empieza a torcerse, la propuesta se acorta o desaparece antes de que la empresa lo note en el banco. El financiero ve importe, plazo y producto, aprueba con un clic, y Embat ordena el traspaso al depósito o al fondo monetario del banco con el que ya está conectado y concilia el vencimiento. En el dataset del reto, 535 millones de euros llevan doce meses sin bajar de su suelo en 312 empresas con más de 100.000 euros parados, 209 de ellas sin ningún producto de inversión. Al 2,5% son unos 13 millones de euros al año que hoy nadie gana.

## PRODUCTO2: Cash pooling automático

Un grupo empresarial suele tener la caja repartida: una filial acumula excedente en su cuenta mientras otra dispone de una póliza de crédito o entra en descubierto, y el grupo acaba pagando intereses al banco por un dinero que ya tiene. Embat hoy muestra esas posiciones y contabiliza los préstamos entre filiales, pero la decisión de mover el dinero sigue siendo manual y llega tarde. Nuestro producto es el marketplace de crédito del track, dentro del grupo: la filial con excedente presta, la filial que necesita pide, y el score de la que pide fija cuánto puede recibir y a qué tipo interno. Cada día el sistema lee los saldos de todas las empresas del grupo, detecta quién sobra y quién falta, y propone el movimiento concreto, de qué filial a cuál y por cuánto. Una filial sólida puede recibir más y a mejor tipo, y una filial que empieza a torcerse ve su límite reducido antes de convertirse en un agujero para el resto. El financiero revisa la propuesta y la aprueba en un clic, y Embat se encarga del traspaso, del devengo de intereses y del asiento en los dos ERP. En el dataset del reto, 97 de 179 grupos presentan esta situación de forma recurrente y hoy mismo hay 85 millones de euros dispuestos en pólizas y descubiertos que otra empresa del mismo grupo podría cubrir.

## MONITOR: el sistema levanta la mano

El monitor no espera a que le pregunten. Cada mes recalcula el score de cada empresa y avisa cuando una se mueve de verdad, distinguiendo un mal mes de un deterioro que lleva meses. Cada aviso dice qué señal se movió, desde cuándo, y qué se puede hacer. Dos avisos son los que más valor tienen.

Alerta de cuotas. Una empresa con deuda tiene cuotas de préstamos, leasing y pólizas que caen en fechas fijas, y encima impuestos y nóminas que también caen en fechas fijas. Casi nadie las suma y las cruza con la caja que va a tener ese mes. En mayo o julio, cuando coinciden impuestos y cuotas grandes, la empresa se lleva un susto y entra en descubierto o dispone de la póliza a última hora. Embat avisa de cada vencimiento por separado, pero no dice si la caja llega. El monitor suma todo lo que viene en los próximos tres meses, lo compara con la caja prevista y avisa con meses de antelación. Si el score es alto, el aviso es tranquilo: dispón de la póliza el día 3. Si el score es bajo y cayendo, el aviso salta en marzo, no en junio, y propone mover caja del grupo o renegociar. En el dataset del reto, 163 empresas no cubren el próximo trimestre de cuotas con su caja, 121 ni contando las líneas sin disponer, y los picos caen en mayo y julio.

Recomendación de pagos. Cada mes la empresa tiene facturas de proveedores por pagar. Hoy las paga cuando toca, o antes por inercia, o tarde cuando va justa. Embat ejecuta el pago en la fecha que le dan. El monitor recomienda la fecha de cada factura según el score: si sobra caja y la tendencia es buena, adelantar las grandes y pedir descuento por pronto pago; si falta, pagar el último día de plazo y nunca después, porque estirar el pago a proveedores es la primera señal de deterioro que ve un banco, y el propio score de la empresa la penaliza. En el dataset del reto, 2.300 millones de euros al año se pagan 21 días antes de vencimiento sin pedir nada a cambio, y 115 empresas han empezado a estirar sus pagos en los últimos seis meses.

## Qué se enseña en la demo

Una lista de empresas con su score y su flecha de tendencia. Una ficha por empresa con los componentes del score, qué se movió el último mes y desde cuándo. Dos tarjetas de decisión en la ficha: coloca esto a este plazo, presta esto a esta filial. Y un panel de avisos que se enciende solo. Cambias de empresa y cambian las tarjetas. Cambias de mes y cambian otra vez.

## Comprador

La empresa cliente de Embat, porque gana interés que hoy no gana, deja de pagar intereses por dinero que ya tiene y evita el descubierto de julio. Embat, porque vende dos módulos nuevos a su base de 400 clientes, cobra comisión al banco o al partner por cada colocación, y da al financiero una razón para entrar cada día. En Francia, Agicap vende estas decisiones como módulos separados; Embat las tendría sobre un score que ninguno de los dos tiene.
