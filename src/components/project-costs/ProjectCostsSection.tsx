import React from 'react';
import CapitalCostsSection from './CapitalCostsSection';
import OperatingCostsSection from './OperatingCostsSection';

interface ProjectCostsSectionProps {
  projectId: string;
}

const ProjectCostsSection: React.FC<ProjectCostsSectionProps> = ({ projectId }) => {
  return (
    <section>
      <CapitalCostsSection projectId={projectId} />
      <div className="border-t border-gray-200 dark:border-gray-700 my-8"></div>
      <OperatingCostsSection projectId={projectId} />
    </section>
  );
};

export default ProjectCostsSection; 