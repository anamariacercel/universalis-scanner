import { DATA_CENTERS, REGIONS, Region } from '../data/worlds';

export interface Settings {
  region: Region;
  dataCenter: string;
  homeWorld: string;
  presetId: string;
  maxItems: number;
  minSalesPerDay: number;
  maxLastSaleHours: number;
  minProfitGil: number;
  minRoiPercent: number;
}

interface Props {
  value: Settings;
  onChange: (s: Settings) => void;
  presets: Array<{ id: string; label: string; description: string }>;
}

export function SettingsPanel({ value, onChange, presets }: Props) {
  const dcsInRegion = DATA_CENTERS.filter((d) => d.region === value.region);
  const dc = DATA_CENTERS.find((d) => d.name === value.dataCenter);

  const update = (patch: Partial<Settings>) => onChange({ ...value, ...patch });

  return (
    <section className="bg-panel border border-border rounded-lg p-5 space-y-4">
      <h2 className="text-accent text-lg font-semibold tracking-wide">Configuration</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Region">
          <select
            className="input"
            value={value.region}
            onChange={(e) => {
              const region = e.target.value as Region;
              const firstDc = DATA_CENTERS.find((d) => d.region === region)!;
              update({ region, dataCenter: firstDc.name, homeWorld: firstDc.worlds[0] });
            }}
          >
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>

        <Field label="Data Center">
          <select
            className="input"
            value={value.dataCenter}
            onChange={(e) => {
              const next = DATA_CENTERS.find((d) => d.name === e.target.value)!;
              update({ dataCenter: next.name, homeWorld: next.worlds[0] });
            }}
          >
            {dcsInRegion.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </Field>

        <Field label="Home World">
          <select
            className="input"
            value={value.homeWorld}
            onChange={(e) => update({ homeWorld: e.target.value })}
          >
            {dc?.worlds.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Field label="Item Preset">
          <select
            className="input"
            value={value.presetId}
            onChange={(e) => update({ presetId: e.target.value })}
          >
            {presets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Max Items to Scan">
          <input type="number" className="input" min={20} max={500}
            value={value.maxItems}
            onChange={(e) => update({ maxItems: Number(e.target.value) || 100 })} />
        </Field>
        <Field label="Min Sales / Day">
          <input type="number" className="input" min={0} step="0.5"
            value={value.minSalesPerDay}
            onChange={(e) => update({ minSalesPerDay: Number(e.target.value) })} />
        </Field>
        <Field label="Max Hours Since Last Sale">
          <input type="number" className="input" min={1} max={336}
            value={value.maxLastSaleHours}
            onChange={(e) => update({ maxLastSaleHours: Number(e.target.value) })} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Field label="Min Net Profit (gil)">
          <input type="number" className="input" min={0} step="100"
            value={value.minProfitGil}
            onChange={(e) => update({ minProfitGil: Number(e.target.value) })} />
        </Field>
        <Field label="Min ROI (%)">
          <input type="number" className="input" min={0} step="1"
            value={value.minRoiPercent}
            onChange={(e) => update({ minRoiPercent: Number(e.target.value) })} />
        </Field>
      </div>

      <p className="text-muted text-xs">
        Profit/ROI are computed <em>after</em> the 5% market-board tax on sale price.
      </p>

      <p className="text-muted text-xs">
        {presets.find((p) => p.id === value.presetId)?.description}
      </p>

      <style>{`
        .input {
          background: #1c2230;
          border: 1px solid #2a3142;
          border-radius: 6px;
          padding: 8px 10px;
          color: #e2e8f0;
          width: 100%;
        }
        .input:focus { outline: 2px solid #c8a45c66; border-color: #c8a45c; }
      `}</style>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-muted block mb-1">{label}</span>
      {children}
    </label>
  );
}
