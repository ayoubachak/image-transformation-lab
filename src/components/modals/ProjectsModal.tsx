import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, FolderPlusIcon, TrashIcon, ArrowDownOnSquareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { projectManager } from '../../services/ProjectManager';
import type { SavedProject } from '../../utils/types';
import { usePipeline } from '../../contexts/PipelineContext';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save' | 'load' | 'new';
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
  const [showConfirmNew, setShowConfirmNew] = useState(false);
  const { nodes } = usePipeline();

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

      // If mode is 'new' and there's a current project or nodes in the pipeline, show confirmation
      if (mode === 'new' && (currentProject || nodes.length > 0)) {
        setShowConfirmNew(true);
      }
    }
  }, [isOpen, mode, nodes]);
  
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
  
  // Handle creating a new project
  const handleNewProject = () => {
    try {
      projectManager.createNewProject();
      if (onSuccess) onSuccess('new_project');
      onClose();
    } catch (err) {
      console.error('Error creating new project:', err);
      setError(`Failed to create new project: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Render the new project confirmation dialog
  const renderNewProjectConfirmation = () => {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
          </div>
          <h3 className="ml-3 text-lg font-medium leading-6 text-gray-900">
            Create New Project?
          </h3>
        </div>
        
        <div className="mt-2">
          <p className="text-sm text-gray-500 mb-3">
            This will clear your current work. Do you want to save your current project first?
          </p>
          
          <div className="flex flex-col space-y-3 mt-6">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => {
                setShowConfirmNew(false);
                setMode('save');
              }}
            >
              Save Current Project First
            </button>
            
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              onClick={handleNewProject}
            >
              Discard Changes & Create New Project
            </button>
            
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Handle mode change - useful for "Save First" option
  const setMode = (newMode: 'save' | 'load' | 'new') => {
    // We can't directly modify the prop, but we can simulate changing it
    if (newMode === 'save') {
      // Get current project name for the save dialog
      const currentProject = projectManager.getCurrentProject();
      if (currentProject) {
        setProjectName(currentProject.name);
      }
    }
    
    // This is just for local UI state
    // The actual mode prop will be updated by the parent component on the next render
    if (newMode === 'new') {
      setShowConfirmNew(true);
    } else {
      setShowConfirmNew(false);
    }
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
                {/* New Project Confirmation */}
                {showConfirmNew ? (
                  renderNewProjectConfirmation()
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        {mode === 'save' ? 'Save Project' : mode === 'load' ? 'Load Project' : 'New Project'}
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

                    {/* Content varies based on mode */}
                    {mode === 'new' && !showConfirmNew && (
                      <div className="flex flex-col items-center justify-center p-8">
                        <FolderPlusIcon className="h-16 w-16 text-blue-500 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Create New Project</h3>
                        <p className="text-gray-600 mb-6 text-center">
                          This will create a new empty project and clear the current canvas.
                        </p>
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={handleNewProject}
                          disabled={loading}
                        >
                          {loading ? 'Creating...' : 'Create New Project'}
                        </button>
                      </div>
                    )}
                    
                    {/* Save Mode UI */}
                    {mode === 'save' && (
                      <div>
                        <div className="mb-6">
                          <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                            Project Name
                          </label>
                          <input
                            type="text"
                            id="project-name"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Enter project name..."
                          />
                        </div>
                        
                        {currentProjectId && (
                          <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md">
                            Updating existing project: {projectName}
                          </div>
                        )}
                        
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mr-3"
                            onClick={onClose}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            onClick={handleSaveProject}
                            disabled={loading || !projectName.trim()}
                          >
                            {loading ? 'Saving...' : 'Save Project'}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Load Mode UI */}
                    {mode === 'load' && (
                      <div>
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Your Projects</h4>
                          {projects.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-md">
                              <p className="text-gray-500">No saved projects found</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                              {projects.map((project) => (
                                <div
                                  key={project.id}
                                  className={`border rounded-md overflow-hidden hover:shadow-md transition-shadow ${
                                    currentProjectId === project.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                                  }`}
                                >
                                  <div className="h-32 bg-gray-100 border-b border-gray-200 flex items-center justify-center relative">
                                    {project.thumbnailDataUrl ? (
                                      <img
                                        src={project.thumbnailDataUrl}
                                        alt={project.name}
                                        className="max-h-full max-w-full object-contain"
                                      />
                                    ) : (
                                      <div className="text-gray-400">
                                        <FolderPlusIcon className="h-12 w-12" />
                                      </div>
                                    )}
                                    {currentProjectId === project.id && (
                                      <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                        Current
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-3">
                                    <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Updated: {formatDate(project.updatedAt)}
                                    </p>
                                    <div className="flex justify-between items-center mt-3">
                                      <button
                                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                        onClick={() => handleLoadProject(project.id)}
                                      >
                                        <ArrowDownOnSquareIcon className="h-4 w-4 mr-1" />
                                        Load
                                      </button>
                                      <button
                                        className={`text-red-600 hover:text-red-800 text-sm flex items-center ${
                                          confirmDelete === project.id ? 'font-bold' : ''
                                        }`}
                                        onClick={() => handleDeleteProject(project.id)}
                                      >
                                        <TrashIcon className="h-4 w-4 mr-1" />
                                        {confirmDelete === project.id ? 'Confirm' : 'Delete'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end mt-4">
                          <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            onClick={onClose}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 