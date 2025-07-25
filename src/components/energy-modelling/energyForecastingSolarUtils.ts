import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database';

// Global project life (years) for all energy forecasting functions
export const PROJECT_LIFE = 3;

/**
 * Runs solar forecasting for a project: extrapolates generation_profile_kWh for 15 years,
 * applying annual_degradation, and upserts to energy_forecasts.
 * @param projectId - The project ID to run forecasting for
 */
export async function runSolarForecasting(projectId: string): Promise<void> {
  // 1. Fetch generation data for the project
  const { data: generationData, error } = await supabase
    .from('generation_data')
    .select('generation_profile_kWh, annual_degradation')
    .eq('project_id', projectId)
    .single();
  if (error || !generationData) {
    return;
  }

  const { generation_profile_kWh, annual_degradation } = generationData as {
    generation_profile_kWh: number[];
    annual_degradation: number;
  };
  if (!generation_profile_kWh || !Array.isArray(generation_profile_kWh)) {
    return;
  }

  // 2. Extrapolate for PROJECT_LIFE years
  let current_profile = [...generation_profile_kWh];
  const all_years: number[][] = [];
  for (let year = 0; year < PROJECT_LIFE; year++) {
    if (year > 0) {
      // Apply degradation at the end of each year
      current_profile = current_profile.map(v => v * (1 - annual_degradation / 100));
    }
    all_years.push([...current_profile]);
  }

  // 3. Upsert to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    generated_solar_energy: all_years,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
}

/**
 * Runs capped energy demand forecasting for a project: for each year, aggregates the minimum of demand_profile and charger_capacity_profile for each charging hub,
 * applies annual growth rates, and upserts to energy_forecasts.gross_energy_demand.
 * @param projectId - The project ID to run forecasting for
 */
export async function runCappedEnergyDemand(projectId: string): Promise<void> {
  // 1. Fetch all charging hubs for the project
  const { data: hubs, error: hubsError } = await supabase
    .from('charging_hubs')
    .select('id, demand_profile, charger_capacity_profile, charging_profile_id')
    .eq('project_id', projectId);
  if (hubsError || !hubs || hubs.length === 0) {
    return;
  }

  // 2. Fetch all relevant charging_profile_behaviour rows
  const profileIds = hubs.map(hub => hub.charging_profile_id).filter(Boolean);
  const { data: behaviours, error: behavioursError } = await supabase
    .from('charging_profile_behaviour')
    .select('charging_profile_id, annual_growth_rates')
    .in('charging_profile_id', profileIds);
  if (behavioursError || !behaviours) {
    return;
  }
  const behaviourMap: Record<string, number[]> = {};
  for (const b of behaviours) {
    behaviourMap[b.charging_profile_id] = b.annual_growth_rates;
  }

  // 3. For each year, aggregate the capped demand for all hubs
  const all_years: number[][] = [];
  for (let year = 0; year < PROJECT_LIFE; year++) {
    // For each hub, calculate the capped and grown demand profile for this year
    const hubProfiles: number[][] = [];
    for (const hub of hubs) {
      let demand_profile: number[] = Array.isArray(hub.demand_profile)
        ? hub.demand_profile
        : typeof hub.demand_profile === 'string' && hub.demand_profile.startsWith('[')
          ? JSON.parse(hub.demand_profile)
          : [];
      let charger_capacity_profile: number[] = Array.isArray(hub.charger_capacity_profile)
        ? hub.charger_capacity_profile
        : typeof hub.charger_capacity_profile === 'string' && hub.charger_capacity_profile.startsWith('[')
          ? JSON.parse(hub.charger_capacity_profile)
          : [];
      // Apply annual growth rate if available
      let growth = 1;
      if (hub.charging_profile_id && behaviourMap[hub.charging_profile_id]) {
        const growthRates = behaviourMap[hub.charging_profile_id];
        // Use the correct growth rate for this year, or last available
        const rate = growthRates[Math.min(year, growthRates.length - 1)] ?? 0;
        growth = 1 + rate / 100;
      }
      // Apply growth to demand_profile
      demand_profile = demand_profile.map(v => v * Math.pow(growth, year));
      // Take min of demand and capacity for each interval
      const capped = demand_profile.map((v, i) => Math.min(v, charger_capacity_profile[i] ?? 0));
      hubProfiles.push(capped);
    }
    // Aggregate (sum) across all hubs for each interval
    const intervals = hubProfiles[0]?.length || 0;
    const totalProfile: number[] = Array(intervals).fill(0);
    for (let i = 0; i < intervals; i++) {
      for (const hub of hubProfiles) {
        totalProfile[i] += hub[i] ?? 0;
      }
    }
    all_years.push(totalProfile);
  }

  // 4. Upsert to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    gross_energy_demand: all_years,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
}

/**
 * For each year, compares generated_solar_energy and gross_energy_demand and saves the minimum for each interval to generated_solar_energy_consumed in energy_forecasts.
 * @param projectId - The project ID to run forecasting for
 */
export async function runGeneratedSolarEnergyConsumed(projectId: string): Promise<void> {
  // 1. Fetch generated_solar_energy and gross_energy_demand from energy_forecasts
  const { data: forecast, error } = await supabase
    .from('energy_forecasts')
    .select('generated_solar_energy, gross_energy_demand')
    .eq('project_id', projectId)
    .single();
  if (error || !forecast) {
    return;
  }
  const { generated_solar_energy, gross_energy_demand } = forecast as {
    generated_solar_energy: number[][];
    gross_energy_demand: number[][];
  };
  if (!generated_solar_energy || !gross_energy_demand) {
    return;
  }
  // 2. For each year, take the minimum for each interval
  const years = Math.min(generated_solar_energy.length, gross_energy_demand.length);
  const consumed: number[][] = [];
  for (let year = 0; year < years; year++) {
    const solar = generated_solar_energy[year] || [];
    const demand = gross_energy_demand[year] || [];
    const intervals = Math.min(solar.length, demand.length);
    const yearConsumed: number[] = [];
    for (let i = 0; i < intervals; i++) {
      yearConsumed.push(Math.min(solar[i], demand[i]));
    }
    consumed.push(yearConsumed);
  }
  // 3. Upsert to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    generated_solar_energy_consumed: consumed,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
}

/**
 * For each interval, calculates max(generated_solar_energy - generated_solar_energy_consumed, 0) and saves the result to generated_solar_energy_excess_post_consumption in energy_forecasts.
 * @param projectId - The project ID to run forecasting for
 */
export async function runGeneratedSolarEnergyExcessPostConsumption(projectId: string): Promise<void> {
  // 1. Fetch generated_solar_energy and generated_solar_energy_consumed from energy_forecasts
  const { data: forecast, error } = await supabase
    .from('energy_forecasts')
    .select('generated_solar_energy, generated_solar_energy_consumed')
    .eq('project_id', projectId)
    .single();
  if (error || !forecast) {
    return;
  }
  const { generated_solar_energy, generated_solar_energy_consumed } = forecast as {
    generated_solar_energy: number[][];
    generated_solar_energy_consumed: number[][];
  };
  if (!generated_solar_energy || !generated_solar_energy_consumed) {
    return;
  }
  // 2. For each year and interval, calculate the excess
  const years = Math.min(generated_solar_energy.length, generated_solar_energy_consumed.length);
  const excess: number[][] = [];
  for (let year = 0; year < years; year++) {
    const solar = generated_solar_energy[year] || [];
    const consumed = generated_solar_energy_consumed[year] || [];
    const intervals = Math.min(solar.length, consumed.length);
    const yearExcess: number[] = [];
    for (let i = 0; i < intervals; i++) {
      yearExcess.push(Math.max(solar[i] - consumed[i], 0));
    }
    excess.push(yearExcess);
  }
  // 3. Upsert to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    generated_solar_energy_excess_post_consumption: excess,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
}

/**
 * For each interval, calculates gross_energy_demand - generated_solar_energy_consumed and saves the result to energy_demand_post_solar in energy_forecasts.
 * @param projectId - The project ID to run forecasting for
 */
export async function runEnergyDemandPostSolar(projectId: string): Promise<void> {
  // 1. Fetch gross_energy_demand and generated_solar_energy_consumed from energy_forecasts
  const { data: forecast, error } = await supabase
    .from('energy_forecasts')
    .select('gross_energy_demand, generated_solar_energy_consumed')
    .eq('project_id', projectId)
    .single();
  if (error || !forecast) {
    return;
  }
  const { gross_energy_demand, generated_solar_energy_consumed } = forecast as {
    gross_energy_demand: number[][];
    generated_solar_energy_consumed: number[][];
  };
  if (!gross_energy_demand || !generated_solar_energy_consumed) {
    return;
  }
  // 2. For each year and interval, calculate the post-solar demand
  const years = Math.min(gross_energy_demand.length, generated_solar_energy_consumed.length);
  const postSolar: number[][] = [];
  for (let year = 0; year < years; year++) {
    const demand = gross_energy_demand[year] || [];
    const consumed = generated_solar_energy_consumed[year] || [];
    const intervals = Math.min(demand.length, consumed.length);
    const yearPostSolar: number[] = [];
    for (let i = 0; i < intervals; i++) {
      yearPostSolar.push(demand[i] - consumed[i]);
    }
    postSolar.push(yearPostSolar);
  }
  // 3. Upsert to energy_forecasts
  const upsertPayload = {
    project_id: projectId,
    energy_demand_post_solar: postSolar,
  } as Database['public']['Tables']['energy_forecasts']['Insert'];
  await supabase
    .from('energy_forecasts')
    .upsert([upsertPayload], { onConflict: 'project_id' });
} 