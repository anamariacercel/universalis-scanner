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

export interface Preset {
  id: string;
  label: string;
  description: string;
  // XIVAPI v2 search query string (e.g. "+ItemSearchCategory=57 +LevelItem>=690")
  search: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'materia-current',
    label: 'Materia — current tier (XI & XII)',
    description: 'Grades XI + XII (both ilvl 690). Highest velocity for current melds.',
    search: '+ItemSearchCategory=57 +LevelItem>=690',
  },
  {
    id: 'materia-all',
    label: 'Materia — all grades',
    description: 'All Materia I–XII. Most lower grades are dead; use only for exploration.',
    search: '+ItemSearchCategory=57',
  },
  {
    id: 'meals',
    label: 'Raid Food (current tier)',
    description: 'Current-tier meals — peak demand during weekly raid lockouts.',
    search: '+ItemSearchCategory=45 +LevelItem>=690',
  },
  {
    id: 'potions',
    label: 'Tinctures & Gemdraughts (current)',
    description: 'Current-tier Gemdraughts (DT) and HQ tinctures.',
    search: '+ItemSearchCategory=43 +LevelItem>=690',
  },
  {
    id: 'darkmatter',
    label: 'Other (Dark Matter, dyes, glamour)',
    description: 'Dark Matter, dyes, glamour prisms, dispellers. Mixed velocity.',
    search: '+ItemSearchCategory=59',
  },
];
