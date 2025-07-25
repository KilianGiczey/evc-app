'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ChargingHubData } from '@/types/database';
import ChargingHubTile from './ChargingHubTile';
import ChargingHubModal from './ChargingHubModal';

interface ChargingHubsSectionProps {
  projectId: string;
}

export default function ChargingHubsSection({ projectId }: ChargingHubsSectionProps) {
  const [chargingHubs, setChargingHubs] = useState<ChargingHubData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load charging hubs for this project
  useEffect(() => {
    loadChargingHubs();
  }, [projectId]);

  const loadChargingHubs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('charging_hubs')
        .select('*')
        .eq('project_id', projectId)
        .order('priority', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setChargingHubs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load charging hubs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHubAdded = (newHubId?: string) => {
    // Reload all hubs to get the updated list
    loadChargingHubs();
    setIsAddModalOpen(false);
  };

  const handleHubRemoved = (removedHubId: string) => {
    // Remove the hub from the local state
    setChargingHubs(prev => prev.filter(hub => hub.id !== removedHubId));
  };

  const handleAddHub = () => {
    setIsAddModalOpen(true);
  };

  return (
    <div className="pt-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Charging Hubs
        </h3>
        <button 
          onClick={handleAddHub}
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Hub</span>
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
          {/* Existing charging hubs */}
          {chargingHubs.map((hub) => (
            <ChargingHubTile
              key={hub.id}
              projectId={projectId}
              hubId={hub.id}
              onHubAdded={handleHubAdded}
              onHubRemoved={handleHubRemoved}
            />
          ))}
          
          {/* Add Hub Tile */}
          <ChargingHubTile
            projectId={projectId}
            onHubAdded={handleHubAdded}
            onHubRemoved={handleHubRemoved}
          />
        </div>
      )}

      {/* Add Hub Modal */}
      <ChargingHubModal
        isOpen={isAddModalOpen}
        onClose={handleHubAdded}
        projectId={projectId}
      />
    </div>
  );
} 