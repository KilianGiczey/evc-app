import React, { useState, useEffect } from 'react';
import { Euro, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import CostModal from './CostModal';

interface CostTileProps {
  projectId: string;
  costId?: string;
  type?: 'Capex' | 'Opex';
  onCostAdded?: (costId?: string) => void;
  onCostRemoved?: (costId: string) => void;
  children?: React.ReactNode;
}

export default function CostTile({ projectId, costId, type, onCostAdded, onCostRemoved, children }: CostTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [costData, setCostData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (costId) {
      loadCostData();
    } else {
      setIsLoading(false);
    }
  }, [projectId, costId]);

  const loadCostData = async () => {
    if (!costId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('costs_data')
        .select('*')
        .eq('id', costId)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(fetchError.message);
      }
      setCostData(data || null);
    } catch (err) {
      setError('Failed to load cost data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = (newCostId?: string) => {
    setIsModalOpen(false);
    if (newCostId && !costId) {
      onCostAdded?.(newCostId);
    } else if (costId) {
      loadCostData();
    }
  };

  const handleRemove = () => {
    if (costId) {
      onCostRemoved?.(costId);
    }
  };

  // Hide tile if costId is present but costData is null (deleted or not found)
  if (costId && !isLoading && !costData) {
    return null;
  }
  return (
    <>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Euro className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {costId ? (costData?.cost_name || 'Cost') : (children ? children : 'Add Cost')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {costId ? (costData?.cost_type === 'Capex' ? 'Capital Cost' : 'Operating Cost') : 'Configure new cost'}
              </p>
            </div>
          </div>
          <div className="p-2 text-gray-400">
            <Settings className="h-5 w-5" />
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">{error}</div>
        ) : costId ? (
          <>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-300">Type:</span>
              <span className="font-medium text-gray-900 dark:text-white">{costData?.cost_type}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-300">Subtype:</span>
              <span className="font-medium text-gray-900 dark:text-white">{costData?.cost_subtype}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-300">Cost {(() => {
                if (costData?.cost_subtype?.includes('€/kWh')) return '(€/kWh)';
                if (costData?.cost_subtype?.includes('€/kW')) return '(€/kW)';
                if (costData?.cost_subtype?.includes('€ / #')) return '(€ / #)';
                return '(€)';
              })()}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{costData?.cost}</span>
            </div>
            {costData?.cost_type === 'Opex' && (
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-600 dark:text-blue-400 font-medium">Recurring annual cost</span>
              </div>
            )}
            {costData?.cost_type === 'Opex' && (
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-300">Escalation:</span>
                <span className="font-medium text-gray-900 dark:text-white">{typeof costData.cost_escalation === 'number' ? costData.cost_escalation : 0}% / year</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Click to add new cost
            </p>
          </div>
        )}
      </div>
      <CostModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        projectId={projectId}
        costId={costId}
        type={type}
      />
    </>
  );
} 