// The arbitrage engine.
//
// Strategy:
//  1. Fetch DC-wide current listings for all candidate item IDs (gives lowest
//     price across all worlds + which world it's on).
//  2. Fetch home-world current listings for the same IDs (gives target sell
//     price).
//  3. Fetch DC-wide history to compute "actually sells" velocity, falling
//     back to regularSaleVelocity when history is sparse.
//  4. Apply filters: must have sold in last N hours, min sales/day, profit > 0.

import { fetchCurrent, fetchHistory, CurrentEntry, HistoryEntry } from './universalis';

// FFXIV charges 5% market-board tax on the seller. Net = sell * 0.95 - buy.
const MB_TAX = 0.05;

export interface ArbitrageRow {
  itemId: number;
  itemName: string;
  iconUrl: string | null;
  buyWorld: string;
  buyPrice: number;
  buyQuantity: number;
  homeWorld: string;
  homePrice: number;       // lowest current home-world price (NQ)
  homeListings: number;
  profitGil: number;       // NET profit per unit after 5% MB tax
  profitPct: number;       // NET ROI after 5% MB tax (vs. buy price)
  salesPerDay: number;
  // Total profit from buying out every profitable listing on the buy world:
  // profitGil × buyableSupply. The right metric for arbitrage — gil/day was
  // misleading for niche items that don't restock at the cheap price.
  tripProfit: number;
  // Total supply (units) available on the buy world at a profitable price.
  // Aggregated across listings, not just the cheapest one.
  buyableSupply: number;
  lastSaleHoursAgo: number;
  hq: boolean;
}

export interface EngineOptions {
  homeWorld: string;
  dataCenter: string;
  itemIds: number[];
  itemNames: Map<number, string>;
  itemIcons: Map<number, string | null>;
  minSalesPerDay: number;        // e.g. 3
  maxLastSaleHours: number;      // e.g. 48
  minProfitGil: number;          // net gil after 5% tax
  minRoiPercent: number;         // net ROI %, e.g. 15
  onProgress?: (msg: string, pct: number) => void;
}

function lowestListing(entry: CurrentEntry | undefined) {
  if (!entry || !entry.listings || entry.listings.length === 0) return null;
  const sorted = [...entry.listings].sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  return sorted[0];
}

function computeSalesPerDay(h: HistoryEntry | undefined): { perDay: number; lastSaleHoursAgo: number } {
  if (!h || !h.entries || h.entries.length === 0) {
    return { perDay: h?.regularSaleVelocity ?? 0, lastSaleHoursAgo: Number.POSITIVE_INFINITY };
  }
  const now = Date.now() / 1000;
  const sorted = [...h.entries].sort((a, b) => b.timestamp - a.timestamp);
  const newest = sorted[0].timestamp;
  const oldest = sorted[sorted.length - 1].timestamp;
  const lastSaleHoursAgo = Math.max(0, (now - newest) / 3600);

  // Sales/day across the observed window, but cap window at 7 days so
  // a one-time sale doesn't get amortized away. `now - oldest` already
  // folds in any dry stretch at the end of the window, so a recent
  // slowdown drags this number down without extra logic.
  const spanSeconds = Math.max(3600, Math.min(now - oldest, 7 * 24 * 3600));
  const longRunPerDay = (sorted.length / spanSeconds) * 86400;

  // Don't take max() with Universalis's regularSaleVelocity — it's a
  // long-window average that can mask recent declines, so picking the
  // larger of the two is biased upward. Observed wins when we have data.
  // Then apply a recency haircut: if the last sale was >24h ago, the
  // *current* rate is almost certainly below the long-run average.
  // Cap at 24h / lastSaleHoursAgo so a 48h gap means ≤0.5/day, regardless
  // of what history says.
  const recencyCap = lastSaleHoursAgo <= 24 ? 1 : 24 / lastSaleHoursAgo;
  const perDay = longRunPerDay * recencyCap;

  return { perDay, lastSaleHoursAgo };
}

export async function runArbitrage(opts: EngineOptions): Promise<ArbitrageRow[]> {
  const { homeWorld, dataCenter, itemIds, itemNames, itemIcons } = opts;
  const progress = opts.onProgress ?? (() => {});

  if (itemIds.length === 0) return [];

  // Pass 1 — fetch home-world history FIRST and drop items that don't sell
  // on the world we'd list on. Velocity filtering before listing fetches
  // cuts API budget on dead items by ~70-90% on a broad scan.
  progress('Fetching home-world sales history…', 0.05);
  const history = await fetchHistory(homeWorld, itemIds, { entriesToReturn: 50 });

  const velocities = new Map<number, { perDay: number; lastSaleHoursAgo: number }>();
  const survivors: number[] = [];
  for (const id of itemIds) {
    const v = computeSalesPerDay(history.get(id));
    if (v.perDay < opts.minSalesPerDay) continue;
    if (v.lastSaleHoursAgo > opts.maxLastSaleHours) continue;
    velocities.set(id, v);
    survivors.push(id);
  }

  if (survivors.length === 0) {
    progress('No items passed the velocity filter.', 1);
    return [];
  }

  // Pass 2 — fetch listings only for items that actually sell.
  progress(`Fetching DC listings (${survivors.length} survivors)…`, 0.5);
  const dcCurrent = await fetchCurrent(dataCenter, survivors, { listings: 5 });

  progress('Fetching home-world listings…', 0.75);
  const homeCurrent = await fetchCurrent(homeWorld, survivors, { listings: 5 });

  progress('Scoring opportunities…', 0.9);
  const rows: ArbitrageRow[] = [];

  for (const id of survivors) {
    const dcEntry = dcCurrent.get(id);
    const homeEntry = homeCurrent.get(id);
    const v = velocities.get(id)!;

    const dcLow = lowestListing(dcEntry);
    const homeLow = lowestListing(homeEntry);
    if (!dcLow || !homeLow) continue;

    // Skip if the cheapest DC listing IS on the home world (no arbitrage).
    const buyWorld = dcLow.worldName ?? '';
    if (buyWorld && buyWorld === homeWorld) continue;

    const netProfit = homeLow.pricePerUnit * (1 - MB_TAX) - dcLow.pricePerUnit;
    const netRoi = (netProfit / dcLow.pricePerUnit) * 100;
    if (netProfit < opts.minProfitGil) continue;
    if (netRoi < opts.minRoiPercent) continue;

    // Sum every listing on the buy world (matching HQ) that's still
    // profitable after the 5% MB tax. This is the real ceiling on how much
    // you can flip in one trip — not just the cheapest listing's quantity.
    const sellThreshold = homeLow.pricePerUnit * (1 - MB_TAX);
    const buyableSupply = (dcEntry?.listings ?? [])
      .filter((l) => l.worldName === buyWorld && l.hq === dcLow.hq && l.pricePerUnit < sellThreshold)
      .reduce((sum, l) => sum + l.quantity, 0);

    rows.push({
      itemId: id,
      itemName: itemNames.get(id) ?? `#${id}`,
      iconUrl: itemIcons.get(id) ?? null,
      buyWorld,
      buyPrice: dcLow.pricePerUnit,
      buyQuantity: dcLow.quantity,
      homeWorld,
      homePrice: homeLow.pricePerUnit,
      homeListings: homeEntry?.listings?.length ?? 0,
      profitGil: Math.round(netProfit),
      profitPct: netRoi,
      salesPerDay: v.perDay,
      tripProfit: Math.round(netProfit * buyableSupply),
      buyableSupply,
      lastSaleHoursAgo: v.lastSaleHoursAgo,
      hq: dcLow.hq,
    });
  }

  rows.sort((a, b) => b.tripProfit - a.tripProfit);
  progress('Done.', 1);
  return rows;
}
