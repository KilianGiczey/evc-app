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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SolarGenerationSectionProps {
  projectId: string;
}

const monthLabels = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

const yellow = '#facc15'; // Tailwind yellow-400

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: { enabled: true },
    dragData: false,
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#64748b' }, // Reverted to default
    },
    y: {
      grid: { color: '#e5e7eb' },
      ticks: { color: '#64748b' },
    },
  },
  maintainAspectRatio: false,
  interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
};

const chartContainerClass =
  'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 min-w-0 pb-8'; // Added pb-8 for extra bottom padding

const SolarGenerationSection: React.FC<SolarGenerationSectionProps> = ({ projectId }) => {
  const [monthlyTotals, setMonthlyTotals] = useState<number[] | null>(null);
  const [hourlyAverages, setHourlyAverages] = useState<number[] | null>(null);
  const [solarYield, setSolarYield] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('generation_data')
        .select('monthly_totals, hourly_averages, solar_yield')
        .eq('project_id', projectId)
        .single();
      if (error) {
        setError('Error loading solar generation data');
        setLoading(false);
        return;
      }
      setMonthlyTotals(data?.monthly_totals || null);
      setHourlyAverages(data?.hourly_averages || null);
      setSolarYield(data?.solar_yield ?? null);
      setLoading(false);
    };
    fetchData();
  }, [projectId]);

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">Loading solar generation data...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-40 text-red-600 dark:text-red-400">{error}</div>;
  }
  if (!monthlyTotals || !hourlyAverages || solarYield === null) {
    return <div className="flex items-center justify-center h-40 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300">No solar generation data available. Run analysis to generate data.</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className={chartContainerClass} style={{ height: 260, minWidth: 0 }}>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Monthly Generation (kWh)</h4>
          <Bar
            data={{
              labels: monthLabels,
              datasets: [
                {
                  label: 'Monthly Generation (kWh)',
                  data: monthlyTotals,
                  backgroundColor: yellow,
                  borderRadius: 4,
                },
              ],
            }}
            options={chartOptions}
            height={200}
          />
        </div>
        <div className={chartContainerClass} style={{ height: 260, minWidth: 0 }}>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Average Hourly Generation (kWh)</h4>
          <Line
            data={{
              labels: hourLabels,
              datasets: [
                {
                  label: 'Hourly Average (kWh)',
                  data: hourlyAverages,
                  borderColor: yellow,
                  backgroundColor: 'rgba(250, 204, 21, 0.2)',
                  tension: 0.3,
                  pointRadius: 2,
                  fill: true,
                },
              ],
            }}
            options={chartOptions}
            height={200}
          />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-4 flex flex-col items-center">
        <span className="text-lg font-semibold text-gray-900 dark:text-white">Solar Yield</span>
        <span className="text-2xl font-bold text-yellow-400 dark:text-yellow-300 mt-2">{solarYield.toFixed(1)} kWh/kWp</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Annual yield per installed kWp</span>
      </div>
    </div>
  );
};

export default SolarGenerationSection; 