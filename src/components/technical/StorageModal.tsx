'use client';

import { useState, useEffect } from 'react';
import { X, Battery } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { StorageData } from '@/types/database';

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function StorageModal({ isOpen, onClose, projectId }: StorageModalProps) {
  const [formData, setFormData] = useState({
    capacity_kwh: '',
    power_kw: '',
    battery_chemistry: '',
    depth_of_discharge: '',
    round_trip_efficiency: '',
    annual_degradation: '2.5', // Default 2.5%
    discharge_behaviour: 'Arbitrage Maximisation',
    discharge_time: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingDataId, setExistingDataId] = useState<string | null>(null);

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      loadExistingData();
    }
  }, [isOpen, projectId]);

  const loadExistingData = async () => {
    setIsLoadingData(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('storage_data')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw new Error(fetchError.message);
      }

      if (data) {
        setExistingDataId(data.id);
        setFormData({
          capacity_kwh: data.capacity_kwh?.toString() || '',
          power_kw: data.power_kw?.toString() || '',
          battery_chemistry: data.battery_chemistry || '',
          depth_of_discharge: data.depth_of_discharge?.toString() || '',
          round_trip_efficiency: data.round_trip_efficiency?.toString() || '',
          annual_degradation: data.annual_degradation?.toString() || '2.5',
          discharge_behaviour: data.discharge_behaviour || 'Arbitrage Maximisation',
          discharge_time: data.discharge_time !== null && data.discharge_time !== undefined ? data.discharge_time.toString() : ''
        });
      } else {
        // Reset to defaults if no existing data
        setExistingDataId(null);
        setFormData({
          capacity_kwh: '',
          power_kw: '',
          battery_chemistry: '',
          depth_of_discharge: '',
          round_trip_efficiency: '',
          annual_degradation: '2.5',
          discharge_behaviour: 'Arbitrage Maximisation',
          discharge_time: ''
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage data');
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
      if (!formData.capacity_kwh || !formData.power_kw || !formData.battery_chemistry || !formData.depth_of_discharge || !formData.round_trip_efficiency) {
        throw new Error('Please fill in all required fields');
      }

      // Validate depth of discharge range (0-100%)
      const depthOfDischarge = parseFloat(formData.depth_of_discharge);
      if (depthOfDischarge < 0 || depthOfDischarge > 100) {
        throw new Error('Depth of Discharge must be between 0 and 100%');
      }

      // Validate round-trip efficiency range (0-100%)
      const roundTripEfficiency = parseFloat(formData.round_trip_efficiency);
      if (roundTripEfficiency < 0 || roundTripEfficiency > 100) {
        throw new Error('Round-trip Efficiency must be between 0 and 100%');
      }

      const storageData: Omit<StorageData, 'id' | 'created_at' | 'updated_at'> = {
        project_id: projectId,
        capacity_kwh: parseFloat(formData.capacity_kwh),
        power_kw: parseFloat(formData.power_kw),
        battery_chemistry: formData.battery_chemistry as 'Lithium-ion' | 'Lithium Iron Phosphate' | 'Lead Acid' | 'Nickel Cadmium',
        depth_of_discharge: parseFloat(formData.depth_of_discharge),
        round_trip_efficiency: parseFloat(formData.round_trip_efficiency),
        annual_degradation: parseFloat(formData.annual_degradation),
        discharge_behaviour: formData.discharge_behaviour,
        discharge_time: formData.discharge_behaviour === 'Set Discharge Time' && formData.discharge_time !== '' ? parseInt(formData.discharge_time) : null
      };

      let result;
      
      if (existingDataId) {
        // Update existing record
        result = await supabase
          .from('storage_data')
          .update(storageData)
          .eq('id', existingDataId)
          .select();
      } else {
        // Insert new record
        result = await supabase
          .from('storage_data')
          .insert(storageData)
          .select();
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // If this was a new insert, set the ID for future updates
      if (!existingDataId && result.data?.[0]) {
        setExistingDataId(result.data[0].id);
      }

      console.log('Storage data saved successfully:', storageData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveInfrastructure = async () => {
    if (!existingDataId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('storage_data')
        .delete()
        .eq('id', existingDataId);

      if (error) {
        throw new Error(error.message);
      }

      setExistingDataId(null);
      setFormData({
        capacity_kwh: '',
        power_kw: '',
        battery_chemistry: '',
        depth_of_discharge: '',
        round_trip_efficiency: '',
        annual_degradation: '2.5',
        discharge_behaviour: 'Arbitrage Maximisation',
        discharge_time: ''
      });

      console.log('Storage infrastructure removed successfully');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while removing infrastructure');
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
              <Battery className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Storage Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Battery System Settings
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
            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Capacity (kWh) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                disabled={isLoadingData}
                value={formData.capacity_kwh}
                onChange={(e) => handleInputChange('capacity_kwh', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., 10.0"
              />
            </div>

            {/* Power */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Power (kW) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                disabled={isLoadingData}
                value={formData.power_kw}
                onChange={(e) => handleInputChange('power_kw', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., 5.0"
              />
            </div>

            {/* Battery Chemistry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Battery Chemistry *
              </label>
              <select
                required
                disabled={isLoadingData}
                value={formData.battery_chemistry}
                onChange={(e) => handleInputChange('battery_chemistry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="">Select chemistry</option>
                <option value="Lithium-ion">Lithium-ion</option>
                <option value="Lithium Iron Phosphate">Lithium Iron Phosphate</option>
                <option value="Lead Acid">Lead Acid</option>
                <option value="Nickel Cadmium">Nickel Cadmium</option>
              </select>
            </div>

            {/* Depth of Discharge */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Depth of Discharge (%) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                required
                disabled={isLoadingData}
                value={formData.depth_of_discharge}
                onChange={(e) => handleInputChange('depth_of_discharge', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., 80"
              />
            </div>

            {/* Round-trip Efficiency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Round-trip Efficiency (%) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                disabled={isLoadingData}
                value={formData.round_trip_efficiency}
                onChange={(e) => handleInputChange('round_trip_efficiency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., 90.0"
              />
            </div>

            {/* Annual Degradation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Annual Degradation (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                disabled={isLoadingData}
                value={formData.annual_degradation}
                onChange={(e) => handleInputChange('annual_degradation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="Default: 2.5%"
              />
            </div>

            {/* Discharge Behaviour */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Discharge Behaviour *
              </label>
              <select
                required
                disabled={isLoadingData}
                value={formData.discharge_behaviour}
                onChange={e => handleInputChange('discharge_behaviour', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="Arbitrage Maximisation">Arbitrage Maximisation</option>
                <option value="Set Discharge Time">Set Discharge Time</option>
                <option value="Peak Reduction">Peak Reduction</option>
              </select>
            </div>
            {/* Discharge Time (only if Set Discharge Time) */}
            {formData.discharge_behaviour === 'Set Discharge Time' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discharge Time (hour of day, 0-23)
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  required
                  disabled={isLoadingData}
                  value={formData.discharge_time}
                  onChange={e => handleInputChange('discharge_time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  placeholder="e.g., 18"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {existingDataId && (
                <button
                  type="button"
                  onClick={handleRemoveInfrastructure}
                  disabled={isLoading || isLoadingData}
                  className="px-4 py-2 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                >
                  Remove Infrastructure
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || isLoadingData}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || isLoadingData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{isLoading ? 'Saving...' : existingDataId ? 'Update Configuration' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 