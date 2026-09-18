# EDA — output_hackspain_data.zip

Análisis exploratorio de primer nivel sobre los 8 CSV del Track Embat. El resultado es un
único HTML autocontenido (sin red, sin dependencias) con ~70 gráficos interactivos.

## Ver el informe

```bash
open eda/report.html
```

o, si el navegador bloquea `file://`:

```bash
python3 -m http.server -d eda 8765   # → http://localhost:8765/report.html
```

## Regenerar

Necesita Docker (el Python local es 3.9 y no tiene DuckDB) y `output/` descomprimido en la raíz:

```bash
./eda/run.sh
```

Tarda ~1 min la primera vez (build de la imagen) y ~30 s después: lee los 3,47 M de filas con DuckDB, escribe `eda_data.json` y lo incrusta en la plantilla.

| Fichero | Qué es |
|---|---|
| `eda.py` | Todas las consultas (DuckDB). Cada sección del informe es un bloque aquí. |
| `panel.py` | Panel empresa × mes (`panel.csv`) para la sección «Generador». |
| `generator_probe.py` | Ingeniería inversa: tendencias por empresa + GMM, Benford, festivos, FX, formatos de id, espacios de contraparte → `probe_data.json`. |
| `Dockerfile` | Imagen `elkano-eda` (duckdb, pandas, scipy, sklearn). |
| `eda_data.json` | Resultados agregados (113 KB). Reutilizable desde la app. |
| `report_template.html` | Plantilla: layout, textos, gráficos SVG vanilla. `__DATA__` se sustituye por el JSON. |
| `build_report.py` | Incrusta el JSON en la plantilla → `report.html`. |
| `report.html` | **El informe.** |

## Secciones

Resumen ejecutivo · Universo (grupos, empresas, cobertura) · Productos bancarios · Financiación y
cuadro de amortización · Saldos · Transacciones · Facturas · Cruces factura ↔ movimiento ·
Ingeniería inversa del generador · Calidad de datos (20 avisos con acción) · Método.

## Decisiones

- Agregados en importe excluyen |importe| ≥ 100 M (tx, facturas) y |balance| ≥ 1.000 M.
- 2026-09 (un solo día) se omite de las series mensuales.
- Facturas: positivo = por cobrar, negativo = por pagar (hipótesis, confirmada al 98 % por el cruce con transacciones).
- La contraparte de transacciones se recupera también del texto (`COUNTERPARTY_xxxxx` en `description`).
