// eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore: Large dynamic JSON, type as any for now
const madridProfiles: any = require('@/resources/solarProfiles/Madrid_Solar_Profiles.json');
import { supabase } from '@/lib/supabase/client';

// Map cardinal orientation to azimuth degrees
const ORIENTATION_TO_AZIMUTH: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

// Helper to round tilt to nearest 5
function roundTilt(tilt: number): number {
  return Math.round(tilt / 5) * 5;
}

// Main function to get raw solar profile (Wh, per 1 kWp, unscaled)
export function getMadridSolarProfile({
  orientation,
  tilt,
}: {
  orientation: string; // 'N', 'E', ...
  tilt: number;
}): number[] | null {
  const locationKey = '40.4168,-3.7038';
  const azimuth = ORIENTATION_TO_AZIMUTH[orientation];
  if (azimuth === undefined) return null;
  const tiltRounded = roundTilt(tilt);
  const azimuthKey = `azimuth_${azimuth}`;
  const tiltKey = `tilt_${tiltRounded}`;

  const arr =
    madridProfiles?.[locationKey]?.[azimuthKey]?.[tiltKey] ?? null;
  if (!arr || !Array.isArray(arr)) return null;
  return arr;
}

// Calculate total monthly generation (12 points)
export function getMonthlyTotals(profile: number[]): number[] {
  // Days in each month for a non-leap year
  const daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];
  let idx = 0;
  return daysInMonth.map(days => {
    const total = profile.slice(idx, idx + days * 24).reduce((sum, v) => sum + v, 0);
    idx += days * 24;
    return total;
  });
}

// Calculate average generation for each hour of the day (24 points)
export function getHourlyAverages(profile: number[]): number[] {
  const hourlySums = Array(24).fill(0);
  const hourlyCounts = Array(24).fill(0);
  for (let i = 0; i < profile.length; i++) {
    const hour = i % 24;
    hourlySums[hour] += profile[i];
    hourlyCounts[hour]++;
  }
  return hourlySums.map((sum, hour) => sum / hourlyCounts[hour]);
}

// Calculate solar yield: total annual generation / installed capacity
export function getSolarYield(profile: number[], kWp: number): number {
  if (!kWp || kWp === 0) return 0;
  const total = profile.reduce((sum, v) => sum + v, 0);
  return total / kWp;
}

export async function runMadridEnergyAnalysis(projectId: string) {
  try {
    // Fetch generation data
    const { data: generationData } = await supabase
      .from('generation_data')
      .select('*')
      .eq('project_id', projectId)
      .single();
    if (!generationData) return;
    const { orientation, tilt, system_size_kwp, system_losses } = generationData;
    // Get raw profile (Wh, per 1 kWp)
    const rawProfile = getMadridSolarProfile({ orientation, tilt });
    if (!rawProfile) return;
    // Scale by kWp, convert Wh to kWh, apply system losses
    const lossFactor = 1 - (system_losses || 0) / 100;
    const profile = rawProfile.map((v: number) => (v * system_size_kwp / 1000) * lossFactor);
    // Calculate summaries
    const monthly_totals = getMonthlyTotals(profile);
    const hourly_averages = getHourlyAverages(profile);
    const solar_yield = getSolarYield(profile, system_size_kwp);
    // Save all outputs to DB
    await supabase
      .from('generation_data')
      .update({
        generation_profile_kWh: profile,
        monthly_totals,
        hourly_averages,
        solar_yield,
      })
      .eq('project_id', projectId);
  } catch (e) {
    // Optionally log error
  }
} 