'use client';

import { useState, useEffect } from 'react';
import { Zap, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ChargingHubData } from '@/types/database';
import ChargingHubModal from './ChargingHubModal';

interface ChargingHubTileProps {
  projectId: string;
  hubId?: string; // Optional for new hubs
  onHubAdded?: (hubId: string) => void;
  onHubRemoved?: (hubId: string) => void;
}

export default function ChargingHubTile({ 
  projectId, 
  hubId, 
  onHubAdded, 
  onHubRemoved 
}: ChargingHubTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chargingHubData, setChargingHubData] = useState<ChargingHubData | null>(null);
  const [assignedProfile, setAssignedProfile] = useState<{id: string, profile_name: string} | null>(null);
  const [assignedSalesTariff, setAssignedSalesTariff] = useState<{id: string, tariff_name: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load charging hub data
  useEffect(() => {
    if (hubId) {
      loadChargingHubData();
    } else {
      // This is a new hub tile, no data to load
      setIsLoading(false);
    }
  }, [projectId, hubId]);

  const loadChargingHubData = async () => {
    if (!hubId) return;
    
    setIsLoading(true);
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

      setChargingHubData(data || null);

      // Load assigned charging profile if one is assigned
      if (data?.charging_profile_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('charging_profiles')
          .select('id, profile_name')
          .eq('id', data.charging_profile_id)
          .single();
        if (!profileError && profileData) {
          setAssignedProfile(profileData);
        }
      } else {
        setAssignedProfile(null);
      }
      // Load assigned sales tariff if one is assigned
      if (data?.sales_tariff_id) {
        const { data: tariffData, error: tariffError } = await supabase
          .from('sales_tariffs_data')
          .select('id, tariff_name')
          .eq('id', data.sales_tariff_id)
          .single();
        if (!tariffError && tariffData) {
          setAssignedSalesTariff(tariffData);
        }
      } else {
        setAssignedSalesTariff(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load charging hub data');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data when modal closes
  const handleModalClose = (newHubId?: string) => {
    setIsModalOpen(false);
    if (newHubId && !hubId) {
      // This was a new hub that was created
      onHubAdded?.(newHubId);
    } else if (hubId) {
      // This was an existing hub that was updated
      loadChargingHubData();
    }
  };

  const handleHubRemoved = () => {
    if (hubId) {
      onHubRemoved?.(hubId);
    }
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
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {hubId ? (chargingHubData?.hub_name || 'Charging Hub') : 'Add Charging Hub'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {hubId ? 'EV Charging Infrastructure' : 'Configure new charging hub'}
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
            {chargingHubData ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Charger Power:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(chargingHubData.charger_power, ' kW')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Number of Chargers:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(chargingHubData.number_of_chargers)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Priority:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatValue(chargingHubData.priority)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Charging Profile:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {assignedProfile ? assignedProfile.profile_name : 'None assigned'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Sales Tariff:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {assignedSalesTariff ? assignedSalesTariff.tariff_name : 'None assigned'}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {hubId ? 'No charging hub data' : 'Click to add new charging hub'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ChargingHubModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        projectId={projectId}
        hubId={hubId}
        onHubRemoved={handleHubRemoved}
      />
    </>
  );
} 