# Pipeline · RAW → PREPROCESAMIENTO → ETIQUETAS → SCORE → VALIDACIÓN

Pipeline principal con **checkpoints en disco**: cada paso guarda sus salidas en `output/` y una huella de sus
entradas (datos + código). Al relanzar solo se re-ejecuta lo que cambió o lo que falló; un fallo en `score` no
obliga a repetir el preprocesamiento.

```bash
./pipeline/run.sh                  # ejecuta lo que haga falta (~60 s la primera vez, 0 s si todo está al día)
./pipeline/run.sh --status         # qué pasos están al día y por qué
./pipeline/run.sh --from score     # rehace score y validate (p. ej. tras tocar un scorer)
./pipeline/run.sh --only validate  # solo ese paso
./pipeline/run.sh --force          # todo desde cero
```

| Paso | Entrada | Salida en `output/` | Qué hace |
|---|---|---|---|
| 0 `raw` | `output/*.csv` | — | comprueba que están los 8 CSV del zip |
| 1 `preprocess` | CSV | `01_preprocessed/{bronze,silver,gold}/*.parquet`, `elkano.duckdb`, `quality/REPORT.md` | tipado → limpieza con flags → marts gold → 47 checks |
| 2 `labels` | gold | `03_validation/events_v1.csv`, `splits.csv`, `labels_summary.json` | evento de impago D1–D4 + cura; 5 folds por grupo |
| 3 `score` | gold + events + splits | `02_score/scores_v{1,2,3}.csv`, `metrics_v1.parquet` (105 métricas × empresa × mes) | generadores v1 scorecard, v2 ∝ Gini, v3 GBM |
| 4 `validate` | scores + events + splits | `03_validation/report_v{1,2,3}.{json,md}`, `comparison.md` | Gini/KS h1/h3/h6, lead time, cura, OOS, OOT, PSI, autocorrelación, univariante, casos |

Los pasos 2–4 viven en [`analytics/`](../analytics/README.md) (métricas, scorers, evaluador). Estado de los checkpoints:
`output/.pipeline_state.json`. Los CSV crudos y `01_preprocessed/` están en `.gitignore`; las salidas de `02_score/` y
`03_validation/` sí se commitean (lista exacta en `.gitignore`, descripción en [`output/README.md`](../output/README.md)).

## Diseño del preprocesamiento (paso 1)

```
output/*.csv ──ingest──▶ bronze ──clean──▶ silver ──marts──▶ gold ──quality──▶ REPORT.md
                (tipos)          (flags, normaliza,     (filtra is_valid,
                                  deriva, NO borra)      agrega, reconstruye)
```

- **`config.py`** contiene *todas* las decisiones (umbrales, mapas, ventanas, qué flags invalidan). Cambiar una regla = tocar una línea y relanzar.
- **Silver no pierde datos.** Cada fila lleva `flags VARCHAR[]` con todo lo detectado. Solo los flags de `INVALIDATING_FLAGS` dejan la fila fuera de gold (`is_valid = false`); el resto son avisos que el consumidor decide cómo tratar.
- **Valores corruptos → NULL en la columna limpia, crudo en `*_raw`** (`exchange_rate_raw`, `status_raw`, `pending_amount_raw`…).
- **Checks** en `stages/quality.py`: conservación de filas, unicidad de claves, integridad referencial, dominios, ventanas de fechas, coherencia de los agregados (p. ej. Σ `company_month.n_tx` = filas de `fact_transactions`) y de la reconstrucción de saldos.

## Reglas de limpieza (resumen; detalle en `config.py` y `stages/clean.py`)

| Tema | Regla | Motivo (EDA) |
|---|---|---|
| Importes | `\|importe\| ≥ 100 M` → `amount_outlier_global` (inválida). `> 50 × p99 de la empresa y > 1 M` → `amount_outlier_company` (inválida). `= 0` → inválida | 500 tx y 159 facturas hasta ±62.000 M distorsionan cualquier suma |
| Saldos | `\|balance\| ≥ 1.000 M` → inválido; `available` se descarta | 4 saldos (uno de 99.999 M); `available` 100 % nulo |
| Datos de prueba | descripción `Tests`/`Test`/`Prueba` → inválida | 10.135 movimientos |
| Duplicados | misma empresa+cuenta+fecha+importe+descripción → `dup_suspect` + `dup_group_size`, **no se eliminan** | el 70 % lleva placeholders (`[PERSON]`, `[COMPANY]`): la anonimización colapsa transacciones distintas |
| Fechas | `due_date`/`payment_date` fuera de 2020–2030 → NULL + flag; `value_date` a > 365 días de `date` → NULL | vencimientos en el año 7025, fecha valor en 2099 |
| Divisa | `exchange_rate` = unidades de moneda del producto (o de la factura) por 1 unidad de moneda de la empresa (o contable) → `amount_company_ccy = amount / rate`; rate 0 o 1 con monedas distintas → NULL + `fx_rate_missing` | verificado: USD/EUR 1,16, GBP/EUR 0,87, BRL/EUR 6,2 |
| Categorías | `-`/null → `uncategorized`; `cash_settlements` → `cash_settlement`; `status` null → `booked` (+flag) | 25 % sin categoría; 29.839 sin status |
| Facturas | `cancel` → `cancelled`; `pending_amount` := 0 en pagadas y canceladas (+flag si no lo era); signo: `+` = por cobrar, `−` = por pagar | 1.063 canceladas con pendiente; cruce con banco confirma el signo al 98 % |
| Deuda | `granted`/`outstanding` negativos → `granted_abs`/`outstanding_abs` + `utilization`; positivos → flag | convención invertida respecto a `debt_schedule_config` |
| País / ERP | país → ISO-2 (`ESPAÑA`, `España `, `Espanya` → `ES`); un vocabulario de ERP para empresas y grupos; `erp_effective = coalesce(empresa, grupo)` | 23 grafías; dos vocabularios |
| Contrapartes | `counterparty_id` (ámbito empresa) y `counterparty_token` extraído del texto (`COUNTERPARTY_xxxxx`, ámbito global por nombre) se exponen **por separado** | coinciden solo el 41 %; el token cruza empresas, el id no |
| Referencias | producto desconocido → `product_unknown`, fila conservada con `product_family` NULL | 1.314 movimientos, 29 saldos |

## Catálogo gold

### `fact_transactions` (2.545.370) · `fact_invoices` (896.552)
Las filas válidas de silver. Columnas clave añadidas respecto al CSV:

- tx: `date` (DATE) + `booked_at` (timestamp original), `value_lag_days`, `year_month`, `dow`, `is_weekend`, `is_holiday_es`, `abs_amount`, `direction` (`in`/`out`), `product_family`/`product_type`, `amount_company_ccy`, `counterparty_token`, `dup_group_size`, `flags`.
- facturas: `direction` (`receivable`/`payable`), `amount_accounting_ccy`, `terms_days` (vto − emisión), `days_to_payment`, `days_late`, `paid_on_time`, `overdue_days` y `aging_bucket` a 2026-09-01, `counterparty_token`, `flags`.

### `dim_company` (1.286)
Empresa + cobertura: nº productos bancarios/deuda, nº movimientos, primer/último movimiento, meses activos, nº facturas, `has_invoices`/`has_debt`/`has_debt_schedule`, tesorería bancaria al corte, deuda dispuesta/concedida, pendiente vencido y % vencidas, `erp_effective`, `country` ISO.

### `dim_product` (8.226)
Bancarios + deuda unificados (`family`), saldo al corte, actividad (`n_tx`, `first_tx`, `last_tx`, `is_active`), `utilization`, `fx_rate_median` observado en sus movimientos.

### `dim_counterparty` (129.716)
Una fila por (empresa, contraparte): presencia en tx/facturas, `role` (`customer`/`supplier`/`payer`/`payee`), volúmenes, fechas, categoría dominante, `name_token`.

### `dim_calendar` (731 días)
Día a día 2024-09-01 → 2026-09-01: laborable, festivo nacional ES, fin de mes, mes parcial.

### `company_month` (1.286 × 25)
Panel completo (ceros donde no hay actividad, `is_active`): `n_tx`, `inflow`/`outflow`/`net` en moneda de la empresa, productos y contrapartes activos, % sin categoría, % conciliado, importe por categoría (`amt_*`), facturas emitidas (`ar_issued`/`ap_issued`), % vencidas, medianas de plazo/DSO/DPO, y saldo `balance_eom`/`min`/`max`/`avg` reconstruido. `is_partial_month` marca 2026-09 (un día).

### `company_day` (940.066) y `product_day_balance` (3.514.648)
Posición de tesorería diaria. El saldo se reconstruye **hacia atrás** desde `balances.csv`:
`balance(d) = balance_snapshot − Σ amount(date > d)` por cuenta bancaria; es NULL antes del primer movimiento importado (`is_observed = false`), porque la cuenta aún no estaba conectada. A nivel empresa se convierte cada cuenta a la moneda de la empresa con su `fx_rate_median`.

### `invoice_tx_match` (651.067 candidatos)
Factura (`invoice` con contraparte) ↔ movimiento de la misma empresa, misma contraparte (`match_via = id` por columna, `token` por texto) y mismo importe, entre −30 y +365 días de la emisión. `rank_for_invoice`/`rank_for_tx` ordenan por id > mismo signo > cercanía al vencimiento; `is_best` es una asignación 1↔1 (cada factura y cada movimiento a lo sumo una vez); `is_unique` = candidato único en ambos sentidos. Cobertura: 173.750 facturas con candidato, 135.697 con `is_best`, de 757.186.

## Extender

- Nueva regla: añadir la condición al diccionario de flags en `stages/clean.py` y, si invalida, a `INVALIDATING_FLAGS`.
- Nuevo mart: `st.create("nombre", sql)` en `stages/marts.py` (exporta parquet y registra filas en `meta.runs`).
- Nuevo check: una línea en `CHECKS` de `stages/quality.py`.
- Nuevo paso del pipeline principal: añadir un `Step` a `STEPS` en `main.py` (entradas, código, claves de config, salidas).
- Sin Docker: `pip install duckdb pandas pyarrow scipy scikit-learn` (Python ≥ 3.10) y `python pipeline/main.py`.
