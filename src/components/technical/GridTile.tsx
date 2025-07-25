'use client';

import { useState, useEffect } from 'react';
import { Zap, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { GridData } from '@/types/database';
import GridModal from './GridModal';

interface GridTileProps {
  projectId: string;
}

export default function GridTile({ projectId }: GridTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load grid data
  useEffect(() => {
    loadGridData();
  }, [projectId]);

  const loadGridData = async () => {
    setIsLoading(true);
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

      setGridData(data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grid data');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data when modal closes
  const handleModalClose = () => {
    setIsModalOpen(false);
    loadGridData(); // Reload data to show any updates
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
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Grid
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Grid Connection
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
            {gridData ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Max Import:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(gridData.max_import_kw, ' kW')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Max Export:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(gridData.max_export_kw, ' kW')}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No grid connection
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <GridModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        projectId={projectId}
      />
    </>
  );
} 