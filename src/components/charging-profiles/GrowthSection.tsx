'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import InteractiveChart from './InteractiveChart';

interface GrowthSectionProps {
  chargingProfileId?: string;
  onGrowthChange?: (growthData: {
    annual_growth_rates: number[];
  }) => void;
  onSaveGrowth?: (saveFn: () => Promise<void>) => void;
}

export default function GrowthSection({ 
  chargingProfileId, 
  onGrowthChange,
  onSaveGrowth
}: GrowthSectionProps) {
  const [growthData, setGrowthData] = useState<number[]>(Array(30).fill(0));
  const [isLoading, setIsLoading] = useState(false);
  const [growthType, setGrowthType] = useState<'custom' | 'linear' | 'exponential' | 's-curve'>('linear');
  const [linearRate, setLinearRate] = useState<number>(2.5);
  const [exponentialRate, setExponentialRate] = useState<number>(18);
  const [sCurveMaxGrowth, setSCurveMaxGrowth] = useState<number>(100);
  const [sCurveMidpoint, setSCurveMidpoint] = useState<number>(10);

  // Calculate linear growth
  const calculateLinearGrowth = useCallback((rate: number) => {
    return Array.from({ length: 30 }, (_, index) => {
      if (index === 0) return 0; // Year 1 is baseline (0% growth)
      return (index * rate); // rate% increase per year
    });
  }, []);

  // Calculate exponential growth
  const calculateExponentialGrowth = useCallback((rate: number) => {
    return Array.from({ length: 30 }, (_, index) => {
      if (index === 0) return 0; // Year 1 is baseline (0% growth)
      return Math.pow(1 + rate / 100, index) - 1; // Compound growth
    });
  }, []);

  // Calculate S-curve growth (logistic function)
  const calculateSCurveGrowth = useCallback((maxGrowth: number, midpoint: number) => {
    return Array.from({ length: 30 }, (_, index) => {
      if (index === 0) return 0; // Year 1 is baseline (0% growth)
      const year = index + 1;
      // Logistic function: L / (1 + e^(-k(x - x0)))
      // where L = maxGrowth, k = steepness, x0 = midpoint
      const steepness = 0.3; // Controls how steep the curve is
      return maxGrowth / (1 + Math.exp(-steepness * (year - midpoint)));
    });
  }, []);

  // Calculate default linear growth (0%, 2.5%, 5%, etc.)
  const calculateDefaultGrowthData = useCallback(() => {
    return calculateLinearGrowth(2.5);
  }, [calculateLinearGrowth]);

  // Save growth data to database
  const saveGrowthData = useCallback(async (data: {
    annual_growth_rates: number[];
  }) => {
    if (!chargingProfileId) return;
    
    try {
      // First, check if a record exists
      const { data: existingData, error: fetchError } = await supabase
        .from('charging_profile_behaviour')
        .select('*')
        .eq('charging_profile_id', chargingProfileId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const growthDataToSave = {
        charging_profile_id: chargingProfileId,
        annual_growth_rates: JSON.stringify(data.annual_growth_rates)
      };

      let result;
      if (existingData) {
        // Update existing record
        result = await supabase
          .from('charging_profile_behaviour')
          .update(growthDataToSave)
          .eq('charging_profile_id', chargingProfileId);
      } else {
        // Insert new record with default values for other fields
        result = await supabase
          .from('charging_profile_behaviour')
          .insert({
            ...growthDataToSave,
            weekday_hourly_data: JSON.stringify(Array(24).fill(0)),
            weekend_hourly_data: JSON.stringify(Array(24).fill(0)),
            monthly_data: JSON.stringify(Array(12).fill(0)),
            weekday_weekend_scale: 0,
            selected_profile: 'default'
          });
      }

      if (result.error) {
        console.error('Failed to save growth data:', result.error);
        throw result.error;
      }
    } catch (err) {
      console.error('Error saving growth data:', err);
      throw err;
    }
  }, [chargingProfileId]);

  // Load data from database or create defaults
  const loadGrowthData = useCallback(async () => {
    if (!chargingProfileId) return;
    
    try {
      const { data, error } = await supabase
        .from('charging_profile_behaviour')
        .select('annual_growth_rates')
        .eq('charging_profile_id', chargingProfileId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.annual_growth_rates) {
        // Data exists - load it
        setGrowthData(JSON.parse(data.annual_growth_rates));
      } else {
        // No data exists - create defaults and save
        const defaultGrowth = calculateDefaultGrowthData();
        
        const defaultData = {
          annual_growth_rates: defaultGrowth
        };
        
        await saveGrowthData(defaultData);
        
        // Load the saved data
        setGrowthData(defaultGrowth);
      }
    } catch (err) {
      console.error('Failed to load growth data:', err);
      // Use defaults on error
      setGrowthData(calculateDefaultGrowthData());
    }
  }, [chargingProfileId]); // Simplified dependencies to prevent re-creation

  // Initialize data when component mounts - only load once
  useEffect(() => {
    if (chargingProfileId) {
      loadGrowthData();
    } else {
      // For new profiles, just set defaults (no save needed yet)
      setGrowthData(calculateDefaultGrowthData());
    }
  }, [chargingProfileId]); // Removed dependencies that cause re-loading

  // Data change handler
  const handleGrowthChange = (newData: number[]) => {
    setGrowthData(newData);
    setGrowthType('custom'); // Mark as custom when user manually changes data
    onGrowthChange?.({ annual_growth_rates: newData });
    // Removed automatic save - will be saved on modal submission
  };

  // Apply growth profile
  const applyGrowthProfile = (type: 'linear' | 'exponential' | 's-curve') => {
    setGrowthType(type);
    let newGrowthData: number[];
    
    switch (type) {
      case 'linear':
        newGrowthData = calculateLinearGrowth(linearRate);
        break;
      case 'exponential':
        newGrowthData = calculateExponentialGrowth(exponentialRate);
        break;
      case 's-curve':
        newGrowthData = calculateSCurveGrowth(sCurveMaxGrowth, sCurveMidpoint);
        break;
      default:
        newGrowthData = calculateLinearGrowth(2.5);
    }
    
    setGrowthData(newGrowthData);
    onGrowthChange?.({ annual_growth_rates: newGrowthData });
    // Removed automatic save - will be saved on modal submission
  };

  // Reset to zero growth
  const resetToZero = () => {
    const zeroGrowth = Array(30).fill(0);
    setGrowthData(zeroGrowth);
    setGrowthType('custom');
    onGrowthChange?.({ annual_growth_rates: zeroGrowth });
    // Removed automatic save - will be saved on modal submission
  };

  // Function to save current growth data - can be called from parent
  const saveCurrentGrowthData = useCallback(async () => {
    if (!chargingProfileId) return;
    
    try {
      await saveGrowthData({ annual_growth_rates: growthData });
    } catch (err) {
      console.error('Failed to save growth data:', err);
      throw err;
    }
  }, [chargingProfileId, growthData, saveGrowthData]);

  // Expose save function to parent via callback
  useEffect(() => {
    if (onSaveGrowth) {
      onSaveGrowth(saveCurrentGrowthData);
    }
  }, [onSaveGrowth, saveCurrentGrowthData]);



  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
          <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Cumulative Demand Growth
        </h3>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Configure cumulative demand growth over 30 years. Values represent percentage increase compared to Year 1 baseline.
          Drag the chart points to adjust growth rates or use predefined profiles below.
        </p>
      </div>

      {/* Growth Profile Options */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Linear Growth */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Linear Growth
              </label>
              <button
                type="button"
                onClick={() => applyGrowthProfile('linear')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  growthType === 'linear'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                }`}
              >
                Apply
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={linearRate}
                onChange={(e) => setLinearRate(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                step="0.1"
                min="0"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">% p.a.</span>
            </div>
          </div>

          {/* Exponential Growth */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Exponential Growth
              </label>
              <button
                type="button"
                onClick={() => applyGrowthProfile('exponential')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  growthType === 'exponential'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                }`}
              >
                Apply
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={exponentialRate}
                onChange={(e) => setExponentialRate(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                step="0.1"
                min="0"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">% p.a.</span>
            </div>
          </div>

          {/* S-Curve Growth */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                S-Curve Growth
              </label>
              <button
                type="button"
                onClick={() => applyGrowthProfile('s-curve')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  growthType === 's-curve'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800'
                }`}
              >
                Apply
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={sCurveMaxGrowth}
                  onChange={(e) => setSCurveMaxGrowth(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  step="0.1"
                  min="0"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">Max %</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={sCurveMidpoint}
                  onChange={(e) => setSCurveMidpoint(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  step="1"
                  min="1"
                  max="30"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">Mid Year</span>
              </div>
            </div>
          </div>

          {/* Zero Growth */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Zero Growth
              </label>
              <button
                type="button"
                onClick={resetToZero}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Apply
              </button>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              No growth over time
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Chart */}
      <div className="mb-6">
        <InteractiveChart
          data={growthData}
          title="Cumulative Demand Growth"
          xAxisLabel="Year"
          yAxisLabel="Cumulative Growth (%)"
          onDataChange={handleGrowthChange}
          minValue={0}
          step={0.1}
        />
      </div>
    </div>
  );
} 