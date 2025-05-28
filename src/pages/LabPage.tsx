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
  customBlur: {
    type: 'customBlur',
    name: 'Custom Blur',
    description: 'Apply a custom convolution kernel for blurring or other effects',
    parameters: [
      {
        name: 'kernelType',
        type: 'select',
        value: 'gaussian',
        options: ['box', 'gaussian', 'custom'],
        label: 'Kernel Type',
        description: 'Select the type of blur kernel to use'
      },
      {
        name: 'kernelSize',
        type: 'number',
        value: 3,
        min: 1,
        max: 31,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of the convolution kernel',
        dependsOn: 'kernelType',
        showIf: (params) => params.kernelType !== 'custom'
      },
      {
        name: 'borderType',
        type: 'select',
        value: 'reflect',
        options: ['constant', 'reflect', 'replicate', 'wrap'],
        label: 'Border Type',
        description: 'How to handle pixels at the border of the image'
      },
      {
        name: 'sigmaX',
        type: 'number',
        value: 0,
        min: 0,
        max: 20,
        step: 0.1,
        label: 'Sigma X',
        description: 'Standard deviation in X direction (0 = auto)',
        dependsOn: 'kernelType',
        showIf: (params) => params.kernelType === 'gaussian'
      },
      {
        name: 'sigmaY',
        type: 'number',
        value: 0,
        min: 0,
        max: 20,
        step: 0.1,
        label: 'Sigma Y',
        description: 'Standard deviation in Y direction (0 = auto)',
        dependsOn: 'kernelType',
        showIf: (params) => params.kernelType === 'gaussian'
      },
      {
        name: 'customKernel',
        type: 'kernel',
        value: {
          width: 3,
          height: 3,
          values: [
            [1/9, 1/9, 1/9],
            [1/9, 1/9, 1/9],
            [1/9, 1/9, 1/9]
          ],
          normalize: true
        },
        label: 'Custom Kernel',
        description: 'Edit your own convolution kernel',
        dependsOn: 'kernelType',
        showIf: (params) => params.kernelType === 'custom'
      }
    ]
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
  adaptiveThreshold: {
    type: 'adaptiveThreshold',
    name: 'Adaptive Threshold',
    description: 'Apply adaptive threshold to the image based on local neighborhood',
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'gaussian',
        options: ['mean', 'gaussian'],
        label: 'Method',
        description: 'Algorithm to calculate the threshold value'
      },
      {
        name: 'blockSize',
        type: 'number',
        value: 11,
        min: 3,
        max: 51,
        step: 2,
        label: 'Block Size',
        description: 'Size of the local neighborhood (must be odd)'
      },
      {
        name: 'c',
        type: 'number',
        value: 2,
        min: -50,
        max: 50,
        step: 1,
        label: 'Constant',
        description: 'Constant subtracted from the mean or weighted mean'
      }
    ]
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
  dilate: {
    type: 'dilate',
    name: 'Dilation',
    description: 'Dilate the image (expand bright regions)',
    parameters: [
      {
        name: 'kernelSize',
        type: 'number',
        value: 3,
        min: 1,
        max: 31,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of the structuring element'
      },
      {
        name: 'iterations',
        type: 'number',
        value: 1,
        min: 1,
        max: 10,
        step: 1,
        label: 'Iterations',
        description: 'Number of times to apply the operation'
      }
    ]
  },
  erode: {
    type: 'erode',
    name: 'Erosion',
    description: 'Erode the image (shrink bright regions)',
    parameters: [
      {
        name: 'kernelSize',
        type: 'number',
        value: 3,
        min: 1,
        max: 31,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of the structuring element'
      },
      {
        name: 'iterations',
        type: 'number',
        value: 1,
        min: 1,
        max: 10,
        step: 1,
        label: 'Iterations',
        description: 'Number of times to apply the operation'
      }
    ]
  },
  colorAdjust: {
    type: 'colorAdjust',
    name: 'Color Adjustment',
    description: 'Adjust brightness, contrast, and other color properties',
    parameters: [
      {
        name: 'brightness',
        type: 'number',
        value: 0,
        min: -100,
        max: 100,
        step: 1,
        label: 'Brightness',
        description: 'Adjust image brightness'
      },
      {
        name: 'contrast',
        type: 'number',
        value: 0,
        min: -100,
        max: 100,
        step: 1,
        label: 'Contrast',
        description: 'Adjust image contrast'
      },
      {
        name: 'saturation',
        type: 'number',
        value: 0,
        min: -100,
        max: 100,
        step: 1,
        label: 'Saturation',
        description: 'Adjust color saturation'
      },
      {
        name: 'hue',
        type: 'number',
        value: 0,
        min: -180,
        max: 180,
        step: 1,
        label: 'Hue',
        description: 'Shift image hue'
      }
    ]
  },
  sharpen: {
    type: 'sharpen',
    name: 'Sharpen',
    description: 'Enhance details in the image',
    parameters: [
      {
        name: 'strength',
        type: 'number',
        value: 0.5,
        min: 0,
        max: 2,
        step: 0.1,
        label: 'Strength',
        description: 'Sharpening intensity'
      },
      {
        name: 'radius',
        type: 'number',
        value: 1,
        min: 0.5,
        max: 5,
        step: 0.5,
        label: 'Radius',
        description: 'Radius of the effect (higher values affect larger areas)'
      }
    ]
  },
  median: {
    type: 'median',
    name: 'Median Filter',
    description: 'Apply median filter for noise reduction',
    parameters: [
      {
        name: 'kernelSize',
        type: 'number',
        value: 3,
        min: 1,
        max: 31,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of the median filter kernel (must be odd)'
      }
    ]
  },
  bilateral: {
    type: 'bilateral',
    name: 'Bilateral Filter',
    description: 'Apply edge-preserving smoothing filter',
    parameters: [
      {
        name: 'diameter',
        type: 'number',
        value: 9,
        min: 1,
        max: 31,
        step: 2,
        label: 'Diameter',
        description: 'Diameter of each pixel neighborhood'
      },
      {
        name: 'sigmaColor',
        type: 'number',
        value: 75,
        min: 10,
        max: 200,
        step: 5,
        label: 'Sigma Color',
        description: 'Filter sigma in the color space'
      },
      {
        name: 'sigmaSpace',
        type: 'number',
        value: 75,
        min: 10,
        max: 200,
        step: 5,
        label: 'Sigma Space',
        description: 'Filter sigma in the coordinate space'
      }
    ]
  },
  histogram: {
    type: 'histogram',
    name: 'Histogram Equalization',
    description: 'Improve contrast using histogram equalization',
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'global',
        options: ['global', 'adaptive'],
        label: 'Method',
        description: 'Global or adaptive (CLAHE) equalization'
      },
      {
        name: 'clipLimit',
        type: 'number',
        value: 2.0,
        min: 0.5,
        max: 10.0,
        step: 0.5,
        label: 'Clip Limit',
        description: 'Threshold for contrast limiting (CLAHE only)',
        dependsOn: 'method',
        showIf: (params) => params.method === 'adaptive'
      }
    ]
  },
  morphology: {
    type: 'morphology',
    name: 'Morphological Operation',
    description: 'Apply morphological transformations to the image',
    parameters: [
      {
        name: 'operation',
        type: 'select',
        value: 'open',
        options: ['open', 'close', 'gradient', 'tophat', 'blackhat'],
        label: 'Operation',
        description: 'Type of morphological operation'
      },
      {
        name: 'kernelSize',
        type: 'number',
        value: 5,
        min: 1,
        max: 31,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of the structuring element'
      },
      {
        name: 'iterations',
        type: 'number',
        value: 1,
        min: 1,
        max: 10,
        step: 1,
        label: 'Iterations',
        description: 'Number of times to apply the operation'
      }
    ]
  },
  resize: {
    type: 'resize',
    name: 'Resize',
    description: 'Change the size of the image',
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'scale',
        options: ['scale', 'dimensions'],
        label: 'Method',
        description: 'Scale by percentage or specify dimensions'
      },
      {
        name: 'scaleX',
        type: 'number',
        value: 50,
        min: 1,
        max: 200,
        step: 1,
        label: 'Scale X (%)',
        description: 'Horizontal scale percentage',
        dependsOn: 'method',
        showIf: (params) => params.method === 'scale'
      },
      {
        name: 'scaleY',
        type: 'number',
        value: 50,
        min: 1,
        max: 200,
        step: 1,
        label: 'Scale Y (%)',
        description: 'Vertical scale percentage',
        dependsOn: 'method',
        showIf: (params) => params.method === 'scale'
      },
      {
        name: 'width',
        type: 'number',
        value: 320,
        min: 1,
        max: 4096,
        step: 1,
        label: 'Width (px)',
        description: 'Target width in pixels',
        dependsOn: 'method',
        showIf: (params) => params.method === 'dimensions'
      },
      {
        name: 'height',
        type: 'number',
        value: 240,
        min: 1,
        max: 4096,
        step: 1,
        label: 'Height (px)',
        description: 'Target height in pixels',
        dependsOn: 'method',
        showIf: (params) => params.method === 'dimensions'
      },
      {
        name: 'interpolation',
        type: 'select',
        value: 'linear',
        options: ['nearest', 'linear', 'cubic', 'lanczos'],
        label: 'Interpolation',
        description: 'Method for calculating pixel values'
      }
    ]
  },
  rotate: {
    type: 'rotate',
    name: 'Rotate',
    description: 'Rotate the image',
    parameters: [
      {
        name: 'angle',
        type: 'number',
        value: 45,
        min: -180,
        max: 180,
        step: 1,
        label: 'Angle',
        description: 'Rotation angle in degrees'
      },
      {
        name: 'scale',
        type: 'number',
        value: 1.0,
        min: 0.1,
        max: 3.0,
        step: 0.1,
        label: 'Scale',
        description: 'Scale factor'
      },
      {
        name: 'borderMode',
        type: 'select',
        value: 'constant',
        options: ['constant', 'reflect', 'replicate', 'wrap'],
        label: 'Border Mode',
        description: 'How to handle pixels outside the image'
      }
    ]
  },
  flip: {
    type: 'flip',
    name: 'Flip',
    description: 'Flip the image horizontally or vertically',
    parameters: [
      {
        name: 'direction',
        type: 'select',
        value: 'horizontal',
        options: ['horizontal', 'vertical', 'both'],
        label: 'Direction',
        description: 'Flip direction'
      }
    ]
  },
  crop: {
    type: 'crop',
    name: 'Crop',
    description: 'Crop a region from the image',
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'manual',
        options: ['manual', 'center', 'auto'],
        label: 'Method',
        description: 'How to determine the crop region'
      },
      {
        name: 'x',
        type: 'number',
        value: 0,
        min: 0,
        max: 4096,
        step: 1,
        label: 'X',
        description: 'X coordinate of top-left corner',
        dependsOn: 'method',
        showIf: (params) => params.method === 'manual'
      },
      {
        name: 'y',
        type: 'number',
        value: 0,
        min: 0,
        max: 4096,
        step: 1,
        label: 'Y',
        description: 'Y coordinate of top-left corner',
        dependsOn: 'method',
        showIf: (params) => params.method === 'manual'
      },
      {
        name: 'width',
        type: 'number',
        value: 320,
        min: 1,
        max: 4096,
        step: 1,
        label: 'Width',
        description: 'Width of crop region',
        dependsOn: 'method',
        showIf: (params) => params.method !== 'auto'
      },
      {
        name: 'height',
        type: 'number',
        value: 240,
        min: 1,
        max: 4096,
        step: 1,
        label: 'Height',
        description: 'Height of crop region',
        dependsOn: 'method',
        showIf: (params) => params.method !== 'auto'
      },
      {
        name: 'aspectRatio',
        type: 'select',
        value: 'free',
        options: ['free', '1:1', '4:3', '16:9', '3:2'],
        label: 'Aspect Ratio',
        description: 'Maintain aspect ratio when cropping',
        dependsOn: 'method',
        showIf: (params) => params.method === 'center'
      }
    ]
  },
  perspective: {
    type: 'perspective',
    name: 'Perspective Transform',
    description: 'Apply perspective transformation to the image',
    parameters: [
      {
        name: 'mode',
        type: 'select',
        value: 'points',
        options: ['points', 'matrix'],
        label: 'Mode',
        description: 'Set perspective by corner points or transformation matrix'
      },
      {
        name: 'topLeft',
        type: 'point',
        value: { x: 0, y: 0 },
        label: 'Top Left',
        description: 'Top-left corner coordinate',
        dependsOn: 'mode',
        showIf: (params) => params.mode === 'points'
      },
      {
        name: 'topRight',
        type: 'point',
        value: { x: 100, y: 0 },
        label: 'Top Right',
        description: 'Top-right corner coordinate',
        dependsOn: 'mode',
        showIf: (params) => params.mode === 'points'
      },
      {
        name: 'bottomLeft',
        type: 'point',
        value: { x: 0, y: 100 },
        label: 'Bottom Left',
        description: 'Bottom-left corner coordinate',
        dependsOn: 'mode',
        showIf: (params) => params.mode === 'points'
      },
      {
        name: 'bottomRight',
        type: 'point',
        value: { x: 100, y: 100 },
        label: 'Bottom Right',
        description: 'Bottom-right corner coordinate',
        dependsOn: 'mode',
        showIf: (params) => params.mode === 'points'
      },
      {
        name: 'matrix',
        type: 'matrix',
        value: {
          width: 3,
          height: 3,
          values: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
          ]
        },
        label: 'Transform Matrix',
        description: '3x3 perspective transformation matrix',
        dependsOn: 'mode',
        showIf: (params) => params.mode === 'matrix'
      },
      {
        name: 'interpolation',
        type: 'select',
        value: 'linear',
        options: ['nearest', 'linear', 'cubic'],
        label: 'Interpolation',
        description: 'Method for calculating pixel values'
      }
    ]
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