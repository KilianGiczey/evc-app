import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

interface EnergyFlowSectionProps {
  projectId: string;
}

interface EnergyFlows {
  flow_solar_to_chargers: number;
  flow_solar_to_battery: number;
  flow_solar_to_grid: number;
  flow_battery_to_chargers: number;
  flow_grid_to_battery: number;
  flow_grid_to_chargers: number;
}

// These positions are visually estimated from the SVG layout (2598x1299)
const labelPositions = {
  flow_solar_to_chargers: { left: '55%', top: '60%' },
  flow_solar_to_battery: { left: '45%', top: '8%' },
  flow_solar_to_grid: { left: '18%', top: '45%' },
  flow_battery_to_chargers: { left: '65%', top: '45%' },
  flow_grid_to_battery: { left: '55%', top: '30%' },
  flow_grid_to_chargers: { left: '45%', top: '85%' },
};

const formatFlow = (val: number) => `${Math.round(val).toLocaleString()} kWh`;

const EnergyFlowSection: React.FC<EnergyFlowSectionProps> = ({ projectId }) => {
  const [flows, setFlows] = useState<EnergyFlows | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlows = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('energy_forecasts')
        .select(
          'flow_solar_to_chargers, flow_solar_to_battery, flow_solar_to_grid, flow_battery_to_chargers, flow_grid_to_battery, flow_grid_to_chargers'
        )
        .eq('project_id', projectId)
        .single();
      if (error) {
        setError('Error loading energy flow data');
        setLoading(false);
        return;
      }
      setFlows(data as EnergyFlows);
      setLoading(false);
    };
    fetchFlows();
  }, [projectId]);

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">Loading energy flow data...</div>;
  }
  if (error || !flows) {
    return <div className="flex items-center justify-center h-40 text-red-600 dark:text-red-400">{error || 'No energy flow data available.'}</div>;
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Energy Flow</h3>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-8">
        <div className="relative w-full max-w-4xl mx-auto" style={{ aspectRatio: '2 / 1' }}>
          {/* SVG Graphic as base */}
          <Image
            src={require('@/resources/energyFlowGraphic.svg')}
            alt="Energy Flow Diagram"
            fill
            style={{ objectFit: 'contain', zIndex: 0 }}
            priority
          />
          {/* Overlay flow value labels only */}
          <div className="absolute inset-0 pointer-events-none">
            <span className="absolute text-sm font-semibold text-yellow-400 dark:text-yellow-300" style={labelPositions.flow_solar_to_chargers}>{"Solar to Chargers:"}<br />{formatFlow(flows.flow_solar_to_chargers)}</span>
            <span className="absolute text-sm font-semibold text-yellow-400 dark:text-yellow-300" style={labelPositions.flow_solar_to_battery}>{"Solar to Battery:"}<br />{formatFlow(flows.flow_solar_to_battery)}</span>
            <span className="absolute text-sm font-semibold text-yellow-400 dark:text-yellow-300" style={labelPositions.flow_solar_to_grid}>{"Solar to Grid:"}<br />{formatFlow(flows.flow_solar_to_grid)}</span>
            <span className="absolute text-sm font-semibold text-orange-400 dark:text-orange-300" style={labelPositions.flow_battery_to_chargers}>{"Battery to Chargers:"}<br />{formatFlow(flows.flow_battery_to_chargers)}</span>
            <span className="absolute text-sm font-semibold text-blue-400 dark:text-blue-300" style={labelPositions.flow_grid_to_battery}>{"Grid to Battery:"}<br />{formatFlow(flows.flow_grid_to_battery)}</span>
            <span className="absolute text-sm font-semibold text-blue-400 dark:text-blue-300" style={labelPositions.flow_grid_to_chargers}>{"Grid to Chargers:"}<br />{formatFlow(flows.flow_grid_to_chargers)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyFlowSection; 