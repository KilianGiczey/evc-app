import type { Project } from '@/types/database';

interface ProjectTileProps {
  project: Project;
  onClick: (project: Project) => void;
}

export default function ProjectTile({ project, onClick }: ProjectTileProps) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
      onClick={() => onClick(project)}
    >
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {project.name}
      </h2>
      <p className="text-gray-600 dark:text-gray-300">
        {project.description || 'No description'}
      </p>
    </div>
  );
} 