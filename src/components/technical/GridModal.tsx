'use client';

import { useState, useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { GridData } from '@/types/database';

interface GridModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function GridModal({ isOpen, onClose, projectId }: GridModalProps) {
  const [formData, setFormData] = useState({
    max_import_kw: '',
    max_export_kw: ''
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
        .from('grid_data')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw new Error(fetchError.message);
      }

      if (data) {
        setExistingDataId(data.id);
        setFormData({
          max_import_kw: data.max_import_kw.toString(),
          max_export_kw: data.max_export_kw.toString()
        });
      } else {
        // Reset to defaults if no existing data
        setExistingDataId(null);
        setFormData({
          max_import_kw: '',
          max_export_kw: ''
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
      if (!formData.max_import_kw || !formData.max_export_kw) {
        throw new Error('Please fill in all required fields');
      }

      // Validate values are positive
      const maxImport = parseFloat(formData.max_import_kw);
      const maxExport = parseFloat(formData.max_export_kw);
      
      if (maxImport <= 0) {
        throw new Error('Max Import Power must be greater than 0');
      }
      
      if (maxExport <= 0) {
        throw new Error('Max Export Power must be greater than 0');
      }

      const gridData: Omit<GridData, 'id' | 'created_at' | 'updated_at'> = {
        project_id: projectId,
        max_import_kw: maxImport,
        max_export_kw: maxExport
      };

      let result;
      
      if (existingDataId) {
        // Update existing record
        result = await supabase
          .from('grid_data')
          .update(gridData)
          .eq('id', existingDataId)
          .select();
      } else {
        // Insert new record
        result = await supabase
          .from('grid_data')
          .insert(gridData)
          .select();
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // If this was a new insert, set the ID for future updates
      if (!existingDataId && result.data?.[0]) {
        setExistingDataId(result.data[0].id);
      }

      console.log('Grid data saved successfully:', gridData);
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
        .from('grid_data')
        .delete()
        .eq('id', existingDataId);

      if (error) {
        throw new Error(error.message);
      }

      setExistingDataId(null);
      setFormData({
        max_import_kw: '',
        max_export_kw: ''
      });

      console.log('Grid infrastructure removed successfully');
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
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Grid Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Grid Connection Settings
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
            {/* Max Import Power */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Import Power (kW) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                disabled={isLoadingData}
                value={formData.max_import_kw}
                onChange={(e) => handleInputChange('max_import_kw', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., 7.0"
              />
            </div>

            {/* Max Export Power */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Export Power (kW) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                disabled={isLoadingData}
                value={formData.max_export_kw}
                onChange={(e) => handleInputChange('max_export_kw', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                placeholder="e.g., 3.68"
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