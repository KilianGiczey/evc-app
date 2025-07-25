'use client';

import { useState, useEffect } from 'react';
import { Battery, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { StorageData } from '@/types/database';
import StorageModal from './StorageModal';

interface StorageTileProps {
  projectId: string;
}

export default function StorageTile({ projectId }: StorageTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load storage data
  useEffect(() => {
    loadStorageData();
  }, [projectId]);

  const loadStorageData = async () => {
    setIsLoading(true);
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

      setStorageData(data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage data');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data when modal closes
  const handleModalClose = () => {
    setIsModalOpen(false);
    loadStorageData(); // Reload data to show any updates
  };

  const formatValue = (value: any, unit?: string) => {
    if (value === null || value === undefined || value === '') {
      return 'Not configured';
    }
    return unit ? `${value}${unit}` : value;
  };



  return (
    <>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Battery className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Storage
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Battery System
              </p>
            </div>
          </div>
          <div className="p-2 text-gray-400">
            <Settings className="h-5 w-5" />
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-2">
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        ) : error ? (
          <div className="space-y-2">
            <div className="text-sm text-red-600 dark:text-red-400">
              Error loading data: {error}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {storageData ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Capacity:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(storageData.capacity_kwh, ' kWh')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Power:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(storageData.power_kw, ' kW')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Chemistry:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(storageData.battery_chemistry)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Depth of Discharge:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(storageData.depth_of_discharge, '%')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Round-trip Efficiency:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(storageData.round_trip_efficiency, '%')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Annual Degradation:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(storageData.annual_degradation, '%')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Discharge Behaviour:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(storageData.discharge_behaviour)}
                  </span>
                </div>
                {storageData.discharge_behaviour === 'Set Discharge Time' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Discharge Time:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatValue(storageData.discharge_time, ':00')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No storage infrastructure
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <StorageModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        projectId={projectId}
      />
    </>
  );
} 