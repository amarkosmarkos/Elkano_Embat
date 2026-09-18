#!/usr/bin/env bash
# Pipeline principal (raw → preprocess → labels → score → validate) en el contenedor elkano-eda.
# Uso: ./pipeline/run.sh [--force | --from score | --only validate | --status]
set -euo pipefail
cd "$(dirname "$0")/.."
docker image inspect elkano-eda >/dev/null 2>&1 || docker build -q -t elkano-eda eda/ >/dev/null
docker run --rm -v "$PWD/output:/output" -v "$PWD/pipeline:/repo/pipeline" -v "$PWD/analytics:/repo/analytics" -w /repo/pipeline \
  -e ELKANO_RAW=/output -e ELKANO_OUT=/output -e PYTHONDONTWRITEBYTECODE=1 elkano-eda python main.py "$@"
