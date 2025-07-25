import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChargingDemandSectionProps {
  projectId: string;
}

const monthLabels = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const yellow = '#facc15';
// Replace the colors array with green shades
const greens = [
  '#16a34a', // Tailwind green-600
  '#22c55e', // Tailwind green-500
  '#4ade80', // Tailwind green-400
  '#86efac', // Tailwind green-300
  '#bbf7d0', // Tailwind green-200
  '#dcfce7', // Tailwind green-100
  '#166534', // Tailwind green-800
  '#15803d', // Tailwind green-700
  '#a7f3d0', // Tailwind green-200 alt
  '#6ee7b7', // Tailwind green-300 alt
];

function getColor(idx: number) {
  return greens[idx % greens.length];
}

export const ChargingDemandSection: React.FC<ChargingDemandSectionProps> = ({ projectId }) => {
  const [dailyTotals, setDailyTotals] = useState<number[][]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<number[][]>([]);
  const [annualDemand, setAnnualDemand] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hubNames, setHubNames] = useState<string[]>([]);
  const [capacityDailyTotals, setCapacityDailyTotals] = useState<number[][]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('charging_hubs')
        .select('id, hub_name, demand_profile_daily_totals, demand_profile_monthly_totals, demand_profile_annual_demand, charger_capacity_profile_daily_totals')
        .eq('project_id', projectId);
      if (error) {
        setError('Error loading charging demand data');
        setLoading(false);
        return;
      }
      // Parse arrays if stringified
      const daily = (data || []).map((hub: any) =>
        typeof hub.demand_profile_daily_totals === 'string' && hub.demand_profile_daily_totals.startsWith('[')
          ? JSON.parse(hub.demand_profile_daily_totals)
          : hub.demand_profile_daily_totals || []
      );
      const monthly = (data || []).map((hub: any) =>
        typeof hub.demand_profile_monthly_totals === 'string' && hub.demand_profile_monthly_totals.startsWith('[')
          ? JSON.parse(hub.demand_profile_monthly_totals)
          : hub.demand_profile_monthly_totals || []
      );
      setDailyTotals(daily);
      setMonthlyTotals(monthly);
      setHubNames((data || []).map((hub: any) => hub.hub_name || 'Unnamed Hub'));
      // Sum annual demand across all hubs
      const totalAnnual = (data || []).reduce((sum: number, hub: any) => sum + (hub.demand_profile_annual_demand || 0), 0);
      setAnnualDemand(totalAnnual);
      setCapacityDailyTotals((data || []).map((hub: any) =>
        typeof hub.charger_capacity_profile_daily_totals === 'string' && hub.charger_capacity_profile_daily_totals.startsWith('[')
          ? JSON.parse(hub.charger_capacity_profile_daily_totals)
          : hub.charger_capacity_profile_daily_totals || []
      ));
      setLoading(false);
    };
    fetchData();
  }, [projectId]);

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">Loading charging demand data...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-40 text-red-600 dark:text-red-400">{error}</div>;
  }
  if (!dailyTotals.length || !monthlyTotals.length) {
    return <div className="flex items-center justify-center h-40 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300">No charging demand data available. Run analysis to generate data.</div>;
  }

  // Stacked area chart for daily demand
  const areaData = {
    labels: Array.from({ length: 365 }, (_, i) => `Day ${i + 1}`),
    datasets: dailyTotals.map((days, idx) => ({
      label: hubNames[idx] || `Hub ${idx + 1}`,
      data: days,
      fill: true,
      backgroundColor: getColor(idx) + '33',
      borderColor: getColor(idx),
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
      stack: 'demand',
    })),
  };

  // Column chart for monthly totals (sum across all hubs)
  const summedMonthly: number[] = Array(12).fill(0);
  for (let m = 0; m < 12; m++) {
    for (let h = 0; h < monthlyTotals.length; h++) {
      summedMonthly[m] += monthlyTotals[h][m] || 0;
    }
  }
  const barData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Total Monthly Demand (kWh)',
        data: summedMonthly,
        backgroundColor: '#16a34a', // Tailwind green-600
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: false },
      tooltip: { enabled: true },
      dragData: false,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b' },
      },
      y: {
        grid: { color: '#e5e7eb' },
        ticks: { color: '#64748b' },
      },
    },
    maintainAspectRatio: false,
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
  };

  // New: Line graph data for summed daily capacity and demand
  const summedCapacity: number[] = Array(365).fill(0);
  const summedDemand: number[] = Array(365).fill(0);
  for (let d = 0; d < 365; d++) {
    for (let h = 0; h < capacityDailyTotals.length; h++) {
      summedCapacity[d] += capacityDailyTotals[h][d] || 0;
    }
    for (let h = 0; h < dailyTotals.length; h++) {
      summedDemand[d] += dailyTotals[h][d] || 0;
    }
  }
  const capacityVsDemandData = {
    labels: Array.from({ length: 365 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: ' (kWh)',
        data: summedCapacity,
        borderColor: '#0ea5e9', // Tailwind blue-500
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
        fill: false,
      },
      {
        label: 'Total Daily Demand (kWh)',
        data: summedDemand,
        borderColor: '#16a34a', // Tailwind green-600
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
        fill: false,
      },
    ],
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Charging Demand</h3>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 min-w-0 pb-8" style={{ height: 260 }}>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Daily Demand by Hub (kWh)</h4>
          <Line data={areaData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: true, position: 'bottom' } } }} height={200} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 min-w-0 pb-8" style={{ height: 260 }}>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Total Monthly Demand (kWh)</h4>
          <Bar data={barData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} height={200} />
        </div>
      </div>
      {annualDemand !== null && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-4 flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Annual EV Charging Demand</span>
          <span className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{annualDemand.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Sum of all hubs' annual demand</span>
        </div>
      )}
      {/* New: Capacity vs Demand Line Graph */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-4" style={{ height: 300, paddingBottom: 48 }}>
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Total Daily Capacity vs Demand (kWh)</h4>
        <Line data={capacityVsDemandData} options={{
          ...chartOptions,
          plugins: { ...chartOptions.plugins, legend: { display: true, position: 'bottom' } },
        }} height={200} />
      </div>
    </div>
  );
};

export default ChargingDemandSection; 