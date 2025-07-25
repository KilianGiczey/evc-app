import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { PROJECT_LIFE } from './energyForecastingSolarUtils';

/**
 * Runs battery forecasting for a project. For each interval, calculates:
 * 1) battery_start_state_of_charge
 * 2) battery_charge_from_solar
 * 3) battery_charge_from_grid (0 for now)
 * 4) battery_discharge
 * 5) battery_end_state_of_charge
 *
 * @param projectId - The project ID to run forecasting for
 */
export async function runBatteryForecasting(projectId: string): Promise<void> {
  // 1. Fetch storage_data for the project
  const { data: storage, error: storageError } = await supabase
    .from('storage_data')
    .select('capacity_kwh, power_kw')
    .eq('project_id', projectId)
    .single();
  if (storageError || !storage) return;
  const { capacity_kwh, power_kw } = storage as { capacity_kwh: number; power_kw: number };

  // 2. Fetch required energy forecast data
  const { data: forecast, error: forecastError } = await supabase
    .from('energy_forecasts')
    .select('generated_solar_energy_excess_post_consumption, energy_demand_post_solar')
    .eq('project_id', projectId)
    .single();
  if (forecastError || !forecast) return;
  const { generated_solar_energy_excess_post_consumption, energy_demand_post_solar } = forecast as {
    generated_solar_energy_excess_post_consumption: number[][];
    energy_demand_post_solar: number[][];
  };
  if (!generated_solar_energy_excess_post_consumption || !energy_demand_post_solar) return;

  // 3. Loop through each year and interval
  const years = Math.min(
    generated_solar_energy_excess_post_consumption.length,
    energy_demand_post_solar.length,
    PROJECT_LIFE
  );
  const battery_start_state_of_charge: number[][] = [];
  const battery_charge_from_solar: number[][] = [];
  const battery_charge_from_grid: number[][] = [];
  const battery_discharge: number[][] = [];
  const battery_end_state_of_charge: number[][] = [];

  for (let year = 0; year < years; year++) {
    const solarExcess = generated_solar_energy_excess_post_consumption[year] || [];
    const postSolarDemand = energy_demand_post_solar[year] || [];
    const intervals = Math.min(solarExcess.length, postSolarDemand.length);
    const year_start_soc: number[] = [];
    const year_charge_solar: number[] = [];
    const year_charge_grid: number[] = [];
    const year_discharge: number[] = [];
    const year_end_soc: number[] = [];
    let prev_end_soc = 0;
    for (let i = 0; i < intervals; i++) {
      // 1) battery_start_state_of_charge
      const start_soc = i === 0 ? 0 : year_end_soc[i - 1];
      year_start_soc.push(start_soc);
      // 2) battery_charge_from_solar
      const available_capacity = capacity_kwh - start_soc;
      const charge_from_solar = Math.max(
        0,
        Math.min(solarExcess[i], power_kw, available_capacity)
      );
      year_charge_solar.push(charge_from_solar);
      // 3) battery_charge_from_grid (0 for now)
      const charge_from_grid = 0;
      year_charge_grid.push(charge_from_grid);
      // 4) battery_discharge
      const discharge = Math.max(
        0,
        Math.min(power_kw, postSolarDemand[i], start_soc + charge_from_solar + charge_from_grid)
      );
      year_discharge.push(discharge);
      // 5) battery_end_state_of_charge
      const end_soc = Math.max(
        0,
        Math.min(
          capacity_kwh,
          start_soc + charge_from_solar + charge_from_grid - discharge
        )
      );
      year_end_soc.push(end_soc);
    }
    battery_start_state_of_charge.push(year_start_soc);
    battery_charge_from_solar.push(year_charge_solar);
    battery_charge_from_grid.push(year_charge_grid);
    battery_discharge.push(year_discharge);
    battery_end_state_of_charge.push(year_end_soc);
  }

  // 4. Upsert all results to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    battery_start_state_of_charge,
    battery_charge_from_solar,
    battery_charge_from_grid,
    battery_discharge,
    battery_end_state_of_charge,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
} 