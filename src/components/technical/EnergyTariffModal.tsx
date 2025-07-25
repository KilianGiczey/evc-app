import { FileText, X } from 'lucide-react';

export default function EnergyTariffModal({
  isOpen,
  onClose,
  onSave,
  saving,
  pricingType,
  setPricingType,
  fixedPrice,
  setFixedPrice,
  variablePrices,
  setVariablePrices,
  customPeriods,
  handleCustomPeriodChange,
  hourOptions
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  pricingType: 'fixed' | 'variable' | 'custom';
  setPricingType: (type: 'fixed' | 'variable' | 'custom') => void;
  fixedPrice: string;
  setFixedPrice: (v: string) => void;
  variablePrices: { P1: string; P2: string; P3: string; P4: string; P5: string; P6: string };
  setVariablePrices: React.Dispatch<React.SetStateAction<{ P1: string; P2: string; P3: string; P4: string; P5: string; P6: string }>>;
  customPeriods: Array<{ name: string; start: string; end: string; price: string; type: string }>;
  handleCustomPeriodChange: (idx: number, field: 'start' | 'end' | 'price' | 'type', value: string) => void;
  hourOptions: string[];
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 h-[600px] md:h-[700px] overflow-y-auto relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <FileText className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Energy Tariff Structure
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Choose and configure your energy pricing structure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div>
            <label htmlFor="tariff-structure" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tariff Structure
            </label>
            <select
              id="tariff-structure"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              value={pricingType}
              onChange={e => setPricingType(e.target.value as 'fixed' | 'variable' | 'custom')}
            >
              <option value="fixed">Fixed Price Tariff or PPA</option>
              <option value="variable">Variable Pricing (Peninsula network periods)</option>
              <option value="custom">Custom Variable Pricing (User-defined periods)</option>
            </select>
          </div>
          <div className="flex-1 flex flex-col gap-4 justify-start mt-6">
            {pricingType === 'fixed' && (
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm text-gray-700 dark:text-gray-300 mb-0">Fixed Price</label>
                <input type="number" min="0" step="0.01" className="w-36 px-3 py-2 border rounded dark:bg-gray-900 dark:text-white" value={fixedPrice} onChange={e => setFixedPrice(e.target.value)} placeholder="e.g. 150" />
                <span className="text-gray-500 text-sm">€/MWh</span>
              </div>
            )}
            {pricingType === 'variable' && (
              <div className="flex flex-col gap-4">
                {(['P1','P2','P3','P4','P5','P6'] as const).map(period => (
                  <div key={period} className="flex items-center gap-4">
                    <label className="w-28 text-sm text-gray-700 dark:text-gray-300 mb-0">Period {period}</label>
                    <input type="number" min="0" step="0.01" className="w-36 px-3 py-2 border rounded dark:bg-gray-900 dark:text-white" value={variablePrices[period]} onChange={e => setVariablePrices(v => ({ ...v, [period]: e.target.value }))} placeholder={`e.g. 150`} />
                    <span className="text-gray-500 text-sm">€/MWh</span>
                  </div>
                ))}
                <div className="text-xs text-gray-500 mt-1">Prices vary by official periods (P1–P6) as defined in the Spanish tariff structure.</div>
              </div>
            )}
            {pricingType === 'custom' && (
              <div className="flex flex-col gap-4">
                {customPeriods.map((period, idx) => (
                  <div key={idx} className="flex items-center gap-4 mb-2">
                    <label className="w-28 text-sm text-gray-700 dark:text-gray-300 mb-0">Period {idx + 1}</label>
                    <select className="w-32 px-2 py-1 border rounded dark:bg-gray-900 dark:text-white" value={period.start} onChange={e => handleCustomPeriodChange(idx, 'start', e.target.value)}>
                      <option value="">Start</option>
                      {hourOptions.map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                    <span>-</span>
                    <select className="w-32 px-2 py-1 border rounded dark:bg-gray-900 dark:text-white" value={period.end} onChange={e => handleCustomPeriodChange(idx, 'end', e.target.value)}>
                      <option value="">End</option>
                      {hourOptions.map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                    <select className="w-36 px-2 py-1 border rounded dark:bg-gray-900 dark:text-white" value={period.type} onChange={e => handleCustomPeriodChange(idx, 'type', e.target.value)}>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekends">Weekends</option>
                    </select>
                    <input type="number" min="0" step="0.01" placeholder="€/MWh" className="w-32 px-2 py-1 border rounded dark:bg-gray-900 dark:text-white" value={period.price} onChange={e => handleCustomPeriodChange(idx, 'price', e.target.value)} />
                    <span className="text-gray-500 text-sm">€/MWh</span>
                  </div>
                ))}
                <div className="text-xs text-gray-500 mt-1">6 slots available. Specify hours, price, and if each period is for weekdays or weekends.</div>
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={onClose}
            disabled={saving}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            onClick={onSave}
            disabled={saving}
            type="button"
          >
            {saving ? 'Saving...' : 'Update Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
} 