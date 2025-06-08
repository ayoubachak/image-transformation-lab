import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  FolderPlusIcon, 
  TrashIcon, 
  ArrowDownOnSquareIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTopRightOnSquareIcon 
} from '@heroicons/react/24/outline';
import { projectManager } from '../../services/ProjectManager';
import type { SavedProject } from '../../utils/types';
import { usePipeline } from '../../contexts/PipelineContext';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save' | 'load' | 'new';
  onSuccess?: (projectId: string) => void;
}

// Storage info interface matching ProjectManager
interface StorageInfo {
  usedSpace: number;
  totalProjects: number;
  availableSpace: number;
  canSave: boolean;
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
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [showStorageDetails, setShowStorageDetails] = useState(false);
  const { nodes } = usePipeline();

  // Load projects list on modal open
  useEffect(() => {
    if (isOpen) {
      loadProjectsList();
      loadStorageInfo();
      
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
  
  // Load storage information
  const loadStorageInfo = () => {
    try {
      const info = projectManager.getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      console.error('Error loading storage info:', err);
      setStorageInfo(null);
    }
  };
  
  // Handle cleaning up storage
  const handleCleanupStorage = () => {
    try {
      const success = projectManager.cleanupStorage();
      if (success) {
        loadProjectsList();
        loadStorageInfo();
        setError(null);
      } else {
        setError('No old projects found to clean up');
      }
    } catch (err) {
      console.error('Error during storage cleanup:', err);
      setError('Failed to clean up storage');
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
      
      // Reload storage info in case of storage issues
      loadStorageInfo();
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
      loadStorageInfo(); // Update storage info after deletion
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
  
  // Format bytes for display
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };
  
  // Render storage information component
  const renderStorageInfo = () => {
    if (!storageInfo) return null;
    
    const usagePercentage = (storageInfo.usedSpace / (storageInfo.usedSpace + storageInfo.availableSpace)) * 100;
    const isNearLimit = usagePercentage > 80;
    const isAtLimit = !storageInfo.canSave;
    
    return (
      <div className={`p-4 rounded-lg border-2 ${
        isAtLimit ? 'border-red-200 bg-red-50' : 
        isNearLimit ? 'border-yellow-200 bg-yellow-50' : 
        'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <ChartBarIcon className={`h-5 w-5 mr-2 ${
              isAtLimit ? 'text-red-600' : 
              isNearLimit ? 'text-yellow-600' : 
              'text-gray-600'
            }`} />
            <h4 className={`font-medium ${
              isAtLimit ? 'text-red-800' : 
              isNearLimit ? 'text-yellow-800' : 
              'text-gray-800'
            }`}>
              Storage Usage
            </h4>
          </div>
          <button
            onClick={() => setShowStorageDetails(!showStorageDetails)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showStorageDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{formatBytes(storageInfo.usedSpace)} used</span>
            <span>{formatBytes(storageInfo.availableSpace)} available</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isAtLimit ? 'bg-red-500' : 
                isNearLimit ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>
        
        {showStorageDetails && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Projects:</span>
              <span className="font-medium">{storageInfo.totalProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Used Space:</span>
              <span className="font-medium">{formatBytes(storageInfo.usedSpace)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Available Space:</span>
              <span className="font-medium">{formatBytes(storageInfo.availableSpace)}</span>
            </div>
          </div>
        )}
        
        {/* Warning messages and cleanup button */}
        {(isAtLimit || isNearLimit) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {isAtLimit && (
              <div className="mb-2">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Storage quota exceeded! Cannot save new projects.
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Delete some projects or use the cleanup feature below.
                </p>
              </div>
            )}
            {isNearLimit && !isAtLimit && (
              <div className="mb-2">
                <p className="text-sm text-yellow-700 font-medium">
                  ⚠️ Storage is running low ({usagePercentage.toFixed(1)}% used)
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Consider cleaning up old projects to free space.
                </p>
              </div>
            )}
            
            <button
              onClick={handleCleanupStorage}
              disabled={loading}
              className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isAtLimit 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Cleaning...' : '🧹 Auto-cleanup Old Projects'}
            </button>
          </div>
        )}
      </div>
    );
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
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                setShowConfirmNew(false);
                setMode('save');
              }}
            >
              Save Current Work First
            </button>
            
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                setShowConfirmNew(false);
                handleNewProject();
              }}
            >
              Discard & Create New
            </button>
            
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                setShowConfirmNew(false);
                onClose();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Helper to set mode
  const setMode = (newMode: 'save' | 'load' | 'new') => {
    // This is handled by parent component
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
                {showConfirmNew && renderNewProjectConfirmation()}
                
                {!showConfirmNew && (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        {mode === 'save' && 'Save Project'}
                        {mode === 'load' && 'Load Project'}
                        {mode === 'new' && 'Create New Project'}
                      </Dialog.Title>
                      <button
                        type="button"
                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onClick={onClose}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Storage Information */}
                    {renderStorageInfo()}

                    {/* Error Display */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* Save Mode */}
                    {mode === 'save' && (
                      <div className="mb-6">
                        <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
                          Project Name
                        </label>
                        <input
                          type="text"
                          id="project-name"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter project name..."
                          disabled={loading}
                        />
                        <div className="mt-4 flex justify-end space-x-3">
                          <button
                            type="button"
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={onClose}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSaveProject}
                            disabled={loading || !projectName.trim() || (storageInfo && !storageInfo.canSave)}
                          >
                            {loading ? 'Saving...' : (currentProjectId ? 'Update Project' : 'Save Project')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Load Mode - Projects List */}
                    {mode === 'load' && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Select a project to load:</h4>
                        {projects.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <FolderPlusIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <p>No saved projects found</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {projects.map((project) => (
                              <div
                                key={project.id}
                                className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                                  project.id === currentProjectId ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                                }`}
                              >
                                <div className="flex items-center flex-1">
                                  {project.thumbnailDataUrl && (
                                    <img
                                      src={project.thumbnailDataUrl}
                                      alt={`${project.name} thumbnail`}
                                      className="w-12 h-12 object-cover rounded border mr-3"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900">{project.name}</h5>
                                    <p className="text-sm text-gray-500">
                                      {formatDate(project.updatedAt)}
                                      {project.id === currentProjectId && (
                                        <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                                          Current
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md"
                                    onClick={() => handleLoadProject(project.id)}
                                    disabled={loading}
                                  >
                                    <ArrowDownOnSquareIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className={`p-2 rounded-md ${
                                      confirmDelete === project.id
                                        ? 'text-red-700 bg-red-100 hover:bg-red-200'
                                        : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                    }`}
                                    onClick={() => handleDeleteProject(project.id)}
                                    disabled={loading}
                                    title={confirmDelete === project.id ? 'Click again to confirm' : 'Delete project'}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 