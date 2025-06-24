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

// Create License Plate Detection Pipeline (Mini-Project 2)
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

// Create Line Segmentation Pipeline (Mini-Project 3)
const createLineSegmentationPipeline = (): Pipeline => {
  const inputNodeId = uuidv4();
  const grayscaleNodeId = uuidv4();
  const backgroundSubtractionNodeId = uuidv4();
  const colorAdjustNodeId = uuidv4();
  const cannyNodeId = uuidv4();
  const morphologyCloseNodeId = uuidv4();
  const houghLinesNodeId = uuidv4();
  const dilateNodeId = uuidv4();
  const fillHolesNodeId = uuidv4();
  const connectedComponentsNodeId = uuidv4();
  const findContoursNodeId = uuidv4();
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
          description: 'Convert to grayscale',
          parameters: [],
          inputNodes: [inputNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 200, y: 200 }
      },
      {
        id: backgroundSubtractionNodeId,
        type: 'transformation',
        transformation: {
          id: backgroundSubtractionNodeId,
          type: 'backgroundSubtraction',
          name: 'Background Subtraction',
          description: 'Remove uneven background',
          parameters: [
            { name: 'method', type: 'select', value: 'morphological' },
            { name: 'kernelSize', type: 'number', value: 51, min: 3, max: 201, step: 2 },
            { name: 'normalize', type: 'boolean', value: true }
          ],
          inputNodes: [grayscaleNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 350, y: 120 }
      },
      {
        id: colorAdjustNodeId,
        type: 'transformation',
        transformation: {
          id: colorAdjustNodeId,
          type: 'colorAdjust',
          name: 'Color Adjustment',
          description: 'Enhance contrast',
          parameters: [
            { name: 'brightness', type: 'number', value: 10, min: -100, max: 100, step: 1 },
            { name: 'contrast', type: 'number', value: 30, min: -100, max: 100, step: 1 },
            { name: 'saturation', type: 'number', value: 0, min: -100, max: 100, step: 1 },
            { name: 'hue', type: 'number', value: 0, min: -180, max: 180, step: 1 }
          ],
          inputNodes: [backgroundSubtractionNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 500, y: 120 }
      },
      {
        id: cannyNodeId,
        type: 'transformation',
        transformation: {
          id: cannyNodeId,
          type: 'canny',
          name: 'Canny Edge Detection',
          description: 'Detect line edges',
          parameters: [
            { name: 'threshold1', type: 'number', value: 50, min: 0, max: 255, step: 1 },
            { name: 'threshold2', type: 'number', value: 150, min: 0, max: 255, step: 1 }
          ],
          inputNodes: [colorAdjustNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 650, y: 120 }
      },
      {
        id: morphologyCloseNodeId,
        type: 'transformation',
        transformation: {
          id: morphologyCloseNodeId,
          type: 'morphology',
          name: 'Morphology Close',
          description: 'Connect line segments',
          parameters: [
            { name: 'operation', type: 'select', value: 'close' },
            { name: 'kernelSize', type: 'number', value: 5, min: 1, max: 31, step: 2 },
            { name: 'iterations', type: 'number', value: 2, min: 1, max: 10, step: 1 }
          ],
          inputNodes: [cannyNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 800, y: 120 }
      },
      {
        id: houghLinesNodeId,
        type: 'transformation',
        transformation: {
          id: houghLinesNodeId,
          type: 'houghLines',
          name: 'Hough Line Detection',
          description: 'Detect straight lines',
          parameters: [
            { name: 'rho', type: 'number', value: 1, min: 0.1, max: 10, step: 0.1 },
            { name: 'theta', type: 'number', value: 1, min: 0.1, max: 10, step: 0.1 },
            { name: 'threshold', type: 'number', value: 100, min: 1, max: 500, step: 1 },
            { name: 'minLineLength', type: 'number', value: 50, min: 0, max: 1000, step: 1 },
            { name: 'maxLineGap', type: 'number', value: 10, min: 0, max: 100, step: 1 },
            { name: 'lineColor', type: 'select', value: 'red' },
            { name: 'lineThickness', type: 'number', value: 2, min: 1, max: 10, step: 1 }
          ],
          inputNodes: [morphologyCloseNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 950, y: 120 }
      },
      {
        id: dilateNodeId,
        type: 'transformation',
        transformation: {
          id: dilateNodeId,
          type: 'dilate',
          name: 'Dilation',
          description: 'Thicken detected lines',
          parameters: [
            { name: 'kernelSize', type: 'number', value: 3, min: 1, max: 31, step: 2 },
            { name: 'iterations', type: 'number', value: 2, min: 1, max: 10, step: 1 }
          ],
          inputNodes: [houghLinesNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 1100, y: 120 }
      },
      {
        id: fillHolesNodeId,
        type: 'transformation',
        transformation: {
          id: fillHolesNodeId,
          type: 'fillHoles',
          name: 'Fill Holes',
          description: 'Fill gaps in lines',
          parameters: [
            { name: 'connectivity', type: 'select', value: '8' },
            { name: 'minHoleSize', type: 'number', value: 0, min: 0, max: 1000, step: 1 },
            { name: 'maxHoleSize', type: 'number', value: 100, min: 0, max: 1000, step: 1 }
          ],
          inputNodes: [dilateNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 1250, y: 120 }
      },
      {
        id: connectedComponentsNodeId,
        type: 'transformation',
        transformation: {
          id: connectedComponentsNodeId,
          type: 'connectedComponents',
          name: 'Connected Components',
          description: 'Filter line segments',
          parameters: [
            { name: 'connectivity', type: 'select', value: '8' },
            { name: 'minArea', type: 'number', value: 50, min: 0, max: 10000, step: 1 },
            { name: 'maxArea', type: 'number', value: 0, min: 0, max: 100000, step: 1 },
            { name: 'outputMode', type: 'select', value: 'filtered' }
          ],
          inputNodes: [fillHolesNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 1400, y: 120 }
      },
      {
        id: findContoursNodeId,
        type: 'transformation',
        transformation: {
          id: findContoursNodeId,
          type: 'findContours',
          name: 'Find Contours',
          description: 'Extract line boundaries',
          parameters: [
            { name: 'mode', type: 'select', value: 'external' },
            { name: 'method', type: 'select', value: 'simple' },
            { name: 'minContourArea', type: 'number', value: 50, min: 0, max: 10000, step: 1 },
            { name: 'thickness', type: 'number', value: 2, min: 1, max: 10, step: 1 },
            { name: 'color', type: 'select', value: 'white' }
          ],
          inputNodes: [connectedComponentsNodeId],
          showPreprocessingSteps: true
        },
        position: { x: 1550, y: 120 }
      },
      {
        id: outputNodeId,
        type: 'output',
        position: { x: 1700, y: 200 }
      }
    ],
    edges: [
      { id: `${inputNodeId}-${grayscaleNodeId}`, source: inputNodeId, target: grayscaleNodeId },
      { id: `${grayscaleNodeId}-${backgroundSubtractionNodeId}`, source: grayscaleNodeId, target: backgroundSubtractionNodeId },
      { id: `${backgroundSubtractionNodeId}-${colorAdjustNodeId}`, source: backgroundSubtractionNodeId, target: colorAdjustNodeId },
      { id: `${colorAdjustNodeId}-${cannyNodeId}`, source: colorAdjustNodeId, target: cannyNodeId },
      { id: `${cannyNodeId}-${morphologyCloseNodeId}`, source: cannyNodeId, target: morphologyCloseNodeId },
      { id: `${morphologyCloseNodeId}-${houghLinesNodeId}`, source: morphologyCloseNodeId, target: houghLinesNodeId },
      { id: `${houghLinesNodeId}-${dilateNodeId}`, source: houghLinesNodeId, target: dilateNodeId },
      { id: `${dilateNodeId}-${fillHolesNodeId}`, source: dilateNodeId, target: fillHolesNodeId },
      { id: `${fillHolesNodeId}-${connectedComponentsNodeId}`, source: fillHolesNodeId, target: connectedComponentsNodeId },
      { id: `${connectedComponentsNodeId}-${findContoursNodeId}`, source: connectedComponentsNodeId, target: findContoursNodeId },
      { id: `${findContoursNodeId}-${outputNodeId}`, source: findContoursNodeId, target: outputNodeId }
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
    title: 'Mini-Project 2: License Plate Detection',
    description: 'Image processing pipeline using grayscale conversion, threshold binarization, median filtering for noise reduction, and skeletonization for structure analysis.',
    image: '/assets/projects/plaque.jpg',
    category: 'mini-projects',
    difficulty: 'advanced',
    tags: ['license plate', 'threshold', 'median filter', 'skeletonization', 'binary processing'],
    pipeline: createLicensePlateDetectionPipeline()
  },
  {
    id: 'line-segmentation',
    title: 'Mini-Project 3: Line Segmentation',
    description: 'Complete solution for segmenting and detecting lines in document images using edge detection, Hough transforms, and morphological processing.',
    image: '/assets/projects/MP3.gif',
    category: 'mini-projects',
    difficulty: 'advanced',
    tags: ['line detection', 'hough transform', 'edge detection', 'morphology'],
    pipeline: createLineSegmentationPipeline()
  }
]; 