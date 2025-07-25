'use client'

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import ProjectTile from '@/components/ProjectTile';
import ProjectModal from '@/components/ProjectModal';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/types/database';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching projects...');
        const { data, error } = await supabase.from('projects').select('*');
        
        console.log('Supabase response:', { data, error });
        
        if (error) {
          console.error('Error fetching projects:', error);
          setError(error.message);
        } else if (data) {
          console.log('Projects fetched successfully:', data);
          setProjects(data as Project[]);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Projects</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center text-gray-500">Loading projects...</div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectTile
                key={project.id}
                project={project}
                onClick={setSelectedProject}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p className="text-lg mb-4">No projects found</p>
            <p className="text-sm">Projects will appear here once they are added to the database.</p>
          </div>
        )}
        
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      </main>
    </div>
  );
} 