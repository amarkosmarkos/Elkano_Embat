# El score, explicado: los porqués

Este doc no tiene fórmulas. Cuenta por qué el score es como es. Las fórmulas están en [salud.md](salud.md); la validación en [validacion_salud.md](validacion_salud.md); el código en [`analytics/`](../analytics/README.md).

---

## La pregunta que intentamos responder

Embat tiene 1.286 empresas conectadas. Cada una genera miles de movimientos bancarios y cientos de facturas al mes. Un tesorero humano mira su propia empresa y, con suerte, la entiende. Nadie puede mirar las 1.286.

La pregunta es una sola: **¿a cuál de estas empresas le va a ir mal en los próximos meses?** "Mal" en tesorería tiene una definición concreta: se queda sin caja, deja de pagar, o le dejan de pagar.

Todo lo demás —métricas, alarmas, dimensiones, versiones— existe solo para responder eso. Si algo no ayuda a responderlo, sobra.

---

## Fase 1 · El score

### Por qué 24 métricas y no 3 (ni 300)

Un tesorero con experiencia, si le enseñas los extractos de una empresa, mira cinco cosas. Las escribimos en `salud.md` como definición de empresa sana:

> genera caja de forma estable, cobra a tiempo, paga a tiempo, tiene colchón de liquidez y su deuda es proporcional a la caja que genera.

Cada una de esas cinco cosas no se puede medir con un solo número, porque cada número tiene un punto ciego:

- **"Cobra a tiempo"**: el DSO (días que tardan en pagarte) no ve las facturas que directamente no te pagan. Por eso hay DSO *y* % de cobros vencidos *y* devoluciones de recibos. Tres ángulos sobre lo mismo, porque uno solo miente.
- **"Tiene colchón"**: el saldo de fin de mes miente si el día 15 estuviste en negativo. Por eso hay saldo mínimo *y* días en negativo *y* runway (cuántos meses aguantas quemando caja) *y* crédito sin usar.
- **"Paga a tiempo"**: los días de retraso a proveedores es la métrica más predictiva que existe en banca. Pero hay una señal aún más temprana: **dejar de pagar la nómina, la Seguridad Social o Hacienda**. Una empresa paga eso hasta el último día que puede. Cuando falta, ya es tarde. Por eso está como métrica propia (A3) y como alarma (S3).
- **"Genera caja"**: el neto de un mes es ruido. Por eso hay neto *y* tendencia a 3 y 6 meses *y* volatilidad *y* crecimiento interanual.
- **"Deuda proporcional"**: cuánto tiene dispuesto de sus líneas, cuánto le cuesta la deuda, cuánta deuda tiene por cada euro que cobra.

Y una sexta cosa que el tesorero no ve pero nosotros sí: **la concentración**. Una empresa que factura el 70 % a un cliente está sana hasta el día que ese cliente estornuda. Como tenemos 42.000 contrapartes compartidas entre empresas, podemos construir un "bureau casero": si los clientes de una empresa están empezando a pagar tarde a *otras* empresas, su cartera se está deteriorando antes de que ella lo note.

Salen 24 porque **es lo que hace falta para cubrir los cinco puntos ciegos sin repetirse**. No son 300 porque cada métrica extra que no aporta información nueva añade ruido al score y la validación lo castiga (regla del doc: fuera las que tienen Gini < 0,05 o correlación > 0,8 con otra).

### Por qué cada métrica lleva su trayectoria

Dos empresas tienen hoy un colchón de 1 mes de caja. Una venía de 3 meses y baja. La otra venía de 0 y sube. Hoy valen lo mismo; dentro de un trimestre no. Por eso cada métrica lleva tres columnas más: cuánto ha cambiado en 3 meses, en 12, y cuántos meses seguidos lleva empeorando (la *racha*). **Esto es lo que separa 45 → 65 de 82 → 68.**

### Por qué 8 alarmas

Las métricas son continuas: un colchón de 0,4 es peor que 0,5, pero no es un acontecimiento. Las alarmas son **acontecimientos**: cosas que, si pasan, un tesorero se levantaría de la silla.

| | Qué se levanta | Por qué es una alarma y no solo una métrica |
|---|---|---|
| S1 | Descubierto 5+ días | No es "poca caja", es "no hay caja" |
| S2 | Comisiones e intereses se disparan | El banco ya te está cobrando el miedo |
| S3 | Falta nómina / SS / impuestos | Lo último que una empresa deja de pagar |
| S4 | Líneas de crédito al 90 % | Ya no queda red |
| S5 | Cobros vencidos > 30 % | Tus clientes te están financiando al revés |
| S6 | Pagas tarde y cada mes peor | La racha importa más que el nivel |
| S7 | Recibos devueltos dos meses seguidos | Un cliente que devuelve una vez es un error; dos, un problema |
| S8 | Caja negativa tres meses seguidos | Ya no es un mes malo |

Son 8 porque son los 8 acontecimientos que el equipo identificó como "señal de estrés inequívoca". Sirven para dos cosas: penalizar el score (una empresa con dos alarmas activas no puede tener 80) y para construir la definición de "le fue mal" en la Fase 2.

### Por qué 5 desgloses

Un número solo no vale para actuar. Si a una empresa le baja el score de 70 a 40, la primera pregunta es *"¿por qué?"*. Y la respuesta útil no es "la métrica B3 subió a 7", es **"liquidez"**.

Los 5 desgloses (pago, liquidez, caja, deuda, concentración) son las cinco cosas del tesorero más la concentración, agrupando las 24 métricas. Son el idioma en el que se explica el score: *"bajó 31 puntos: liquidez"*. Un comercial de Embat puede llamar con eso. Con "la métrica B3" no.

Además, en la validación se mide cuánto predice cada desglose por separado. Ahora mismo liquidez y pago son las que mandan; concentración apenas aporta. Eso es información para la siguiente versión.

### Por qué un número de 0 a 100

Porque **el vector de 105 columnas es para la máquina; el número es para la persona**.

- Para ordenar 1.286 empresas ("¿a quién llamo primero?") hace falta un escalar.
- Para ver si una empresa va mejor o peor que hace tres meses, también.
- Para validar (Gini, KS, lead time) hace falta un ranking, y un ranking es una dimensión.
- Es lo que hace cualquier rating de crédito: comprimir cientos de variables en un número para poder decidir.

El vector no se tira: se guarda entero (`metrics_v1.parquet`), es lo que el modelo usa, y es de donde salen los desgloses y las explicaciones.

El significado del número es literal: **score = 100 − probabilidad (%) de que le pase algo malo en los próximos meses**. Score 90: casi seguro que no. Score 10: casi seguro que sí.

### Por qué hay tres versiones

Porque el doc de arquitectura lo pide así: un evaluador fijo y generadores que se iteran. Cada versión existe por una razón:

**v1 — el scorecard literal.** Es `salud.md §H` tal cual: percentiles, media por dimensión, pesos 0,30 / 0,25 / 0,20 / 0,15 / 0,10 elegidos a ojo, −5 puntos por alarma, +10 por tendencia. Es el punto de partida y sirve para una cosa: comprobar que todo el circuito funciona y saber **qué Gini hay que superar**. Salió 0,25 a 6 meses. Flojo, pero honesto.

**v2 — los pesos los pone la validación.** El propio doc dice cómo mejorar v1: mirar el Gini de cada métrica por separado, tirar las que no predicen nada (salieron 12 de 24: concentración entera, tendencias, volatilidad…), quedarse con una de cada par redundante, y poner peso proporcional a lo que predice cada una. Sin penalizaciones (medido: restan). Resultado 0,35. Sigue siendo una fórmula transparente, sin entrenamiento, que cualquiera puede leer.

**v3 — el modelo.** Cuando la fórmula lineal toca techo, se deja que un modelo aprenda las combinaciones (por ejemplo: "colchón bajo *y* tendencia negativa" es mucho peor que la suma de los dos). Usa las 105 columnas. Para que no haga trampa, cada empresa se puntúa con un modelo que nunca la vio, y hay una versión entrenada solo con el pasado para medir fuera de tiempo. Resultado 0,38 a 6 meses, 0,54 a 1 mes.

Las tres conviven porque **cada una vale para algo distinto**: v1 es la referencia, v2 es la explicable, v3 es la mejor. En la app, lo natural es enseñar el número de v3 y la explicación de v2 ("bajó 12 pts: días en negativo 7 → 30").

---

## Fase 2 · La validación

### Por qué hace falta una fase aparte

Porque un score que no se valida es una opinión. La pregunta de la Fase 2 es brutalmente simple: **el score de enero, ¿acertó lo que pasó de febrero a julio?**

Para responderla hace falta primero decir qué es "lo que pasó".

### Por qué el evento se define con reglas (D1–D4)

Nadie nos ha dado una lista de empresas que quebraron. En banca tampoco la tienen: definen el *default* como un comportamiento observable ("más de 90 días sin pagar"). Hacemos lo mismo, con cuatro reglas sobre **lo que la empresa debe** (no lo que le deben, eso es una métrica del score):

- D1: una factura recibida lleva 90 días vencida y sin pagar, y es grande.
- D2: falta la nómina, la SS o los impuestos que siempre pagaba.
- D3: 5 o más días del mes en descubierto.
- D4: intereses y comisiones se disparan.

Fíjate en que D2, D3 y D4 se parecen a las alarmas S3, S1 y S2. Es a propósito y es un riesgo: si la métrica de hoy es la misma regla que el evento de mañana, el Gini se infla. Por eso el evento se mide **en los meses siguientes**, nunca en el mismo, y se calcula además un "Gini sin las métricas gemelas" para ver cuánto predice el score sin ellas.

### Por qué la tasa de evento tenía que estar entre 5 % y 20 %

Si el 60 % de los meses son "evento", predecirlo es trivial y no significa nada. Si es el 1 %, no hay casos para aprender. La primera versión literal de las reglas daba **74 %**. Dos cosas lo causaban: el saldo se calculaba desde cero (todo el mundo parecía en descubierto) y D1 contaba facturas que el ERP nunca marca como pagadas aunque lo estén. Con el saldo real y D1 más exigente: **19,1 %**. Ese ajuste está documentado en `analytics/config.py` con los números.

### Por qué Gini, y por qué a 1, 3 y 6 meses

El Gini responde: si cojo una empresa que tuvo evento y otra que no, ¿cuántas veces la primera tenía peor score? 0 es tirar una moneda; 1 es perfecto; 0,4–0,6 es lo que consigue un banco con datos de pymes.

Se mide a tres horizontes porque un score que solo ve lo inminente (Gini alto a 1 mes, cero a 6) no sirve para *anticipar*, solo para *constatar*. Y anticipar es el producto.

### Por qué fuera de muestra y fuera de tiempo

Porque el reto tiene un test oculto: empresas que no hemos visto, y el futuro. Fuera de muestra (5 grupos de empresas, se evalúa cada uno con un score que no lo usó) simula lo primero. Fuera de tiempo (se construye con los primeros meses, se evalúa en los últimos) simula lo segundo. Si el Gini cae mucho en cualquiera de los dos, el score memorizó en vez de aprender.

### Por qué lead time, cura, PSI y autocorrelación

- **Lead time**: no basta acertar, hay que acertar *antes*. ¿Cuántos meses antes del evento el score ya estaba en el 20 % peor?
- **Gini de cura**: un score que solo baja es un score de castigo. Si una empresa se recupera, ¿el score sube antes?
- **PSI**: ¿el score de 2026 significa lo mismo que el de 2025, o se ha desplazado la escala?
- **Autocorrelación**: un score que salta 30 puntos cada mes es ruido; uno que no se mueve nunca no reacciona. Tiene que estar entre 0,80 y 0,95.

---

## Dónde estamos

| | v1 | v2 | v3 | mínimo del doc |
|---|---:|---:|---:|---:|
| Gini a 1 mes | 0,34 | 0,43 | **0,54** | — |
| Gini a 3 meses | 0,26 | 0,36 | **0,44** | — |
| Gini a 6 meses | 0,25 | 0,35 | **0,38** | 0,40 |
| Autocorrelación | 0,74 | 0,90 | 0,93 | 0,80–0,95 |
| Caída fuera de muestra | 0,01 | 0,01 | 0,00 | < 0,08 |

Tres versiones, cada una mejor que la anterior, estables fuera de muestra y fuera de tiempo. Y un número que aún no llega: 0,38 frente a 0,40 a seis meses.

La razón está medida: el score ordena muy bien **quién está mal hoy** y regular **quién va a empezar a estar mal**. Cuando se mira solo a empresas que hoy no tienen ningún evento, el Gini baja a 0,20. Y probando más features, más historia o modelos más grandes no se mueve más de una centésima.

Es decir: el techo no está en el score, está en la **definición del evento** (D1 y D3 son estados que duran meses, y el 46 % de los pares empresa-mes tiene evento en los 6 meses siguientes). La siguiente iteración no es otra versión del score; es una `events_v2` más exigente. El circuito está preparado para eso: se cambia un umbral, `./pipeline/run.sh --from labels`, y `comparison.md` dice si mejora.
