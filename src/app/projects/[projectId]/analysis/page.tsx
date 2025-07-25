'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { use, useState } from 'react';
import { GenerationTile, StorageTile, GridTile, ConsumptionTile, ChargingHubsSection, TariffsSection, SalesTariffsSection } from '@/components/technical';
import { ChargingProfilesSection } from '@/components/charging-profiles';
import { SolarGenerationSection, ChargingDemandSection, BatteryStorageSection, EnergyFlowSection } from '@/components/energy-modelling';
import { runMadridEnergyAnalysis, getMadridSolarProfile } from '@/components/energy-modelling/solarUtils';
import { runChargingDemandAnalysis, calculateChargingDemandDailyTotals, calculateChargingDemandMonthlyTotals, calculateChargingCapacityProfiles } from '@/components/energy-modelling/chargingDemandUtils';
import { runSolarForecasting, runCappedEnergyDemand, runGeneratedSolarEnergyConsumed, runGeneratedSolarEnergyExcessPostConsumption, runEnergyDemandPostSolar } from '@/components/energy-modelling/energyForecastingSolarUtils';
import { runBatteryForecasting } from '@/components/energy-modelling/energyForecastingBatteryUtils';
import { runEnergyDemandPostSolarBattery, runGridImport, runGeneratedSolarEnergyExcessPostConsumptionBattery, runGridExport, runEnergyDemandPostSolarBatteryGrid } from '@/components/energy-modelling/energyForecastingGridUtils';
import { supabase } from '@/lib/supabase/client';
import { useEffect } from 'react';
import { calculateEnergyFlows, runEnergyFlowAnalysis, runDailyAverageBatteryCharge, runDailyAverageBatteryDischarge } from '@/components/energy-modelling';
import { ProjectCostsSection } from '@/components/project-costs';

interface AnalysisPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const router = useRouter();
  const { projectId } = use(params);
  const [expandedSections, setExpandedSections] = useState<{
    projectDetails: boolean;
    chargingProfiles: boolean;
    technicalInputs: boolean;
    energyModelling: boolean;
    projectCosts: boolean;
    calculations: boolean;
    outputs: boolean;
    salesTariffs: boolean;
  }>({
    projectDetails: true,
    chargingProfiles: false,
    technicalInputs: false,
    energyModelling: false,
    projectCosts: true,
    calculations: false,
    outputs: false,
    salesTariffs: true,
  });
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);

  // Fetch generation data for kWp value
  useEffect(() => {
    const fetchGenerationData = async () => {
      const { data } = await supabase
        .from('generation_data')
        .select('*')
        .eq('project_id', projectId)
        .single();
      // setGenerationData(data); // Removed as per edit hint
      // setSolarProfile(data?.generation_profile_kWh || null); // Removed as per edit hint
    };
    fetchGenerationData();
  }, [projectId]);

  const handleBackToProjects = () => {
    router.push('/projects');
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleRunEnergyAnalysis = async () => {
    setIsRunningAnalysis(true);
    try {
      await runMadridEnergyAnalysis(projectId);
      await runChargingDemandAnalysis(projectId);
      await calculateChargingCapacityProfiles(projectId);
      await calculateChargingDemandDailyTotals(projectId);
      await calculateChargingDemandMonthlyTotals(projectId);
      await runSolarForecasting(projectId);
      await runCappedEnergyDemand(projectId);
      await runGeneratedSolarEnergyConsumed(projectId);
      await runGeneratedSolarEnergyExcessPostConsumption(projectId);
      await runEnergyDemandPostSolar(projectId);
      await runBatteryForecasting(projectId);
      await runEnergyDemandPostSolarBattery(projectId);
      await runGridImport(projectId);
      await runEnergyDemandPostSolarBatteryGrid(projectId);
      await runGeneratedSolarEnergyExcessPostConsumptionBattery(projectId);
      await runGridExport(projectId);

      await runEnergyFlowAnalysis(projectId);
      await runDailyAverageBatteryCharge(projectId);
      await runDailyAverageBatteryDischarge(projectId);
    } finally {
      setIsRunningAnalysis(false);
    }
  };

  const SectionHeader = ({ 
    title, 
    isExpanded, 
    onToggle, 
    actionButton 
  }: { 
    title: string; 
    isExpanded: boolean; 
    onToggle: () => void;
    actionButton?: React.ReactNode;
  }) => (
    <div className="w-full flex items-center justify-between p-4 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-t-lg border-b border-gray-200 dark:border-gray-600">
      <button
        onClick={onToggle}
        className="flex-1 flex items-center justify-between focus:outline-none"
        style={{ minWidth: 0 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {title}
        </h3>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      {actionButton && <div className="ml-4">{actionButton}</div>}
    </div>
  );

  const SectionContent = ({ 
    children, 
    isExpanded 
  }: { 
    children: React.ReactNode; 
    isExpanded: boolean;
  }) => (
    <div className={`transition-all duration-200 ease-in-out ${
      isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
    }`}>
      <div className="p-6 bg-white dark:bg-gray-800 rounded-b-lg border border-gray-200 dark:border-gray-600">
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToProjects}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Projects</span>
              </button>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Project Analysis
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Project #{projectId}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Analysis dashboard for project performance and insights
          </p>
        </div>

        {/* Analysis Sections */}
        <div className="space-y-6">
          {/* Project Details Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Project Details"
              isExpanded={expandedSections.projectDetails}
              onToggle={() => toggleSection('projectDetails')}
            />
            <SectionContent isExpanded={expandedSections.projectDetails}>
              <div className="text-gray-600 dark:text-gray-300">
                <p>Project details content will be displayed here</p>
              </div>
            </SectionContent>
          </div>

          {/* Charging Profiles Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Charging Profiles"
              isExpanded={expandedSections.chargingProfiles}
              onToggle={() => toggleSection('chargingProfiles')}
            />
            <SectionContent isExpanded={expandedSections.chargingProfiles}>
              <ChargingProfilesSection projectId={projectId} />
            </SectionContent>
          </div>

          {/* Technical Inputs Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Technical Inputs"
              isExpanded={expandedSections.technicalInputs}
              onToggle={() => toggleSection('technicalInputs')}
            />
            <SectionContent isExpanded={expandedSections.technicalInputs}>
              {/* Main Technical Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <GenerationTile projectId={projectId} />
                <StorageTile projectId={projectId} />
                <GridTile projectId={projectId} />
              </div>
              
              {/* Sales Tariffs Section (no collapsible box) */}
              <SalesTariffsSection projectId={projectId} />
              {/* Tariffs Section */}
              <TariffsSection projectId={projectId} />
              <div className="border-t border-gray-200 dark:border-gray-700 my-8"></div>
              {/* Charging Hubs Section */}
              <ChargingHubsSection projectId={projectId} />
            </SectionContent>
          </div>

          {/* Energy Modelling Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Energy Modelling"
              isExpanded={expandedSections.energyModelling}
              onToggle={() => toggleSection('energyModelling')}
              actionButton={
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold shadow"
                  type="button"
                  onClick={e => { e.stopPropagation(); handleRunEnergyAnalysis(); }}
                  disabled={isRunningAnalysis}
                >
                  {isRunningAnalysis ? 'Running...' : 'Run Energy Analysis'}
                </button>
              }
            />
            <SectionContent isExpanded={expandedSections.energyModelling}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Solar Generation</h3>
              <SolarGenerationSection projectId={projectId} />
              <div className="border-t border-gray-200 dark:border-gray-700 my-8"></div>
              <ChargingDemandSection projectId={projectId} />
              <div className="border-t border-gray-200 dark:border-gray-700 my-8"></div>
              <BatteryStorageSection projectId={projectId} />
              <div className="border-t border-gray-200 dark:border-gray-700 my-8"></div>
              <EnergyFlowSection projectId={projectId} />
            </SectionContent>
          </div>

          {/* Project Costs Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Project Costs"
              isExpanded={expandedSections.projectCosts}
              onToggle={() => toggleSection('projectCosts')}
            />
            <SectionContent isExpanded={expandedSections.projectCosts}>
              <ProjectCostsSection projectId={projectId} />
            </SectionContent>
          </div>

          {/* Calculations Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Calculations"
              isExpanded={expandedSections.calculations}
              onToggle={() => toggleSection('calculations')}
            />
            <SectionContent isExpanded={expandedSections.calculations}>
              <div className="text-gray-600 dark:text-gray-300">
                <p>Calculations content will be displayed here</p>
              </div>
            </SectionContent>
          </div>

          {/* Outputs Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Outputs"
              isExpanded={expandedSections.outputs}
              onToggle={() => toggleSection('outputs')}
            />
            <SectionContent isExpanded={expandedSections.outputs}>
              <div className="text-gray-600 dark:text-gray-300">
                <p>Outputs content will be displayed here</p>
              </div>
            </SectionContent>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleBackToProjects}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    </div>
  );
} 