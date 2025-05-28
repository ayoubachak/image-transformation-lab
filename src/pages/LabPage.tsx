import { useState } from 'react';
import { motion } from 'framer-motion';
import { useImageProcessing } from '../contexts/ImageProcessingContext';
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
import { v4 as uuidv4 } from 'uuid';

// Transformation templates
const transformationTemplates: Record<TransformationType, Omit<Transformation, 'id' | 'inputNodes'>> = {
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
  const { addNode, nodes, selectedNodeId, clearPipeline } = useImageProcessing();
  const [showTransformationManager, setShowTransformationManager] = useState(false);

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
    const template = transformationTemplates[type];
    const id = uuidv4();
    
    // Create transformation with the template
    const transformation: Transformation = {
      ...template,
      id,
      inputNodes: [],
    };
    
    addNode('transformation', transformation);
    setShowTransformationManager(false);
  };

  const toggleTransformationManager = () => {
    setShowTransformationManager(!showTransformationManager);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <LabToolbar onOpenTransformationManager={toggleTransformationManager} />
      
      <div className="flex-grow flex relative p-4">
        {/* Main pipeline area */}
        <div className="flex-grow rounded-lg overflow-hidden shadow-md">
          <ImageProcessingPipeline />
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
    </div>
  );
} 