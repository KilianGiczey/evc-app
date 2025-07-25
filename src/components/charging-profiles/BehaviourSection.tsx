'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import InteractiveChart from './InteractiveChart';
import chargingProfiles from '@/resources/ev_charging_profiles.json';

interface BehaviourSectionProps {
  chargingProfileId?: string;
  onBehaviourChange?: (behaviourData: {
    weekday_hourly_data: number[];
    weekend_hourly_data: number[];
    monthly_data: number[];
  }) => void;
  totalAnnualKWh: number;
  onSaveBehaviour?: (saveFn: () => Promise<void>) => void;
}

// Utility function for weekday/weekend allocation
function calculateWeekdayWeekendAllocation(totalAnnualKWh: number, scale: number) {
  const weekdayDays = 5;
  const weekendDays = 2;
  // Avoid division by zero
  if (totalAnnualKWh <= 0) {
    return {
      averageWeekdayConsumption: 0,
      averageWeekendConsumption: 0,
      totalWeekdayConsumption: 0,
      totalWeekendConsumption: 0,
      weekdayDays,
      weekendDays,
    };
  }
  const averageWeekdayConsumption = (totalAnnualKWh / ((365 * weekdayDays / 7) + (1 + scale / 100) * (365 * weekendDays / 7)));
  const averageWeekendConsumption = averageWeekdayConsumption * (1 + scale / 100);
  const totalWeekdayConsumption = (averageWeekdayConsumption * weekdayDays / 7 * 365);
  const totalWeekendConsumption = (averageWeekendConsumption * weekendDays / 7 * 365);
  return {
    averageWeekdayConsumption,
    averageWeekendConsumption,
    totalWeekdayConsumption,
    totalWeekendConsumption,
    weekdayDays,
    weekendDays,
  };
}

export default function BehaviourSection({ 
  chargingProfileId, 
  onBehaviourChange,
  totalAnnualKWh,
  onSaveBehaviour
}: BehaviourSectionProps) {
  const [weekdayData, setWeekdayData] = useState<number[]>(Array(24).fill(0));
  const [weekendData, setWeekendData] = useState<number[]>(Array(24).fill(0));
  const [monthlyData, setMonthlyData] = useState<number[]>(Array(12).fill(0));
  const [weekdayWeekendScale, setWeekdayWeekendScale] = useState<number>(0); // 0 = equal, positive = more weekdays, negative = more weekends
  const [displayScale, setDisplayScale] = useState<number>(0); // For display during dragging
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<string>('default'); // 'default' or profile name

  // Calculate default values based on annual volume and weekday/weekend scale
  const calculateDefaultWeekdayData = useCallback(() => {
    const { averageWeekdayConsumption } = calculateWeekdayWeekendAllocation(totalAnnualKWh, weekdayWeekendScale);
    if (totalAnnualKWh <= 0) return Array(24).fill(0);
    if (selectedProfile === 'default') {
      const defaultHourlyValue = averageWeekdayConsumption / 24;
      return Array(24).fill(defaultHourlyValue);
    } else {
      const profile = chargingProfiles.find(p => p.Profile === selectedProfile);
      if (!profile) return Array(24).fill(0);
      const weekdaySum = profile.Weekday_Hourly.reduce((sum, weight) => sum + weight, 0);
      return profile.Weekday_Hourly.map(weight =>
        weekdaySum > 0 ? (weight / weekdaySum) * averageWeekdayConsumption : 0
      );
    }
  }, [totalAnnualKWh, weekdayWeekendScale, selectedProfile]);

  const calculateDefaultWeekendData = useCallback(() => {
    const { averageWeekendConsumption } = calculateWeekdayWeekendAllocation(totalAnnualKWh, weekdayWeekendScale);
    if (totalAnnualKWh <= 0) return Array(24).fill(0);
    if (selectedProfile === 'default') {
      const defaultHourlyValue = averageWeekendConsumption / 24;
      return Array(24).fill(defaultHourlyValue);
    } else {
      const profile = chargingProfiles.find(p => p.Profile === selectedProfile);
      if (!profile) return Array(24).fill(0);
      const weekendSum = profile.Weekend_Hourly.reduce((sum, weight) => sum + weight, 0);
      return profile.Weekend_Hourly.map(weight =>
        weekendSum > 0 ? (weight / weekendSum) * averageWeekendConsumption : 0
      );
    }
  }, [totalAnnualKWh, weekdayWeekendScale, selectedProfile]);

  const calculateDefaultMonthlyData = useCallback(() => {
    if (totalAnnualKWh <= 0) return Array(12).fill(0);
    
    if (selectedProfile === 'default') {
      // Original default calculation
      const defaultMonthlyValue = (totalAnnualKWh / 12);
      return Array(12).fill(defaultMonthlyValue);
    } else {
      // Use selected profile pattern
      const profile = chargingProfiles.find(p => p.Profile === selectedProfile);
      if (!profile) return Array(12).fill(0);
      
      // Calculate the sum of monthly profile weights
      const monthlySum = profile.Monthly.reduce((sum, weight) => sum + weight, 0);
      
      // Apply the profile pattern proportionally to the annual consumption
      return profile.Monthly.map(weight => 
        monthlySum > 0 ? (weight / monthlySum) * totalAnnualKWh : 0
      );
    }
  }, [totalAnnualKWh, selectedProfile]);

  // Single save function - upserts if profile exists, inserts if new
  const saveBehaviourData = useCallback(async (data: {
    weekday_hourly_data: number[];
    weekend_hourly_data: number[];
    monthly_data: number[];
    weekday_weekend_scale?: number;
    selected_profile?: string;
  }) => {
    if (!chargingProfileId) return;
    
    try {
      const behaviourDataToSave = {
        charging_profile_id: chargingProfileId,
        weekday_hourly_data: JSON.stringify(data.weekday_hourly_data),
        weekend_hourly_data: JSON.stringify(data.weekend_hourly_data),
        monthly_data: JSON.stringify(data.monthly_data),
        weekday_weekend_scale: data.weekday_weekend_scale ?? weekdayWeekendScale,
        selected_profile: data.selected_profile ?? selectedProfile
      };

      const { error } = await supabase
        .from('charging_profile_behaviour')
        .upsert(behaviourDataToSave, {
          onConflict: 'charging_profile_id'
        });

      if (error) {
        console.error('Failed to save behaviour data:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error saving behaviour data:', err);
      throw err;
    }
  }, [chargingProfileId, weekdayWeekendScale, selectedProfile]);

  // Load data from database or create defaults
  const loadBehaviourData = useCallback(async () => {
    if (!chargingProfileId) return;
    
    try {
      const { data, error } = await supabase
        .from('charging_profile_behaviour')
        .select('*')
        .eq('charging_profile_id', chargingProfileId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Data exists - load it
        setWeekdayData(JSON.parse(data.weekday_hourly_data));
        setWeekendData(JSON.parse(data.weekend_hourly_data));
        setMonthlyData(JSON.parse(data.monthly_data));
        
        const savedProfile = data.selected_profile || 'default';
        setSelectedProfile(savedProfile);
        
        // Always use the saved scale value from database, regardless of profile
        const scale = data.weekday_weekend_scale || 0;
        
        setWeekdayWeekendScale(scale);
        setDisplayScale(scale);
      } else {
        // No data exists - create defaults and save
        const defaultWeekday = calculateDefaultWeekdayData();
        const defaultWeekend = calculateDefaultWeekendData();
        const defaultMonthly = calculateDefaultMonthlyData();
        
        const defaultData = {
          weekday_hourly_data: defaultWeekday,
          weekend_hourly_data: defaultWeekend,
          monthly_data: defaultMonthly,
          weekday_weekend_scale: 0, // Use fixed value instead of state
          selected_profile: 'default' // Use fixed value instead of state
        };
        
        await saveBehaviourData(defaultData);
        
        // Load the saved data
        setWeekdayData(defaultWeekday);
        setWeekendData(defaultWeekend);
        setMonthlyData(defaultMonthly);
      }
    } catch (err) {
      console.error('Failed to load behaviour data:', err);
      // Use defaults on error
      setWeekdayData(calculateDefaultWeekdayData());
      setWeekendData(calculateDefaultWeekendData());
      setMonthlyData(calculateDefaultMonthlyData());
    }
  }, [chargingProfileId]); // Simplified dependencies to prevent re-creation

  // Initialize data when component mounts - only load once
  useEffect(() => {
    if (chargingProfileId) {
      loadBehaviourData();
    } else {
      // For new profiles, just set defaults (no save needed yet)
      setWeekdayData(calculateDefaultWeekdayData());
      setWeekendData(calculateDefaultWeekendData());
      setMonthlyData(calculateDefaultMonthlyData());
    }
  }, [chargingProfileId]); // Removed dependencies that cause re-loading

  // Data change handlers - removed save functionality
  const handleWeekdayChange = (newData: number[]) => {
    setWeekdayData(newData);
  };

  const handleWeekendChange = (newData: number[]) => {
    setWeekendData(newData);
  };

  const handleMonthlyChange = (newData: number[]) => {
    setMonthlyData(newData);
  };

  // Handle weekday/weekend scale change during dragging
  const handleScaleChange = (newScale: number) => {
    setDisplayScale(newScale);
  };

  // Handle scale change start
  const handleScaleChangeStart = () => {
    setIsDragging(true);
  };

  // Save scale changes when dragging ends
  const handleScaleChangeEnd = () => {
    setIsDragging(false);
    setWeekdayWeekendScale(displayScale);
    // Removed automatic save - will be saved on modal submission
  };

  // Reset to equal allocation
  const resetToEqual = () => {
    setDisplayScale(0);
    setWeekdayWeekendScale(0);
    // Removed automatic save - will be saved on modal submission
  };

  // Calibrate functions that scale user values according to daily/monthly amounts
  const calibrateWeekday = () => {
    if (totalAnnualKWh <= 0) return;
    const { averageWeekdayConsumption } = calculateWeekdayWeekendAllocation(totalAnnualKWh, weekdayWeekendScale);
    const dailyAmount = averageWeekdayConsumption;
    const sumOfValues = weekdayData.reduce((sum, value) => sum + value, 0);
    if (sumOfValues === 0) return;
    const calibratedData = weekdayData.map(value =>
      (value / sumOfValues) * dailyAmount
    );
    setWeekdayData(calibratedData);
  };
  const calibrateWeekend = () => {
    if (totalAnnualKWh <= 0) return;
    const { averageWeekendConsumption } = calculateWeekdayWeekendAllocation(totalAnnualKWh, weekdayWeekendScale);
    const dailyAmount = averageWeekendConsumption;
    const sumOfValues = weekendData.reduce((sum, value) => sum + value, 0);
    if (sumOfValues === 0) return;
    const calibratedData = weekendData.map(value =>
      (value / sumOfValues) * dailyAmount
    );
    setWeekendData(calibratedData);
  };

  const calibrateMonthly = () => {
    if (totalAnnualKWh <= 0) return;
    
    const monthlyAmount = totalAnnualKWh;
    const sumOfValues = monthlyData.reduce((sum, value) => sum + value, 0);
    
    if (sumOfValues === 0) return;
    
    const calibratedData = monthlyData.map(value => 
      (value / sumOfValues) * monthlyAmount
    );
    
    setMonthlyData(calibratedData);
    /*saveBehaviourData({
      weekday_hourly_data: weekdayData,
      weekend_hourly_data: weekendData,
      monthly_data: calibratedData,
      selected_profile: selectedProfile
    });*/
  };

  const resetWeekday = () => {
    if (window.confirm('Are you sure you want to reset the weekday profile? This will clear all your custom adjustments.')) {
      const defaultWeekday = calculateDefaultWeekdayData();
      setWeekdayData(defaultWeekday);
      /*saveBehaviourData({
        weekday_hourly_data: defaultWeekday,
        weekend_hourly_data: weekendData,
        monthly_data: monthlyData,
        selected_profile: selectedProfile
      });*/
    }
  };

  const resetWeekend = () => {
    if (window.confirm('Are you sure you want to reset the weekend profile? This will clear all your custom adjustments.')) {
      const defaultWeekend = calculateDefaultWeekendData();
      setWeekendData(defaultWeekend);
      /*saveBehaviourData({
        weekday_hourly_data: weekdayData,
        weekend_hourly_data: defaultWeekend,
        monthly_data: monthlyData,
        selected_profile: selectedProfile
      });*/
    }
  };

  const resetMonthly = () => {
    if (window.confirm('Are you sure you want to reset the monthly profile? This will clear all your custom adjustments.')) {
      const defaultMonthly = calculateDefaultMonthlyData();
      setMonthlyData(defaultMonthly);
      /*saveBehaviourData({
        weekday_hourly_data: weekdayData,
        weekend_hourly_data: weekendData,
        monthly_data: defaultMonthly,
        selected_profile: selectedProfile
      });*/
    }
  };

  // Handle profile selection change
  const handleProfileChange = (profileName: string) => {
    setSelectedProfile(profileName);
    let newScale: number;
    if (profileName === 'default') {
      newScale = 0;
    } else {
      const profile = chargingProfiles.find(p => p.Profile === profileName);
      if (profile) {
        newScale = profile.Weekday_Weight;
      } else {
        newScale = 0;
      }
    }
    setWeekdayWeekendScale(newScale);
    setDisplayScale(newScale);
    const { averageWeekdayConsumption, averageWeekendConsumption } = calculateWeekdayWeekendAllocation(totalAnnualKWh, newScale);
    let newWeekdayData: number[];
    let newWeekendData: number[];
    let newMonthlyData: number[];
    if (totalAnnualKWh <= 0) {
      newWeekdayData = Array(24).fill(0);
      newWeekendData = Array(24).fill(0);
      newMonthlyData = Array(12).fill(0);
    } else if (profileName === 'default') {
      const defaultWeekdayHourlyValue = averageWeekdayConsumption / 24;
      const defaultWeekendHourlyValue = averageWeekendConsumption / 24;
      const defaultMonthlyValue = totalAnnualKWh / 12;
      newWeekdayData = Array(24).fill(defaultWeekdayHourlyValue);
      newWeekendData = Array(24).fill(defaultWeekendHourlyValue);
      newMonthlyData = Array(12).fill(defaultMonthlyValue);
    } else {
      const profile = chargingProfiles.find(p => p.Profile === profileName);
      if (!profile) {
        newWeekdayData = Array(24).fill(0);
        newWeekendData = Array(24).fill(0);
        newMonthlyData = Array(12).fill(0);
      } else {
        const weekdaySum = profile.Weekday_Hourly.reduce((sum, weight) => sum + weight, 0);
        newWeekdayData = profile.Weekday_Hourly.map(weight =>
          weekdaySum > 0 ? (weight / weekdaySum) * averageWeekdayConsumption : 0
        );
        const weekendSum = profile.Weekend_Hourly.reduce((sum, weight) => sum + weight, 0);
        newWeekendData = profile.Weekend_Hourly.map(weight =>
          weekendSum > 0 ? (weight / weekendSum) * averageWeekendConsumption : 0
        );
        const monthlySum = profile.Monthly.reduce((sum, weight) => sum + weight, 0);
        newMonthlyData = profile.Monthly.map(weight =>
          monthlySum > 0 ? (weight / monthlySum) * totalAnnualKWh : 0
        );
      }
    }
    setWeekdayData(newWeekdayData);
    setWeekendData(newWeekendData);
    setMonthlyData(newMonthlyData);
  }

  // Function to save current behaviour data - can be called from parent
  const saveCurrentBehaviourData = useCallback(async () => {
    if (!chargingProfileId) return;
    
    try {
      await saveBehaviourData({
        weekday_hourly_data: weekdayData,
        weekend_hourly_data: weekendData,
        monthly_data: monthlyData,
        weekday_weekend_scale: weekdayWeekendScale,
        selected_profile: selectedProfile
      });
    } catch (err) {
      console.error('Failed to save behaviour data:', err);
      throw err;
    }
  }, [chargingProfileId, weekdayData, weekendData, monthlyData, weekdayWeekendScale, selectedProfile, saveBehaviourData]);

  // Expose save function to parent via callback
  useEffect(() => {
    if (onSaveBehaviour) {
      onSaveBehaviour(saveCurrentBehaviourData);
    }
  }, [onSaveBehaviour, saveCurrentBehaviourData]);

  // Calculate current allocations for display (use displayScale during dragging)
  const currentScale = isDragging ? displayScale : weekdayWeekendScale;
  const { averageWeekdayConsumption: weekdayDailyAmount, averageWeekendConsumption: weekendDailyAmount } = calculateWeekdayWeekendAllocation(totalAnnualKWh, currentScale);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
          <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Behaviour
        </h3>
      </div>

      {/* Profile Selection */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Charging Profile Template</h4>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedProfile}
            onChange={(e) => handleProfileChange(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="default">Default (Equal Distribution)</option>
            {chargingProfiles.map((profile) => (
              <option key={profile.Profile} value={profile.Profile}>
                {profile.Profile.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        {selectedProfile !== 'default' && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Selected profile will be applied proportionally to your annual consumption and weekday/weekend allocation settings.
          </div>
        )}
      </div>

      {/* Weekday/Weekend Allocation Slider */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Weekday/Weekend Allocation</h4>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {currentScale > 0 ? `+${Math.abs(currentScale).toFixed(1)}% Weekends` : 
               currentScale < 0 ? `+${Math.abs(currentScale).toFixed(1)}% Weekdays` : 
               'Equal Allocation'}
            </div>
            <button
              type="button"
              onClick={resetToEqual}
              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Reset to Equal
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="range"
            min="-200"
            max="200"
            value={displayScale}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            onMouseDown={handleScaleChangeStart}
            onTouchStart={handleScaleChangeStart}
            onMouseUp={handleScaleChangeEnd}
            onTouchEnd={handleScaleChangeEnd}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>More Weekday</span>
            <span>Equal</span>
            <span>More Weekend</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
            <div className="font-medium text-gray-900 dark:text-white">Weekdays</div>
            <div className="text-gray-600 dark:text-gray-400">{weekdayDailyAmount.toFixed(1)} kWh/day</div>
          </div>
          <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
            <div className="font-medium text-gray-900 dark:text-white">Weekends</div>
            <div className="text-gray-600 dark:text-gray-400">{weekendDailyAmount.toFixed(1)} kWh/day</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Weekday Hourly Chart */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">Weekday Hourly Profile</h4>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={calibrateWeekday}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  Math.abs(weekdayData.reduce((sum, value) => sum + value, 0) - weekdayDailyAmount) > 0.1
                    ? 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700'
                    : 'text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                Calibrate
              </button>
              <button
                type="button"
                onClick={resetWeekday}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
          <InteractiveChart
            data={weekdayData}
            title=""
            xAxisLabel="Hour"
            yAxisLabel="Demand (kWh)"
            onDataChange={handleWeekdayChange}
            minValue={0}
            step={1}
          />
          <div className="mt-2 flex justify-between text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Assigned Consumption:</span> {weekdayData.reduce((sum, value) => sum + value, 0).toFixed(1)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Average Weekday Consumption:</span> {weekdayDailyAmount.toFixed(1)} kWh
            </div>
          </div>
        </div>

        {/* Weekend Hourly Chart */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">Weekend Hourly Profile</h4>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={calibrateWeekend}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  Math.abs(weekendData.reduce((sum, value) => sum + value, 0) - weekendDailyAmount) > 0.1
                    ? 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700'
                    : 'text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                Calibrate
              </button>
              <button
                type="button"
                onClick={resetWeekend}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
          <InteractiveChart
            data={weekendData}
            title=""
            xAxisLabel="Hour"
            yAxisLabel="Demand (kWh)"
            onDataChange={handleWeekendChange}
            minValue={0}
            step={1}
          />
          <div className="mt-2 flex justify-between text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Assigned Consumption:</span> {weekendData.reduce((sum, value) => sum + value, 0).toFixed(1)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Average Weekend Consumption:</span> {weekendDailyAmount.toFixed(1)} kWh
            </div>
          </div>
        </div>

        {/* Monthly Chart */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">Monthly Profile</h4>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={calibrateMonthly}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  Math.abs(monthlyData.reduce((sum, value) => sum + value, 0) - (totalAnnualKWh)) > 0.1
                    ? 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700'
                    : 'text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                Calibrate
              </button>
              <button
                type="button"
                onClick={resetMonthly}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
          <InteractiveChart
            data={monthlyData}
            title=""
            xAxisLabel="Month"
            xAxisLabels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}
            yAxisLabel="Demand (kWh)"
            onDataChange={handleMonthlyChange}
            minValue={0}
            step={1}
            chartType="bar" // ADDED
          />
          <div className="mt-2 flex justify-between text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Assigned Consumption:</span> {monthlyData.reduce((sum, value) => sum + value, 0).toFixed(1)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Annual Consumption:</span> {(totalAnnualKWh).toFixed(1)} kWh
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}