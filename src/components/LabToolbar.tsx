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
  CubeTransparentIcon
} from '@heroicons/react/24/outline';
import { Tooltip } from 'react-tooltip';

// Import transformation templates
import { transformationTemplates } from '../pages/LabPage';

interface LabToolbarProps {
  onOpenTransformationManager?: () => void;
  operationMode?: 'select' | 'connect' | 'disconnect' | null;
  onChangeOperationMode?: (mode: 'select' | 'connect' | 'disconnect' | null) => void;
}

export default function LabToolbar({ onOpenTransformationManager, operationMode, onChangeOperationMode }: LabToolbarProps) {
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
            <Tooltip id="add-node-tooltip" place="bottom">
              Add Node
            </Tooltip>
            
            {/* Add node dropdown menu */}
            {showAddMenu && (
              <div className="absolute top-full left-0 z-50 mt-1 bg-white rounded-md shadow-lg border border-gray-200 w-56 py-2">
                <div className="px-3 py-1 border-b border-gray-100 mb-1">
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
                
                {/* Transformations section - simplified */}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <div className="px-3 py-1">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transformations</h3>
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
                      onClick={() => handleAddTransformation('blur')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-blue-50 text-blue-700 rounded-md"
                    >
                      <CubeTransparentIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Blur</span>
                    </button>
                    <button
                      onClick={() => handleAddTransformation('threshold')}
                      className="flex flex-col items-center justify-center p-2 hover:bg-indigo-50 text-indigo-700 rounded-md"
                    >
                      <AdjustmentsHorizontalIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Threshold</span>
                    </button>
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
          <Tooltip id="manage-pipeline-tooltip" place="bottom">
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
          <Tooltip id="connect-mode-tooltip" place="bottom">
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
          <Tooltip id="disconnect-mode-tooltip" place="bottom">
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
              <Tooltip id="duplicate-node-tooltip" place="bottom">
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
              <Tooltip id="delete-node-tooltip" place="bottom">
                Delete Node (Delete)
              </Tooltip>
            </>
          )}
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center space-x-1">
          {/* Clear pipeline button */}
          <button
            onClick={() => clearPipeline()}
            className="p-2 rounded-md transition-colors text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            id="clear-btn"
            data-tooltip-id="clear-tooltip"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
          <Tooltip id="clear-tooltip" place="bottom">
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
          <Tooltip id="help-tooltip" place="bottom">
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