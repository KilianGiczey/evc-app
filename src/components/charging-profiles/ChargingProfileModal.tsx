'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ChargingProfileData } from '@/types/database';
import BehaviourSection from './BehaviourSection';
import GrowthSection from './GrowthSection';

interface ChargingProfileModalProps {
  isOpen: boolean;
  onClose: (newProfileId?: string) => void;
  projectId: string;
  profileId?: string;
  onProfileRemoved?: () => void;
}

export default function ChargingProfileModal({ 
  isOpen, 
  onClose, 
  projectId, 
  profileId, 
  onProfileRemoved 
}: ChargingProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingDataId, setExistingDataId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    profile_name: '',
    initial_number_of_vehicles: '',
    average_charging_percentage: '',
    average_battery_size: ''
  });
  
  // Refs for save functions
  const saveBehaviourRef = useRef<(() => Promise<void>) | null>(null);
  const saveGrowthRef = useRef<(() => Promise<void>) | null>(null);

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      if (profileId) {
        loadExistingData();
      } else {
        // Reset for new profile
        setExistingDataId(null);
      }
    }
  }, [isOpen, projectId, profileId]);

  const loadExistingData = async () => {
    if (!profileId) return;
    
    setIsLoadingData(true);
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

      if (data) {
        setExistingDataId(data.id);
        setFormData({
          profile_name: data.profile_name,
          initial_number_of_vehicles: data.initial_number_of_vehicles.toString(),
          average_charging_percentage: data.average_charging_percentage.toString(),
          average_battery_size: data.average_battery_size.toString()
        });
      } else {
        // Reset to defaults if no existing data
        setExistingDataId(null);
        setFormData({
          profile_name: '',
          initial_number_of_vehicles: '',
          average_charging_percentage: '',
          average_battery_size: ''
        });
      }
    } catch (err) {
      console.error('Failed to load existing data:', err);
      setError('Failed to load existing data');
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
      if (!formData.profile_name || !formData.initial_number_of_vehicles || !formData.average_charging_percentage || !formData.average_battery_size) {
        throw new Error('Please fill in all required fields');
      }

      // Validate numeric fields
      const initialVehicles = parseInt(formData.initial_number_of_vehicles);
      const chargingPercentage = parseFloat(formData.average_charging_percentage);
      const batterySize = parseFloat(formData.average_battery_size);

      if (isNaN(initialVehicles) || initialVehicles <= 0) {
        throw new Error('Initial number of vehicles must be a positive integer');
      }

      if (isNaN(chargingPercentage) || chargingPercentage < 0 || chargingPercentage > 100) {
        throw new Error('Average charging percentage must be between 0 and 100');
      }

      if (isNaN(batterySize) || batterySize <= 0) {
        throw new Error('Average battery size must be a positive number');
      }

      const chargingProfileData: Omit<ChargingProfileData, 'id' | 'created_at' | 'updated_at'> = {
        project_id: projectId,
        profile_name: formData.profile_name,
        initial_number_of_vehicles: initialVehicles,
        average_charging_percentage: chargingPercentage,
        average_battery_size: batterySize
      };

      let result;
      
      if (existingDataId) {
        // Update existing record
        result = await supabase
          .from('charging_profiles')
          .update(chargingProfileData)
          .eq('id', existingDataId)
          .select();
      } else {
        // Insert new record
        result = await supabase
          .from('charging_profiles')
          .insert(chargingProfileData)
          .select();
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Save behaviour and growth data if we have a profile ID
      const profileIdToUse = existingDataId || result.data?.[0]?.id;
      if (profileIdToUse) {
        // Save behaviour data
        if (saveBehaviourRef.current) {
          await saveBehaviourRef.current();
        }
        
        // Save growth data
        if (saveGrowthRef.current) {
          await saveGrowthRef.current();
        }
      }

      // If this was a new insert, set the ID for future updates
      if (!existingDataId && result.data?.[0]) {
        setExistingDataId(result.data[0].id);
        onClose(result.data[0].id);
      } else {
        onClose();
      }

      console.log('Charging profile data saved successfully:', chargingProfileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveProfile = async () => {
    if (!existingDataId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('charging_profiles')
        .delete()
        .eq('id', existingDataId);

      if (error) {
        throw new Error(error.message);
      }

      setExistingDataId(null);
      setFormData({
        profile_name: '',
        initial_number_of_vehicles: '',
        average_charging_percentage: '',
        average_battery_size: ''
      });

      console.log('Charging profile removed successfully');
      onProfileRemoved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while removing profile');
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

  // Calculate total kWh for initial year
  const calculateTotalKWh = () => {
    const vehicles = parseInt(formData.initial_number_of_vehicles) || 0;
    const rechargePercent = parseFloat(formData.average_charging_percentage) || 0;
    const batterySize = parseFloat(formData.average_battery_size) || 0;
    
    // Convert percentage to decimal (e.g., 25.5% -> 0.255)
    const rechargeDecimal = rechargePercent / 100;
    
    // Calculate: vehicles * recharge % * battery size
    const totalKWh = vehicles * rechargeDecimal * batterySize;
    
    return isNaN(totalKWh) ? 0 : totalKWh;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {profileId ? 'Edit Charging Profile' : 'Add Charging Profile'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                EV Charging Behavior Configuration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
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
          {/* Profile Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Profile Name
            </label>
            <input
              type="text"
              required
              disabled={isLoadingData}
              value={formData.profile_name}
              onChange={(e) => handleInputChange('profile_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              placeholder="e.g. Private Vechicle ChargingProfile"
            />
          </div>

          {/* Traffic Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Traffic
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Initial Number of Vehicles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Initial Number of Vehicles per Annum
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={isLoadingData}
                  value={formData.initial_number_of_vehicles}
                  onChange={(e) => handleInputChange('initial_number_of_vehicles', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  placeholder="e.g. 50"
                />
              </div>

              {/* Average Charging Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Average Battery Recharge (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  disabled={isLoadingData}
                  value={formData.average_charging_percentage}
                  onChange={(e) => handleInputChange('average_charging_percentage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  placeholder="e.g. 25.5"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Percentage of battery capacity
                </p>
              </div>

              {/* Average Battery Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Average Battery Size (kWh)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  disabled={isLoadingData}
                  value={formData.average_battery_size}
                  onChange={(e) => handleInputChange('average_battery_size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  placeholder="e.g. 75.0"
                />
              </div>
            </div>

            {/* Total kWh Calculation */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Year 1 Maximum Potential Demand
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Vehicles × Recharge % × Battery Size
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {calculateTotalKWh().toLocaleString(undefined, { 
                      minimumFractionDigits: 0, 
                      maximumFractionDigits: 1 
                    })}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    kWh
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Behaviour Section */}
          <BehaviourSection
            chargingProfileId={existingDataId || undefined}
            totalAnnualKWh={calculateTotalKWh()}
            onSaveBehaviour={(saveFn: () => Promise<void>) => {
              saveBehaviourRef.current = saveFn;
            }}
          />

          {/* Growth Section */}
          <GrowthSection
            chargingProfileId={existingDataId || undefined}
            onSaveGrowth={(saveFn: () => Promise<void>) => {
              saveGrowthRef.current = saveFn;
            }}
          />

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-3">
              {existingDataId && (
                <button
                  type="button"
                  onClick={handleRemoveProfile}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  <span>Remove Profile</span>
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => onClose()}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : (existingDataId ? 'Update Profile' : 'Add Profile')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 