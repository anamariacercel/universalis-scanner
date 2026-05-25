// Curated XIVAPI search definitions for "scannable" item categories.
// We use the search endpoint to fetch lists of itemIds for a category, then
// feed those IDs into the Universalis batch endpoints.
//
// XIVAPI v2 search docs: https://v2.xivapi.com/docs/guides/search/
//
// ItemSearchCategory IDs (verified empirically against XIVAPI v2 in 2026):
//   43 = Medicine (tinctures / potions / gemdraughts)
//   45 = Meals (food)
//   57 = Materia
//   59 = "Other" (Dark Matter, dyes, glamour prisms, dispellers, etc.)
//
// LevelItem thresholds tuned for Dawntrail (7.x) endgame:
//   690 = current top tier (Materia XI+XII, Gemdraughts, Alpaca Pasta meals)
//   640 = previous tier (Grade 8 Tinctures, Endwalker meals)
// If a future expansion bumps i-levels, raise the thresholds rather than
// having the scanner pick up stale tiers.

// Each preset carries its own recommended thresholds. High-velocity consumables
// (Materia, food, pots) get tight filters; slow-movers (dyes, glamour) get
// relaxed ones so they aren't filtered to zero rows by defaults tuned for
// raid-night Materia.
export interface PresetThresholds {
  minSalesPerDay: number;
  maxLastSaleHours: number;
  minProfitGil: number;
  minRoiPercent: number;
  // Optional — lets a wide-coverage preset (e.g. "All marketable") request a
  // higher scan ceiling than the default 100.
  maxItems?: number;
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  // XIVAPI v2 search query string (e.g. "+ItemSearchCategory=57 +LevelItem>=690")
  search: string;
  thresholds: PresetThresholds;
}

const HIGH_VELOCITY: PresetThresholds = {
  minSalesPerDay: 20,
  maxLastSaleHours: 4,
  minProfitGil: 1000,
  minRoiPercent: 15,
};

export const PRESETS: Preset[] = [
  {
    id: 'materia-current',
    label: 'Materia — current tier (XI & XII)',
    description: 'Grades XI + XII (both ilvl 690). Highest velocity for current melds.',
    search: '+ItemSearchCategory=57 +LevelItem>=690',
    thresholds: HIGH_VELOCITY,
  },
  {
    id: 'materia-all',
    label: 'Materia — all grades',
    description: 'All Materia I–XII. Most lower grades are dead; use only for exploration.',
    search: '+ItemSearchCategory=57',
    thresholds: { minSalesPerDay: 3, maxLastSaleHours: 48, minProfitGil: 500, minRoiPercent: 15 },
  },
  {
    id: 'meals',
    label: 'Raid Food (current tier)',
    description: 'Current-tier meals — peak demand during weekly raid lockouts.',
    search: '+ItemSearchCategory=45 +LevelItem>=690',
    thresholds: HIGH_VELOCITY,
  },
  {
    id: 'potions',
    label: 'Tinctures & Gemdraughts (current)',
    description: 'Current-tier Gemdraughts (DT) and HQ tinctures.',
    search: '+ItemSearchCategory=43 +LevelItem>=690',
    thresholds: HIGH_VELOCITY,
  },
  {
    id: 'all-market',
    label: 'All marketable items (slow scan)',
    description: 'Every item with a market-board category. Slow (~30s–2min) but finds opportunities outside the curated presets.',
    // ItemSearchCategory>=1 means "has a market-board category" = listable.
    search: '+ItemSearchCategory>=1',
    // Very loose — we have no idea what category each row falls into, so let
    // anything that actually moves and clears the profit floor through.
    thresholds: { minSalesPerDay: 0.2, maxLastSaleHours: 168, minProfitGil: 500, minRoiPercent: 10, maxItems: 2000 },
  },
  {
    id: 'darkmatter',
    label: 'Other (Dark Matter, dyes, glamour)',
    description: 'Dark Matter, dyes, glamour prisms, dispellers. Mixed/slow velocity.',
    search: '+ItemSearchCategory=59',
    // Thresholds are intentionally loose — these items can sell as little as
    // a few times a week per world, but the margins make them worthwhile.
    thresholds: { minSalesPerDay: 0.2, maxLastSaleHours: 168, minProfitGil: 200, minRoiPercent: 10 },
  },
];
