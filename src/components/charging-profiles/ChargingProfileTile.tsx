'use client';

import { useState, useEffect } from 'react';
import { Users, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ChargingProfileData } from '@/types/database';
import ChargingProfileModal from './ChargingProfileModal';

interface ChargingProfileTileProps {
  projectId: string;
  profileId?: string; // Optional for new profiles
  onProfileAdded?: (profileId: string) => void;
  onProfileRemoved?: (profileId: string) => void;
}

export default function ChargingProfileTile({ 
  projectId, 
  profileId, 
  onProfileAdded, 
  onProfileRemoved 
}: ChargingProfileTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chargingProfileData, setChargingProfileData] = useState<ChargingProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load charging profile data
  useEffect(() => {
    if (profileId) {
      loadChargingProfileData();
    } else {
      // This is a new profile tile, no data to load
      setIsLoading(false);
    }
  }, [projectId, profileId]);

  const loadChargingProfileData = async () => {
    if (!profileId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('charging_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw new Error(fetchError.message);
      }

      setChargingProfileData(data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load charging profile data');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data when modal closes
  const handleModalClose = (newProfileId?: string) => {
    setIsModalOpen(false);
    if (newProfileId && !profileId) {
      // This was a new profile that was created
      onProfileAdded?.(newProfileId);
    } else if (profileId) {
      // This was an existing profile that was updated
      loadChargingProfileData();
    }
  };

  const handleProfileRemoved = () => {
    if (profileId) {
      onProfileRemoved?.(profileId);
    }
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
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {profileId ? 'Charging Profile' : 'Add Charging Profile'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {profileId ? 'EV Charging Behavior' : 'Configure new charging profile'}
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
            {chargingProfileData ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Profile Name:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {chargingProfileData.profile_name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Initial Vehicles:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {chargingProfileData.initial_number_of_vehicles}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Avg Charging %:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {chargingProfileData.average_charging_percentage}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Avg Battery:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {chargingProfileData.average_battery_size} kWh
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {profileId ? 'No charging profile data' : 'Click to add new charging profile'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ChargingProfileModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        projectId={projectId}
        profileId={profileId}
        onProfileRemoved={handleProfileRemoved}
      />
    </>
  );
} 