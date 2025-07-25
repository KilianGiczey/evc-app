'use client';

import { useState, useEffect } from 'react';
import { Sun, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { GenerationData } from '@/types/database';
import GenerationModal from './GenerationModal';

interface GenerationTileProps {
  projectId: string;
}

export default function GenerationTile({ projectId }: GenerationTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generationData, setGenerationData] = useState<GenerationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load generation data
  useEffect(() => {
    loadGenerationData();
  }, [projectId]);

  const loadGenerationData = async () => {
    setIsLoading(true);
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

      setGenerationData(data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load generation data');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data when modal closes
  const handleModalClose = () => {
    setIsModalOpen(false);
    loadGenerationData(); // Reload data to show any updates
  };

  const formatValue = (value: any, unit?: string) => {
    if (value === null || value === undefined || value === '') {
      return 'Not configured';
    }
    return unit ? `${value}${unit}` : value;
  };

  const getPanelTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'monocrystalline': 'Monocrystalline',
      'polycrystalline': 'Polycrystalline',
      'thin-film': 'Thin-film'
    };
    return typeMap[type] || type;
  };

  return (
    <>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Sun className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Generation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Solar PV Installation
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
            {generationData ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">System Size:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(generationData.system_size_kwp, ' kWp')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Panel Type:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getPanelTypeDisplay(generationData.panel_type)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Orientation:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(generationData.orientation)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Tilt:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(generationData.tilt, '°')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">System Losses:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(generationData.system_losses, '%')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Annual Degradation:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(generationData.annual_degradation, '%')}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No generating infrastructure
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <GenerationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        projectId={projectId}
      />
    </>
  );
} 