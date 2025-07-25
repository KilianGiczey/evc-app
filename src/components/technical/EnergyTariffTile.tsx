import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import EnergyTariffModal from './EnergyTariffModal';
import { supabase } from '@/lib/supabase/client';

const initialCustomPeriods = Array.from({ length: 6 }, (_, i) => ({
  name: `Period ${i + 1}`,
  start: '',
  end: '',
  price: '',
  type: 'weekdays', // 'weekdays' or 'weekends'
}));

export default function EnergyTariffTile({ projectId }: { projectId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pricingType, setPricingType] = useState<'fixed' | 'variable' | 'custom'>('fixed');
  const [fixedPrice, setFixedPrice] = useState('');
  const [variablePrices, setVariablePrices] = useState({ P1: '', P2: '', P3: '', P4: '', P5: '', P6: '' });
  const [customPeriods, setCustomPeriods] = useState(initialCustomPeriods);
  const [summary, setSummary] = useState<string>('');

  const handleCustomPeriodChange = (idx: number, field: 'start' | 'end' | 'price' | 'type', value: string) => {
    setCustomPeriods(periods => periods.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  // For hour dropdowns (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  // Fetch the active tariff summary on mount or after save
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
        if (data.energy_tariff_type === 'fixed') {
          setSummary('Fixed');
        } else if (data.energy_tariff_type === 'variable') {
          setSummary('Variable');
        } else if (data.energy_tariff_type === 'custom') {
          setSummary('Custom');
        } else {
          setSummary('No tariff set');
        }
      } else {
        setSummary('No tariff set');
      }
    }
    if (projectId) fetchSummary();
  }, [projectId, isModalOpen]);

  async function handleSave() {
    setSaving(true);
    // Prepare the upsert object with correct zeroing
    let insertObj: any = {
      project_id: projectId,
      energy_tariff_type: pricingType,
      energy_fixed_price: 0,
      energy_variable_prices: { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0 },
      energy_custom_periods: [
        { name: 'Period 1', start: 0, end: 0, price: 0, type: 'weekdays' },
        { name: 'Period 2', start: 0, end: 0, price: 0, type: 'weekdays' },
        { name: 'Period 3', start: 0, end: 0, price: 0, type: 'weekdays' },
        { name: 'Period 4', start: 0, end: 0, price: 0, type: 'weekdays' },
        { name: 'Period 5', start: 0, end: 0, price: 0, type: 'weekdays' },
        { name: 'Period 6', start: 0, end: 0, price: 0, type: 'weekdays' },
      ],
    };
    if (pricingType === 'fixed') {
      insertObj.energy_fixed_price = fixedPrice ? Number(fixedPrice) : 0;
    } else if (pricingType === 'variable') {
      insertObj.energy_variable_prices = Object.fromEntries(
        Object.entries(variablePrices).map(([k, v]) => [k, v ? Number(v) : 0])
      );
    } else if (pricingType === 'custom') {
      insertObj.energy_custom_periods = customPeriods.map(p => ({
        ...p,
        start: p.start ? Number(p.start) : 0,
        end: p.end ? Number(p.end) : 0,
        price: p.price ? Number(p.price) : 0,
      }));
    }
    await supabase.from('tariffs_data').upsert([insertObj], { onConflict: 'project_id' });
    setSaving(false);
    setIsModalOpen(false);
    // The useEffect will refresh the summary
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setIsModalOpen(true)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <FileText className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Energy Tariffs
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {summary}
              </p>
            </div>
          </div>
        </div>
      </div>
      <EnergyTariffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        saving={saving}
        pricingType={pricingType}
        setPricingType={setPricingType}
        fixedPrice={fixedPrice}
        setFixedPrice={setFixedPrice}
        variablePrices={variablePrices}
        setVariablePrices={setVariablePrices}
        customPeriods={customPeriods}
        handleCustomPeriodChange={handleCustomPeriodChange}
        hourOptions={hourOptions}
      />
    </>
  );
} 