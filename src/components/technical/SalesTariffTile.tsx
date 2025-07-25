import { useState } from 'react';
import { FileText, Trash2, Settings } from 'lucide-react';
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

interface SalesTariffTileProps {
  projectId: string;
  tariff: SalesTariff;
  onTariffUpdated: () => void;
  onTariffDeleted: () => void;
}

type CustomPeriod = { name: string; start: string; end: string; price: string; type: string };

const initialCustomPeriods: CustomPeriod[] = Array.from({ length: 6 }, (_, i) => ({
  name: `Period ${i + 1}`,
  start: '',
  end: '',
  price: '',
  type: 'weekdays',
}));

export default function SalesTariffTile({ projectId, tariff, onTariffUpdated, onTariffDeleted }: SalesTariffTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tariffName, setTariffName] = useState<string>(tariff.tariff_name || '');
  const [pricingType, setPricingType] = useState<'fixed' | 'variable' | 'custom'>(tariff.energy_tariff_type || 'fixed');
  const [fixedPrice, setFixedPrice] = useState<string>(tariff.energy_fixed_price?.toString() || '');
  const [variablePrices, setVariablePrices] = useState<{ P1: string; P2: string; P3: string; P4: string; P5: string; P6: string }>(
    tariff.energy_variable_prices
      ? {
          P1: tariff.energy_variable_prices.P1?.toString() || '',
          P2: tariff.energy_variable_prices.P2?.toString() || '',
          P3: tariff.energy_variable_prices.P3?.toString() || '',
          P4: tariff.energy_variable_prices.P4?.toString() || '',
          P5: tariff.energy_variable_prices.P5?.toString() || '',
          P6: tariff.energy_variable_prices.P6?.toString() || '',
        }
      : { P1: '', P2: '', P3: '', P4: '', P5: '', P6: '' }
  );
  const [customPeriods, setCustomPeriods] = useState<CustomPeriod[]>(
    Array.isArray(tariff.energy_custom_periods)
      ? tariff.energy_custom_periods.map((p) => ({
          name: p.name,
          start: p.start?.toString() || '',
          end: p.end?.toString() || '',
          price: p.price?.toString() || '',
          type: p.type,
        }))
      : initialCustomPeriods
  );

  const handleCustomPeriodChange = (idx: number, field: 'start' | 'end' | 'price' | 'type', value: string) => {
    setCustomPeriods(periods => periods.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  async function handleSave() {
    setSaving(true);
    let insertObj: any = {
      id: tariff.id,
      project_id: projectId,
      tariff_name: tariffName,
      energy_tariff_type: pricingType,
      energy_fixed_price: null,
      energy_variable_prices: null,
      energy_custom_periods: null,
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
    await supabase.from('sales_tariffs_data').upsert([insertObj]);
    setSaving(false);
    setIsModalOpen(false);
    onTariffUpdated();
  }

  async function handleDelete(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    if (!window.confirm('Delete this sales tariff?')) return;
    await supabase.from('sales_tariffs_data').delete().eq('id', tariff.id);
    onTariffDeleted();
  }

  async function handleRemoveTariff() {
    if (!tariff.id) return;
    if (!window.confirm('Are you sure you want to remove this sales tariff?')) return;
    await supabase.from('sales_tariffs_data').delete().eq('id', tariff.id);
    setIsModalOpen(false);
    onTariffDeleted();
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => setIsModalOpen(true)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
              <FileText className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {tariff.tariff_name || 'Sales Tariff'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {tariff.energy_tariff_type ? tariff.energy_tariff_type.charAt(0).toUpperCase() + tariff.energy_tariff_type.slice(1) : 'No type'}
              </p>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" onClick={e => { e.stopPropagation(); setIsModalOpen(true); }} title="Edit Tariff">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
      <SalesTariffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
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
        handleCustomPeriodChange={handleCustomPeriodChange}
        hourOptions={hourOptions}
        onRemove={tariff.id ? handleRemoveTariff : undefined}
        tariffId={tariff.id}
      />
    </>
  );
} 