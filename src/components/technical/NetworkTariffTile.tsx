import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { NetworkTariffModal } from './index';
import { supabase } from '@/lib/supabase/client';

const NETWORK_TARIFF_OPTIONS = [
  '2.0 TD',
  '3.0 TD',
  '6.1 TD',
  '6.2 TD',
  '6.3 TD',
  '6.4 TD',
];

export default function NetworkTariffTile({ projectId }: { projectId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [networkTariffType, setNetworkTariffType] = useState('3.0 TD');
  const [contractedPowerMarginPercent, setContractedPowerMarginPercent] = useState(10);
  const [summary, setSummary] = useState<string>('');

  // Fetch the active network tariff summary on mount or after save
  useEffect(() => {
    async function fetchSummary() {
      const { data } = await supabase
        .from('tariffs_data')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setSummary(`${data.network_tariff_type || 'Not set'} (${data.contracted_power_margin_percent ?? 'N/A'}%)`);
        if (data.network_tariff_type) setNetworkTariffType(data.network_tariff_type);
        if (typeof data.contracted_power_margin_percent === 'number') setContractedPowerMarginPercent(data.contracted_power_margin_percent);
      } else {
        setSummary('No network tariff set');
      }
    }
    if (projectId) fetchSummary();
  }, [projectId, isModalOpen]);

  async function handleSave() {
    setSaving(true);
    const insertObj: any = {
      project_id: projectId,
      network_tariff_type: networkTariffType,
      contracted_power_margin_percent: contractedPowerMarginPercent,
    };
    console.log('NetworkTariffTile: Upserting object:', insertObj);
    const { data, error } = await supabase.from('tariffs_data').upsert([insertObj], { onConflict: 'project_id' });
    console.log('NetworkTariffTile: Upsert result:', { data, error });
    setSaving(false);
    setIsModalOpen(false);
    // The useEffect will refresh the summary
  }

  return (
    <>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Network Tariffs
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {summary}
              </p>
            </div>
          </div>
        </div>
      </div>
      <NetworkTariffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        saving={saving}
        networkTariffType={networkTariffType}
        setNetworkTariffType={setNetworkTariffType}
        contractedPowerMarginPercent={contractedPowerMarginPercent}
        setContractedPowerMarginPercent={setContractedPowerMarginPercent}
      />
    </>
  );
} 