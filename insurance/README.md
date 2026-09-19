# Seguro de crédito de David

Integración selectiva de Producto_Seguros.zip y del módulo React incluido en Elkano_Embat.zip. No reemplaza el modelo ni los productos existentes.

- Pantalla: `/productos/seguro`.
- Datos: `apps/web/public/data/insurance-portfolio.json`, 48 empresas y 848 observaciones.
- Motor de cálculo: `src/pricing.py`.
- Generador: `python3 insurance/generate_data.py` desde la raíz. Requiere los scores, eventos y reporte versionados en `output/`.
- Tests: `cd insurance && python3 -m unittest discover -s tests`.

El score, las contribuciones y los eventos proceden de los artefactos existentes. Las exposiciones, la conversión de estrés a impago, las primas y las coberturas son escenarios de demostración. La selección de pólizas se guarda en localStorage, no emite contratos ni cobra primas. La gráfica histórica aplica la selección actual a todo el periodo; no es un registro de altas ni de cobros.

Se conserva la metodología original en `docs/`. Su denominación V4 corresponde al score `v3-gbm` existente, no a un modelo nuevo. La pantalla React consume precios precalculados; no incluye edición de supuestos actuariales.

Para probar sin interferir con la presentación: `pnpm --filter web exec next dev -p 4330`.
