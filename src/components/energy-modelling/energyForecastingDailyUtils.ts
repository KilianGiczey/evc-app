import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database';

/**
 * Calculates the average interval battery charging (from solar and grid) for the first year.
 * Saves the result (24 data points) to energy_forecasts.daily_average_battery_charging as JSONB.
 */
export async function runDailyAverageBatteryCharge(projectId: string): Promise<void> {
  const { data: forecast, error } = await supabase
    .from('energy_forecasts')
    .select('battery_charge_from_solar, battery_charge_from_grid')
    .eq('project_id', projectId)
    .single();
  if (error || !forecast) return;
  const { battery_charge_from_solar, battery_charge_from_grid } = forecast as {
    battery_charge_from_solar: number[][];
    battery_charge_from_grid: number[][];
  };
  if (!battery_charge_from_solar || !battery_charge_from_grid) return;
  // Use only the first year (index 0)
  const solar = battery_charge_from_solar[0] || [];
  const grid = battery_charge_from_grid[0] || [];
  // Assume 24 intervals per day (hourly)
  const intervals = 24;
  const days = Math.floor(solar.length / intervals);
  if (days === 0) return;
  const avg: number[] = Array(intervals).fill(0);
  for (let h = 0; h < intervals; h++) {
    let sum = 0;
    for (let d = 0; d < days; d++) {
      sum += (solar[d * intervals + h] || 0) + (grid[d * intervals + h] || 0);
    }
    avg[h] = -(sum / days);
  }
  console.log('Saving daily_average_battery_charging:', avg);
  await supabase
    .from('energy_forecasts')
    .upsert([
      {
        project_id: projectId,
        daily_average_battery_charging: avg,
      } as Partial<Database['public']['Tables']['energy_forecasts']['Insert']>
    ], { onConflict: 'project_id' });
}

/**
 * Calculates the average interval battery discharging for the first year.
 * Saves the result (24 data points) to energy_forecasts.daily_average_battery_discharge as JSONB.
 */
export async function runDailyAverageBatteryDischarge(projectId: string): Promise<void> {
  const { data: forecast, error } = await supabase
    .from('energy_forecasts')
    .select('battery_discharge')
    .eq('project_id', projectId)
    .single();
  if (error || !forecast) return;
  const { battery_discharge } = forecast as { battery_discharge: number[][] };
  if (!battery_discharge) return;
  // Use only the first year (index 0)
  const discharge = battery_discharge[0] || [];
  // Assume 24 intervals per day (hourly)
  const intervals = 24;
  const days = Math.floor(discharge.length / intervals);
  if (days === 0) return;
  const avg: number[] = Array(intervals).fill(0);
  for (let h = 0; h < intervals; h++) {
    let sum = 0;
    for (let d = 0; d < days; d++) {
      sum += discharge[d * intervals + h] || 0;
    }
    avg[h] = sum / days;
  }
  await supabase
    .from('energy_forecasts')
    .upsert([
      {
        project_id: projectId,
        daily_average_battery_discharging: avg,
      } as Partial<Database['public']['Tables']['energy_forecasts']['Insert']>
    ], { onConflict: 'project_id' });
} 