import { supabase } from '@/lib/supabase/client';

function isWeekend(hourIdx: number): boolean {
  const dayOfWeek = Math.floor(hourIdx / 24) % 7;
  return dayOfWeek === 5 || dayOfWeek === 6;
}

function parseDbArray(val: any): number[] | null {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    if (val.startsWith('[')) {
      try {
        return JSON.parse(val);
      } catch (e) {
        return null;
      }
    }
    return val.replace(/[{}]/g, '').split(',').map(Number);
  }
  return null;
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

export async function runChargingDemandAnalysis(projectId: string) {
  const { data: hubs } = await supabase
    .from('charging_hubs')
    .select('id, charging_profile_id')
    .eq('project_id', projectId);
  if (!hubs) return;

  for (const hub of hubs) {
    let demand_profile: number[] = [];
    if (!hub.charging_profile_id) {
      demand_profile = Array(8760).fill(0);
    } else {
      const { data: profile } = await supabase
        .from('charging_profile_behaviour')
        .select('weekday_hourly_data, weekend_hourly_data, monthly_data')
        .eq('charging_profile_id', hub.charging_profile_id)
        .single();
      if (!profile) {
        demand_profile = Array(8760).fill(0);
      } else {
        let weekday_hourly_data = parseDbArray(profile.weekday_hourly_data);
        let weekend_hourly_data = parseDbArray(profile.weekend_hourly_data);
        let monthly_data = parseDbArray(profile.monthly_data);
        if (!weekday_hourly_data || !weekend_hourly_data || !monthly_data) {
          demand_profile = Array(8760).fill(0);
        } else {
          // New scaling: ensure sum of each month's hours matches monthly_data[month]
          const monthDays = [31,28,31,30,31,30,31,31,30,31,30,31];
          let hourIdx = 0;
          for (let month = 0; month < 12; month++) {
            const daysInMonth = monthDays[month];
            const hoursInMonth = daysInMonth * 24;
            // Build base profile for this month
            let baseProfile: number[] = [];
            for (let h = 0; h < hoursInMonth; h++) {
              const absHour = hourIdx + h;
              const isWknd = isWeekend(absHour);
              const hourOfDay = absHour % 24;
              const base = isWknd ? weekend_hourly_data[hourOfDay] : weekday_hourly_data[hourOfDay];
              baseProfile.push(base);
            }
            const baseSum = baseProfile.reduce((a, b) => a + b, 0) || 1; // avoid div by zero
            const scaling = monthly_data[month] / baseSum;
            for (let h = 0; h < hoursInMonth; h++) {
              demand_profile.push(baseProfile[h] * scaling);
            }
            hourIdx += hoursInMonth;
          }
        }
      }
    }
    // Calculate annual demand
    const demand_profile_annual_demand = sum(demand_profile);
    await supabase
      .from('charging_hubs')
      .update({ demand_profile, demand_profile_annual_demand })
      .eq('id', hub.id);
  }
}

export async function calculateChargingDemandDailyTotals(projectId: string) {
  const { data: hubs } = await supabase
    .from('charging_hubs')
    .select('id, demand_profile')
    .eq('project_id', projectId);
  if (!hubs) return;
  for (const hub of hubs) {
    let profile: number[] = Array.isArray(hub.demand_profile)
      ? hub.demand_profile
      : typeof hub.demand_profile === 'string' && hub.demand_profile.startsWith('[')
        ? JSON.parse(hub.demand_profile)
        : [];
    const dailyTotals: number[] = Array(365).fill(0);
    for (let d = 0; d < 365; d++) {
      dailyTotals[d] = sum(profile.slice(d * 24, d * 24 + 24));
    }
    await supabase
      .from('charging_hubs')
      .update({ demand_profile_daily_totals: dailyTotals })
      .eq('id', hub.id);
  }
}

export async function calculateChargingDemandMonthlyTotals(projectId: string) {
  const { data: hubs } = await supabase
    .from('charging_hubs')
    .select('id, demand_profile_daily_totals')
    .eq('project_id', projectId);
  if (!hubs) return;
  const monthDays = [31,28,31,30,31,30,31,31,30,31,30,31];
  for (const hub of hubs) {
    let dailyTotals: number[] = Array.isArray(hub.demand_profile_daily_totals)
      ? hub.demand_profile_daily_totals
      : typeof hub.demand_profile_daily_totals === 'string' && hub.demand_profile_daily_totals.startsWith('[')
        ? JSON.parse(hub.demand_profile_daily_totals)
        : [];
    let monthlyTotals: number[] = Array(12).fill(0);
    let idx = 0;
    for (let m = 0; m < 12; m++) {
      const days = monthDays[m];
      monthlyTotals[m] = sum(dailyTotals.slice(idx, idx + days));
      idx += days;
    }
    await supabase
      .from('charging_hubs')
      .update({ demand_profile_monthly_totals: monthlyTotals })
      .eq('id', hub.id);
  }
}

/**
 * Calculates and saves the hourly available capacity profile (8760 points) for each charging hub in the project.
 * Each value is charger_power * number_of_chargers (in kW), repeated for every hour of the year.
 * Saves the result to the charger_capacity_profile column (JSONB) in charging_hubs.
 */
export async function calculateChargingCapacityProfiles(projectId: string) {
  const { data: hubs, error } = await supabase
    .from('charging_hubs')
    .select('id, charger_power, number_of_chargers')
    .eq('project_id', projectId);
  if (error || !hubs) return;

  for (const hub of hubs) {
    const capacity = (hub.charger_power || 0) * (hub.number_of_chargers || 0); // kW
    // 8760 hours in a year
    const capacityProfile = Array(8760).fill(capacity);
    // Calculate daily totals (365 days)
    const dailyTotals = Array(365).fill(0).map((_, d) => {
      return capacityProfile.slice(d * 24, d * 24 + 24).reduce((a, b) => a + b, 0);
    });
    await supabase
      .from('charging_hubs')
      .update({ charger_capacity_profile: capacityProfile, charger_capacity_profile_daily_totals: dailyTotals })
      .eq('id', hub.id);
  }
} 