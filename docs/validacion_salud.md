# Validación del score de salud

Cómo saber si el score es bueno sin tener una etiqueta. Se hace como en banca: se define un **evento de impago** con reglas sobre los datos, se comprueba si el score de hoy predice el evento de los próximos meses, y se mide con Gini.

## 1. El evento (la "verdad")

En banca el *default* es "más de 90 días sin pagar una obligación". Es un comportamiento observable, no una quiebra. Lo construimos igual, sobre **lo que la empresa debe** (no sobre lo que le deben, que es una feature del score).

Una empresa está en **evento** el mes *m* si cumple alguna:

| Id | Regla | Datos |
|---|---|---|
| D1 | Factura recibida con `due_date` ≤ *m − 3 meses* y sin pagar a fin de *m*, de importe ≥ 1 % de sus salidas mensuales | `invoices`, `amount < 0` |
| D2 | Falta el pago de `salary`, `social_security` o `tax` que existía en los 6 meses anteriores | `transactions` |
| D3 | Saldo `checking` < 0 durante ≥ 5 días del mes | `transactions` |
| D4 | `interest_charge + fee` > 3 × mediana de 6 meses **y** > 2 % de las salidas | `transactions` |

```
evento_m = D1 ∨ D2 ∨ D3 ∨ D4
cura_m   = 1 si estuvo en evento ≥ 2 meses y lleva ≥ 3 meses sin evento
```

Tasa base esperada: entre 5 % y 20 % de los pares (empresa, mes). Si sale fuera, ajustar umbrales (D1 a 60 días, etc.) **antes** de evaluar nada.

Referencia del dataset: 3,3 % de las facturas pagadas se pagaron con más de 90 días de retraso; 92.083 facturas recibidas están vencidas a fecha de extracción.

## 2. La tabla de validación

Una fila por empresa y mes de observación *t*:

| company_id | t | score_t | y_1 | y_3 | y_6 | cura_6 |
|---|---|---|---|---|---|---|

```
score_t = score calculado con datos ≤ fin de t
y_h     = 1 si evento en algún mes de t+1 … t+h      (h = 1, 3, 6)
cura_6  = 1 si cura en t+1 … t+6  (solo filas con evento_t = 1)
```

Meses válidos: t = mes 6 … mes 18 (6 de historia antes, 6 de ventana después). ≈ 13 × 1.286 ≈ 16.700 filas.

### Reglas para no hacer trampa (leakage)

| Dato | Problema | Solución |
|---|---|---|
| `invoices.status` | es el estado a fecha de extracción, no en *t* | no usarlo; vencida en *t* = `due_date < t` y (`payment_date > t` o vacío) |
| `balances.csv` | es la foto final | no anclar el saldo al final; usar suma acumulada desde el primer movimiento o saldo relativo dentro del mes |
| `debt_products.outstanding` | es el saldo de hoy | usar `granted`, `created_at` y `debt_repayment` |
| percentiles | si se calculan con todos los meses, el futuro contamina | percentil por mes *t* |
| evento = feature | si la feature de *t* es la misma regla que el evento, el Gini se infla | el evento se mide en *t+1…t+6* con umbral de 90 días; la feature en *t*. Comprobar el Gini quitando la feature gemela |

## 3. Métodos

### 3.1 Gini (poder de ordenación) — el número principal
¿Las empresas con peor score son las que tienen evento después?
```
AUC  = P( score_a < score_b )   para un par (a con evento, b sin evento) elegido al azar
Gini = 2 · AUC − 1
```
Se calcula para h = 1, 3, 6.

| Gini | Lectura |
|---|---|
| 0 | azar |
| 0,3 – 0,4 | débil |
| 0,4 – 0,6 | scoring de pymes en banca |
| 0,6 – 0,8 | modelo de comportamiento con datos bancarios |

Debe **decaer suavemente** con el horizonte. Si h1 = 0,7 y h3 = 0,1, solo ve lo inminente.

### 3.2 KS (separación)
```
KS = max_s | F_evento(s) − F_no_evento(s) |
```
F = distribución acumulada del score en cada grupo. > 0,3 aceptable; > 0,45 bueno.

### 3.3 Gini univariante — ¿la combinación aporta?
Gini de **cada métrica por separado** contra y_6.
```
regla 1: métrica con Gini < 0,05 → fuera
regla 2: dos métricas con correlación > 0,8 → quedarse con una
regla 3: Gini(score) > max( Gini de cada métrica )   si no, la combinación destruye información
```
Los pesos del score se pueden fijar proporcionales al Gini univariante de cada dimensión.

### 3.4 Lead time (anticipación)
Cuántos meses antes del evento el score ya avisaba.
```
umbral_t     = percentil 20 del score ese mes
aviso_c      = primer mes en que score_c < umbral
lead_time_c  = mes_primer_evento_c − aviso_c
lead_time    = mediana( lead_time_c )   sobre empresas con evento
```
Objetivo: ≥ 2 meses. Es el bonus "anticipación medida" del reto.

### 3.5 Gini de mejora (las dos direcciones)
Sobre filas con evento_t = 1:
```
Gini( Δscore_t = score_t − score_{t−3}  vs  cura_6 )
```
Si el score sube antes de que la empresa se cure, detecta mejora. Objetivo: > 0,3.

### 3.6 Out-of-sample (simula el test oculto)
```
folds = 5, asignados por group_id (todas las filiales de un grupo en el mismo fold), semilla fija
para cada fold k:
    pesos / percentiles / modelo con los otros 4
    Gini_k = Gini en el fold k
Gini_OOS = media( Gini_k )
```
Aceptable si `Gini_in_sample − Gini_OOS < 0,05`.

### 3.7 Out-of-time
```
construir con t ≤ mes 12
Gini_OOT = Gini en t = 13 … 18
```
Mismo criterio. Si cae mucho, el score memorizó una época.

### 3.8 PSI (estabilidad de la distribución)
Compara la distribución del score en dos meses separados 12 meses, en 10 tramos.
```
PSI = Σ_tramos ( p_hoy − p_antes ) · ln( p_hoy / p_antes )
```
< 0,10 estable · 0,10–0,25 vigilar · > 0,25 el score ha cambiado de significado.

### 3.9 Autocorrelación (ruido)
```
rho = corr( score_t , score_{t+1} )   por empresa, media
```
0,80 – 0,95. Menos = ruido; más = no reacciona.

### 3.10 Calibración (opcional)
Agrupar en 10 tramos de score; comparar % de evento observado con el esperado por tramo. Da significado al número ("score 30 ⇒ 40 % de evento a 6 meses"). Útil para pricing en el producto.

### 3.11 Revisión de casos
- 20 mejores y 20 peores del último mes: abrir sus datos; tiene que entenderse por qué.
- 10 falsos negativos (score alto, evento en ≤ 3 meses): ¿qué señal faltó?
- 10 falsos positivos (score bajo, 12 meses sin evento): ¿qué los salvó?
- Filiales del mismo grupo: correlación de score 0,3 – 0,5.

## 4. Criterios de aceptación

| Métrica | Mínimo | Bueno |
|---|---|---|
| Gini h6 | 0,40 | 0,55 |
| Gini h6 > mejor métrica individual | sí | — |
| KS h6 | 0,30 | 0,45 |
| Lead time mediano | 1 mes | ≥ 2 meses |
| Gini de mejora | 0,20 | 0,35 |
| Caída in-sample → OOS | < 0,08 | < 0,05 |
| Caída → OOT | < 0,08 | < 0,05 |
| PSI 12 meses | < 0,25 | < 0,10 |
| Autocorrelación | 0,75 – 0,97 | 0,80 – 0,95 |

## 5. Orden de ejecución

1. Recuperar `category` en el 25 % de transacciones con `-` (D2 y D4 dependen de ello).
2. Calcular D1–D4 y comprobar la tasa base. Congelar `events.csv`.
3. Construir la tabla de validación con las reglas de leakage.
4. Gini univariante de cada métrica → lista definitiva de features y pesos.
5. Score v1 → Gini h1/h3/h6, KS.
6. Out-of-sample por grupo y out-of-time.
7. Lead time y Gini de mejora.
8. Revisión de casos. Leaderboard.

Frase para el jurado: "Gini 0,xx a 6 meses sobre un evento de impago a 90 días, estable en empresas no vistas y fuera de tiempo, con anticipación mediana de N meses".
