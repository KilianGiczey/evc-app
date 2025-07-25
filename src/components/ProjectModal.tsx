import type { Project } from '@/types/database';
import { useRouter } from 'next/navigation';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  const router = useRouter();
  
  if (!project) return null;

  const handleAnalysis = () => {
    onClose();
    router.push(`/projects/${project.id}/analysis`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-md w-full relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {project.name}
        </h2>
        <p className="mb-4 text-gray-700 dark:text-gray-200">
          {project.description || 'No description available.'}
        </p>
        {/* Evaluation UI goes here */}
        <div className="text-gray-500 mb-6">Project evaluation coming soon...</div>
        
        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAnalysis}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Analysis
          </button>
        </div>
      </div>
    </div>
  );
} 