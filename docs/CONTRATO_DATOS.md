# Contrato de datos · X-Ray Monitor

Este documento fija **qué ficheros necesita la app** y con qué esquema. Cada equipo entrega sus JSON en
`Elkano_Embat/data/`. La app no lee los CSV originales: solo estos ficheros. Si el esquema se respeta,
se pueden regenerar las veces que haga falta sin tocar código de la app (`pnpm db:seed` y listo).

Convenciones:
- Un fichero por tabla, **array JSON de objetos** (no JSONL).
- Meses como `"YYYY-MM"` (ej. `"2025-03"`). Importes en **EUR**, ya convertidos.
- Lo que no se puede calcular va a `null`, **nunca a 0**.
- `company_id` es el de `companies.csv` (`COMP_0639`).

---

## Equipo "Leer el rastro" + "El score, el eje"

### `companies.json` · una fila por empresa (1.286)

```json
{
  "company_id": "COMP_0639",
  "group_id": "GROUP_0113",
  "display_name": "Velasco Industrial",
  "sector_hint": "industrial",
  "currency": "EUR",
  "has_erp": true,
  "has_debt": true,
  "first_month": "2024-09",
  "last_month": "2026-08",
  "n_months": 24
}
```

- `display_name`: nombre sintético (Faker con semilla fija) para que la demo no diga "COMP_0639".
- `sector_hint`: si se puede inferir de las categorías/descripciones; si no, `null`.
- `n_months`: meses con transacciones. Solo 291 empresas tienen los 24-25 completos.

### `scores.json` · una fila por empresa y mes (~20k)

```json
{
  "company_id": "COMP_0639",
  "month": "2026-08",
  "score": 68,
  "confidence": 0.9,
  "delta_1m": -2,
  "delta_3m": -7,
  "delta_6m": -14,
  "regime": "deteriorating",
  "subscores": {
    "liquidity": 55,
    "collections": 72,
    "payments": 60,
    "debt": 48,
    "activity": 80
  },
  "signals": {
    "cash_position": 412000,
    "net_cash_flow": -83000,
    "runway_months": 4.9,
    "dso_days": 61,
    "dpo_days": 44,
    "overdue_ar_ratio": 0.18,
    "overdue_ap_ratio": 0.07,
    "debt_utilization": 0.83,
    "debt_service_ratio": 0.21,
    "inflow_volatility": 0.35,
    "top_customer_share": 0.41
  }
}
```

| campo | tipo | significado |
|---|---|---|
| `score` | entero 0-100 | 100 = más sana. Es el número del leaderboard. |
| `confidence` | 0-1 | baja con historia corta o pocos datos (sin ERP, sin deuda). |
| `delta_1m/3m/6m` | entero o `null` | diferencia de score respecto a hace 1/3/6 meses. |
| `regime` | enum | `improving` · `stable` · `deteriorating` · `dip` (bache puntual, no deterioro). Lo decide el modelo. |
| `subscores.*` | 0-100 o `null` | liquidez, cobros, pagos, deuda, actividad. `collections/payments` requieren ERP; `debt` requiere deuda. |
| `signals.*` | número o `null` | valores crudos para gráficos y explicaciones (ver tabla abajo). |

Señales (`signals`):

| señal | unidad | cómo se calcula (orientativo) |
|---|---|---|
| `cash_position` | EUR | saldo de cuentas corrientes a fin de mes, reconstruido hacia atrás desde `balances.csv` con las transacciones |
| `net_cash_flow` | EUR | entradas − salidas del mes |
| `runway_months` | meses | caja / media de salidas netas de 3 meses (si flujo positivo, `null` o un tope de 36) |
| `dso_days` | días | plazo medio de cobro de facturas emitidas (`amount > 0`) |
| `dpo_days` | días | plazo medio de pago de facturas recibidas (`amount < 0`) |
| `overdue_ar_ratio` | 0-1 | importe vencido por cobrar / total por cobrar |
| `overdue_ap_ratio` | 0-1 | importe vencido por pagar / total por pagar |
| `debt_utilization` | 0-1 | outstanding / granted en líneas de crédito y préstamos |
| `debt_service_ratio` | 0-1 | cuotas + intereses del mes / entradas del mes |
| `inflow_volatility` | 0-∞ | desviación típica / media de entradas en 6 meses |
| `top_customer_share` | 0-1 | peso del mayor `counterparty_id` en las entradas |

Se pueden añadir señales nuevas: la app las pinta genéricamente si están en `signals`.

### `predictions.json` · test oculto (leaderboard)

```json
{ "company_id": "COMP_9999", "month": "2026-08", "score": 71 }
```

Mismo esquema que `scores.json` si es posible (con subscores y señales); mínimo `company_id`, `month`,
`score`. La app las muestra en la pestaña "Empresas nunca vistas".

### `anticipation.json` · bonus "anticipación medida"

```json
{
  "company_id": "COMP_0639",
  "event_month": "2026-08",
  "event_type": "deterioration",
  "detected_month": "2026-05",
  "lead_months": 3
}
```

`event_type` ∈ `deterioration` · `improvement`. `lead_months = event_month − detected_month`.
Alimenta el KPI "detectamos el cambio X meses antes de media".

---

## Equipo "Explicarse"

### `explanations.json` · una por empresa y mes

Mínimo: el último mes de cada empresa. Ideal: los últimos 6 meses de las empresas de la demo.

```json
{
  "company_id": "COMP_0639",
  "month": "2026-08",
  "headline": "Sigue pareciendo sana, pero cobra cada vez más tarde y ha agotado la póliza.",
  "summary": "El saldo aguanta porque ha tirado de la línea de crédito, no porque cobre bien. Desde abril el plazo de cobro ha pasado de 47 a 61 días y tres clientes acumulan 112 k€ vencidos. Si no corrige el cobro, en dos meses tendrá que renegociar la póliza.",
  "drivers": [
    {
      "signal": "dso_days",
      "label": "Plazo de cobro",
      "direction": "worse",
      "impact": -6,
      "from": 47,
      "to": 61,
      "since": "2026-04"
    },
    {
      "signal": "debt_utilization",
      "label": "Uso de la línea de crédito",
      "direction": "worse",
      "impact": -4,
      "from": 0.61,
      "to": 0.83,
      "since": "2026-05"
    },
    {
      "signal": "net_cash_flow",
      "label": "Flujo de caja",
      "direction": "better",
      "impact": 2,
      "from": -120000,
      "to": -83000,
      "since": "2026-07"
    }
  ],
  "recommendations": [
    {
      "action": "Reclamar las 3 facturas vencidas de COUNTERPARTY_04680 (112 k€)",
      "urgency": "high",
      "expected_impact": "+9 días de runway"
    },
    {
      "action": "Renegociar el vencimiento de la póliza antes de que llegue al 90 %",
      "urgency": "medium",
      "expected_impact": "evita un impago técnico en noviembre"
    }
  ]
}
```

- `headline`: una frase, máximo ~90 caracteres. Es lo que se ve en la tarjeta.
- `summary`: 2-4 frases en castellano, sin jerga, para un CFO.
- `drivers`: 2-5 entradas. `impact` es la **contribución en puntos** al cambio de score desde el mes
  anterior; la suma debe aproximar `delta_1m`. `direction` ∈ `better` · `worse` · `neutral`.
  `signal` debe existir en `signals` de `scores.json`.
- `recommendations`: 1-3. `urgency` ∈ `high` · `medium` · `low`.

### `alerts.json` · el monitor

Una fila por alerta disparada. **Tiene que haber alertas de mejora**, no solo de deterioro.

```json
{
  "alert_id": "COMP_0639-2026-05-regime_change",
  "company_id": "COMP_0639",
  "month": "2026-05",
  "type": "regime_change",
  "severity": "high",
  "title": "Cambio de tendencia: de estable a deterioro",
  "message": "El score ha caído 7 puntos en 3 meses mientras el saldo sigue positivo.",
  "lead_months": 3
}
```

- `type` ∈ `regime_change` · `threshold` · `anomaly` · `improvement`.
- `severity` ∈ `high` · `medium` · `info`. Las de `improvement` suelen ser `info`.
- `lead_months`: si la alerta anticipó un evento de `anticipation.json`, cuántos meses antes; si no, `null`.

---

## Calendario de entregas

| cuándo | qué | para qué |
|---|---|---|
| Viernes noche | confirmar esquema + `scores.json` heurístico de 20-30 empresas | la app se construye contra datos reales |
| Sábado mediodía | `companies.json`, `scores.json` completo, `anticipation.json` | cartera completa |
| Sábado tarde | `predictions.json` | pestaña "nunca vistas" + leaderboard |
| Sábado noche | `explanations.json` y `alerts.json` (mínimo las 10 empresas de la demo) | ficha y monitor |
| Domingo mañana | versión final de todo | reseed y ensayo |

## Empresas de la demo (a elegir juntos)

Necesitamos tres perfiles con historia completa (24 meses):
1. **Mejora clara** (tipo Northbrook 45→65).
2. **Deterioro que aún parece sana** (tipo Velasco 82→68): saldo positivo, score cayendo.
3. **Bache puntual** (`dip`): un mes malo que el modelo no confunde con deterioro.

Mientras no lleguen los ficheros reales, `tools/make_fixtures.py` genera todos estos JSON con un score
de reglas para que la app funcione desde el primer momento.
