import { useMemo, useState } from 'react';
import { ArbitrageRow } from '../lib/arbitrage';

type SortKey = 'tripProfit' | 'profitGil' | 'profitPct' | 'salesPerDay' | 'buyPrice' | 'homePrice' | 'itemName';

interface Props {
  rows: ArbitrageRow[];
}

export function ResultsTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('tripProfit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [minVelocity, setMinVelocity] = useState(0);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) =>
      r.salesPerDay >= minVelocity && (q === '' || r.itemName.toLowerCase().includes(q)),
    );
    filtered.sort((a, b) => {
      const va = a[sortKey]; const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'desc' ? vb - va : va - vb;
      return sortDir === 'desc'
        ? String(vb).localeCompare(String(va))
        : String(va).localeCompare(String(vb));
    });
    return filtered;
  }, [rows, sortKey, sortDir, minVelocity, query]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortKey(k); setSortDir('desc'); }
  }

  return (
    <section className="bg-panel border border-border rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-3 items-center px-4 py-3 border-b border-border">
        <h2 className="text-accent text-lg font-semibold mr-auto">
          Opportunities <span className="text-muted text-sm">({visible.length})</span>
        </h2>
        <input
          className="bg-panel2 border border-border rounded px-3 py-1.5 text-sm placeholder:text-muted"
          placeholder="Filter by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="text-sm text-muted flex items-center gap-2">
          Min sales/day
          <input
            type="number" step="0.5" min={0}
            className="bg-panel2 border border-border rounded px-2 py-1 w-20 text-slate-100"
            value={minVelocity}
            onChange={(e) => setMinVelocity(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-panel2 text-muted">
            <tr>
              <Th onClick={() => toggleSort('itemName')} active={sortKey === 'itemName'} dir={sortDir}>Item</Th>
              <Th className="text-right">Buy At</Th>
              <Th className="text-right" onClick={() => toggleSort('buyPrice')} active={sortKey === 'buyPrice'} dir={sortDir}>Buy Price</Th>
              <Th className="text-right">Sell At</Th>
              <Th className="text-right" onClick={() => toggleSort('homePrice')} active={sortKey === 'homePrice'} dir={sortDir}>Home Price</Th>
              <Th className="text-right" onClick={() => toggleSort('profitGil')} active={sortKey === 'profitGil'} dir={sortDir}>Profit/ea</Th>
              <Th className="text-right" onClick={() => toggleSort('profitPct')} active={sortKey === 'profitPct'} dir={sortDir}>%</Th>
              <Th
                className="text-right"
                onClick={() => toggleSort('tripProfit')}
                active={sortKey === 'tripProfit'}
                dir={sortDir}
                title="Total profit from buying out every profitable listing on the buy world: profit/ea × buyable supply."
              >Trip Profit</Th>
              <Th className="text-right" onClick={() => toggleSort('salesPerDay')} active={sortKey === 'salesPerDay'} dir={sortDir}>Velocity</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={9} className="text-center text-muted py-10">
                No arbitrage opportunities matching the current filters. Run a scan or relax thresholds.
              </td></tr>
            )}
            {visible.map((r) => (
              <tr key={r.itemId} className="border-t border-border hover:bg-panel2/60">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {r.iconUrl && <img src={r.iconUrl} alt="" className="w-7 h-7 rounded bg-panel2" />}
                    <div>
                      <div className="text-slate-100">{r.itemName}{r.hq ? ' [HQ]' : ''}</div>
                      <div className="text-muted text-xs">#{r.itemId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-right text-accent2">{r.buyWorld}</td>
                <td className="px-4 py-2 text-right">
                  {fmt(r.buyPrice)}{' '}
                  <span className="text-muted" title={`Cheapest listing has ${r.buyQuantity} unit(s); ${r.buyableSupply} total profitable on ${r.buyWorld}`}>
                    ×{r.buyQuantity}
                    {r.buyableSupply > r.buyQuantity && <span className="opacity-70"> ({r.buyableSupply} total)</span>}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-accent">{r.homeWorld}</td>
                <td className="px-4 py-2 text-right">{fmt(r.homePrice)}</td>
                <td className={`px-4 py-2 text-right font-semibold ${r.profitGil > 0 ? 'text-good' : 'text-bad'}`}>
                  {fmt(r.profitGil)}
                </td>
                <td className={`px-4 py-2 text-right ${r.profitPct > 0 ? 'text-good' : 'text-bad'}`}>
                  {r.profitPct.toFixed(0)}%
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${r.tripProfit > 0 ? 'text-good' : 'text-bad'}`}>
                  {fmt(r.tripProfit)}
                </td>
                <td className="px-4 py-2 text-right">
                  {r.salesPerDay.toFixed(1)}/day
                  <div className="text-muted text-xs">last {r.lastSaleHoursAgo.toFixed(0)}h ago</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({
  children, onClick, active, dir, className = '', title,
}: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; dir?: 'asc' | 'desc'; className?: string; title?: string;
}) {
  return (
    <th
      className={`px-4 py-2 font-medium text-left ${onClick ? 'cursor-pointer select-none hover:text-slate-100' : ''} ${className}`}
      onClick={onClick}
      title={title}
    >
      {children}{active && (dir === 'desc' ? ' ↓' : ' ↑')}
    </th>
  );
}

function fmt(n: number) {
  return n.toLocaleString();
}
