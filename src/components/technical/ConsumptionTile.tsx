'use client';

import { useState } from 'react';
import { Car, Settings } from 'lucide-react';
import ConsumptionModal from './ConsumptionModal';

interface ConsumptionTileProps {
  projectId: string;
}

export default function ConsumptionTile({ projectId }: ConsumptionTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Car className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Charging Hub
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                EV Charging Station
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Charger Power:</span>
            <span className="font-medium text-gray-900 dark:text-white">Not configured</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Daily Usage:</span>
            <span className="font-medium text-gray-900 dark:text-white">Not configured</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Charging Pattern:</span>
            <span className="font-medium text-gray-900 dark:text-white">Not configured</span>
          </div>
        </div>
      </div>

      <ConsumptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
      />
    </>
  );
} 