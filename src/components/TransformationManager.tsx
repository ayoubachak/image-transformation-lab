import { useState } from 'react';
import { usePipeline } from '../contexts/PipelineContext';
import { v4 as uuidv4 } from 'uuid';
import type { TransformationType, Transformation, ImageProcessingNode } from '../utils/types';
import { 
  TrashIcon, 
  PlusIcon, 
  CheckIcon, 
  ArrowPathIcon, 
  AdjustmentsHorizontalIcon,
  LinkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

// Transformation templates
const transformationTemplates: Partial<Record<TransformationType, Omit<Transformation, 'id' | 'inputNodes'>>> = {
  grayscale: {
    type: "grayscale" as TransformationType,
    name: "Grayscale",
    description: "Convert image to grayscale",
    parameters: [],
  },
  blur: {
    type: "blur" as TransformationType,
    name: "Blur",
    description: "Apply blur effect to image",
    parameters: [
      {
        name: "kernelSize",
        type: "number" as const,
        value: 5,
        min: 1,
        max: 31,
        step: 2,
      },
    ],
  },
  threshold: {
    type: 'threshold',
    name: 'Threshold',
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
  },
  laplacian: {
    type: 'laplacian',
    name: 'Laplacian Edge Detection',
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
  sobel: {
    type: 'sobel',
    name: 'Sobel Edge Detection',
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
  canny: {
    type: 'canny',
    name: 'Canny Edge Detection',
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
  },
  custom: {
    type: 'custom',
    name: 'Custom Filter',
    description: 'Apply a custom filter',
    parameters: [],
  },
} as const;

// Group transformations by category
const transformationCategories: Record<string, string[]> = {
  'Basic': ['grayscale', 'threshold'],
  'Filters': ['blur'],
  'Edge Detection': ['laplacian', 'sobel', 'canny'],
  'Advanced': ['custom']
};

interface TransformationManagerProps {
  onClose?: () => void;
}

export default function TransformationManager({ onClose }: TransformationManagerProps) {
  const { 
    nodes, 
    edges, 
    addNode, 
    removeNode, 
    addEdge, 
    removeEdge 
  } = usePipeline();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [nodesToConnect, setNodesToConnect] = useState<{source: string, target: string} | null>(null);
  
  // Get all available transformations for the selected category
  const getAvailableTransformations = () => {
    if (!selectedCategory) return [];
    
    interface TransformWithType {
      transformType: TransformationType;
      name: string;
      description: string;
      parameters: any[];
    }
    
    return (transformationCategories[selectedCategory] || []).map(typeKey => {
      const transformType = typeKey as TransformationType;
      const template = transformationTemplates[transformType];
      
      return {
        transformType,
        name: template?.name || '',
        description: template?.description || '',
        parameters: template?.parameters || []
      } as TransformWithType;
    });
  };
  
  // Add a new transformation node to the pipeline
  const handleAddTransformation = (type: TransformationType) => {
    const template = transformationTemplates[type];
    addNode('transformation', template);
  };
  
  // Remove a node from the pipeline
  const handleRemoveNode = (nodeId: string) => {
    // First remove all edges connected to this node
    const connectedEdges = edges.filter(
      edge => edge.source === nodeId || edge.target === nodeId
    );
    
    connectedEdges.forEach(edge => {
      removeEdge(edge.id);
    });
    
    // Then remove the node itself
    removeNode(nodeId);
  };
  
  // Start the node connection process
  const handleStartConnect = (sourceNodeId: string) => {
    setNodesToConnect({ source: sourceNodeId, target: '' });
  };
  
  // Complete the node connection
  const handleCompleteConnect = (targetNodeId: string) => {
    if (nodesToConnect && nodesToConnect.source) {
      addEdge(nodesToConnect.source, targetNodeId);
      setNodesToConnect(null);
    }
  };
  
  // Cancel the node connection process
  const handleCancelConnect = () => {
    setNodesToConnect(null);
  };
  
  // Check if a node can be a source (input nodes and transformation nodes)
  const canBeSource = (node: ImageProcessingNode) => {
    return node.type === 'input' || node.type === 'transformation';
  };
  
  // Check if a node can be a target (transformation nodes and output nodes)
  const canBeTarget = (node: ImageProcessingNode) => {
    return node.type === 'transformation' || node.type === 'output';
  };
  
  // Check if a connection already exists between two nodes
  const connectionExists = (sourceId: string, targetId: string) => {
    return edges.some(edge => edge.source === sourceId && edge.target === targetId);
  };
  
  // Toggle node expansion for details
  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodeId(expandedNodeId === nodeId ? null : nodeId);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Transformation Manager</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Add transformation section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-700 mb-3">Add Transformation</h3>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          {Object.keys(transformationCategories).map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(
                selectedCategory === category ? null : category
              )}
              className={`py-2 px-4 rounded-md transition-colors ${
                selectedCategory === category 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        {selectedCategory && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {getAvailableTransformations().map(transformation => (
              <button
                key={transformation.transformType}
                onClick={() => handleAddTransformation(transformation.transformType)}
                className="flex items-center py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                <span className="text-sm">{transformation.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Manage existing nodes section */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-3">Manage Nodes</h3>
        
        {/* Connection mode indicator */}
        {nodesToConnect && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex justify-between items-center">
              <p className="text-sm text-yellow-700">
                Select a node to connect to <strong>{
                  nodes.find(n => n.id === nodesToConnect.source)?.transformation?.name || 
                  nodes.find(n => n.id === nodesToConnect.source)?.type
                }</strong>
              </p>
              <button 
                onClick={handleCancelConnect}
                className="text-yellow-600 hover:text-yellow-800 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {/* Nodes list */}
        <div className="space-y-3">
          {nodes.map(node => (
            <div 
              key={node.id}
              className={`border rounded-md overflow-hidden ${
                expandedNodeId === node.id ? 'border-blue-400' : 'border-gray-200'
              }`}
            >
              <div 
                className={`p-3 flex justify-between items-center cursor-pointer ${
                  expandedNodeId === node.id ? 'bg-blue-50' : 'bg-gray-50'
                }`}
                onClick={() => toggleNodeExpanded(node.id)}
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    node.type === 'input' ? 'bg-green-500' :
                    node.type === 'output' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}></div>
                  <span className="font-medium text-gray-800">
                    {node.transformation?.name || 
                     (node.type === 'input' ? 'Input' : 'Output')}
                  </span>
                </div>
                <div className="flex items-center">
                  <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${
                    expandedNodeId === node.id ? 'transform rotate-180' : ''
                  }`} />
                </div>
              </div>
              
              {expandedNodeId === node.id && (
                <div className="p-3 border-t border-gray-200 bg-white">
                  <div className="text-xs text-gray-500 mb-2">
                    Node ID: {node.id}
                  </div>
                  
                  <div className="flex space-x-2 mb-3">
                    {/* Connect button - only for nodes that can be source */}
                    {canBeSource(node) && !nodesToConnect && (
                      <button
                        onClick={() => handleStartConnect(node.id)}
                        className="text-xs py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded flex items-center"
                      >
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Connect
                      </button>
                    )}
                    
                    {/* Target selection - only shown when in connect mode */}
                    {nodesToConnect && canBeTarget(node) && 
                     nodesToConnect.source !== node.id &&
                     !connectionExists(nodesToConnect.source, node.id) && (
                      <button
                        onClick={() => handleCompleteConnect(node.id)}
                        className="text-xs py-1 px-2 bg-green-50 hover:bg-green-100 text-green-700 rounded flex items-center"
                      >
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Connect Here
                      </button>
                    )}
                    
                    {/* Configure button - only for transformation nodes */}
                    {node.type === 'transformation' && node.transformation && (
                      <button
                        onClick={() => {}} // Open configuration panel
                        className="text-xs py-1 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded flex items-center"
                      >
                        <AdjustmentsHorizontalIcon className="h-3 w-3 mr-1" />
                        Configure
                      </button>
                    )}
                    
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveNode(node.id)}
                      className="text-xs py-1 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded flex items-center"
                    >
                      <TrashIcon className="h-3 w-3 mr-1" />
                      Remove
                    </button>
                  </div>
                  
                  {/* Connections */}
                  <div className="text-xs text-gray-600">
                    <div className="mb-1">Connections:</div>
                    <ul className="ml-3 space-y-1">
                      {edges
                        .filter(edge => edge.source === node.id || edge.target === node.id)
                        .map(edge => {
                          const isSource = edge.source === node.id;
                          const connectedNodeId = isSource ? edge.target : edge.source;
                          const connectedNode = nodes.find(n => n.id === connectedNodeId);
                          const connectedNodeName = connectedNode?.transformation?.name || 
                                                 (connectedNode?.type === 'input' ? 'Input' : 'Output');
                          
                          return (
                            <li key={edge.id} className="flex justify-between items-center">
                              <span>
                                {isSource ? 'Output to ' : 'Input from '}
                                <span className="font-medium">{connectedNodeName}</span>
                              </span>
                              <button
                                onClick={() => removeEdge(edge.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Remove connection"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </li>
                          );
                        })}
                      {edges.filter(edge => edge.source === node.id || edge.target === node.id).length === 0 && (
                        <li className="text-gray-400 italic">No connections</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {nodes.length === 0 && (
            <div className="text-center p-6 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-gray-500">No nodes in the pipeline yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Start by adding input, transformation, and output nodes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 