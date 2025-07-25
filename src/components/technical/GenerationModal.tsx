'use client';

import { useState, useEffect } from 'react';
import { X, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { GenerationData } from '@/types/database';

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function GenerationModal({ isOpen, onClose, projectId }: GenerationModalProps) {
  const [formData, setFormData] = useState({
    system_size_kwp: '',
    panel_type: '',
    orientation: '',
    tilt: '',
    system_losses: '14', // Default 14%
    annual_degradation: '2.5' // Default 2.5%
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
        .from('generation_data')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw new Error(fetchError.message);
      }

      if (data) {
        setExistingDataId(data.id);
        setFormData({
          system_size_kwp: data.system_size_kwp.toString(),
          panel_type: data.panel_type,
          orientation: data.orientation,
          tilt: data.tilt.toString(),
          system_losses: data.system_losses.toString(),
          annual_degradation: data.annual_degradation.toString()
        });
      } else {
        // Reset to defaults if no existing data
        setExistingDataId(null);
        setFormData({
          system_size_kwp: '',
          panel_type: '',
          orientation: '',
          tilt: '',
          system_losses: '14',
          annual_degradation: '2.5'
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
      if (!formData.system_size_kwp || !formData.panel_type || !formData.orientation || !formData.tilt) {
        throw new Error('Please fill in all required fields');
      }

      // Validate tilt range (0-45 degrees)
      const tilt = parseFloat(formData.tilt);
      if (tilt < 0 || tilt > 45) {
        throw new Error('Tilt must be between 0 and 45 degrees');
      }

      // Validate orientation
      const validOrientations = ['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW'];
      if (!validOrientations.includes(formData.orientation)) {
        throw new Error('Orientation must be one of: N, E, S, W, NE, SE, SW, NW');
      }

      const generationData: Omit<GenerationData, 'id' | 'created_at' | 'updated_at'> = {
        project_id: projectId,
        system_size_kwp: parseFloat(formData.system_size_kwp),
        panel_type: formData.panel_type as 'monocrystalline' | 'polycrystalline' | 'thin-film',
        orientation: formData.orientation as 'N' | 'E' | 'S' | 'W' | 'NE' | 'SE' | 'SW' | 'NW',
        tilt: tilt,
        system_losses: parseFloat(formData.system_losses),
        annual_degradation: parseFloat(formData.annual_degradation)
      };

      let result;
      
      if (existingDataId) {
        // Update existing record
        result = await supabase
          .from('generation_data')
          .update(generationData)
          .eq('id', existingDataId)
          .select();
      } else {
        // Insert new record
        result = await supabase
          .from('generation_data')
          .insert(generationData)
          .select();
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // If this was a new insert, set the ID for future updates
      if (!existingDataId && result.data?.[0]) {
        setExistingDataId(result.data[0].id);
      }

      console.log('Generation data saved successfully:', generationData);
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
        .from('generation_data')
        .delete()
        .eq('id', existingDataId);

      if (error) {
        throw new Error(error.message);
      }

      setExistingDataId(null);
      setFormData({
        system_size_kwp: '',
        panel_type: '',
        orientation: '',
        tilt: '',
        system_losses: '14',
        annual_degradation: '2.5'
      });

      console.log('Generation infrastructure removed successfully');
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
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Sun className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Generation Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Solar PV Installation Settings
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
            {/* System Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Size (kWp) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                disabled={isLoadingData}
                value={formData.system_size_kwp}
                onChange={(e) => handleInputChange('system_size_kwp', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., 5.0"
              />
            </div>

            {/* Panel Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Panel Type *
              </label>
              <select
                required
                disabled={isLoadingData}
                value={formData.panel_type}
                onChange={(e) => handleInputChange('panel_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="">Select panel type</option>
                <option value="monocrystalline">Monocrystalline</option>
                <option value="polycrystalline">Polycrystalline</option>
                <option value="thin-film">Thin-film</option>
              </select>
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Orientation *
              </label>
              <select
                required
                disabled={isLoadingData}
                value={formData.orientation}
                onChange={(e) => handleInputChange('orientation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="">Select orientation</option>
                <option value="N">North (N)</option>
                <option value="NE">Northeast (NE)</option>
                <option value="E">East (E)</option>
                <option value="SE">Southeast (SE)</option>
                <option value="S">South (S)</option>
                <option value="SW">Southwest (SW)</option>
                <option value="W">West (W)</option>
                <option value="NW">Northwest (NW)</option>
              </select>
            </div>

            {/* Tilt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tilt (degrees) *
              </label>
              <input
                type="number"
                min="0"
                max="45"
                required
                disabled={isLoadingData}
                value={formData.tilt}
                onChange={(e) => handleInputChange('tilt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="0-45 degrees"
              />
            </div>

            {/* System Losses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Losses (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                disabled={isLoadingData}
                value={formData.system_losses}
                onChange={(e) => handleInputChange('system_losses', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="Default: 14%"
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