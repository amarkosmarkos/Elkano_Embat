# Cómo se determina si una empresa está sana

Base conceptual del score. Qué se mira en análisis de riesgo de crédito y tesorería, por qué, y de qué columna del dataset sale cada señal.

## 1. Lo clásico: análisis de estados financieros

La literatura de riesgo de crédito parte de las cuentas anuales.

- **Altman Z-score (1968)** — combinación lineal de 5 ratios: capital circulante/activos, beneficios retenidos/activos, EBIT/activos, valor de mercado/deuda, ventas/activos. Sigue siendo el benchmark de predicción de quiebra.
- **Beaver (1966)** — el mejor predictor individual de quiebra era **cash-flow / deuda total**: capacidad de generar caja frente a lo que se debe.
- Lo que mira un analista bancario, en 4 bloques:

| Bloque | Ratios habituales |
|---|---|
| Liquidez | current ratio, quick ratio, caja / gastos mensuales (*runway*) |
| Solvencia / apalancamiento | deuda neta / EBITDA, cobertura de intereses, **DSCR** (caja generada / servicio de la deuda) |
| Rentabilidad y caja | márgenes, conversión de beneficio en caja |
| Eficiencia operativa | **DSO** (días en cobrar), **DPO** (días en pagar), rotación de inventario → ciclo de conversión de caja |

**Limitación** (y es justo el problema que plantea el reto): son fotos fijas anuales con 6–12 meses de retraso. Los ratings "se actualizan cada tanto" y no ven el 82 → 68.

## 2. Lo moderno: scoring con datos bancarios (cash-flow lending)

Desde PSD2 (2018), fintechs de crédito a pymes (Kabbage, iwoca, Tide, Silvr, Qonto…) y bancos puntúan con **movimientos bancarios** en vez de cuentas. Las guías de la EBA sobre concesión de préstamos (2020) reconocen el análisis basado en flujos de caja. Los bureaus (Dun & Bradstreet **Paydex**, Experian) llevan décadas puntuando solo con **days beyond terms**: cuántos días después del vencimiento paga la empresa. Un único indicador de comportamiento, y de los más predictivos.

| Dimensión | Señal concreta | Por qué importa |
|---|---|---|
| **Liquidez real** | saldo mínimo del mes, días en negativo/descubierto, saldo medio vs. salidas mensuales | la quiebra es siempre falta de caja, no de beneficio |
| **Generación de caja** | entradas − salidas operativas por mes, tendencia y volatilidad | el cash-flow de Beaver, pero mensual |
| **Comportamiento de pago propio** | retrasos con proveedores, impuestos, nóminas; devoluciones/recibos impagados | pagar tarde impuestos o nóminas es la señal de estrés más temprana |
| **Comportamiento de cobro** | DSO, % de facturas vencidas, envejecimiento (*aging*) | si tus clientes no pagan, te contagian |
| **Deuda** | servicio de deuda / caja generada, % dispuesto de líneas, vencimientos próximos | una línea al 95 % de uso es una empresa sin colchón |
| **Concentración** | % de cobros del top-1 / top-5 clientes | un cliente que se cae hunde la empresa |
| **Estabilidad** | volatilidad de ingresos, estacionalidad esperada vs. real | separa el "bache" de la "caída" |

## 3. Mapeo a nuestro dataset

Tenemos exactamente lo que usa un prestamista de open banking y **no** tenemos cuentas anuales. Ver tipos y avisos en [data-map.md](data-map.md).

| Dimensión | Fuente | Cálculo propuesto |
|---|---|---|
| Liquidez | `transactions` (saldo reconstruido acumulando `amount` por `product_id`, anclado al final con `balances.balance`) | saldo mínimo mensual; runway = saldo / salidas medias; días en negativo |
| Generación de caja | `transactions.amount` por mes, excluyendo `category` no operativas (`transfer`, disposiciones/amortizaciones de deuda…) | neto operativo mensual; pendiente a 3 y 6 meses; desviación típica |
| Pago propio | `transactions.category` ∈ {`tax`, `payroll`, `utility`, `fee`, `interest_charge`}; `invoices` recibidas (`amount` < 0): `payment_date − due_date` | días de retraso medios; % pagos fuera de plazo; comisiones/intereses de demora |
| Cobro | `invoices` emitidas (`amount` > 0): `status = overdue`, `pending_amount`, `payment_date − issuance_date` | DSO; % importe vencido; aging 30/60/90 |
| Deuda | `debt_products.outstanding / granted`; `debt_schedule_config` (cuota, `next_payment_date`) | % dispuesto de líneas; servicio de deuda / caja generada |
| Concentración | `invoices.counterparty_id`, `transactions.counterparty_id` | share del top-5 en cobros |
| Estabilidad | series mensuales de todo lo anterior | coeficiente de variación; ruptura de estacionalidad |

Cuidado con: signo de `amount` (negativo = salida), `category = "-"` en el 25 % de transacciones, `counterparty_id` vacío en el 90 % de transacciones (usar facturas para concentración), fechas y importes fuera de rango (filtrar antes de agregar).

## 4. Definición operativa de "sana"

No hay etiqueta en el dataset. La definición que usa el sector:

> Una empresa está sana cuando **genera caja de forma estable, cobra a tiempo, paga a tiempo, tiene colchón de liquidez y su deuda es proporcional a la caja que genera** — y su trayectoria en esas cinco cosas es plana o mejora.

**Empieza a torcerse** cuando una o dos dimensiones se degradan durante ≥ 2–3 meses seguidos aunque el resto aguante. El orden típico:

1. se estira el DPO (paga más tarde a proveedores),
2. crece el uso de líneas de crédito,
3. aparecen comisiones de demora / intereses,
4. se retrasan impuestos o nóminas,
5. cae el saldo.

El score debe moverse en el paso 1–2, no en el 5. Eso es la **anticipación** que pide el reto.

## 5. Diseño del score que se deriva

- `score(company_id, month) → 0–100`, una serie mensual por empresa. Del mes final sale el número por empresa; de la serie, la tendencia, la dirección y la anticipación. Al revés no se puede.
- Cada dimensión normalizada contra el conjunto de empresas (percentil o z-score) y combinada de forma **aditiva** → el score se descompone en contribuciones y se explica: "bajó 8 puntos porque el % de facturas vencidas pasó del 10 al 30 %". Es el diseño de los scorecards bancarios reales.
- Componente de trayectoria explícito (pendiente de los últimos N meses) para que 45 → 65 puntúe distinto de 82 → 68 aunque hoy coincidan.
- Suavizado / persistencia para que un mes malo aislado no hunda el score (bache vs. caída).
- Sin features que dependan de `company_id` o `group_id`: debe generalizar al test oculto de 60–80 empresas.

## Preguntas abiertas (para los mentores)

- Formato exacto de entrega al leaderboard: ¿`company_id, month, score`? ¿rango 0–100?
- Métrica del script de scoring y contra qué verdad (¿etiqueta discreta, score continuo, dirección de la trayectoria?).
- ¿El test oculto viene con los mismos 8 CSV para esas 60–80 empresas? ¿Cuándo se libera?
- El brief habla de "nueve CSV" y de "CSV y JSON"; el zip trae 8 CSV + diccionario y ningún JSON.
