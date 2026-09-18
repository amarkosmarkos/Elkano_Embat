#!/usr/bin/env bash
# Ejecuta el EDA completo dentro de un contenedor (el Python local es 3.9 y no tiene duckdb).
# Uso: ./eda/run.sh   (desde la raíz del repo o desde eda/)
set -euo pipefail
cd "$(dirname "$0")"
docker build -q -t elkano-eda . >/dev/null
docker run --rm -v "$PWD/../output:/data:ro" -v "$PWD:/eda" -w /eda elkano-eda bash -c \
  "python eda.py --data /data --out eda_data.json && python panel.py /data && python generator_probe.py --data /data && python build_report.py"
echo "Listo → eda/report.html  (abrir con: open eda/report.html  o  python3 -m http.server -d eda 8765)"
