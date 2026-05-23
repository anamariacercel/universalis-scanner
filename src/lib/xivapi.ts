// Minimal XIVAPI v2 client for item-ID discovery.
// Docs: https://v2.xivapi.com/docs/guides/search/

export interface XivItem {
  ID: number;
  Name: string;
  IconPath?: string;
}

const XIVAPI = 'https://v2.xivapi.com';

export async function searchItems(
  query: string,
  maxResults = 200,
): Promise<XivItem[]> {
  const results: XivItem[] = [];
  let cursor: string | null = null;
  while (results.length < maxResults) {
    const params = new URLSearchParams({
      limit: String(Math.min(100, maxResults - results.length)),
    });
    if (cursor) {
      params.set('cursor', cursor);
    } else {
      params.set('sheets', 'Item');
      params.set('query', query);
      params.set('fields', 'Name,Icon');
    }
    const res = await fetch(`${XIVAPI}/api/search?${params}`);
    if (!res.ok) throw new Error(`XIVAPI ${res.status}`);
    const json = await res.json();
    for (const r of json.results ?? []) {
      results.push({
        ID: r.row_id as number,
        Name: (r.fields?.Name ?? '') as string,
        IconPath: r.fields?.Icon?.path_hr1 as string | undefined,
      });
    }
    if (!json.next) break;
    cursor = json.next as string;
  }
  return results.slice(0, maxResults);
}

export function iconUrl(item: XivItem): string | null {
  if (!item.IconPath) return null;
  return `${XIVAPI}/api/asset?path=${encodeURIComponent(item.IconPath)}&format=png`;
}
