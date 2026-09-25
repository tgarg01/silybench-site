# silybench-site

The silybench website: **what it really costs to serve open LLMs**, comparing self-hosting on rented
GPUs with pay-per-token APIs, plus the benchmarks behind it and the managed-hosting offer.

A static Next.js site (`output: "export"`). It has no backend and computes nothing beyond simple
arithmetic. All numbers come from [silybench-data](https://github.com/tgarg01/silybench-data)
`derived/`, fetched at build time by `scripts/fetch-data.mjs`.

| Page | What |
|---|---|
| `/` | Self-host vs API: savings at full load, break-even volume, cost vs traffic chart |
| `/calculator` | Your traffic → cheapest GPU × provider × precision vs every API |
| `/services` | Managed hosting offer (copy in `src/content/business.ts`) |
| `/benchmarks`, `/runs` | Latency / throughput / capacity / accuracy dashboards |
| `/data`, `/reproduce`, `/methodology` | Downloads, one-prompt reproduction, method |

## Develop
```bash
npm ci
npm run dev                                                   # data from GitHub (main)
SILYBENCH_DATA_DIR=../silybench-data/derived npm run dev      # data from a local checkout
npm run build                                                 # static site in ./out
```

## Deploy
`.github/workflows/deploy.yml` publishes to GitHub Pages on every push, whenever silybench-data
rebuilds (a `repository_dispatch` sent by its CI), and daily. For a custom domain, set it in the
repo's Pages settings; the base path adapts automatically.

## Before launch
- `src/content/business.ts`: set `contactUrl` (email, Cal.com or form) and review the tiers and copy.
