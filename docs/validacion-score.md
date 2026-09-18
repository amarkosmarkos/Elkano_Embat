# Cómo validar el score sin etiquetas — como se hace en la vida real

Responde a: "el score es una combinación de métricas; ¿cómo sé empíricamente si es bueno?". Aplica el proceso estándar de validación de modelos de riesgo de crédito (Basilea / guía TRIM del BCE) a nuestros 8 CSV.

## 0. La idea en tres frases

1. En la vida real esto **es supervisado**: la etiqueta es el *default*, definido por regulación (CRR art. 178) como **más de 90 días sin pagar una obligación**. No es una quiebra: es un comportamiento observable en los pagos.
2. Nosotros no tenemos una columna "default", pero tenemos 24 meses de pagos, saldos y facturas. **Construimos la misma etiqueta con reglas** sobre nuestras columnas. A partir de ahí se valida como valida un banco.
3. La prueba central: calcular el score en el mes *t* con datos hasta *t*, mirar si el evento ocurre en *t+1…t+6*, y medir el **Gini**. El score combinado es bueno si su Gini supera al de cada métrica individual, y se mantiene en empresas y meses que no se usaron para construirlo.

## 1. Definición del evento de resultado ("default proxy")

Regla del sector: el default es sobre **las obligaciones propias** de la empresa (lo que ella debe), no sobre lo que le deben. Por eso el evento se construye con pagos propios, y los cobros de clientes quedan como *feature*, no como resultado. Así evitamos validar el score contra sí mismo.

Una empresa está en **evento** en el mes *m* si cumple **alguna** de estas:

| Id | Regla | Columnas | Justificación |
|---|---|---|---|
| **D1** | Factura **recibida** (`amount` < 0) con `due_date` en *m−3* o antes y sin `payment_date` ≤ *m*, importe ≥ 1 % de sus salidas mensuales | invoices | Es literalmente el "90 días sin pagar" de Basilea |
| **D2** | Mes sin salida con `category` ∈ {`salary`, `social_security`, `tax`} cuando los 6 meses anteriores sí la tenían | transactions | No pagar nóminas, SS o impuestos es la señal de estrés más grave y más temprana |
| **D3** | Saldo reconstruido de cuentas `checking` < 0 durante ≥ 5 días del mes | transactions + balances | Descubierto = falta de caja real |
| **D4** | `interest_charge` + `fee` del mes > 3 × mediana de los 6 meses anteriores **y** > 2 % de las salidas | transactions | Comisiones de demora, intereses de descubierto |

Tasas base observadas en el dataset (para saber si el evento es demasiado raro o demasiado común):
- 33,7 % de las facturas pagadas se pagaron tarde; **3,3 % con más de 90 días** de retraso.
- 92.083 facturas recibidas están `overdue` a fecha de extracción.
- `salary`: 42.223 movimientos; `social_security`: 24.158; `tax`: 55.904 — hay suficiente para D2.
- `collection_refund` (11.848): devoluciones de cobros de clientes — es *feature*, no evento.

Objetivo: que entre el 5 % y el 20 % de los pares (empresa, mes) tengan evento. Si sale < 2 %, relajar D1 a 60 días; si sale > 30 %, endurecer los umbrales. Ajustarlo con los datos antes de nada.

**Evento de mejora ("cure")**: empresa que estuvo en evento ≥ 2 meses y lleva ≥ 3 meses sin ninguno de D1–D4. Sirve para validar la dirección de mejora (requisito del reto). Definición equivalente a la "cura" de Basilea (probation period).

## 2. Construcción del dataset de validación

Es la parte que más se hace mal. Para cada empresa y cada mes *t* de observación:

- **Features / score**: calculados **solo con datos con fecha ≤ fin de *t***.
- **Resultado**: `y = 1` si hay evento en algún mes de *t+1 … t+6* (ventana de 6 meses); `y = 0` si no.
- Meses de observación válidos: *t* = mes 6 … mes 18 (se necesitan 6 meses de historia para features y 6 de ventana). Eso da **13 puntos × 1.286 empresas ≈ 16.700 filas**.

| company_id | t | score_t | feat_1 … feat_n | y (evento en t+1…t+6) |
|---|---|---|---|---|
| COMP_0001 | 2025-03 | 71 | … | 0 |
| COMP_0001 | 2025-04 | 66 | … | 1 |
| … | | | | |

### Fugas de información (leakage) — específicas de nuestros datos

| Trampa | Por qué | Cómo se evita |
|---|---|---|
| **`invoices.status`** es el estado **a fecha de extracción** (2026-09), no en el mes *t* | Una factura `overdue` hoy pudo estar al día en el mes *t* | No usar `status`. Derivar el estado en *t*: vencida si `due_date` < *t* y (`payment_date` > *t* o vacío) |
| **`balances.csv`** es la foto final | Anclar el saldo reconstruido al final introduce la suma de todos los flujos futuros | Reconstruir el saldo con flujos relativos (saldo mínimo del mes − saldo inicial) o anclar solo cuando *t* = último mes |
| **`debt_products.outstanding`** es el saldo actual | No se sabe cuánto era en *t* | Usar solo `granted` y `created_at` como features; reconstruir amortizaciones desde `debt_repayment` si hace falta |
| **Percentiles calculados con todas las empresas y todos los meses** | Los meses futuros contaminan la normalización | Percentiles por mes *t* usando solo empresas de entrenamiento |
| Evento y feature idénticos | Si D1 es "facturas recibidas vencidas" y una feature es "facturas recibidas vencidas hoy", el Gini se infla | Las features miden *t*; el evento mide *t+1…t+6* con el umbral de 90 días. Comprobar además el Gini quitando la feature gemela |

## 3. Métricas: ¿el score ordena bien?

Con la tabla anterior, ordenamos los pares por `score_t` y miramos dónde caen los `y = 1`.

| Métrica | Qué es | Referencia en la industria |
|---|---|---|
| **Gini (Accuracy Ratio)** | 2 × AUC − 1. Métrica estándar de riesgo | Scoring de pymes en banca: 0,40–0,60. Modelos de comportamiento con datos bancarios: 0,60–0,80. 0 = azar |
| **KS** | máxima distancia entre la distribución acumulada de buenos y malos | > 0,30 aceptable; > 0,45 bueno |
| **Gini por horizonte** | repetir con ventana *t+1*, *t+3*, *t+6* | Debe decaer suavemente. Si en *t+1* es 0,7 y en *t+3* es 0,1, el score solo ve lo inminente |
| **Lead time** | para cada empresa que entra en evento en *m*, primer mes en que el score cruzó el umbral de alerta; mediana de (*m* − ese mes) | ≥ 2 meses. Es el bonus "anticipación medida" del reto, y sale gratis de aquí |

### Análisis univariante: la prueba de que la combinación aporta

Antes de combinar nada, calcular el **Gini de cada métrica por separado** contra `y`. Resultado esperado: una tabla ordenada.

| Métrica | Gini | Decisión |
|---|---|---|
| días de retraso en pagos propios | 0,5x | entra |
| % dispuesto de líneas | 0,3x | entra |
| … | | |
| nº de cuentas bancarias | 0,02 | fuera |

Reglas:
- Métricas con Gini < 0,05: fuera. No discriminan.
- Métricas con Gini alto pero correlación > 0,8 entre sí: quedarse con una.
- **El score combinado debe tener Gini mayor que la mejor métrica individual.** Si no, la combinación destruye información y hay que revisar pesos o normalización.

### Dirección de mejora

Mismo procedimiento con `y_cure` (§1) sobre las empresas que estaban en evento: ¿el score sube antes de que se curen? Gini de (Δscore en *t*) contra `y_cure` en *t+1…t+6*. El reto penaliza un detector solo de deterioro.

## 4. Estabilidad: fuera de muestra y fuera de tiempo

| Test | Cómo | Qué mirar |
|---|---|---|
| **Out-of-sample** (simula el test oculto) | Separar el 20 % de las empresas **por `group_id`** (las filiales de un holding se parecen). Pesos, percentiles y modelo con el 80 %; Gini en el 20 % | Caída de Gini < 0,05 entre train y holdout. Repetir con 5 particiones |
| **Out-of-time** | Construir con *t* ≤ mes 12; medir en *t* = 13…18 | Mismo criterio. Si cae mucho, el score memorizó una época (estacionalidad, 2025 vs 2026) |
| **PSI** (Population Stability Index) | Distribución del score en 10 tramos en dos periodos; PSI = Σ (p₂−p₁)·ln(p₂/p₁) | < 0,10 estable; 0,10–0,25 vigilar; > 0,25 el score ha cambiado de significado |
| **Autocorrelación** | correlación del score de cada empresa entre *t* y *t+1* | 0,80–0,95. Menos = ruido; más = no reacciona |

## 5. Calibración (opcional para el reto)

Agrupar los pares en 10 tramos de score y comparar tasa de evento observada con la esperada por tramo. Convierte un ranking en un número con significado ("score 30 ⇒ 40 % de probabilidad de evento en 6 meses"). Útil para el pitch de producto (pricing de seguro o de crédito); el jurado no lo va a auditar.

## 6. Revisión experta (lo que hace un comité de riesgos)

- Los 20 mejores y los 20 peores del último mes: abrir sus datos y comprobar que se entiende por qué. Una empresa en el top con descubiertos o nóminas sin pagar es un bug.
- Casos de desacuerdo: empresas con score alto y evento en 3 meses (falsos negativos) — ¿qué señal se nos escapó? Empresas con score bajo y sin evento en 12 meses (falsos positivos) — ¿qué las salvó?
- Coherencia por grupo: correlación del score entre filiales del mismo `group_id` moderada (0,3–0,5).

## 7. El leaderboard

Es la única validación externa. Tratarlo como un holdout de verdad: pocas subidas, solo para confirmar el backtest interno. Si el backtest dice Gini 0,6 y el leaderboard nos pone últimos, el script mide otra cosa — y eso hay que saberlo el viernes.

## 8. Plan de ejecución (orden)

1. **Categorías**: recuperar `category` en el 25 % de transacciones con `-` (clasificador sobre `description`). D2 y D4 dependen de ello.
2. **Eventos D1–D4** por empresa y mes; comprobar la tasa base (5–20 %). Ajustar umbrales.
3. **Tabla de validación** (§2) con las reglas anti-leakage. Guardarla en Convex o parquet: es el activo central del proyecto.
4. **Gini univariante** de cada métrica (§3). Fijar la lista de features.
5. **Score v1** (scorecard aditivo con pesos proporcionales al Gini univariante). Gini combinado > mejor individual.
6. **Out-of-sample por grupo y out-of-time** (§4).
7. **Lead time** y **Gini de mejora** (§3): son los números del pitch.
8. Revisión de 20+20 casos (§6). Subir al leaderboard.

Quien pregunte "¿cómo sabes que el score es bueno?" recibe: "Gini 0,6x a 6 meses sobre un evento de default a 90 días, estable en empresas no vistas (0,5x) y fuera de tiempo, con una anticipación mediana de N meses".
