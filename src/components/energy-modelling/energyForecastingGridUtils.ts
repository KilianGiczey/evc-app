import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database';

/**
 * For each interval, calculates energy_demand_post_solar_battery = energy_demand_post_solar - battery_discharge
 * and saves the result to energy_forecasts.
 * @param projectId - The project ID to run forecasting for
 */
export async function runEnergyDemandPostSolarBattery(projectId: string): Promise<void> {
  // 1. Fetch energy_demand_post_solar and battery_discharge from energy_forecasts
  const { data: forecast, error } = await supabase
    .from('energy_forecasts')
    .select('energy_demand_post_solar, battery_discharge')
    .eq('project_id', projectId)
    .single();
  if (error || !forecast) return;
  const { energy_demand_post_solar, battery_discharge } = forecast as {
    energy_demand_post_solar: number[][];
    battery_discharge: number[][];
  };
  if (!energy_demand_post_solar || !battery_discharge) return;

  // 2. For each year and interval, calculate post-solar-battery demand
  const years = Math.min(energy_demand_post_solar.length, battery_discharge.length);
  const postSolarBattery: number[][] = [];
  for (let year = 0; year < years; year++) {
    const demand = energy_demand_post_solar[year] || [];
    const discharge = battery_discharge[year] || [];
    const intervals = Math.min(demand.length, discharge.length);
    const yearPostSolarBattery: number[] = [];
    for (let i = 0; i < intervals; i++) {
      yearPostSolarBattery.push(demand[i] - discharge[i]);
    }
    postSolarBattery.push(yearPostSolarBattery);
  }

  // 3. Upsert to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    energy_demand_post_solar_battery: postSolarBattery,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
}

/**
 * For each interval, calculates grid_import = min(grid_data.max_import_kw, energy_demand_post_solar_battery)
 * and saves the result to energy_forecasts.
 * @param projectId - The project ID to run forecasting for
 */
export async function runGridImport(projectId: string): Promise<void> {
  // 1. Fetch grid_data and energy_demand_post_solar_battery
  const { data: grid, error: gridError } = await supabase
    .from('grid_data')
    .select('max_import_kw')
    .eq('project_id', projectId)
    .single();
  if (gridError || !grid) return;
  const { max_import_kw } = grid as { max_import_kw: number };

  const { data: forecast, error: forecastError } = await supabase
    .from('energy_forecasts')
    .select('energy_demand_post_solar_battery')
    .eq('project_id', projectId)
    .single();
  if (forecastError || !forecast) return;
  const { energy_demand_post_solar_battery } = forecast as {
    energy_demand_post_solar_battery: number[][];
  };
  if (!energy_demand_post_solar_battery) return;

  // 2. For each year and interval, calculate grid import
  const years = energy_demand_post_solar_battery.length;
  const gridImport: number[][] = [];
  for (let year = 0; year < years; year++) {
    const demand = energy_demand_post_solar_battery[year] || [];
    const intervals = demand.length;
    const yearGridImport: number[] = [];
    for (let i = 0; i < intervals; i++) {
      yearGridImport.push(Math.min(max_import_kw, demand[i]));
    }
    gridImport.push(yearGridImport);
  }

  // 3. Upsert to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    grid_import: gridImport,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
}

/**
 * For each interval, calculates generated_solar_energy_excess_post_consumption_battery = generated_solar_energy_excess_post_consumption - battery_charge_from_solar
 * and saves the result to energy_forecasts.
 * @param projectId - The project ID to run forecasting for
 */
export async function runGeneratedSolarEnergyExcessPostConsumptionBattery(projectId: string): Promise<void> {
  // 1. Fetch generated_solar_energy_excess_post_consumption and battery_charge_from_solar
  const { data: forecast, error } = await supabase
    .from('energy_forecasts')
    .select('generated_solar_energy_excess_post_consumption, battery_charge_from_solar')
    .eq('project_id', projectId)
    .single();
  if (error || !forecast) return;
  const { generated_solar_energy_excess_post_consumption, battery_charge_from_solar } = forecast as {
    generated_solar_energy_excess_post_consumption: number[][];
    battery_charge_from_solar: number[][];
  };
  if (!generated_solar_energy_excess_post_consumption || !battery_charge_from_solar) return;

  // 2. For each year and interval, calculate the excess post battery
  const years = Math.min(generated_solar_energy_excess_post_consumption.length, battery_charge_from_solar.length);
  const excessPostBattery: number[][] = [];
  for (let year = 0; year < years; year++) {
    const excess = generated_solar_energy_excess_post_consumption[year] || [];
    const charge = battery_charge_from_solar[year] || [];
    const intervals = Math.min(excess.length, charge.length);
    const yearExcess: number[] = [];
    for (let i = 0; i < intervals; i++) {
      yearExcess.push(excess[i] - charge[i]);
    }
    excessPostBattery.push(yearExcess);
  }

  // 3. Upsert to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    generated_solar_energy_excess_post_consumption_battery: excessPostBattery,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
}

/**
 * For each interval, calculates grid_export = min(generated_solar_energy_excess_post_consumption, grid_data.max_export_kw)
 * and saves the result to energy_forecasts.
 * @param projectId - The project ID to run forecasting for
 */
export async function runGridExport(projectId: string): Promise<void> {
  // 1. Fetch grid_data and generated_solar_energy_excess_post_consumption
  const { data: grid, error: gridError } = await supabase
    .from('grid_data')
    .select('max_export_kw')
    .eq('project_id', projectId)
    .single();
  if (gridError || !grid) return;
  const { max_export_kw } = grid as { max_export_kw: number };

  const { data: forecast, error: forecastError } = await supabase
    .from('energy_forecasts')
    .select('generated_solar_energy_excess_post_consumption')
    .eq('project_id', projectId)
    .single();
  if (forecastError || !forecast) return;
  const { generated_solar_energy_excess_post_consumption } = forecast as {
    generated_solar_energy_excess_post_consumption: number[][];
  };
  if (!generated_solar_energy_excess_post_consumption) return;

  // 2. For each year and interval, calculate grid export
  const years = generated_solar_energy_excess_post_consumption.length;
  const gridExport: number[][] = [];
  for (let year = 0; year < years; year++) {
    const excess = generated_solar_energy_excess_post_consumption[year] || [];
    const intervals = excess.length;
    const yearGridExport: number[] = [];
    for (let i = 0; i < intervals; i++) {
      yearGridExport.push(Math.min(excess[i], max_export_kw));
    }
    gridExport.push(yearGridExport);
  }

  // 3. Upsert to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    grid_export: gridExport,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
}

/**
 * For each interval, calculates energy_demand_post_solar_battery_grid = energy_demand_post_solar_battery - grid_import
 * and saves the result to energy_forecasts.
 * @param projectId - The project ID to run forecasting for
 */
export async function runEnergyDemandPostSolarBatteryGrid(projectId: string): Promise<void> {
  // 1. Fetch energy_demand_post_solar_battery and grid_import
  const { data: forecast, error } = await supabase
    .from('energy_forecasts')
    .select('energy_demand_post_solar_battery, grid_import')
    .eq('project_id', projectId)
    .single();
  if (error || !forecast) return;
  const { energy_demand_post_solar_battery, grid_import } = forecast as {
    energy_demand_post_solar_battery: number[][];
    grid_import: number[][];
  };
  if (!energy_demand_post_solar_battery || !grid_import) return;

  // 2. For each year and interval, calculate post-solar-battery-grid demand
  const years = Math.min(energy_demand_post_solar_battery.length, grid_import.length);
  const postSolarBatteryGrid: number[][] = [];
  for (let year = 0; year < years; year++) {
    const demand = energy_demand_post_solar_battery[year] || [];
    const grid = grid_import[year] || [];
    const intervals = Math.min(demand.length, grid.length);
    const yearPostSolarBatteryGrid: number[] = [];
    for (let i = 0; i < intervals; i++) {
      yearPostSolarBatteryGrid.push(demand[i] - grid[i]);
    }
    postSolarBatteryGrid.push(yearPostSolarBatteryGrid);
  }

  // 3. Upsert to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    energy_demand_post_solar_battery_grid: postSolarBatteryGrid,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
} 