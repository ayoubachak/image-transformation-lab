import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePipeline } from '../contexts/PipelineContext';
import ImageProcessingPipeline from '../components/ImageProcessingPipeline';
import TransformationManager from '../components/TransformationManager';
import LabToolbar from '../components/LabToolbar';
import { 
  PhotoIcon, 
  DocumentDuplicateIcon, 
  ArrowsPointingOutIcon,
  WrenchScrewdriverIcon 
} from '@heroicons/react/24/outline';
import type { Transformation, TransformationType } from '../utils/types';

// Transformation templates
export const transformationTemplates: Record<TransformationType, Omit<Transformation, 'id' | 'inputNodes'>> = {
  grayscale: {
    type: 'grayscale',
    name: 'Grayscale',
    description: 'Convert image to grayscale',
    parameters: [],
  },
  blur: {
    type: 'blur',
    name: 'Gaussian Blur',
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
};

export default function LabPage() {
  const { 
    addNode, 
    nodes, 
    selectedNodeId, 
    clearPipeline, 
    removeNode, 
    addEdge, 
    removeEdge, 
    duplicateNode
  } = usePipeline();
  const [showTransformationManager, setShowTransformationManager] = useState(false);
  const [operationMode, setOperationMode] = useState<'select' | 'connect' | 'disconnect' | null>(null);
  const [connectStartNodeId, setConnectStartNodeId] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  
  // Function to handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if modifiers are pressed except for the specific combinations we want
    if (event.altKey || event.metaKey || 
        (event.ctrlKey && !['c', 'v', 'x'].includes(event.key.toLowerCase())) || 
        event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Delete selected node with Delete key
    if (event.key === 'Delete' && selectedNodeId) {
      removeNode(selectedNodeId);
      event.preventDefault();
    }

    // Connect mode with C key
    if (event.key.toLowerCase() === 'c' && !event.ctrlKey) {
      setOperationMode(prev => prev === 'connect' ? null : 'connect');
      setConnectStartNodeId(null);
      event.preventDefault();
    }

    // Disconnect mode with D key
    if (event.key.toLowerCase() === 'd') {
      setOperationMode(prev => prev === 'disconnect' ? null : 'disconnect');
      event.preventDefault();
    }

    // Copy/cut/paste with Ctrl+C, Ctrl+X, Ctrl+V
    if (event.ctrlKey && selectedNodeId) {
      if (event.key.toLowerCase() === 'c') {
        // Copy node to clipboard
        duplicateNode(selectedNodeId);
        event.preventDefault();
      } else if (event.key.toLowerCase() === 'x') {
        // Cut node (copy then delete)
        duplicateNode(selectedNodeId);
        removeNode(selectedNodeId);
        event.preventDefault();
      }
    }
  }, [selectedNodeId, removeNode, duplicateNode, setOperationMode]);

  // Register and clean up keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Check if there's already an input node
  const hasInputNode = nodes.some((node) => node.type === 'input');
  // Check if there's already an output node
  const hasOutputNode = nodes.some((node) => node.type === 'output');

  const handleAddInputNode = () => {
    if (!hasInputNode) {
      addNode('input');
    }
  };

  const handleAddOutputNode = () => {
    if (!hasOutputNode) {
      addNode('output');
    }
  };

  const handleAddTransformation = (type: TransformationType) => {
    // Pass the template directly - the pipeline context will handle adding id and inputNodes
    addNode('transformation', transformationTemplates[type]);
    setShowTransformationManager(false);
  };

  const toggleTransformationManager = () => {
    setShowTransformationManager(!showTransformationManager);
  };

  // Handle node clicks based on current operation mode
  const handleNodeClick = (nodeId: string) => {
    if (operationMode === 'connect') {
      if (!connectStartNodeId) {
        // First node in connection process
        setConnectStartNodeId(nodeId);
      } else if (connectStartNodeId !== nodeId) {
        // Second node - create the connection
        addEdge(connectStartNodeId, nodeId);
        setConnectStartNodeId(null);
        setOperationMode(null);
      }
    }
  };

  // Handle edge click for disconnect mode
  const handleEdgeClick = (edgeId: string) => {
    if (operationMode === 'disconnect') {
      removeEdge(edgeId);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50" ref={pageRef}>
      <LabToolbar 
        onOpenTransformationManager={toggleTransformationManager} 
        operationMode={operationMode}
        onChangeOperationMode={setOperationMode}
      />
      
      <div className="flex-grow flex relative p-4">
        {/* Main pipeline area */}
        <div className="flex-grow rounded-lg overflow-hidden shadow-md">
          <ImageProcessingPipeline 
            readOnly={false} 
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            highlightNodeId={connectStartNodeId}
            operationMode={operationMode}
          />
        </div>
        
        {/* Transformation manager panel */}
        {showTransformationManager && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute top-0 right-0 bottom-0 w-96 bg-white shadow-xl border-l border-gray-200 overflow-y-auto z-20 rounded-l-md"
          >
            <TransformationManager onClose={toggleTransformationManager} />
          </motion.div>
        )}
      </div>

      {/* Status indicator for connect mode */}
      {connectStartNodeId && operationMode === 'connect' && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg">
          Now select a target node to complete the connection
        </div>
      )}
    </div>
  );
} 