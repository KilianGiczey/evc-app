'use client';

import { useState, useEffect } from 'react';
import { X, Zap, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ChargingHubData } from '@/types/database';

interface ChargingHubModalProps {
  isOpen: boolean;
  onClose: (newHubId?: string) => void;
  projectId: string;
  hubId?: string;
  onHubRemoved?: () => void;
}

export default function ChargingHubModal({ 
  isOpen, 
  onClose, 
  projectId, 
  hubId, 
  onHubRemoved 
}: ChargingHubModalProps) {
  const [formData, setFormData] = useState({
    hub_name: '',
    charger_power: '',
    number_of_chargers: '',
    priority: '',
    charging_profile_id: '',
    sales_tariff_id: '',
  });

  const [availableProfiles, setAvailableProfiles] = useState<Array<{id: string, profile_name: string}>>([]);
  const [availableSalesTariffs, setAvailableSalesTariffs] = useState<Array<{id: string, tariff_name: string}>>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingDataId, setExistingDataId] = useState<string | null>(null);

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      loadAvailableProfiles();
      loadAvailableSalesTariffs();
      if (hubId) {
        loadExistingData();
      } else {
        // Reset form for new hub
        setExistingDataId(null);
        setFormData({
          hub_name: '',
          charger_power: '',
          number_of_chargers: '',
          priority: '',
          charging_profile_id: '',
          sales_tariff_id: '',
        });
      }
    }
  }, [isOpen, projectId, hubId]);

  const loadAvailableProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('charging_profiles')
        .select('id, profile_name')
        .eq('project_id', projectId)
        .order('profile_name');

      if (error) {
        console.error('Error loading charging profiles:', error);
        return;
      }

      setAvailableProfiles(data || []);
    } catch (err) {
      console.error('Failed to load charging profiles:', err);
    }
  };

  const loadAvailableSalesTariffs = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_tariffs_data')
        .select('id, tariff_name')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Error loading sales tariffs:', error);
        return;
      }
      setAvailableSalesTariffs(data || []);
    } catch (err) {
      console.error('Failed to load sales tariffs:', err);
    }
  };

  const loadExistingData = async () => {
    if (!hubId) return;
    
    setIsLoadingData(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('charging_hubs')
        .select('*')
        .eq('id', hubId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw new Error(fetchError.message);
      }

      if (data) {
        setExistingDataId(data.id);
        setFormData({
          hub_name: data.hub_name,
          charger_power: data.charger_power.toString(),
          number_of_chargers: data.number_of_chargers.toString(),
          priority: data.priority.toString(),
          charging_profile_id: data.charging_profile_id || '',
          sales_tariff_id: data.sales_tariff_id || '',
        });
      } else {
        // Reset to defaults if no existing data
        setExistingDataId(null);
        setFormData({
          hub_name: '',
          charger_power: '',
          number_of_chargers: '',
          priority: '',
          charging_profile_id: '',
          sales_tariff_id: '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load existing data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.hub_name || !formData.charger_power || !formData.number_of_chargers || !formData.priority) {
        throw new Error('Please fill in all required fields');
      }

      // Validate numeric fields
      const chargerPower = parseFloat(formData.charger_power);
      const numberOfChargers = parseInt(formData.number_of_chargers);
      const priority = parseInt(formData.priority);

      if (isNaN(chargerPower) || chargerPower <= 0) {
        throw new Error('Charger power must be a positive number');
      }

      if (isNaN(numberOfChargers) || numberOfChargers <= 0) {
        throw new Error('Number of chargers must be a positive integer');
      }

      if (isNaN(priority) || priority <= 0) {
        throw new Error('Priority must be a positive integer');
      }

      const chargingHubData: Omit<ChargingHubData, 'id' | 'created_at' | 'updated_at'> = {
        project_id: projectId,
        hub_name: formData.hub_name,
        charger_power: chargerPower,
        number_of_chargers: numberOfChargers,
        priority: priority,
        charging_profile_id: formData.charging_profile_id || null,
        sales_tariff_id: formData.sales_tariff_id || null,
      };

      let result;
      
      if (existingDataId) {
        // Update existing record
        result = await supabase
          .from('charging_hubs')
          .update(chargingHubData)
          .eq('id', existingDataId)
          .select();
      } else {
        // Insert new record
        result = await supabase
          .from('charging_hubs')
          .insert(chargingHubData)
          .select();
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // If this was a new insert, set the ID for future updates
      if (!existingDataId && result.data?.[0]) {
        setExistingDataId(result.data[0].id);
        onClose(result.data[0].id);
      } else {
        onClose();
      }

      console.log('Charging hub data saved successfully:', chargingHubData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveHub = async () => {
    if (!existingDataId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('charging_hubs')
        .delete()
        .eq('id', existingDataId);

      if (error) {
        throw new Error(error.message);
      }

      setExistingDataId(null);
      setFormData({
        hub_name: '',
        charger_power: '',
        number_of_chargers: '',
        priority: '',
        charging_profile_id: '',
        sales_tariff_id: '',
      });

      console.log('Charging hub removed successfully');
      onHubRemoved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while removing hub');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {hubId ? 'Edit Charging Hub' : 'Add Charging Hub'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                EV Charging Infrastructure Configuration
              </p>
            </div>
          </div>
          <button
            onClick={() => onClose()}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading State */}
        {isLoadingData && (
          <div className="mx-6 mt-4 p-3 bg-blue-100 dark:bg-blue-900 border border-blue-400 text-blue-700 dark:text-blue-300 rounded flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading existing configuration...</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hub Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hub Name *
              </label>
              <input
                type="text"
                required
                disabled={isLoadingData}
                value={formData.hub_name}
                onChange={(e) => handleInputChange('hub_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., Main Parking Hub"
              />
            </div>

            {/* Charger Power */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Charger Power (kW) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                disabled={isLoadingData}
                value={formData.charger_power}
                onChange={(e) => handleInputChange('charger_power', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., 22.0"
              />
            </div>

            {/* Number of Chargers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Chargers *
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={isLoadingData}
                value={formData.number_of_chargers}
                onChange={(e) => handleInputChange('number_of_chargers', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., 4"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority (Ranking) *
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={isLoadingData}
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., 1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Lower numbers = higher priority
              </p>
            </div>

            {/* Charging Profile */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Charging Profile
              </label>
              <select
                disabled={isLoadingData}
                value={formData.charging_profile_id}
                onChange={(e) => handleInputChange('charging_profile_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="">No Demand</option>
                {availableProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.profile_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose a charging profile to define the charging behavior for this hub
              </p>
            </div>
            {/* Sales Tariff */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sales Tariff
              </label>
              <select
                disabled={isLoadingData}
                value={formData.sales_tariff_id}
                onChange={(e) => handleInputChange('sales_tariff_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="">None</option>
                {availableSalesTariffs.map((tariff) => (
                  <option key={tariff.id} value={tariff.id}>
                    {tariff.tariff_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select the sales tariff to apply to this hub
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {existingDataId && (
                <button
                  type="button"
                  onClick={handleRemoveHub}
                  className="px-4 py-2 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                >
                  Remove Hub
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
                onClick={handleSubmit}
                disabled={isLoading}
                type="button"
              >
                {isLoading ? 'Saving...' : 'Save Hub'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 