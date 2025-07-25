// Utility to calculate first year energy flows for analysis

import { supabase } from '@/lib/supabase/client';

export interface EnergyFlowInputs {
  generated_solar_energy_consumed: number[];
  battery_charge_from_solar: number[];
  grid_export: number[];
  battery_discharge: number[];
  battery_charge_from_grid: number[];
  grid_import: number[];
}

export interface EnergyFlows {
  flow_solar_to_chargers: number;
  flow_solar_to_battery: number;
  flow_solar_to_grid: number;
  flow_battery_to_chargers: number;
  flow_grid_to_battery: number;
  flow_grid_to_chargers: number;
}

export function calculateEnergyFlows({
  generated_solar_energy_consumed,
  battery_charge_from_solar,
  grid_export,
  battery_discharge,
  battery_charge_from_grid,
  grid_import,
}: EnergyFlowInputs): EnergyFlows {
  return {
    flow_solar_to_chargers: generated_solar_energy_consumed.reduce((sum, v) => sum + v, 0),
    flow_solar_to_battery: battery_charge_from_solar.reduce((sum, v) => sum + v, 0),
    flow_solar_to_grid: grid_export.reduce((sum, v) => sum + v, 0),
    flow_battery_to_chargers: battery_discharge.reduce((sum, v) => sum + v, 0),
    flow_grid_to_battery: battery_charge_from_grid.reduce((sum, v) => sum + v, 0),
    flow_grid_to_chargers: grid_import.reduce((sum, v) => sum + v, 0),
  };
}

export async function runEnergyFlowAnalysis(projectId: string): Promise<EnergyFlows | null> {
  const { data: forecast } = await supabase
    .from('energy_forecasts')
    .select('generated_solar_energy_consumed, battery_charge_from_solar, grid_export, battery_discharge, battery_charge_from_grid, grid_import')
    .eq('project_id', projectId)
    .single();
  if (!forecast) return null;
  const flows = calculateEnergyFlows({
    generated_solar_energy_consumed: forecast.generated_solar_energy_consumed?.[0] || [],
    battery_charge_from_solar: forecast.battery_charge_from_solar?.[0] || [],
    grid_export: forecast.grid_export?.[0] || [],
    battery_discharge: forecast.battery_discharge?.[0] || [],
    battery_charge_from_grid: forecast.battery_charge_from_grid?.[0] || [],
    grid_import: forecast.grid_import?.[0] || [],
  });
  // Upsert the flows to energy_forecasts
  await supabase
    .from('energy_forecasts')
    .upsert([
      {
        project_id: projectId,
        flow_solar_to_chargers: flows.flow_solar_to_chargers,
        flow_solar_to_battery: flows.flow_solar_to_battery,
        flow_solar_to_grid: flows.flow_solar_to_grid,
        flow_battery_to_chargers: flows.flow_battery_to_chargers,
        flow_grid_to_battery: flows.flow_grid_to_battery,
        flow_grid_to_chargers: flows.flow_grid_to_chargers,
      }
    ], { onConflict: 'project_id' });
  return flows;
} 