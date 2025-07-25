import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import CostTile from './CostTile';
import CostModal from './CostModal';
import { getCostsByType } from './costsUtils';

interface OperatingCostsSectionProps {
  projectId: string;
}

export default function OperatingCostsSection({ projectId }: OperatingCostsSectionProps) {
  const [costs, setCosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadCosts();
  }, [projectId]);

  const loadCosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCostsByType(projectId, 'Opex');
      setCosts(data || []);
    } catch (err) {
      setError('Failed to load operating costs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCostAdded = () => {
    loadCosts();
    setIsAddModalOpen(false);
  };

  const handleCostRemoved = (removedCostId: string) => {
    loadCosts();
  };

  const handleAddCost = () => {
    setIsAddModalOpen(true);
  };

  return (
    <div className="pt-2 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white">Operating Costs</h4>
        <button
          onClick={handleAddCost}
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Operating Cost</span>
        </button>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {costs.map((cost) => (
            <CostTile
              key={cost.id}
              projectId={projectId}
              costId={cost.id}
              onCostAdded={handleCostAdded}
              onCostRemoved={handleCostRemoved}
            />
          ))}
          <CostTile
            projectId={projectId}
            onCostAdded={handleCostAdded}
            onCostRemoved={handleCostRemoved}
            type="Opex"
          >
            Add Operating Cost
          </CostTile>
        </div>
      )}
      <CostModal
        isOpen={isAddModalOpen}
        onClose={handleCostAdded}
        projectId={projectId}
        type="Opex"
      />
    </div>
  );
} 