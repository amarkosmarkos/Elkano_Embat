# Embat Capital Network — score-driven credit marketplace

Interactive product demo built on the **v3 financial-health score** (`output/02_score/scores_v3.csv`).
Embat sits between companies with excess treasury and companies that could receive financing; every screen
is driven by the score, its five dimension contributions, its history, alerts, stress flags and the 24
underlying metrics. No banking, payment or external integrations — everything runs locally.

```bash
docker compose --profile marketplace up --build   # from the repo root → http://localhost:8080
```

The three score files live in the repo (`output/02_score/`, see [`output/README.md`](../../output/README.md));
`companies.csv` and `groups.csv` come from the challenge zip unzipped in `output/` (only those five files are copied into the image; the 650 MB of raw transactions/invoices are excluded by `.dockerignore`).

## Embedding — one screen, no scrolling

The app is built to be dropped into a web page as a single HTML element: every screen is a fixed grid that fits
the viewport it is given (tabs and pagers replace scrolling), and when the host box is smaller than the design
minimum (1180 × 720) the whole UI down-scales with CSS `zoom` so it still fits (`src/hooks/useFitScale.ts`).

```html
<!-- host page: a full-height section the visitor scrolls to -->
<section style="height:100vh">
  <iframe src="http://localhost:8080/" style="width:100%;height:100%;border:0" title="Embat Capital Network"></iframe>
</section>
```

Any box size works — the app measures its container (`#root`) and never overflows it. The look is a pirate
treasure-map theme (parchment panels with torn edges, brass and rope, ink charts, Pirata One / IM Fell / Cinzel
type); the header toggle switches between *below deck* (dark wood) and *open sea* (teal) backgrounds.

## Demo story — Lenders → Borrowers → Monitor

| Screen | Route | What it shows |
|---|---|---|
| **Lenders** | `/` | *Who is in a position to lend*: big cards (score, momentum, capacity, the reasons) of the qualified lenders, or the charted-waters map. **Lend** picks the company that deploys the capital. |
| **Borrowers** | `/borrowers` | Financing candidates **for that lender** (healthy + visible capital need; the lender and its business group are excluded) and the chest builder: capital, risk, exposure cap, min score, positions, group limit, allocation month → animated build → *Treasure map* (✕ marks the top pick), *Distribution*, *Crew*. |
| **Company** | overlay / `/company/:id` | Click any company anywhere: spider chart of the five dimensions (axis = percentile of the dimension contribution across the network) with the health score in the centre, derived indicators, **all 24 metrics** with 3-/12-month change and worsening streak, score history, the 8 stress flags, lender capacity and financing need. |
| **Monitor** | `/monitor` | Timeline / *Advance time* replays real monthly scores. Chest score, expected stress, trajectory, paged cards of meaningful changes (score from → to, driver, onset, persistence) with a detail drawer. |
| **Actions** | `/monitor/actions` | One recommendation per position that moved (pause / reduce / review / increase) with the score-behaviour reasons and a single **Execute** button that changes the chest for real (freed capital → reserve); *Undo all* restores it. |

The chest is always built **for a lender**: it never includes the lender or companies of its business group, and
candidates whose score is driven by the same dimensions as the lender's rank lower (`profileOverlap`, cosine
similarity of the five contributions — the dataset has no sector field, so this is the honest proxy for "not the
same kind of risk"). The resulting weighted overlap is shown next to the chest score.

## Data contract

`etl/build_dataset.py` runs at image build time (python + pandas) and only **reshapes** pipeline outputs:

| Source | Fields used |
|---|---|
| `02_score/scores_v3.csv` | `score`, `score_raw`, `c_pago … c_concentracion`, `alert`, `explanation`, per company-month |
| `02_score/scores_v2.csv` | `explanation` at metric level ("colchon 1.93 → 0.85") |
| `02_score/metrics_v1.parquet` | the 24 base metrics (A1–E4), the 8 stress flags `S1…S8`, `n_stress` |
| `companies.csv`, `groups.csv` | group, country (normalised to ISO-2), currency, ERP |

Output: `public/data/network.json` (index with full score history per company) and
`public/data/companies/<id>.json` (metric time series, explanations, stress flags), loaded lazily.

The dataset is anonymised (`COMP_xxxx`); **company names are deterministic display aliases** generated from
the id so the demo reads like a product. The real id is shown everywhere.

## Derived calculations (isolated in `src/lib/`)

Everything not present verbatim in the files above lives in four modules and is a deterministic function of score fields:

- `derived.ts` — momentum (`score_t − score_{t−3}`), decline/rise streaks, score volatility, trend label, tiers
  (README semaphore ≥70 / 40–70 / <40, split at 80), percentile, main driver, **provider assessment**
  (qualification rules + capacity index), **receiver assessment** (health floor, payment behaviour, need signals, fit),
  radar axes (`componentPercentiles`) and lender ↔ borrower `profileOverlap`.
- `portfolio.ts` — allocator: screen at the allocation month (scored, not the lender or its group, no alert, stress
  within tolerance, ≥6 months history, ≥ min score) → rank = (w·score + w·momentum + w·stability) × (1 − 0.3·overlap
  with the lender) → group diversification → weights ∝ rank^γ, capped per company with water-filling. Metrics: weighted score,
  **expected stress = Σ w·(100 − score)/100** (the score is literally 100 − P(stress event in 3–6 months)),
  HHI, effective N, tiers, histogram.
- `monitor.ts` — replay: per-position delta since allocation, streaks, declines in last 4 months, persistence,
  onset month (drawdown > 5 pts from the running peak), driver dimension (largest `c_<dim>` change), status.
- `actions.ts` — rules from score behaviour (reduce / pause / review / increase / monitor) with reasons;
  `applyActions` rescales the weights of executed actions (freed capital → reserve) and re-values the chest.

## Development

```bash
pnpm install                      # repo root (pnpm workspace)
docker run --rm -v "$PWD/output:/data:ro" -v "$PWD/apps/marketplace:/app" elkano-eda \
  python /app/etl/build_dataset.py --data /data --out /app/public/data     # regenerate JSON (image from eda/)
pnpm --filter marketplace dev     # http://localhost:5173
pnpm --filter marketplace build
```

Stack: Vite · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · d3-scale/shape/hierarchy · zustand · nginx.
Fonts are bundled locally (@fontsource) — no network needed at demo time.
