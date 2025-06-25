import type { Lesson, Pipeline } from './types';
import { v4 as uuidv4 } from 'uuid';

// Create a standard pipeline structure with one transformation node
const createSingleTransformPipeline = (transformationType: string, parameters: any[] = []): Pipeline => {
  const inputNodeId = uuidv4();
  const transformNodeId = uuidv4();
  const outputNodeId = uuidv4();
  
  return {
    nodes: [
      {
        id: inputNodeId,
        type: 'input',
        position: { x: 100, y: 250 }
      },
      {
        id: transformNodeId,
        type: 'transformation',
        transformation: {
          id: transformNodeId,
          type: transformationType as any,
          name: getTransformationName(transformationType),
          description: getTransformationDescription(transformationType),
          parameters,
          inputNodes: [inputNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 350, y: 250 }
      },
      {
        id: outputNodeId,
        type: 'output',
        position: { x: 600, y: 250 }
      }
    ],
    edges: [
      {
        id: `${inputNodeId}-${transformNodeId}`,
        source: inputNodeId,
        target: transformNodeId
      },
      {
        id: `${transformNodeId}-${outputNodeId}`,
        source: transformNodeId,
        target: outputNodeId
      }
    ]
  };
};

// Get standard transformation name
const getTransformationName = (type: string): string => {
  switch (type) {
    case 'grayscale': return 'Grayscale';
    case 'blur': return 'Gaussian Blur';
    case 'threshold': return 'Threshold';
    case 'laplacian': return 'Laplacian Edge Detection';
    case 'sobel': return 'Sobel Edge Detection';
    case 'canny': return 'Canny Edge Detection';
    case 'watershed': return 'Watershed Segmentation';
    case 'distanceTransform': return 'Distance Transform';
    case 'shapeAnalysis': return 'Shape Analysis';
    case 'bwperim': return 'Boundary Detection (bwperim)';
    case 'cellDetection': return 'Cell Detection Pipeline';
    default: return 'Custom Transformation';
  }
};

// Get standard transformation description
const getTransformationDescription = (type: string): string => {
  switch (type) {
    case 'grayscale': return 'Convert image to grayscale';
    case 'blur': return 'Apply Gaussian blur to reduce noise';
    case 'threshold': return 'Apply binary threshold to the image';
    case 'laplacian': return 'Detect edges using Laplacian operator';
    case 'sobel': return 'Detect edges using Sobel operator';
    case 'canny': return 'Detect edges using Canny algorithm';
    case 'watershed': return 'Separate touching objects using watershed segmentation';
    case 'distanceTransform': return 'Compute distance to nearest background pixel';
    case 'shapeAnalysis': return 'Analyze geometric properties of detected shapes';
    case 'bwperim': return 'Boundary Detection (bwperim)';
    case 'cellDetection': return 'Cell Detection Pipeline';
    default: return 'Apply custom transformation';
  }
};

// Standard parameters for transformations
const standardParameters = {
  kernelSize: {
    name: 'kernelSize',
    type: 'number' as const,
    value: 3,
    min: 1,
    max: 31,
    step: 2
  },
  threshold: {
    name: 'threshold',
    type: 'number' as const,
    value: 128,
    min: 0,
    max: 255,
    step: 1
  },
  cannyThreshold1: {
    name: 'threshold1',
    type: 'number' as const,
    value: 50,
    min: 0,
    max: 255,
    step: 1
  },
  cannyThreshold2: {
    name: 'threshold2',
    type: 'number' as const,
    value: 150,
    min: 0,
    max: 255,
    step: 1
  }
};

// Create Laplacian edge detection pipeline (Grayscale -> Blur -> Laplacian)
const createLaplacianPipeline = (): Pipeline => {
  const inputNodeId = uuidv4();
  const grayscaleNodeId = uuidv4();
  const blurNodeId = uuidv4();
  const laplacianNodeId = uuidv4();
  const outputNodeId = uuidv4();
  
  return {
    nodes: [
      {
        id: inputNodeId,
        type: 'input',
        position: { x: 100, y: 250 }
      },
      {
        id: grayscaleNodeId,
        type: 'transformation',
        transformation: {
          id: grayscaleNodeId,
          type: 'grayscale',
          name: 'Grayscale',
          description: 'Convert image to grayscale',
          parameters: [],
          inputNodes: [inputNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 300, y: 250 }
      },
      {
        id: blurNodeId,
        type: 'transformation',
        transformation: {
          id: blurNodeId,
          type: 'blur',
          name: 'Gaussian Blur',
          description: 'Apply Gaussian blur to reduce noise',
          parameters: [standardParameters.kernelSize],
          inputNodes: [grayscaleNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 500, y: 250 }
      },
      {
        id: laplacianNodeId,
        type: 'transformation',
        transformation: {
          id: laplacianNodeId,
          type: 'laplacian',
          name: 'Laplacian',
          description: 'Apply Laplacian operator for edge detection',
          parameters: [standardParameters.kernelSize],
          inputNodes: [blurNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 700, y: 250 }
      },
      {
        id: outputNodeId,
        type: 'output',
        position: { x: 900, y: 250 }
      }
    ],
    edges: [
      {
        id: `${inputNodeId}-${grayscaleNodeId}`,
        source: inputNodeId,
        target: grayscaleNodeId
      },
      {
        id: `${grayscaleNodeId}-${blurNodeId}`,
        source: grayscaleNodeId,
        target: blurNodeId
      },
      {
        id: `${blurNodeId}-${laplacianNodeId}`,
        source: blurNodeId,
        target: laplacianNodeId
      },
      {
        id: `${laplacianNodeId}-${outputNodeId}`,
        source: laplacianNodeId,
        target: outputNodeId
      }
    ]
  };
};

// Create Sobel edge detection pipeline (Grayscale -> Blur -> Sobel)
const createSobelPipeline = (): Pipeline => {
  const inputNodeId = uuidv4();
  const grayscaleNodeId = uuidv4();
  const blurNodeId = uuidv4();
  const sobelNodeId = uuidv4();
  const outputNodeId = uuidv4();
  
  return {
    nodes: [
      {
        id: inputNodeId,
        type: 'input',
        position: { x: 100, y: 250 }
      },
      {
        id: grayscaleNodeId,
        type: 'transformation',
        transformation: {
          id: grayscaleNodeId,
          type: 'grayscale',
          name: 'Grayscale',
          description: 'Convert image to grayscale',
          parameters: [],
          inputNodes: [inputNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 300, y: 250 }
      },
      {
        id: blurNodeId,
        type: 'transformation',
        transformation: {
          id: blurNodeId,
          type: 'blur',
          name: 'Gaussian Blur',
          description: 'Apply Gaussian blur to reduce noise',
          parameters: [standardParameters.kernelSize],
          inputNodes: [grayscaleNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 500, y: 250 }
      },
      {
        id: sobelNodeId,
        type: 'transformation',
        transformation: {
          id: sobelNodeId,
          type: 'sobel',
          name: 'Sobel',
          description: 'Apply Sobel operator for edge detection',
          parameters: [standardParameters.kernelSize],
          inputNodes: [blurNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 700, y: 250 }
      },
      {
        id: outputNodeId,
        type: 'output',
        position: { x: 900, y: 250 }
      }
    ],
    edges: [
      {
        id: `${inputNodeId}-${grayscaleNodeId}`,
        source: inputNodeId,
        target: grayscaleNodeId
      },
      {
        id: `${grayscaleNodeId}-${blurNodeId}`,
        source: grayscaleNodeId,
        target: blurNodeId
      },
      {
        id: `${blurNodeId}-${sobelNodeId}`,
        source: blurNodeId,
        target: sobelNodeId
      },
      {
        id: `${sobelNodeId}-${outputNodeId}`,
        source: sobelNodeId,
        target: outputNodeId
      }
    ]
  };
};

// Create Canny edge detection pipeline (Grayscale -> Blur -> Canny)
const createCannyPipeline = (): Pipeline => {
  const inputNodeId = uuidv4();
  const grayscaleNodeId = uuidv4();
  const blurNodeId = uuidv4();
  const cannyNodeId = uuidv4();
  const outputNodeId = uuidv4();
  
  return {
    nodes: [
      {
        id: inputNodeId,
        type: 'input',
        position: { x: 100, y: 250 }
      },
      {
        id: grayscaleNodeId,
        type: 'transformation',
        transformation: {
          id: grayscaleNodeId,
          type: 'grayscale',
          name: 'Grayscale',
          description: 'Convert image to grayscale',
          parameters: [],
          inputNodes: [inputNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 300, y: 250 }
      },
      {
        id: blurNodeId,
        type: 'transformation',
        transformation: {
          id: blurNodeId,
          type: 'blur',
          name: 'Gaussian Blur',
          description: 'Apply Gaussian blur to reduce noise',
          parameters: [standardParameters.kernelSize],
          inputNodes: [grayscaleNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 500, y: 250 }
      },
      {
        id: cannyNodeId,
        type: 'transformation',
        transformation: {
          id: cannyNodeId,
          type: 'canny',
          name: 'Canny',
          description: 'Apply Canny algorithm for edge detection',
          parameters: [
            standardParameters.cannyThreshold1,
            standardParameters.cannyThreshold2
          ],
          inputNodes: [blurNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 700, y: 250 }
      },
      {
        id: outputNodeId,
        type: 'output',
        position: { x: 900, y: 250 }
      }
    ],
    edges: [
      {
        id: `${inputNodeId}-${grayscaleNodeId}`,
        source: inputNodeId,
        target: grayscaleNodeId
      },
      {
        id: `${grayscaleNodeId}-${blurNodeId}`,
        source: grayscaleNodeId,
        target: blurNodeId
      },
      {
        id: `${blurNodeId}-${cannyNodeId}`,
        source: blurNodeId,
        target: cannyNodeId
      },
      {
        id: `${cannyNodeId}-${outputNodeId}`,
        source: cannyNodeId,
        target: outputNodeId
      }
    ]
  };
};

// Create License Plate Detection Pipeline (Mini-Project 1)
const createLicensePlateDetectionPipeline = (): Pipeline => {
  const inputNodeId = uuidv4();
  const grayscaleNodeId = uuidv4();
  const thresholdNodeId = uuidv4();
  const medianFilterNodeId = uuidv4();
  const skeletonizeNodeId = uuidv4();
  const outputNodeId = uuidv4();
  
  return {
    nodes: [
      {
        id: inputNodeId,
        type: 'input',
        position: { x: 50, y: 200 }
      },
      {
        id: grayscaleNodeId,
        type: 'transformation',
        transformation: {
          id: grayscaleNodeId,
          type: 'grayscale',
          name: 'Grayscale',
          description: 'Convert to grayscale for processing',
          parameters: [],
          inputNodes: [inputNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 200, y: 200 }
      },
      {
        id: thresholdNodeId,
        type: 'transformation',
        transformation: {
          id: thresholdNodeId,
          type: 'threshold',
          name: 'Threshold',
          description: 'Binary threshold with invert',
          parameters: [
            { name: 'threshold', type: 'number', value: 54, min: 0, max: 255, step: 1, label: 'Threshold Value', description: 'Intensity threshold for binarization' },
            { name: 'invert', type: 'boolean', value: true, label: 'Invert Result', description: 'Invert the binary result (swap black and white)' }
          ],
          inputNodes: [grayscaleNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 350, y: 200 }
      },
      {
        id: medianFilterNodeId,
        type: 'transformation',
        transformation: {
          id: medianFilterNodeId,
          type: 'median',
          name: 'Median Filter',
          description: 'Noise reduction with median filtering',
          parameters: [
            { name: 'kernelSize', type: 'number', value: 3, min: 3, max: 15, step: 2, label: 'Kernel Size', description: 'Size of the median filter kernel (must be odd)' },
            { name: 'method', type: 'select', value: 'standard', options: ['standard', 'adaptive', 'cross-shaped', 'selective'], label: 'Filter Method', description: 'Type of median filtering to apply' },
            { name: 'iterations', type: 'number', value: 3, min: 1, max: 5, step: 1, label: 'Iterations', description: 'Number of times to apply the filter' },
            { name: 'preserveEdges', type: 'boolean', value: true, label: 'Preserve Edges', description: 'Try to preserve edge information' },
            { name: 'adaptiveWindowMax', type: 'number', value: 9, min: 5, max: 15, step: 2, label: 'Max Adaptive Window', description: 'Maximum window size for adaptive method' }
          ],
          inputNodes: [thresholdNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 500, y: 200 }
      },
      {
        id: skeletonizeNodeId,
        type: 'transformation',
        transformation: {
          id: skeletonizeNodeId,
          type: 'skeletonize',
          name: 'Skeletonize',
          description: 'Reduce objects to skeletal structure',
          parameters: [
            { name: 'method', type: 'select', value: 'zhang-suen', options: ['zhang-suen', 'morphological'], label: 'Algorithm', description: 'Skeletonization algorithm to use' },
            { name: 'iterations', type: 'number', value: 48, min: 1, max: 200, step: 1, label: 'Max Iterations', description: 'Maximum number of iterations' },
            { name: 'preserveEndpoints', type: 'boolean', value: true, label: 'Preserve Endpoints', description: 'Preserve endpoint pixels in skeleton' }
          ],
          inputNodes: [medianFilterNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 650, y: 200 }
      },
      {
        id: outputNodeId,
        type: 'output',
        position: { x: 800, y: 200 }
      }
    ],
    edges: [
      { id: `${inputNodeId}-${grayscaleNodeId}`, source: inputNodeId, target: grayscaleNodeId },
      { id: `${grayscaleNodeId}-${thresholdNodeId}`, source: grayscaleNodeId, target: thresholdNodeId },
      { id: `${thresholdNodeId}-${medianFilterNodeId}`, source: thresholdNodeId, target: medianFilterNodeId },
      { id: `${medianFilterNodeId}-${skeletonizeNodeId}`, source: medianFilterNodeId, target: skeletonizeNodeId },
      { id: `${skeletonizeNodeId}-${outputNodeId}`, source: skeletonizeNodeId, target: outputNodeId }
    ]
  };
};

// Create Line Segmentation Pipeline (Mini-Project 2)
const createLineSegmentationPipeline = (): Pipeline => {
  const inputNodeId = uuidv4();
  const medianNodeId = uuidv4();
  const backgroundSubtractionNodeId = uuidv4();
  const advancedThresholdNodeId = uuidv4();
  const morphologyNodeId = uuidv4();
  const outputNodeId = uuidv4();

  return {
    nodes: [
      {
        id: inputNodeId,
        type: 'input',
        position: { x: 0, y: 160 }
      },
      {
        id: medianNodeId,
        type: 'transformation',
        transformation: {
          id: medianNodeId,
          type: 'median',
          name: 'Median Filter',
          description: 'Apply median filter for noise reduction',
          parameters: [
            { name: 'kernelSize', type: 'number', value: 3, min: 3, max: 15, step: 2, label: 'Kernel Size', description: 'Size of the median filter kernel (must be odd)' },
            { name: 'method', type: 'select', value: 'cross-shaped', options: ['standard', 'adaptive', 'cross-shaped', 'selective'], label: 'Filter Method', description: 'Type of median filtering to apply' },
            { name: 'iterations', type: 'number', value: 5, min: 1, max: 5, step: 1, label: 'Iterations', description: 'Number of times to apply the filter' },
            { name: 'preserveEdges', type: 'boolean', value: true, label: 'Preserve Edges', description: 'Try to preserve edge information' },
            { name: 'adaptiveWindowMax', type: 'number', value: 9, min: 5, max: 15, step: 2, label: 'Max Adaptive Window', description: 'Maximum window size for adaptive method' },
            { name: 'selectiveThreshold', type: 'number', value: 100, min: 10, max: 500, step: 10, label: 'Selective Threshold', description: 'Variance threshold for selective filtering' },
            { name: 'edgeThreshold', type: 'number', value: 200, min: 10, max: 200, step: 5, label: 'Edge Threshold', description: 'Threshold for edge detection' }
          ],
          inputNodes: [inputNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 432, y: 176 }
      },
      {
        id: backgroundSubtractionNodeId,
        type: 'transformation',
        transformation: {
          id: backgroundSubtractionNodeId,
          type: 'backgroundSubtraction',
          name: 'Background Subtraction',
          description: 'Remove uneven background illumination from images',
          parameters: [
            { name: 'method', type: 'select', value: 'morphological', options: ['morphological', 'gaussian', 'rolling-ball', 'polynomial'], label: 'Method', description: 'Background estimation method' },
            { name: 'kernelSize', type: 'number', value: 51, min: 3, max: 201, step: 2, label: 'Kernel Size', description: 'Size of the structuring element (must be odd)' },
            { name: 'sigmaX', type: 'number', value: 50, min: 1, max: 200, step: 1, label: 'Sigma X', description: 'Standard deviation in X direction' },
            { name: 'sigmaY', type: 'number', value: 50, min: 1, max: 200, step: 1, label: 'Sigma Y', description: 'Standard deviation in Y direction' },
            { name: 'ballRadius', type: 'number', value: 25, min: 5, max: 100, step: 1, label: 'Ball Radius', description: 'Radius of rolling ball' },
            { name: 'polynomialOrder', type: 'number', value: 3, min: 1, max: 6, step: 1, label: 'Polynomial Order', description: 'Order of polynomial fitting' },
            { name: 'normalize', type: 'boolean', value: true, label: 'Normalize Result', description: 'Normalize output to full intensity range' }
          ],
          inputNodes: [medianNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 848, y: 160 }
      },
      {
        id: advancedThresholdNodeId,
        type: 'transformation',
        transformation: {
          id: advancedThresholdNodeId,
          type: 'advancedThreshold',
          name: 'Advanced Thresholding',
          description: 'Advanced statistical and multi-level thresholding for noisy images',
          parameters: [
            { name: 'method', type: 'select', value: 'statistical-combined', options: ['multi-otsu', 'triangle', 'minimum-error', 'hysteresis', 'statistical-combined', 'multi-scale'], label: 'Thresholding Method', description: 'Advanced thresholding algorithm to use' },
            { name: 'levels', type: 'number', value: 2, min: 1, max: 4, step: 1, label: 'Threshold Levels', description: 'Number of threshold levels for multi-level methods' },
            { name: 'highThreshold', type: 'number', value: 180, min: 50, max: 255, step: 1, label: 'High Threshold', description: 'Upper threshold for hysteresis method' },
            { name: 'lowThreshold', type: 'number', value: 80, min: 10, max: 200, step: 1, label: 'Low Threshold', description: 'Lower threshold for hysteresis method' },
            { name: 'postProcessing', type: 'boolean', value: true, label: 'Morphological Cleanup', description: 'Apply automatic morphological post-processing' },
            { name: 'removeNoise', type: 'boolean', value: true, label: 'Remove Noise', description: 'Remove small noise components' },
            { name: 'minComponentSize', type: 'number', value: 135, min: 5, max: 500, step: 5, label: 'Min Component Size', description: 'Minimum component size to keep (pixels)' },
            { name: 'fillHoles', type: 'boolean', value: true, label: 'Fill Holes', description: 'Fill holes in thresholded regions' },
            { name: 'preserveEdges', type: 'boolean', value: true, label: 'Preserve Edges', description: 'Try to preserve edge details during cleanup' },
            { name: 'adaptiveLocalSize', type: 'number', value: 9, min: 5, max: 51, step: 2, label: 'Adaptive Window Size', description: 'Local window size for adaptive components (must be odd)' }
          ],
          inputNodes: [backgroundSubtractionNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 1280, y: 128 }
      },
      {
        id: morphologyNodeId,
        type: 'transformation',
        transformation: {
          id: morphologyNodeId,
          type: 'morphology',
          name: 'Morphological Operation',
          description: 'Apply morphological transformations to the image',
          parameters: [
            { name: 'operation', type: 'select', value: 'open', options: ['open', 'close', 'gradient', 'tophat', 'blackhat'], label: 'Operation', description: 'Type of morphological operation' },
            { name: 'kernelSize', type: 'number', value: 5, min: 1, max: 31, step: 2, label: 'Kernel Size', description: 'Size of the structuring element' },
            { name: 'iterations', type: 'number', value: 1, min: 1, max: 10, step: 1, label: 'Iterations', description: 'Number of times to apply the operation' }
          ],
          inputNodes: [advancedThresholdNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 1712, y: 208 }
      },
      {
        id: outputNodeId,
        type: 'output',
        position: { x: 2192, y: 192 }
      }
    ],
    edges: [
      { id: `${inputNodeId}-${medianNodeId}`, source: inputNodeId, target: medianNodeId },
      { id: `${medianNodeId}-${backgroundSubtractionNodeId}`, source: medianNodeId, target: backgroundSubtractionNodeId },
      { id: `${backgroundSubtractionNodeId}-${advancedThresholdNodeId}`, source: backgroundSubtractionNodeId, target: advancedThresholdNodeId },
      { id: `${advancedThresholdNodeId}-${morphologyNodeId}`, source: advancedThresholdNodeId, target: morphologyNodeId },
      { id: `${morphologyNodeId}-${outputNodeId}`, source: morphologyNodeId, target: outputNodeId }
    ]
  };
};

const createCellDetectionMiniProject = (): Pipeline => {
  const inputNodeId = uuidv4();
  const medianNodeId = uuidv4();
  const backgroundSubtractionNodeId = uuidv4();
  const advancedThresholdNodeId = uuidv4();
  const morphologyNodeId = uuidv4();
  const cellDetectionNodeId = uuidv4();
  const outputNodeId = uuidv4();

  return {
    nodes: [
      {
        id: inputNodeId,
        type: 'input',
        position: { x: 100, y: 150 }
      },
      {
        id: medianNodeId,
        type: 'transformation',
        transformation: {
          id: medianNodeId,
          type: 'median',
          name: 'Median Filter',
          description: 'Reduce noise while preserving edges',
          parameters: [
            { name: 'kernelSize', type: 'number', value: 5, min: 3, max: 15, step: 2, label: 'Filter Size' },
            { name: 'method', type: 'select', value: 'cross-shaped', options: ['standard', 'adaptive', 'cross-shaped', 'selective'], label: 'Filter Method' },
            { name: 'iterations', type: 'number', value: 3, min: 1, max: 5, label: 'Iterations' },
            { name: 'preserveEdges', type: 'boolean', value: true, label: 'Preserve Edges' },
            { name: 'edgeThreshold', type: 'number', value: 50, min: 10, max: 100, label: 'Edge Threshold' }
          ],
          inputNodes: [inputNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 290, y: 120 }
      },
      {
        id: backgroundSubtractionNodeId,
        type: 'transformation',
        transformation: {
          id: backgroundSubtractionNodeId,
          type: 'backgroundSubtraction',
          name: 'Background Subtraction',
          description: 'Remove uneven illumination',
          parameters: [
            { name: 'method', type: 'select', value: 'morphological', options: ['morphological', 'gaussian', 'rolling-ball', 'polynomial'], label: 'Method' },
            { name: 'kernelSize', type: 'number', value: 51, min: 15, max: 201, step: 2, label: 'Kernel Size' },
            { name: 'sigmaX', type: 'number', value: 50, min: 1, max: 200, label: 'Sigma X' },
            { name: 'sigmaY', type: 'number', value: 50, min: 1, max: 200, label: 'Sigma Y' },
            { name: 'ballRadius', type: 'number', value: 25, min: 5, max: 100, label: 'Ball Radius' },
            { name: 'polynomialOrder', type: 'number', value: 3, min: 1, max: 7, label: 'Polynomial Order' },
            { name: 'normalize', type: 'boolean', value: true, label: 'Normalize Result' }
          ],
          inputNodes: [medianNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 545, y: 120 }
      },
      {
        id: advancedThresholdNodeId,
        type: 'transformation',
        transformation: {
          id: advancedThresholdNodeId,
          type: 'advancedThreshold',
          name: 'Advanced Thresholding',
          description: 'Multi-level statistical thresholding',
          parameters: [
            { name: 'thresholdingMethod', type: 'select', value: 'statistical-combined', options: ['statistical-combined', 'multi-otsu', 'local-adaptive'], label: 'Thresholding Method' },
            { name: 'thresholdLevels', type: 'number', value: 1, min: 1, max: 4, label: 'Threshold Levels' },
            { name: 'highThreshold', type: 'number', value: 180, min: 50, max: 255, label: 'High Threshold' },
            { name: 'lowThreshold', type: 'number', value: 80, min: 10, max: 200, label: 'Low Threshold' },
            { name: 'morphologicalCleanup', type: 'boolean', value: true, label: 'Morphological Cleanup' },
            { name: 'removeNoise', type: 'boolean', value: true, label: 'Remove Noise' },
            { name: 'minComponentSize', type: 'number', value: 135, min: 50, max: 500, label: 'Min Component Size' },
            { name: 'fillHoles', type: 'boolean', value: true, label: 'Fill Holes' },
            { name: 'preserveEdges', type: 'boolean', value: true, label: 'Preserve Edges' },
            { name: 'adaptiveWindowSize', type: 'number', value: 9, min: 3, max: 31, step: 2, label: 'Adaptive Window Size' }
          ],
          inputNodes: [backgroundSubtractionNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 820, y: 120 }
      },
      {
        id: morphologyNodeId,
        type: 'transformation',
        transformation: {
          id: morphologyNodeId,
          type: 'morphology',
          name: 'Morphological Operation',
          description: 'Clean and enhance cell shapes',
          parameters: [
            { name: 'operation', type: 'select', value: 'open', options: ['open', 'close', 'gradient', 'tophat', 'blackhat'], label: 'Operation' },
            { name: 'kernelSize', type: 'number', value: 5, min: 3, max: 31, step: 2, label: 'Kernel Size' },
            { name: 'iterations', type: 'number', value: 1, min: 1, max: 10, label: 'Iterations' }
          ],
          inputNodes: [advancedThresholdNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 1075, y: 120 }
      },
      {
        id: cellDetectionNodeId,
        type: 'transformation',
        transformation: {
          id: cellDetectionNodeId,
          type: 'cellDetection',
          name: 'Cell Detection Pipeline',
          description: 'Comprehensive cell detection and analysis',
          parameters: [
            // Preprocessing
            { name: 'enablePreprocessing', type: 'boolean', value: false, label: 'Enable Preprocessing' },
            { name: 'gaussianBlur', type: 'number', value: 1, min: 0, max: 10, label: 'Gaussian Blur' },
            { name: 'medianFilterSize', type: 'number', value: 3, min: 1, max: 15, step: 2, label: 'Median Filter Size' },
            { name: 'medianIterations', type: 'number', value: 1, min: 1, max: 5, label: 'Median Iterations' },
            
            // Thresholding (skip since already done)
            { name: 'thresholdMethod', type: 'select', value: 'manual', options: ['otsu', 'adaptive', 'manual'], label: 'Threshold Method' },
            { name: 'manualThreshold', type: 'number', value: 128, min: 0, max: 255, label: 'Manual Threshold' },
            { name: 'invertBinary', type: 'boolean', value: false, label: 'Invert Binary' },
            
            // Morphology (minimal since already done)
            { name: 'enableMorphology', type: 'boolean', value: false, label: 'Enable Morphology' },
            { name: 'fillHoles', type: 'boolean', value: true, label: 'Fill Holes' },
            { name: 'clearBorder', type: 'boolean', value: true, label: 'Clear Border' },
            { name: 'borderWidth', type: 'number', value: 5, min: 1, max: 20, label: 'Border Width' },
            
            // Segmentation
            { name: 'segmentationMethod', type: 'select', value: 'contours', options: ['watershed', 'distance', 'contours', 'components'], label: 'Segmentation Method' },
            { name: 'minCellSize', type: 'number', value: 50, min: 10, max: 1000, label: 'Min Cell Size' },
            { name: 'maxCellSize', type: 'number', value: 2000, min: 500, max: 50000, label: 'Max Cell Size' },
            
            // Shape analysis
            { name: 'enableShapeAnalysis', type: 'boolean', value: true, label: 'Enable Shape Analysis' },
            { name: 'minCircularity', type: 'number', value: 0.2, min: 0.0, max: 1.0, step: 0.1, label: 'Min Circularity' },
            { name: 'maxCircularity', type: 'number', value: 1.0, min: 0.0, max: 1.0, step: 0.1, label: 'Max Circularity' },
            { name: 'minAspectRatio', type: 'number', value: 0.3, min: 0.1, max: 5.0, step: 0.1, label: 'Min Aspect Ratio' },
            { name: 'maxAspectRatio', type: 'number', value: 3.0, min: 0.5, max: 10.0, step: 0.1, label: 'Max Aspect Ratio' },
            
            // Output
            { name: 'outputMode', type: 'select', value: 'overlay', options: ['segmented', 'labeled', 'overlay', 'boundaries', 'analysis'], label: 'Output Mode' },
            { name: 'colorCoding', type: 'boolean', value: true, label: 'Color Coding' },
            { name: 'showCellNumbers', type: 'boolean', value: false, label: 'Show Cell Numbers' },
            { name: 'boundaryThickness', type: 'number', value: 2, min: 1, max: 10, label: 'Boundary Thickness' }
          ],
          inputNodes: [morphologyNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 1375, y: 120 }
      },
      {
        id: outputNodeId,
        type: 'output',
        position: { x: 1550, y: 200 }
      }
    ],
    edges: [
      { id: `${inputNodeId}-${medianNodeId}`, source: inputNodeId, target: medianNodeId },
      { id: `${medianNodeId}-${backgroundSubtractionNodeId}`, source: medianNodeId, target: backgroundSubtractionNodeId },
      { id: `${backgroundSubtractionNodeId}-${advancedThresholdNodeId}`, source: backgroundSubtractionNodeId, target: advancedThresholdNodeId },
      { id: `${advancedThresholdNodeId}-${morphologyNodeId}`, source: advancedThresholdNodeId, target: morphologyNodeId },
      { id: `${morphologyNodeId}-${cellDetectionNodeId}`, source: morphologyNodeId, target: cellDetectionNodeId },
      { id: `${cellDetectionNodeId}-${outputNodeId}`, source: cellDetectionNodeId, target: outputNodeId }
    ]
  };
};

// Sample lesson definitions
export const sampleLessons: Lesson[] = [
  {
    id: 'edge-detection-laplacian',
    title: 'Edge Detection using Laplacian',
    description: 'Learn how to detect edges in an image using the Laplacian operator, which is a second-order derivative filter used for edge detection.',
    image: 'https://placehold.co/600x400?text=Laplacian+Edge+Detection',
    category: 'edge-detection',
    difficulty: 'intermediate',
    tags: ['edge detection', 'laplacian', 'image processing', 'computer vision'],
    pipeline: createLaplacianPipeline()
  },
  {
    id: 'edge-detection-sobel',
    title: 'Edge Detection using Sobel',
    description: 'Learn how to detect edges in an image using the Sobel operator, which emphasizes edges by computing the gradient of the image intensity.',
    image: 'https://placehold.co/600x400?text=Sobel+Edge+Detection',
    category: 'edge-detection',
    difficulty: 'intermediate',
    tags: ['edge detection', 'sobel', 'gradient', 'image processing'],
    pipeline: createSobelPipeline()
  },
  {
    id: 'edge-detection-canny',
    title: 'Edge Detection using Canny',
    description: 'Learn how to detect edges in an image using the Canny algorithm, a multi-stage edge detection technique that uses thresholding and thin lines.',
    image: 'https://placehold.co/600x400?text=Canny+Edge+Detection',
    category: 'edge-detection',
    difficulty: 'advanced',
    tags: ['edge detection', 'canny', 'thresholding', 'computer vision'],
    pipeline: createCannyPipeline()
  },
  {
    id: 'grayscale-conversion',
    title: 'Grayscale Conversion',
    description: 'Learn how to convert a color image to grayscale, reducing the color information while preserving luminance for easier processing.',
    image: 'https://placehold.co/600x400?text=Grayscale+Conversion',
    category: 'transformations',
    difficulty: 'beginner',
    tags: ['grayscale', 'color', 'basics', 'image processing'],
    pipeline: createSingleTransformPipeline('grayscale')
  },
  {
    id: 'gaussian-blur',
    title: 'Gaussian Blur',
    description: 'Learn how to apply Gaussian blur to reduce image noise and detail, using a kernel that represents the shape of a Gaussian curve.',
    image: 'https://placehold.co/600x400?text=Gaussian+Blur',
    category: 'filters',
    difficulty: 'beginner',
    tags: ['blur', 'gaussian', 'smoothing', 'kernel'],
    pipeline: createSingleTransformPipeline('blur', [standardParameters.kernelSize])
  },
  {
    id: 'thresholding',
    title: 'Binary Thresholding',
    description: 'Learn how to separate objects from the background by applying a threshold value that converts grayscale images to binary.',
    image: 'https://placehold.co/600x400?text=Binary+Thresholding',
    category: 'transformations',
    difficulty: 'beginner',
    tags: ['threshold', 'binary', 'segmentation', 'image processing'],
    pipeline: createSingleTransformPipeline('threshold', [standardParameters.threshold])
  },
  {
    id: 'basic-edge-detection',
    title: 'Introduction to Edge Detection',
    description: 'Learn the basics of edge detection and how different algorithms can help identify object boundaries in images.',
    image: 'https://placehold.co/600x400?text=Basic+Edge+Detection',
    category: 'edge-detection',
    difficulty: 'beginner',
    tags: ['edge detection', 'basics', 'computer vision'],
    pipeline: createSingleTransformPipeline('laplacian', [standardParameters.kernelSize])
  },
  {
    id: 'advanced-thresholding',
    title: 'Advanced Thresholding Techniques',
    description: 'Explore advanced thresholding techniques for better image segmentation, including adaptive and Otsu thresholding.',
    image: 'https://placehold.co/600x400?text=Advanced+Thresholding',
    category: 'transformations',
    difficulty: 'advanced',
    tags: ['threshold', 'segmentation', 'adaptive', 'otsu'],
    pipeline: createSingleTransformPipeline('threshold', [standardParameters.threshold])
  },
  {
    id: 'blur-techniques',
    title: 'Image Blurring Techniques',
    description: 'Compare different blur techniques including Gaussian, median, and box blur to understand their effects on image noise reduction.',
    image: 'https://placehold.co/600x400?text=Blur+Techniques',
    category: 'filters',
    difficulty: 'intermediate',
    tags: ['blur', 'gaussian', 'median', 'noise reduction'],
    pipeline: createSingleTransformPipeline('blur', [standardParameters.kernelSize])
  },
  {
    id: 'license-plate-detection',
    title: 'Mini-Project 1: License Plate Detection',
    description: 'Image processing pipeline using grayscale conversion, threshold binarization, median filtering for noise reduction, and skeletonization for structure analysis.',
    image: `${import.meta.env.BASE_URL}assets/projects/plaque.jpg`,
    category: 'mini-projects',
    difficulty: 'advanced',
    tags: ['license plate', 'threshold', 'median filter', 'skeletonization', 'binary processing'],
    pipeline: createLicensePlateDetectionPipeline()
  },
  {
    id: 'line-segmentation',
    title: 'Mini-Project 2: Line Segmentation',
    description: 'Simplified line segmentation pipeline using median filtering, background subtraction, advanced thresholding, and morphological operations.',
    image: `${import.meta.env.BASE_URL}assets/projects/MP3.gif`,
    category: 'mini-projects',
    difficulty: 'advanced',
    tags: ['line detection', 'advanced thresholding', 'background subtraction', 'morphology'],
    pipeline: createLineSegmentationPipeline()
  },
  {
    id: 'cell-detection',
    title: 'Mini-Project 3: Cell Detection',
    description: 'Comprehensive cell detection and analysis using advanced thresholding, morphological operations, and shape analysis.',
    image: `${import.meta.env.BASE_URL}assets/projects/cell.jpg`,
    category: 'mini-projects',
    difficulty: 'advanced',
    tags: ['cell detection', 'advanced thresholding', 'morphology', 'shape analysis'],
    pipeline: createCellDetectionMiniProject()
  }
]; 