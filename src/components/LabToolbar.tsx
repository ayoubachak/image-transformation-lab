import React, { useState } from 'react';
import { usePipeline } from '../contexts/PipelineContext';
import { v4 as uuidv4 } from 'uuid';
import type { Transformation, TransformationType } from '../utils/types';
import {
  PhotoIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  TrashIcon,
  Bars3Icon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  QuestionMarkCircleIcon,
  ArrowDownOnSquareIcon,
  ChevronUpDownIcon,
  SwatchIcon,
  CubeTransparentIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from 'react-tooltip';

interface LabToolbarProps {
  onOpenTransformationManager?: () => void;
}

// Transformation templates grouped by category
const transformationCategories = {
  'Basic': [
    {
      type: 'grayscale' as TransformationType,
      name: 'Grayscale',
      icon: <SwatchIcon className="w-4 h-4" />,
      description: 'Convert image to grayscale',
      parameters: [],
    },
    {
      type: 'threshold' as TransformationType,
      name: 'Threshold',
      icon: <ChevronUpDownIcon className="w-4 h-4" />,
      description: 'Apply binary threshold to the image',
      parameters: [
        {
          name: 'threshold',
          type: 'number',
          value: 128,
          min: 0,
          max: 255,
          step: 1,
        },
      ],
    }
  ],
  'Filters': [
    {
      type: 'blur' as TransformationType,
      name: 'Gaussian Blur',
      icon: <CubeTransparentIcon className="w-4 h-4" />,
      description: 'Apply Gaussian blur to the image',
      parameters: [
        {
          name: 'kernelSize',
          type: 'number',
          value: 3,
          min: 1,
          max: 31,
          step: 2,
        },
      ],
    }
  ],
  'Edge Detection': [
    {
      type: 'laplacian' as TransformationType,
      name: 'Laplacian',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
      </svg>,
      description: 'Detect edges using Laplacian operator',
      parameters: [
        {
          name: 'kernelSize',
          type: 'number',
          value: 3,
          min: 1,
          max: 31,
          step: 2,
        },
      ],
    },
    {
      type: 'sobel' as TransformationType,
      name: 'Sobel',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6v12m3-12v12m3-12v12M4 9h16M4 12h16M4 15h16" />
      </svg>,
      description: 'Detect edges using Sobel operator',
      parameters: [
        {
          name: 'kernelSize',
          type: 'number',
          value: 3,
          min: 1,
          max: 31,
          step: 2,
        },
      ],
    },
    {
      type: 'canny' as TransformationType,
      name: 'Canny',
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16a1 1 0 001 1h14a1 1 0 001-1V4" />
      </svg>,
      description: 'Detect edges using Canny algorithm',
      parameters: [
        {
          name: 'threshold1',
          type: 'number',
          value: 50,
          min: 0,
          max: 255,
          step: 1,
        },
        {
          name: 'threshold2',
          type: 'number',
          value: 150,
          min: 0,
          max: 255,
          step: 1,
        },
      ],
    }
  ],
};

export default function LabToolbar({ onOpenTransformationManager }: LabToolbarProps) {
  const { addNode, nodes, clearPipeline } = usePipeline();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Check if there's already an input node
  const hasInputNode = nodes.some((node) => node.type === 'input');
  
  // Check if there's already an output node
  const hasOutputNode = nodes.some((node) => node.type === 'output');

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

  const handleAddTransformation = (transformTemplate: any) => {
    // Create transformation with the template - no need to handle IDs separately
    addNode('transformation', transformTemplate);
    setShowAddMenu(false);
  };
  
  const handleCategorySelect = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Main toolbar */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo & title */}
          <div className="flex items-center mr-4">
            <h1 className="text-lg font-semibold text-slate-800">Image Processing Lab</h1>
          </div>
          
          {/* Primary buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
              id="add-node-btn"
              data-tooltip-id="add-node-tooltip"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Add Node
            </button>
            <Tooltip id="add-node-tooltip" place="bottom">
              Add input, output, or transformation nodes
            </Tooltip>
            
            <button
              onClick={onOpenTransformationManager}
              className="flex items-center px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-md text-sm font-medium transition-colors"
              id="manage-pipeline-btn"
              data-tooltip-id="manage-pipeline-tooltip"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1.5" />
              Manage Pipeline
            </button>
            <Tooltip id="manage-pipeline-tooltip" place="bottom">
              Edit connections and configure the pipeline
            </Tooltip>
          </div>
        </div>
        
        {/* Secondary buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => clearPipeline()}
            className="flex items-center px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors"
            id="clear-btn"
            data-tooltip-id="clear-tooltip"
          >
            <TrashIcon className="h-4 w-4 mr-1.5" />
            Clear
          </button>
          <Tooltip id="clear-tooltip" place="bottom">
            Clear all nodes and connections
          </Tooltip>
          
          <button
            onClick={() => {}}
            className="flex items-center px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-md text-sm font-medium transition-colors"
            id="help-btn"
            data-tooltip-id="help-tooltip"
          >
            <QuestionMarkCircleIcon className="h-4 w-4" />
          </button>
          <Tooltip id="help-tooltip" place="bottom">
            View help documentation
          </Tooltip>
        </div>
      </div>
      
      {/* Add node dropdown menu */}
      {showAddMenu && (
        <div className="absolute top-14 left-4 z-50 bg-white rounded-md shadow-lg border border-gray-200 w-64 py-2">
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
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
                <span className="ml-auto text-xs text-gray-500">(Already added)</span>
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
                <span className="ml-auto text-xs text-gray-500">(Already added)</span>
              )}
            </button>
          </div>
          
          <div className="border-t border-gray-100 mt-1 pt-1">
            <div className="px-3 py-1.5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transformations</h3>
            </div>
            
            {/* Transformation categories */}
            <div className="max-h-64 overflow-y-auto px-1.5">
              {Object.keys(transformationCategories).map((category) => (
                <div key={category} className="mb-1">
                  <button
                    className="flex items-center justify-between w-full px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                    onClick={() => handleCategorySelect(category)}
                  >
                    <span>{category}</span>
                    <svg 
                      className={`w-4 h-4 transition-transform ${selectedCategory === category ? 'transform rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Transformation options */}
                  {selectedCategory === category && (
                    <div className="pl-2 py-1">
                      {transformationCategories[category as keyof typeof transformationCategories].map((transform) => (
                        <button
                          key={transform.type}
                          className="flex items-center px-3 py-1.5 text-sm w-full text-left hover:bg-indigo-50 text-indigo-700 rounded-md mb-0.5"
                          onClick={() => handleAddTransformation(transform)}
                        >
                          <div className="h-5 w-5 mr-2 text-indigo-500 flex items-center justify-center">
                            {transform.icon}
                          </div>
                          <span>{transform.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 