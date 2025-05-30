import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, FolderPlusIcon, TrashIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import { projectManager } from '../../services/ProjectManager';
import type { SavedProject } from '../../utils/types';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save' | 'load';
  onSuccess?: (projectId: string) => void;
}

export default function ProjectsModal({ isOpen, onClose, mode, onSuccess }: ProjectsModalProps) {
  const [projects, setProjects] = useState<{
    id: string;
    name: string;
    updatedAt: number;
    thumbnailDataUrl?: string;
  }[]>([]);
  const [projectName, setProjectName] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Load projects list on modal open
  useEffect(() => {
    if (isOpen) {
      loadProjectsList();
      
      // Get current project
      const currentProject = projectManager.getCurrentProject();
      if (currentProject) {
        setCurrentProjectId(currentProject.id);
        
        // If in save mode, prefill the name
        if (mode === 'save') {
          setProjectName(currentProject.name);
        }
      } else {
        setCurrentProjectId(null);
        setProjectName('');
      }
    }
  }, [isOpen, mode]);
  
  // Load the list of projects
  const loadProjectsList = () => {
    try {
      const projectsList = projectManager.getProjectsList();
      
      // Sort by most recently updated
      projectsList.sort((a, b) => b.updatedAt - a.updatedAt);
      
      setProjects(projectsList);
      setError(null);
    } catch (err) {
      console.error('Error loading projects list:', err);
      setError('Failed to load projects list');
      setProjects([]);
    }
  };
  
  // Handle saving a project
  const handleSaveProject = () => {
    if (!projectName.trim()) {
      setError('Please enter a project name');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if we're updating an existing project
      if (currentProjectId) {
        const updated = projectManager.updateProject(currentProjectId, projectName);
        if (updated) {
          if (onSuccess) onSuccess(updated.id);
          onClose();
        } else {
          setError('Failed to update project');
        }
      } else {
        // Create a new project
        const newProject = projectManager.saveProject(projectName);
        if (onSuccess) onSuccess(newProject.id);
        onClose();
      }
    } catch (err) {
      console.error('Error saving project:', err);
      setError(`Failed to save project: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle loading a project
  const handleLoadProject = (projectId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const project = projectManager.loadProject(projectId);
      if (project) {
        if (onSuccess) onSuccess(project.id);
        onClose();
      } else {
        setError('Failed to load project');
      }
    } catch (err) {
      console.error('Error loading project:', err);
      setError(`Failed to load project: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deleting a project
  const handleDeleteProject = (projectId: string) => {
    if (confirmDelete !== projectId) {
      // First click - ask for confirmation
      setConfirmDelete(projectId);
      return;
    }
    
    // Second click - confirmed delete
    setLoading(true);
    
    try {
      projectManager.deleteProject(projectId);
      loadProjectsList();
      setConfirmDelete(null);
      
      // If we deleted the current project, clear the name
      if (projectId === currentProjectId) {
        setCurrentProjectId(null);
        setProjectName('');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all modal-content">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {mode === 'save' ? 'Save Project' : 'Load Project'}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Error display */}
                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
                    {error}
                  </div>
                )}

                {/* Save Mode UI */}
                {mode === 'save' && (
                  <div className="mb-4">
                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                          Project Name
                        </label>
                        <input
                          type="text"
                          id="project-name"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                          placeholder="Enter project name"
                          disabled={loading}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveProject}
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!projectName.trim() || loading}
                      >
                        {loading ? 'Saving...' : currentProjectId ? 'Update Project' : 'Save Project'}
                      </button>
                    </div>
                    
                    {currentProjectId && (
                      <p className="mt-2 text-sm text-gray-500">
                        You are updating an existing project. Click "Update Project" to save changes.
                      </p>
                    )}
                  </div>
                )}

                {/* Projects List */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    {projects.length > 0 
                      ? `Your Projects (${projects.length})` 
                      : 'No saved projects found'}
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                    {projects.map((project) => (
                      <div 
                        key={project.id}
                        className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                          currentProjectId === project.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                          {project.thumbnailDataUrl ? (
                            <img 
                              src={project.thumbnailDataUrl} 
                              alt={project.name}
                              className="w-full h-full object-contain" 
                            />
                          ) : (
                            <FolderPlusIcon className="h-12 w-12 text-gray-300" />
                          )}
                        </div>
                        
                        {/* Project details */}
                        <div className="p-3">
                          <h5 className="font-medium text-gray-900 mb-1 truncate">{project.name}</h5>
                          <p className="text-xs text-gray-500 mb-2">
                            Updated: {formatDate(project.updatedAt)}
                          </p>
                          
                          {/* Actions */}
                          <div className="flex space-x-2 mt-2">
                            {mode === 'load' ? (
                              <button
                                type="button"
                                onClick={() => handleLoadProject(project.id)}
                                className="flex-1 inline-flex justify-center items-center rounded-md border border-transparent bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                disabled={loading}
                              >
                                <ArrowDownOnSquareIcon className="h-4 w-4 mr-1" />
                                Load
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentProjectId(project.id);
                                  setProjectName(project.name);
                                }}
                                className={`flex-1 inline-flex justify-center items-center rounded-md border px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                  currentProjectId === project.id
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                                disabled={loading}
                              >
                                {currentProjectId === project.id ? 'Selected' : 'Select'}
                              </button>
                            )}
                            
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(project.id)}
                              className={`inline-flex justify-center items-center rounded-md border border-transparent px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                                confirmDelete === project.id
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                              disabled={loading}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 