import { useEffect, useMemo, useState } from 'react';
import { DATA_CENTERS } from './data/worlds';
import { PRESETS } from './data/presets';
import { searchItems, iconUrl, XivItem } from './lib/xivapi';
import { runArbitrage, ArbitrageRow } from './lib/arbitrage';
import { SettingsPanel, Settings } from './components/Settings';
import { ResultsTable } from './components/ResultsTable';

const SETTINGS_KEY = 'universalis-scanner.settings.v1';

const defaultSettings: Settings = {
  region: 'North-America',
  dataCenter: 'Aether',
  homeWorld: 'Cactuar',
  presetId: 'materia-current',
  maxItems: 100,
  // Defaults are tuned for high-velocity consumables (Materia, food). For
  // slow-moving items (housing, glamour) the user should relax these.
  minSalesPerDay: 20,
  maxLastSaleHours: 4,
  minProfitGil: 1000,
  minRoiPercent: 15,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { return defaultSettings; }
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<ArbitrageRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const homeWorldValid = useMemo(() => {
    const dc = DATA_CENTERS.find((d) => d.name === settings.dataCenter);
    return dc?.worlds.includes(settings.homeWorld) ?? false;
  }, [settings.dataCenter, settings.homeWorld]);

  async function onScan() {
    if (!homeWorldValid) { setError('Home world is not on the selected data center.'); return; }
    setError(null);
    setScanning(true);
    setRows([]);
    setProgress(0);
    setStatus('Fetching item list from XIVAPI…');
    try {
      const preset = PRESETS.find((p) => p.id === settings.presetId) ?? PRESETS[0];
      const items: XivItem[] = await searchItems(preset.search, settings.maxItems);
      if (items.length === 0) {
        throw new Error(
          `XIVAPI returned 0 items for preset "${preset.label}". The category or item-level filter may need updating.`,
        );
      }

      const itemIds = items.map((i) => i.ID);
      const names = new Map(items.map((i) => [i.ID, i.Name]));
      const icons = new Map(items.map((i) => [i.ID, iconUrl(i)]));

      setStatus(`Scanning ${itemIds.length} items on ${settings.dataCenter}…`);
      const result = await runArbitrage({
        homeWorld: settings.homeWorld,
        dataCenter: settings.dataCenter,
        itemIds,
        itemNames: names,
        itemIcons: icons,
        minSalesPerDay: settings.minSalesPerDay,
        maxLastSaleHours: settings.maxLastSaleHours,
        minProfitGil: settings.minProfitGil,
        minRoiPercent: settings.minRoiPercent,
        onProgress: (msg, pct) => { setStatus(msg); setProgress(pct); },
      });
      setRows(result);
      setStatus(`Scan complete — ${result.length} opportunities.`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setStatus('');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-panel/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <div className="text-2xl font-semibold tracking-wide text-accent">
            Universalis Scanner
          </div>
          <div className="text-muted text-sm">FFXIV market-board arbitrage finder</div>
          <div className="ml-auto text-xs text-muted">
            Data: <a className="underline hover:text-accent2" href="https://universalis.app" target="_blank">Universalis</a> · <a className="underline hover:text-accent2" href="https://xivapi.com" target="_blank">XIVAPI</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <SettingsPanel value={settings} onChange={setSettings} presets={PRESETS} />

        <div className="flex items-center gap-4">
          <button
            onClick={onScan}
            disabled={scanning}
            className="bg-accent text-bg font-semibold px-5 py-2 rounded hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {scanning ? 'Scanning…' : 'Scan market'}
          </button>
          {status && <span className="text-muted text-sm">{status}</span>}
          {scanning && (
            <div className="flex-1 h-2 bg-panel2 rounded overflow-hidden max-w-xs">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-bad/10 border border-bad/40 text-bad rounded p-3 text-sm">
            {error}
          </div>
        )}

        <ResultsTable rows={rows} />

        <footer className="text-muted text-xs text-center py-6">
          Built for personal use. Respect Universalis rate limits (25 req/s) — this app caps itself at ~12 req/s.
        </footer>
      </main>
    </div>
  );
}
