import React, { useState } from 'react';
import { usePipeline } from '../contexts/PipelineContext';
import { v4 as uuidv4 } from 'uuid';
import type { Transformation, TransformationType } from '../utils/types';
import {
  PhotoIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  QuestionMarkCircleIcon,
  LinkIcon,
  NoSymbolIcon,
  ScissorsIcon,
  ClipboardIcon,
  DocumentDuplicateIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  SwatchIcon,
  CubeTransparentIcon,
  FolderIcon,
  FolderOpenIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import { Tooltip } from 'react-tooltip';

// Import transformation templates
import { transformationTemplates } from '../pages/LabPage';

interface LabToolbarProps {
  onOpenTransformationManager?: () => void;
  operationMode?: 'select' | 'connect' | 'disconnect' | null;
  onChangeOperationMode?: (mode: 'select' | 'connect' | 'disconnect' | null) => void;
  onOpenProjectsModal?: (mode: 'save' | 'load' | 'new') => void;
}

export default function LabToolbar({ 
  onOpenTransformationManager, 
  operationMode, 
  onChangeOperationMode,
  onOpenProjectsModal
}: LabToolbarProps) {
  const { addNode, nodes, clearPipeline, removeNode, selectedNodeId, duplicateNode } = usePipeline();
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Check if there's already an input node
  const hasInputNode = nodes.some((node) => node.type === 'input');
  
  // Check if there's already an output node
  const hasOutputNode = nodes.some((node) => node.type === 'output');

  // Get the selected node if one exists
  const selectedNode = selectedNodeId ? nodes.find(node => node.id === selectedNodeId) : null;

  const handleAddInputNode = () => {
    if (!hasInputNode) {
      addNode('input');
    }
    setShowAddMenu(false);
  };

  const handleAddOutputNode = () => {
    if (!hasOutputNode) {
      addNode('output');
    }
    setShowAddMenu(false);
  };

  const handleAddTransformation = (transformType: TransformationType | string) => {
    // Convert to TransformationType if needed
    const type = transformType as TransformationType;
    
    // Use the transformation template from transformationTemplates
    if (transformationTemplates[type]) {
      addNode('transformation', transformationTemplates[type]);
    }
    setShowAddMenu(false);
  };
  
  const handleDeleteSelectedNode = () => {
    if (selectedNodeId) {
      removeNode(selectedNodeId);
    }
  };

  const handleDuplicateSelectedNode = () => {
    if (selectedNodeId) {
      duplicateNode(selectedNodeId);
    }
  };

  const handleChangeOperationMode = (mode: 'select' | 'connect' | 'disconnect' | null) => {
    if (onChangeOperationMode) {
      // If the mode is already active, turn it off
      if (operationMode === mode) {
        onChangeOperationMode(null);
    } else {
        onChangeOperationMode(mode);
      }
    }
  };

  // Button style for toolbar buttons
  const buttonClass = "p-2 rounded-md transition-colors text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
  const activeButtonClass = "p-2 rounded-md transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
  
  // Button style for action buttons
  const actionButtonClass = (isActive?: boolean) => 
    `p-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Main toolbar */}
      <div className="px-3 py-1 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {/* Add node button */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className={actionButtonClass(showAddMenu)}
              id="add-node-btn"
              data-tooltip-id="add-node-tooltip"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            <Tooltip 
              id="add-node-tooltip" 
              place="bottom" 
              offset={10}
              className="tooltip-fixed"
              delayShow={300}
              positionStrategy="fixed"
            >
              Add Node
            </Tooltip>
      
      {/* Add node dropdown menu */}
      {showAddMenu && (
              <div className="absolute top-full left-0 z-50 mt-1 bg-white rounded-md shadow-lg border border-gray-200 w-56 py-2 max-h-[80vh] overflow-y-auto">
                <div className="px-3 py-1 border-b border-gray-100 mb-1 sticky top-0 bg-white z-10">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Nodes</h3>
          </div>
          
          <div className="px-1.5 py-1">
            <button
              className={`flex items-center px-3 py-2 rounded-md text-sm w-full text-left hover:bg-blue-50 text-blue-700 ${hasInputNode ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleAddInputNode}
              disabled={hasInputNode}
            >
              <PhotoIcon className="h-5 w-5 mr-2 text-blue-500" />
              Input Node
              {hasInputNode && (
                      <span className="ml-auto text-xs text-gray-500">(Added)</span>
              )}
            </button>
            
            <button
              className={`flex items-center px-3 py-2 rounded-md text-sm w-full text-left hover:bg-green-50 text-green-700 ${hasOutputNode ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleAddOutputNode}
              disabled={hasOutputNode}
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2 text-green-500" />
              Output Node
              {hasOutputNode && (
                      <span className="ml-auto text-xs text-gray-500">(Added)</span>
              )}
            </button>
          </div>
          
                {/* Transformations section - categorized */}
          <div className="border-t border-gray-100 mt-1 pt-1">
                  <div className="px-3 py-1">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Transforms</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 px-1.5">
                    <button
                      onClick={() => handleAddTransformation('grayscale')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-purple-50 text-purple-700 rounded-md"
                    >
                      <SwatchIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Grayscale</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('threshold')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-indigo-50 text-indigo-700 rounded-md"
                    >
                      <AdjustmentsHorizontalIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Threshold</span>
                    </button>
                  </div>
                  
                  <div className="px-3 py-1 mt-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 px-1.5">
                    <button
                      onClick={() => handleAddTransformation('blur')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-blue-50 text-blue-700 rounded-md"
                    >
                      <CubeTransparentIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Blur</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('customBlur')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-blue-50 text-blue-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      <span className="text-xs">Custom Blur</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('sharpen')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-blue-50 text-blue-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span className="text-xs">Sharpen</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('median')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-blue-50 text-blue-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-xs">Median</span>
                    </button>
                  </div>
                  
                  <div className="px-3 py-1 mt-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edge Detection</h3>
            </div>
            
                  <div className="grid grid-cols-2 gap-1 px-1.5">
                    <button
                      onClick={() => handleAddTransformation('canny')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-amber-50 text-amber-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16a1 1 0 001 1h14a1 1 0 001-1V4" />
                      </svg>
                      <span className="text-xs">Canny</span>
                    </button>
                  <button
                      onClick={() => handleAddTransformation('laplacian')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-amber-50 text-amber-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                      <span className="text-xs">Laplacian</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('sobel')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-amber-50 text-amber-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6v12m3-12v12m3-12v12M4 9h16M4 12h16M4 15h16" />
                    </svg>
                      <span className="text-xs">Sobel</span>
                  </button>
                  </div>
                  
                  <div className="px-3 py-1 mt-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Morphology</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 px-1.5">
                    <button
                      onClick={() => handleAddTransformation('dilate')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-indigo-50 text-indigo-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">Dilate</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('erode')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-indigo-50 text-indigo-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      <span className="text-xs">Erode</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('morphology')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-indigo-50 text-indigo-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                      </svg>
                      <span className="text-xs">Morphology</span>
                    </button>
                  </div>
                  
                  <div className="px-3 py-1 mt-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adjustments</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 px-1.5">
                    <button
                      onClick={() => handleAddTransformation('colorAdjust')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-rose-50 text-rose-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      <span className="text-xs">Color</span>
                    </button>
                        <button
                      onClick={() => handleAddTransformation('histogram')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-rose-50 text-rose-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-xs">Histogram</span>
                    </button>
                  </div>
                  
                  <div className="px-3 py-1 mt-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Geometry</h3>
                          </div>
                  
                  <div className="grid grid-cols-2 gap-1 px-1.5 mb-2">
                    <button
                      onClick={() => handleAddTransformation('resize')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-emerald-50 text-emerald-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                      <span className="text-xs">Resize</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('rotate')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-emerald-50 text-emerald-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs">Rotate</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('crop')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-emerald-50 text-emerald-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">Crop</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('perspective')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-emerald-50 text-emerald-700 rounded-md"
                    >
                      <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span className="text-xs">Perspective</span>
                        </button>
                  </div>
                </div>
                    </div>
                  )}
                </div>
          
          {/* Manage Pipeline button */}
          <button
            onClick={onOpenTransformationManager}
            className={buttonClass}
            id="manage-pipeline-btn"
            data-tooltip-id="manage-pipeline-tooltip"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
          <Tooltip 
            id="manage-pipeline-tooltip" 
            place="bottom" 
            offset={10}
            className="tooltip-fixed"
            delayShow={300}
            positionStrategy="fixed"
          >
            Manage Pipeline
          </Tooltip>
          
          {/* Connection mode button */}
          <button
            onClick={() => handleChangeOperationMode('connect')}
            className={operationMode === 'connect' ? activeButtonClass : buttonClass}
            id="connect-mode-btn"
            data-tooltip-id="connect-mode-tooltip"
          >
            <LinkIcon className="h-5 w-5" />
          </button>
          <Tooltip 
            id="connect-mode-tooltip" 
            place="bottom" 
            offset={10}
            className="tooltip-fixed"
            delayShow={300}
            positionStrategy="fixed"
          >
            Connect Nodes (C)
          </Tooltip>
          
          {/* Disconnect mode button */}
          <button
            onClick={() => handleChangeOperationMode('disconnect')}
            className={operationMode === 'disconnect' ? activeButtonClass : buttonClass}
            id="disconnect-mode-btn"
            data-tooltip-id="disconnect-mode-tooltip"
          >
            <NoSymbolIcon className="h-5 w-5" />
          </button>
          <Tooltip 
            id="disconnect-mode-tooltip" 
            place="bottom" 
            offset={10}
            className="tooltip-fixed"
            delayShow={300}
            positionStrategy="fixed"
          >
            Disconnect Nodes (D)
          </Tooltip>
          
          {/* Node action buttons - only shown when a node is selected */}
          {selectedNode && (
            <>
              <div className="h-6 mx-1 border-r border-gray-200"></div>
              
              {/* Duplicate button */}
              <button
                onClick={handleDuplicateSelectedNode}
                className={buttonClass}
                id="duplicate-node-btn"
                data-tooltip-id="duplicate-node-tooltip"
              >
                <DocumentDuplicateIcon className="h-5 w-5" />
              </button>
              <Tooltip 
                id="duplicate-node-tooltip" 
                place="bottom" 
                offset={10}
                className="tooltip-fixed"
                delayShow={300}
                positionStrategy="fixed"
              >
                Duplicate Node (Ctrl+C)
              </Tooltip>
              
              {/* Delete button */}
              <button
                onClick={handleDeleteSelectedNode}
                className="p-2 rounded-md transition-colors text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                id="delete-node-btn"
                data-tooltip-id="delete-node-tooltip"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
              <Tooltip 
                id="delete-node-tooltip" 
                place="bottom" 
                offset={10}
                className="tooltip-fixed"
                delayShow={300}
                positionStrategy="fixed"
              >
                Delete Node (Delete)
              </Tooltip>
            </>
          )}
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center space-x-1">
          {/* Project buttons */}
          {onOpenProjectsModal && (
            <>
              {/* New Project button */}
              <button
                onClick={() => onOpenProjectsModal('new')}
                className={buttonClass}
                id="new-project-btn"
                data-tooltip-id="new-project-tooltip"
              >
                <DocumentPlusIcon className="h-5 w-5" />
              </button>
              <Tooltip 
                id="new-project-tooltip" 
                place="bottom" 
                offset={10}
                className="tooltip-fixed"
                delayShow={300}
                positionStrategy="fixed"
              >
                New Project
              </Tooltip>
              
              {/* Save Project button */}
              <button
                onClick={() => onOpenProjectsModal('save')}
                className={buttonClass}
                id="save-project-btn"
                data-tooltip-id="save-project-tooltip"
              >
                <FolderIcon className="h-5 w-5" />
              </button>
              <Tooltip 
                id="save-project-tooltip" 
                place="bottom" 
                offset={10}
                className="tooltip-fixed"
                delayShow={300}
                positionStrategy="fixed"
              >
                Save Project
              </Tooltip>
            
              {/* Project Load button */}
              <button
                onClick={() => onOpenProjectsModal('load')}
                className={buttonClass}
                id="load-project-btn"
                data-tooltip-id="load-project-tooltip"
              >
                <FolderOpenIcon className="h-5 w-5" />
              </button>
              <Tooltip 
                id="load-project-tooltip" 
                place="bottom" 
                offset={10}
                className="tooltip-fixed"
                delayShow={300}
                positionStrategy="fixed"
              >
                Load Project
              </Tooltip>
            </>
          )}

          {/* Clear pipeline button */}
          <button
            onClick={() => clearPipeline()}
            className="p-2 rounded-md transition-colors text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            id="clear-btn"
            data-tooltip-id="clear-tooltip"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
          <Tooltip 
            id="clear-tooltip" 
            place="bottom" 
            offset={10}
            className="tooltip-fixed"
            delayShow={300}
            positionStrategy="fixed"
          >
            Clear All
          </Tooltip>
          
          {/* Help button */}
          <button
            onClick={() => {}}
            className={buttonClass}
            id="help-btn"
            data-tooltip-id="help-tooltip"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
          <Tooltip 
            id="help-tooltip" 
            place="bottom" 
            offset={10}
            className="tooltip-fixed"
            delayShow={300}
            positionStrategy="fixed"
          >
            Help
          </Tooltip>
        </div>
      </div>
      
      {/* Operation mode indicator - simplified */}
      {operationMode && (
        <div className={`px-3 py-1 text-xs font-medium ${
          operationMode === 'connect' 
            ? 'bg-green-50 text-green-700 border-t border-green-100' 
            : operationMode === 'disconnect'
              ? 'bg-amber-50 text-amber-700 border-t border-amber-100'
              : 'bg-blue-50 text-blue-700 border-t border-blue-100'
        }`}>
          {operationMode === 'connect' && (
            <div className="flex items-center">
              <LinkIcon className="h-3 w-3 mr-1" />
              <span>Select source node, then target node</span>
              <button 
                className="ml-auto text-green-700 hover:text-green-900" 
                onClick={() => handleChangeOperationMode(null)}
              >
                <span className="sr-only">Cancel</span>
                ✕
              </button>
            </div>
          )}
          {operationMode === 'disconnect' && (
            <div className="flex items-center">
              <NoSymbolIcon className="h-3 w-3 mr-1" />
              <span>Click on a connection to remove it</span>
              <button 
                className="ml-auto text-amber-700 hover:text-amber-900" 
                onClick={() => handleChangeOperationMode(null)}
              >
                <span className="sr-only">Cancel</span>
                ✕
              </button>
          </div>
          )}
        </div>
      )}
    </div>
  );
} 