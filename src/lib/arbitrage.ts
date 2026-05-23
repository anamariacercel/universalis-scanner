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
  profitGil: number;       // NET profit after 5% MB tax
  profitPct: number;       // NET ROI after 5% MB tax (vs. buy price)
  salesPerDay: number;
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
  // a one-time sale doesn't get amortized away.
  const spanSeconds = Math.max(3600, Math.min(now - oldest, 7 * 24 * 3600));
  const perDay = (sorted.length / spanSeconds) * 86400;

  // If Universalis provides regularSaleVelocity and our window is narrow, prefer it.
  const fromVelocity = h.regularSaleVelocity ?? 0;
  return { perDay: Math.max(perDay, fromVelocity), lastSaleHoursAgo };
}

export async function runArbitrage(opts: EngineOptions): Promise<ArbitrageRow[]> {
  const { homeWorld, dataCenter, itemIds, itemNames, itemIcons } = opts;
  const progress = opts.onProgress ?? (() => {});

  if (itemIds.length === 0) return [];

  progress('Fetching DC listings…', 0.05);
  const dcCurrent = await fetchCurrent(dataCenter, itemIds, { listings: 5 });

  progress('Fetching home-world listings…', 0.4);
  const homeCurrent = await fetchCurrent(homeWorld, itemIds, { listings: 5 });

  progress('Fetching sales history…', 0.65);
  const history = await fetchHistory(dataCenter, itemIds, { entriesToReturn: 50 });

  progress('Scoring opportunities…', 0.9);
  const rows: ArbitrageRow[] = [];

  for (const id of itemIds) {
    const dcEntry = dcCurrent.get(id);
    const homeEntry = homeCurrent.get(id);
    const histEntry = history.get(id);

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

    const { perDay, lastSaleHoursAgo } = computeSalesPerDay(histEntry);
    if (perDay < opts.minSalesPerDay) continue;
    if (lastSaleHoursAgo > opts.maxLastSaleHours) continue;

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
      salesPerDay: perDay,
      lastSaleHoursAgo,
      hq: dcLow.hq,
    });
  }

  rows.sort((a, b) => b.profitGil - a.profitGil);
  progress('Done.', 1);
  return rows;
}
