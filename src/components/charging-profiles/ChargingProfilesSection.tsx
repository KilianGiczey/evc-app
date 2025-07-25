'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ChargingProfileData } from '@/types/database';
import ChargingProfileTile from './ChargingProfileTile';
import ChargingProfileModal from './ChargingProfileModal';

interface ChargingProfilesSectionProps {
  projectId: string;
}

export default function ChargingProfilesSection({ projectId }: ChargingProfilesSectionProps) {
  const [chargingProfiles, setChargingProfiles] = useState<ChargingProfileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load charging profiles for this project
  useEffect(() => {
    loadChargingProfiles();
  }, [projectId]);

  const loadChargingProfiles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('charging_profiles')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setChargingProfiles(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load charging profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileAdded = (newProfileId?: string) => {
    // Reload all profiles to get the updated list
    loadChargingProfiles();
    setIsAddModalOpen(false);
  };

  const handleProfileRemoved = (removedProfileId: string) => {
    // Remove the profile from the local state
    setChargingProfiles(prev => prev.filter(profile => profile.id !== removedProfileId));
  };

  const handleAddProfile = () => {
    setIsAddModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button 
          onClick={handleAddProfile}
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Profile</span>
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
          {/* Existing charging profiles */}
          {chargingProfiles.map((profile) => (
            <ChargingProfileTile
              key={profile.id}
              projectId={projectId}
              profileId={profile.id}
              onProfileAdded={handleProfileAdded}
              onProfileRemoved={handleProfileRemoved}
            />
          ))}
          
          {/* Add Profile Tile */}
          <ChargingProfileTile
            projectId={projectId}
            onProfileAdded={handleProfileAdded}
            onProfileRemoved={handleProfileRemoved}
          />
        </div>
      )}

      {/* Add Profile Modal */}
      <ChargingProfileModal
        isOpen={isAddModalOpen}
        onClose={handleProfileAdded}
        projectId={projectId}
      />
    </div>
  );
} 