// Universalis API client.
// Docs: https://docs.universalis.app/
//
// Endpoints used:
//   GET /api/v2/{worldDcRegion}/{itemIds}            -> current pricing
//   GET /api/v2/history/{worldDcRegion}/{itemIds}    -> sales history
//
// Up to 100 comma-separated item IDs per request. Rate limit ~25 req/s.

import { RateLimiter, chunk } from './rateLimit';

const BASE = 'https://universalis.app/api/v2';
const BATCH_SIZE = 100;
const limiter = new RateLimiter(4, 80);

export interface CurrentListing {
  pricePerUnit: number;
  quantity: number;
  worldName?: string;     // present on DC/region queries
  hq: boolean;
  retainerName?: string;
}

export interface CurrentEntry {
  itemID: number;
  worldName?: string;
  listings: CurrentListing[];
  regularSaleVelocity?: number;
  nqSaleVelocity?: number;
  hqSaleVelocity?: number;
  lastUploadTime?: number;
  minPriceNQ?: number;
  minPriceHQ?: number;
}

export interface HistoryEntry {
  itemID: number;
  entries: Array<{
    pricePerUnit: number;
    quantity: number;
    timestamp: number;     // seconds
    hq: boolean;
    worldName?: string;
  }>;
  regularSaleVelocity?: number;
  lastUploadTime?: number;
}

interface MultiResponse<T> {
  items: Record<string, T> | T[];
  unresolvedItems?: number[];
}

async function getJson(url: string): Promise<any> {
  return limiter.run(async () => {
    const res = await fetch(url);
    if (res.status === 429) {
      // backoff and retry once
      await new Promise((r) => setTimeout(r, 1500));
      const retry = await fetch(url);
      if (!retry.ok) throw new Error(`Universalis ${retry.status}`);
      return retry.json();
    }
    if (!res.ok) throw new Error(`Universalis ${res.status}`);
    return res.json();
  });
}

// Universalis returns `items` either as an object keyed by ID (multi-ID) or
// a single entry (single-ID). Normalize to a Map keyed by itemID.
function normalize<T extends { itemID?: number }>(json: any, ids: number[]): Map<number, T> {
  const out = new Map<number, T>();
  if (json && typeof json === 'object' && 'items' in json) {
    const items = (json as MultiResponse<T>).items;
    if (Array.isArray(items)) {
      for (const e of items) if (e.itemID != null) out.set(e.itemID, e);
    } else {
      for (const [k, v] of Object.entries(items)) out.set(Number(k), v);
    }
    return out;
  }
  // single-item response shape (rare, when ids.length === 1)
  if (json && json.itemID != null) {
    out.set(json.itemID, json as T);
  } else if (ids.length === 1) {
    out.set(ids[0], json as T);
  }
  return out;
}

export async function fetchCurrent(
  worldDcRegion: string,
  itemIds: number[],
  opts: { listings?: number; entries?: number } = {},
): Promise<Map<number, CurrentEntry>> {
  const listings = opts.listings ?? 5;
  const entries = opts.entries ?? 0;
  const result = new Map<number, CurrentEntry>();
  for (const batch of chunk(itemIds, BATCH_SIZE)) {
    const ids = batch.join(',');
    const url = `${BASE}/${encodeURIComponent(worldDcRegion)}/${ids}?listings=${listings}&entries=${entries}`;
    const json = await getJson(url);
    const map = normalize<CurrentEntry>(json, batch);
    for (const [k, v] of map) result.set(k, v);
  }
  return result;
}

export async function fetchHistory(
  worldDcRegion: string,
  itemIds: number[],
  opts: { entriesToReturn?: number; minSalesUnix?: number } = {},
): Promise<Map<number, HistoryEntry>> {
  const entriesToReturn = opts.entriesToReturn ?? 50;
  const result = new Map<number, HistoryEntry>();
  for (const batch of chunk(itemIds, BATCH_SIZE)) {
    const ids = batch.join(',');
    const params = new URLSearchParams({ entriesToReturn: String(entriesToReturn) });
    if (opts.minSalesUnix) params.set('statsWithin', String(opts.minSalesUnix));
    const url = `${BASE}/history/${encodeURIComponent(worldDcRegion)}/${ids}?${params}`;
    const json = await getJson(url);
    const map = normalize<HistoryEntry>(json, batch);
    for (const [k, v] of map) result.set(k, v);
  }
  return result;
}
