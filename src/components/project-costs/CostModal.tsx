import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface CostModalProps {
  isOpen: boolean;
  onClose: (newCostId?: string) => void;
  projectId: string;
  costId?: string;
  type?: 'Capex' | 'Opex';
}

const COST_SUBTYPES = [
  'Fixed Cost',
  'Solar: €/kW of PV Installed',
  'Battery: €/kW of Battery Installed',
  'Battery: €/kWh of Battery Installed',
  'Grid Connection: €/kW of Import Limit',
  'Chargers: €/kW of Chargers Installed',
  'Chargers: € / # of Chargers Installed',
];

export default function CostModal({ isOpen, onClose, projectId, costId, type }: CostModalProps) {
  const [formData, setFormData] = useState({
    cost_name: '',
    cost_type: type || 'Capex',
    cost_subtype: '',
    charger_hub_id: '',
    cost: '',
    cost_escalation: type === 'Opex' ? '0' : '',
  });
  const [availableHubs, setAvailableHubs] = useState<Array<{ id: string; hub_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingDataId, setExistingDataId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      loadAvailableHubs();
      if (costId) {
        loadExistingData();
      } else {
        setExistingDataId(null);
        setFormData({
          cost_name: '',
          cost_type: type || 'Capex',
          cost_subtype: '',
          charger_hub_id: '',
          cost: '',
          cost_escalation: type === 'Opex' ? '0' : '',
        });
      }
    }
  }, [isOpen, projectId, costId, type]);

  const loadAvailableHubs = async () => {
    try {
      const { data, error } = await supabase
        .from('charging_hubs')
        .select('id, hub_name')
        .eq('project_id', projectId)
        .order('hub_name');
      if (!error && data) {
        setAvailableHubs(data);
      }
    } catch (err) {
      // ignore
    }
  };

  const loadExistingData = async () => {
    if (!costId) return;
    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('costs_data')
        .select('*')
        .eq('id', costId)
        .single();
      if (!error && data) {
        setExistingDataId(data.id);
        setFormData({
          cost_name: data.cost_name || '',
          cost_type: data.cost_type || type || 'Capex',
          cost_subtype: data.cost_subtype || '',
          charger_hub_id: data.charger_hub_id || '',
          cost: data.cost || '',
          cost_escalation: (data.cost_type === 'Opex' ? (data.cost_escalation ?? '0') : ''),
        });
      }
    } catch (err) {
      // ignore
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // Ensure charger_hub_id is null if empty string
      const payload = {
        ...formData,
        project_id: projectId,
        charger_hub_id: formData.charger_hub_id ? formData.charger_hub_id : null,
        cost_escalation: formData.cost_type === 'Opex' && formData.cost_escalation !== '' ? Number(formData.cost_escalation) : null,
      };
      let result;
      if (existingDataId) {
        result = await supabase
          .from('costs_data')
          .update(payload)
          .eq('id', existingDataId)
          .select('id')
          .single();
      } else {
        result = await supabase
          .from('costs_data')
          .insert([payload])
          .select('id')
          .single();
      }
      if (result.error) {
        throw new Error(result.error.message);
      }
      onClose(result.data?.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save cost');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!existingDataId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('costs_data')
        .delete()
        .eq('id', existingDataId);
      if (error) {
        throw new Error(error.message);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete cost');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          onClick={() => onClose()}
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {existingDataId ? 'Edit Cost' : 'Add Cost'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost Name *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              value={formData.cost_name}
              onChange={e => handleInputChange('cost_name', e.target.value)}
              required
              disabled={isLoadingData}
              placeholder="e.g., PV Installation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost Subtype *</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              value={formData.cost_subtype}
              onChange={e => handleInputChange('cost_subtype', e.target.value)}
              required
              disabled={isLoadingData}
            >
              <option value="">Select subtype</option>
              {COST_SUBTYPES.map(subtype => (
                <option key={subtype} value={subtype}>{subtype}</option>
              ))}
            </select>
          </div>
          {(formData.cost_subtype.includes('Chargers')) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Charger Hub Link</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                value={formData.charger_hub_id}
                onChange={e => handleInputChange('charger_hub_id', e.target.value)}
                disabled={isLoadingData}
              >
                <option value="">None</option>
                {availableHubs.map(hub => (
                  <option key={hub.id} value={hub.id}>{hub.hub_name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {(() => {
                if (formData.cost_subtype.includes('€/kWh')) return 'Cost (€/kWh) *';
                if (formData.cost_subtype.includes('€/kW')) return 'Cost (€/kW) *';
                if (formData.cost_subtype.includes('€ / # of Chargers Installed')) return 'Cost (€ / #) *';
                return 'Cost (€) *';
              })()}
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              value={formData.cost}
              onChange={e => handleInputChange('cost', e.target.value)}
              required
              min="0"
              step="any"
              disabled={isLoadingData}
              placeholder="e.g., 10000"
            />
          </div>
          {/* Cost Escalation (only for Opex) */}
          {formData.cost_type === 'Opex' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Annual Cost Escalation (%)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                value={formData.cost_escalation}
                onChange={e => handleInputChange('cost_escalation', e.target.value)}
                min="0"
                step="any"
                disabled={isLoadingData}
                placeholder="e.g., 2.5"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Annual percentage increase for this operating cost</p>
            </div>
          )}
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {existingDataId && (
                <button
                  type="button"
                  className="px-4 py-2 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  onClick={handleRemove}
                  disabled={isLoading}
                >
                  Remove Cost
                </button>
              )}
            </div>
            <div className="flex gap-4">
              <button
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                onClick={() => onClose()}
                disabled={isLoading}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? 'Saving...' : (existingDataId ? 'Save Changes' : 'Add Cost')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 