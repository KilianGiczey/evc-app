'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import dragData from 'chartjs-plugin-dragdata';

// Register Chart.js components and plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  dragData
);

interface InteractiveChartProps {
  data: number[];
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  onDataChange: (newData: number[]) => void;
  minValue?: number;
  step?: number;
  xAxisLabels?: string[];
  chartType?: 'line' | 'bar'; // ADDED
}

export default function InteractiveChart({
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  onDataChange,
  minValue = 0,
  step = 1,
  xAxisLabels,
  chartType = 'line', // ADDED
}: InteractiveChartProps) {
  const [chartData, setChartData] = useState(data);
  const [isDragging, setIsDragging] = useState(false);
  const chartRef = useRef<any>(null); // allow both line/bar

  // Update chart data when prop data changes
  useEffect(() => {
    setChartData(data);
  }, [data]);

  // Calculate dynamic Y-axis range based on data
  const calculateYAxisRange = useCallback(() => {
    if (chartData.length === 0) {
      return { min: minValue, max: 100, stepSize: 25 };
    }
    
    const maxDataValue = Math.max(...chartData);
    const dynamicMax = maxDataValue * 2; // Double the max value
    
    return {
      min: minValue,
      max: dynamicMax,
      stepSize: Math.ceil(dynamicMax / 10) // Dynamic step size
    };
  }, [chartData, minValue]);

  // Update Y-axis when data changes (but not while dragging)
  useEffect(() => {
    if (!isDragging && chartRef.current) {
      const yAxisRange = calculateYAxisRange();
      const chart = chartRef.current;
      
      // Update chart options safely
      if (chart.options.scales?.y) {
        chart.options.scales.y.min = yAxisRange.min;
        chart.options.scales.y.max = yAxisRange.max;
        if (chart.options.scales.y.ticks) {
          (chart.options.scales.y.ticks as any).stepSize = yAxisRange.stepSize;
        }
        
        chart.update('none'); // Update without animation
      }
    }
  }, [chartData, isDragging, calculateYAxisRange]);

  // Check for data changes periodically during drag operations
  useEffect(() => {
    const interval = setInterval(() => {
      if (chartRef.current) {
        const currentData = chartRef.current.data.datasets[0].data as number[];
        if (JSON.stringify(currentData) !== JSON.stringify(chartData)) {
          console.log('Data changed detected:', currentData);
          onDataChange(currentData);
        }
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [chartData, onDataChange]);

  const yAxisRange = calculateYAxisRange();

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.parsed.y.toFixed(1)}`;
          },
          title: (items) => `${xAxisLabel} ${items[0].dataIndex}`
        }
      },
      dragData: {
        round: step,
        dragX: false,
        dragY: true,
        onDragStart: (e, datasetIndex, index, value) => {
          console.log('Drag started:', index, value);
          setIsDragging(true);
        },
        onDrag: (e, datasetIndex, index, value) => {
          console.log('Dragging:', index, value);
        },
        onDragEnd: (e, datasetIndex, index, value) => {
          console.log('Drag ended:', index, value);
          setIsDragging(false);
          if (typeof value === 'number') {
            const newData = [...chartData];
            newData[index] = value;
            console.log('Updating data:', newData);
            onDataChange(newData);
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: xAxisLabel
        },
        ticks: {
          stepSize: 1
        }
      },
      y: {
        title: {
          display: true,
          text: yAxisLabel
        },
        min: yAxisRange.min,
        max: yAxisRange.max,
        ticks: {
          stepSize: yAxisRange.stepSize,
          callback: function(value) {
            return Math.round(Number(value));
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  };

  const chartDataConfig = {
    labels: xAxisLabels && xAxisLabels.length === chartData.length ? xAxisLabels : chartData.map((_, index) => index.toString()),
    datasets: [
      {
        label: title,
        data: chartData,
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        borderWidth: 3,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#3b82f6',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#1d4ed8',
        pointHoverBorderColor: '#3b82f6',
        pointHoverBorderWidth: 2,
        tension: 0.1
      }
    ]
  };

  // Use correct chart component
  const ChartComponent = chartType === 'bar' ? Bar : Line;

  // Fix tooltip type for both line and bar
  const chartOptionsTyped = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins?.tooltip,
        callbacks: {
          ...chartOptions.plugins?.tooltip?.callbacks,
          title: (items: any) => {
            if (xAxisLabels && items[0]) {
              return `${xAxisLabel} ${xAxisLabels[items[0].dataIndex]}`;
            }
            return `${xAxisLabel} ${items[0].dataIndex}`;
          }
        }
      }
    }
  } as ChartOptions<'line'> & ChartOptions<'bar'>;

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h4>
      <div className="relative" style={{ height: '200px' }}>
        <ChartComponent
          ref={chartRef}
          data={chartDataConfig}
          options={chartOptionsTyped}
        />
      </div>
    </div>
  );
} 