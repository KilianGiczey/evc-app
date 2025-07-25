import { Globe, X } from 'lucide-react';

const NETWORK_TARIFF_OPTIONS = [
  '2.0 TD',
  '3.0 TD',
  '6.1 TD',
  '6.2 TD',
  '6.3 TD',
  '6.4 TD',
];

export default function NetworkTariffModal({
  isOpen,
  onClose,
  onSave,
  saving,
  networkTariffType,
  setNetworkTariffType,
  contractedPowerMarginPercent,
  setContractedPowerMarginPercent,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  networkTariffType: string;
  setNetworkTariffType: (type: string) => void;
  contractedPowerMarginPercent: number;
  setContractedPowerMarginPercent: (v: number) => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 h-auto overflow-y-auto relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Network Tariff
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Select your network tariff and contracted power margin
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
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
          <div>
            <label htmlFor="network-tariff-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selected Network Tariff
            </label>
            <select
              id="network-tariff-type"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              value={networkTariffType}
              onChange={e => setNetworkTariffType(e.target.value)}
            >
              {NETWORK_TARIFF_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="contracted-power-margin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contracted Power Demand as % above Max Forecasted Demand
            </label>
            <div className="flex items-center gap-2">
              <input
                id="contracted-power-margin"
                type="number"
                min={0}
                max={100}
                step={1}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                value={contractedPowerMarginPercent}
                onChange={e => setContractedPowerMarginPercent(Number(e.target.value))}
                placeholder="10"
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Update Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
} 