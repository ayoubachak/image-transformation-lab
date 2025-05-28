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
  }
]; 