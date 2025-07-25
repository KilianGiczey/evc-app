import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface BatteryStorageSectionProps {
  projectId: string;
}

const hourLabels = Array.from({ length: 24 }, (_, i) => i.toString());
const yellow = '#facc15'; // Tailwind yellow-400 (solar)
const orange = '#f97316'; // Tailwind orange-500 (battery storage icon)

const BatteryStorageSection: React.FC<BatteryStorageSectionProps> = ({ projectId }) => {
  const [charging, setCharging] = useState<number[] | null>(null);
  const [discharging, setDischarging] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('energy_forecasts')
        .select('daily_average_battery_charging, daily_average_battery_discharging')
        .eq('project_id', projectId)
        .single();
      if (error) {
        setError('Error loading battery storage data');
        setLoading(false);
        return;
      }
      setCharging(data?.daily_average_battery_charging || null);
      setDischarging(data?.daily_average_battery_discharging || null);
      setLoading(false);
    };
    fetchData();
  }, [projectId]);

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">Loading battery storage data...</div>;
  }
  if (error || !charging || !discharging) {
    return <div className="flex items-center justify-center h-40 text-red-600 dark:text-red-400">{error || 'No battery storage data available.'}</div>;
  }

  const data = {
    labels: hourLabels,
    datasets: [
      {
        label: 'Charging (kWh)',
        data: charging,
        borderColor: yellow,
        backgroundColor: 'rgba(250,204,21,0.2)',
        tension: 0.2,
        fill: false,
        pointBackgroundColor: yellow,
        pointBorderColor: yellow,
      },
      {
        label: 'Discharging (kWh)',
        data: discharging,
        borderColor: orange,
        backgroundColor: 'rgba(249,115,22,0.2)',
        tension: 0.2,
        fill: false,
        pointBackgroundColor: orange,
        pointBorderColor: orange,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 18,
          boxHeight: 18,
          padding: 18,
        },
      },
      title: {
        display: true,
        text: 'Daily Average Battery Charging & Discharging',
        font: { size: 18, weight: 'bold' as const },
        color: '#111827',
        padding: { top: 8, bottom: 16 },
        align: 'start' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kWh`,
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Hour of Day',
        }
      },
      y: {
        title: {
          display: true,
          text: 'kWh',
        },
        beginAtZero: true,
      }
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Battery Storage</h3>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-8 flex flex-col" style={{ minHeight: 400 }}>
        <div className="w-full h-80" style={{ minHeight: 320, minWidth: 0 }}>
          <Line data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

export default BatteryStorageSection; 