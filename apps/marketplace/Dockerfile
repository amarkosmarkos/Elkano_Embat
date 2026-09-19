# syntax=docker/dockerfile:1.7
# Build context = repo root (see docker-compose.yml). Three stages, no runtime dependencies:
#   1. data     — reshape the real v3 score outputs (output/02_score, output/companies.csv …) into JSON
#   2. build    — Vite production build with the JSON under public/data
#   3. runtime  — nginx serving the static bundle on :80

FROM python:3.12-slim AS data
RUN pip install --no-cache-dir pandas==2.2.3 pyarrow==18.1.0
WORKDIR /work
COPY output/companies.csv output/groups.csv output/
COPY output/02_score/scores_v3.csv output/02_score/scores_v2.csv output/02_score/metrics_v1.parquet output/02_score/
COPY apps/marketplace/etl/build_dataset.py apps/marketplace/etl/
RUN python apps/marketplace/etl/build_dataset.py --data output --out /work/public-data

FROM node:22-alpine AS build
RUN npm install -g pnpm@11
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/marketplace/package.json apps/marketplace/
RUN pnpm install --frozen-lockfile --filter marketplace
COPY apps/marketplace apps/marketplace
COPY --from=data /work/public-data apps/marketplace/public/data
RUN pnpm --filter marketplace build

FROM nginx:1.27-alpine AS runtime
COPY apps/marketplace/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/marketplace/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/data/network.json >/dev/null || exit 1
