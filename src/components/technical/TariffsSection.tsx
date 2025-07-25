import EnergyTariffTile from './EnergyTariffTile';
import NetworkTariffTile from './NetworkTariffTile';

interface TariffsSectionProps {
  projectId: string;
}

export default function TariffsSection({ projectId }: TariffsSectionProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Import Tariffs
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EnergyTariffTile projectId={projectId} />
        <NetworkTariffTile projectId={projectId} />
      </div>
    </div>
  );
} 