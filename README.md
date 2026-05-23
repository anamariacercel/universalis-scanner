# Universalis Scanner

FFXIV market-board arbitrage finder. Buys cheap on your data center, identifies items that **actually sell** on your home world, and ranks by profit.

## Tech stack (100% free)

- **Vite + React 18 + TypeScript + Tailwind CSS** — static build, no runtime backend.
- **Universalis API** (`https://universalis.app/api/v2/`) — current listings + sales history. CORS-enabled, no key.
- **XIVAPI** (`https://xivapi.com`) — item discovery / icons. CORS-enabled, no key.
- **GitHub Pages** (or Netlify / Vercel / Cloudflare Pages) for hosting. No serverless functions required.

The entire app runs in the browser. Settings are persisted in `localStorage`.

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL.

## Deploying to GitHub Pages

1. Push the repo to GitHub.
2. In `vite.config.ts`, set `base: '/<your-repo-name>/'` (currently `'./'` for portability).
3. `npm run build && npm run deploy` — uses the `gh-pages` package to push `dist/` to a `gh-pages` branch.
4. In repo Settings → Pages, choose `gh-pages` branch.

## How the arbitrage engine works

1. **Item discovery** — XIVAPI search returns IDs for the selected preset (Materia, raid food, potions, etc.).
2. **DC scan** — Universalis `/api/v2/{DC}/{ids}` returns the lowest current price across the entire data center, including which world owns the listing.
3. **Home scan** — same endpoint against the home world for the target sell price.
4. **History scan** — `/api/v2/history/{DC}/{ids}` returns recent sales. Sales/day is computed from the observed window (or `regularSaleVelocity` if richer).
5. **Filtering** — drop items where:
   - Last sale > N hours ago (default 48)
   - Sales/day below threshold (default 3)
   - Profit below floor (default 1,000 gil)
   - Cheapest listing already on the home world

## Rate limiting

Universalis allows ~25 req/sec. The client batches **100 item IDs per request** and uses a token-bucket queue (`src/lib/rateLimit.ts`) capped at **~12 req/sec with concurrency 4** — safely under the limit.

## File map

```
src/
  App.tsx                 # Page shell + scan orchestration
  main.tsx, index.css
  components/
    Settings.tsx          # Region / DC / Home World / thresholds
    ResultsTable.tsx      # Sortable, filterable opportunities table
  data/
    worlds.ts             # DC + world list (static snapshot)
    presets.ts            # XIVAPI search definitions per category
  lib/
    universalis.ts        # Batched current + history fetches
    xivapi.ts             # Item search + icon URLs
    rateLimit.ts          # Token-bucket queue + chunk helper
    arbitrage.ts          # Core engine
```

## Caveats

- World/DC lists are a static snapshot. Square Enix shuffles them occasionally; refresh from Universalis's `/api/v2/data-centers` if needed.
- Universalis data quality depends on user uploads in your DC. Sparse DCs = noisier results.
- This app does **not** account for the 5% market tax — adjust `minProfitGil` accordingly.
