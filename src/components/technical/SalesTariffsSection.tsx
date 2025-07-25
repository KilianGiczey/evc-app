import { useEffect, useState } from 'react';
import { Plus, FileText, Settings } from 'lucide-react';
import SalesTariffTile from './SalesTariffTile';
import SalesTariffModal from './SalesTariffModal';
import { supabase } from '@/lib/supabase/client';

interface SalesTariff {
  id: string;
  project_id: string;
  tariff_name: string;
  energy_tariff_type: 'fixed' | 'variable' | 'custom';
  energy_fixed_price: number | null;
  energy_variable_prices: { [key: string]: number } | null;
  energy_custom_periods: Array<{ name: string; start: number; end: number; price: number; type: string }> | null;
  created_at?: string;
  updated_at?: string;
}

type CustomPeriod = { name: string; start: string; end: string; price: string; type: string };

interface SalesTariffsSectionProps {
  projectId: string;
}

export default function SalesTariffsSection({ projectId }: SalesTariffsSectionProps) {
  const [tariffs, setTariffs] = useState<SalesTariff[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tariffName, setTariffName] = useState('');
  const [pricingType, setPricingType] = useState<'fixed' | 'variable' | 'custom'>('fixed');
  const [fixedPrice, setFixedPrice] = useState('');
  const [variablePrices, setVariablePrices] = useState<{ P1: string; P2: string; P3: string; P4: string; P5: string; P6: string }>({ P1: '', P2: '', P3: '', P4: '', P5: '', P6: '' });
  const [customPeriods, setCustomPeriods] = useState<CustomPeriod[]>(Array.from({ length: 6 }, (_, i) => ({ name: `Period ${i + 1}`, start: '', end: '', price: '', type: 'weekdays' })));

  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  function resetModalState() {
    setTariffName('');
    setPricingType('fixed');
    setFixedPrice('');
    setVariablePrices({ P1: '', P2: '', P3: '', P4: '', P5: '', P6: '' });
    setCustomPeriods(Array.from({ length: 6 }, (_, i) => ({ name: `Period ${i + 1}`, start: '', end: '', price: '', type: 'weekdays' })));
  }

  async function fetchTariffs() {
    const { data } = await supabase.from('sales_tariffs_data').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
    setTariffs((data as SalesTariff[]) || []);
  }

  useEffect(() => {
    if (projectId) fetchTariffs();
  }, [projectId]);

  async function handleAddTariff() {
    setSaving(true);
    let insertObj: any = {
      project_id: projectId,
      tariff_name: tariffName,
      energy_tariff_type: pricingType,
      energy_fixed_price: null,
      energy_variable_prices: null,
      energy_custom_periods: null,
    };
    // Only include id if editing an existing tariff
    const existingTariff = tariffs.find(t => t.tariff_name === tariffName);
    if (existingTariff && existingTariff.id) {
      insertObj.id = existingTariff.id;
    }
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
    console.log('Upserting sales tariff:', insertObj);
    // Upsert on 'id' (primary key)
    const { data, error } = await supabase.from('sales_tariffs_data').upsert([insertObj], { onConflict: 'id' });
    console.log('Upsert result:', { data, error });
    if (error && error.code === '23505') { // Unique violation
      alert('Tariff name must be unique. Please choose a different name.');
      setSaving(false);
      return;
    }
    setSaving(false);
    setIsAddModalOpen(false);
    resetModalState();
    fetchTariffs();
  }

  // Add Sales Tariff tile for grid
  const AddSalesTariffTile = () => (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer min-h-[180px]"
      onClick={() => setIsAddModalOpen(true)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
            <FileText className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add Sales Tariff
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Configure new sales tariff
            </p>
          </div>
        </div>
        <div className="p-2 text-gray-400">
          <Settings className="h-5 w-5" />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400 text-sm text-center w-full font-medium">
          Click to add new sales tariff
        </span>
      </div>
    </div>
  );

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sales Tariffs
        </h3>
        <button
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 text-white" />
          <span>Add Sales Tariff</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tariffs.map(tariff => (
          <SalesTariffTile
            key={tariff.id}
            projectId={projectId}
            tariff={tariff}
            onTariffUpdated={fetchTariffs}
            onTariffDeleted={fetchTariffs}
          />
        ))}
        <AddSalesTariffTile />
      </div>
      <SalesTariffModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); resetModalState(); }}
        onSave={handleAddTariff}
        saving={saving}
        tariffName={tariffName}
        setTariffName={setTariffName}
        pricingType={pricingType}
        setPricingType={setPricingType}
        fixedPrice={fixedPrice}
        setFixedPrice={setFixedPrice}
        variablePrices={variablePrices}
        setVariablePrices={setVariablePrices}
        customPeriods={customPeriods}
        handleCustomPeriodChange={(idx, field, value) => setCustomPeriods(periods => periods.map((p, i) => i === idx ? { ...p, [field]: value } : p))}
        hourOptions={hourOptions}
      />
    </div>
  );
} 