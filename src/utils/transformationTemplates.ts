/**
 * Shape Detection Transformation Templates
 * Pre-configured transformations for shape detection and analysis
 */

import { v4 as uuidv4 } from 'uuid';
import type { Transformation } from './types';

/**
 * Template for basic transformations
 */
export interface BasicTransformationTemplate {
  type: string;
  name: string;
  description: string;
  parameters: any[];
}

/**
 * Template for complex pipeline transformations
 */
export interface PipelineTransformationTemplate {
  type: string;
  name: string;
  description: string;
  steps: string[];
  parameters: any[];
}

/**
 * Factory interface for creating transformation nodes
 */
export interface TransformationFactory {
  type: string;
  name: string;
  description: string;
  category: string;
  factory: () => Transformation;
}

/**
 * Watershed Segmentation Template
 */
export const createWatershedTransformation = (
  inputNodes: string[] = []
): Transformation => ({
  id: uuidv4(),
  type: 'watershed',
  name: 'Watershed Segmentation',
  description: 'Separate touching objects using watershed algorithm',
  inputNodes,
  parameters: [
    {
      name: 'method',
      type: 'select',
      value: 'distance',
      label: 'Watershed Method',
      description: 'Algorithm variant to use',
      options: ['distance', 'gradient', 'markers']
    },
    {
      name: 'preprocessing',
      type: 'select',
      value: 'gaussian',
      label: 'Preprocessing',
      description: 'Noise reduction before watershed',
      options: ['gaussian', 'median', 'bilateral', 'none']
    },
    {
      name: 'blurKernelSize',
      type: 'number',
      value: 5,
      min: 3,
      max: 15,
      step: 2,
      label: 'Blur Kernel Size',
      description: 'Size of preprocessing filter'
    },
    {
      name: 'threshold',
      type: 'number',
      value: 128,
      min: 0,
      max: 255,
      step: 1,
      label: 'Binary Threshold',
      description: 'Threshold for binarization'
    },
    {
      name: 'minDistance',
      type: 'number',
      value: 10,
      min: 1,
      max: 50,
      step: 1,
      label: 'Minimum Distance',
      description: 'Minimum distance between objects'
    },
    {
      name: 'connectivityType',
      type: 'select',
      value: 8,
      label: 'Connectivity',
      description: 'Pixel connectivity type',
      options: ['4', '8']
    },
    {
      name: 'removeSmallObjects',
      type: 'boolean',
      value: true,
      label: 'Remove Small Objects',
      description: 'Filter out small objects',
      advanced: true
    },
    {
      name: 'minObjectSize',
      type: 'number',
      value: 50,
      min: 10,
      max: 1000,
      step: 10,
      label: 'Min Object Size',
      description: 'Minimum object size to keep',
      advanced: true
    }
  ]
});

/**
 * Distance Transform Template
 */
export const createDistanceTransformTransformation = (
  inputNodes: string[] = []
): Transformation => ({
  id: uuidv4(),
  type: 'distanceTransform',
  name: 'Distance Transform',
  description: 'Compute distance to nearest background pixel',
  inputNodes,
  parameters: [
    {
      name: 'distanceType',
      type: 'select',
      value: 'euclidean',
      label: 'Distance Type',
      description: 'Distance metric to use',
      options: ['euclidean', 'manhattan', 'chessboard', 'l1', 'l2']
    },
    {
      name: 'outputMode',
      type: 'select',
      value: 'distance',
      label: 'Output Mode',
      description: 'Type of output to generate',
      options: ['distance', 'skeleton', 'peaks', 'ridges']
    },
    {
      name: 'threshold',
      type: 'number',
      value: 128,
      min: 0,
      max: 255,
      step: 1,
      label: 'Binary Threshold',
      description: 'Threshold for input binarization'
    },
    {
      name: 'normalize',
      type: 'boolean',
      value: true,
      label: 'Normalize Output',
      description: 'Normalize distances to 0-255 range'
    },
    {
      name: 'minDistance',
      type: 'number',
      value: 5,
      min: 1,
      max: 50,
      step: 1,
      label: 'Minimum Distance',
      description: 'Threshold for peaks/ridges detection',
      advanced: true
    },
    {
      name: 'maskSize',
      type: 'select',
      value: 3,
      label: 'Mask Size',
      description: 'Size of distance transform mask',
      options: ['3', '5'],
      advanced: true
    },
    {
      name: 'invertInput',
      type: 'boolean',
      value: false,
      label: 'Invert Input',
      description: 'Invert binary image before processing',
      advanced: true
    }
  ]
});

/**
 * Shape Analysis Template
 */
export const createShapeAnalysisTransformation = (
  inputNodes: string[] = []
): Transformation => ({
  id: uuidv4(),
  type: 'shapeAnalysis',
  name: 'Shape Analysis',
  description: 'Analyze geometric properties of detected shapes',
  inputNodes,
  parameters: [
    {
      name: 'analysisType',
      type: 'select',
      value: 'contours',
      label: 'Analysis Type',
      description: 'Method for shape detection',
      options: ['contours', 'blobs', 'regions', 'geometric']
    },
    {
      name: 'outputMode',
      type: 'select',
      value: 'overlay',
      label: 'Output Mode',
      description: 'How to display results',
      options: ['filtered', 'labeled', 'properties', 'overlay']
    },
    {
      name: 'minArea',
      type: 'number',
      value: 100,
      min: 1,
      max: 50000,
      step: 10,
      label: 'Minimum Area',
      description: 'Minimum shape area (pixels)'
    },
    {
      name: 'maxArea',
      type: 'number',
      value: 10000,
      min: 100,
      max: 100000,
      step: 100,
      label: 'Maximum Area',
      description: 'Maximum shape area (pixels)'
    },
    {
      name: 'circularityMin',
      type: 'number',
      value: 0.0,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: 'Min Circularity',
      description: 'Minimum circularity (0=line, 1=circle)',
      advanced: true
    },
    {
      name: 'circularityMax',
      type: 'number',
      value: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: 'Max Circularity',
      description: 'Maximum circularity (0=line, 1=circle)',
      advanced: true
    },
    {
      name: 'aspectRatioMin',
      type: 'number',
      value: 0.1,
      min: 0.1,
      max: 10.0,
      step: 0.1,
      label: 'Min Aspect Ratio',
      description: 'Minimum width/height ratio',
      advanced: true
    },
    {
      name: 'aspectRatioMax',
      type: 'number',
      value: 10.0,
      min: 0.1,
      max: 20.0,
      step: 0.1,
      label: 'Max Aspect Ratio',
      description: 'Maximum width/height ratio',
      advanced: true
    },
    {
      name: 'colorCode',
      type: 'boolean',
      value: true,
      label: 'Color Code Results',
      description: 'Color shapes by properties',
      advanced: true
    },
    {
      name: 'drawProperties',
      type: 'boolean',
      value: true,
      label: 'Draw Properties',
      description: 'Show shape measurements',
      advanced: true
    },
    {
      name: 'minPerimeter',
      type: 'number',
      value: 20,
      min: 1,
      max: 5000,
      step: 5,
      label: 'Min Perimeter',
      description: 'Minimum shape perimeter',
      advanced: true
    },
    {
      name: 'maxPerimeter',
      type: 'number',
      value: 1000,
      min: 50,
      max: 10000,
      step: 50,
      label: 'Max Perimeter',
      description: 'Maximum shape perimeter',
      advanced: true
    },
    {
      name: 'solidityMin',
      type: 'number',
      value: 0.0,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: 'Min Solidity',
      description: 'Minimum area/convex_hull_area ratio',
      advanced: true
    },
    {
      name: 'solidityMax',
      type: 'number',
      value: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: 'Max Solidity',
      description: 'Maximum area/convex_hull_area ratio',
      advanced: true
    },
    {
      name: 'convexityMin',
      type: 'number',
      value: 0.0,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: 'Min Convexity',
      description: 'Minimum convex_perimeter/perimeter ratio',
      advanced: true
    },
    {
      name: 'convexityMax',
      type: 'number',
      value: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: 'Max Convexity',
      description: 'Maximum convex_perimeter/perimeter ratio',
      advanced: true
    }
  ]
});

/**
 * Create a cell detection pipeline using shape analysis
 */
export const createCellDetectionPipeline = () => {
  const inputNodeId = uuidv4();
  const grayscaleNodeId = uuidv4();
  const thresholdNodeId = uuidv4();
  const fillHolesNodeId = uuidv4();
  const watershedNodeId = uuidv4();
  const shapeAnalysisNodeId = uuidv4();
  const outputNodeId = uuidv4();

  return {
    nodes: [
      {
        id: inputNodeId,
        type: 'input' as const,
        position: { x: 100, y: 250 }
      },
      {
        id: grayscaleNodeId,
        type: 'transformation' as const,
        transformation: {
          id: grayscaleNodeId,
          type: 'grayscale' as const,
          name: 'Grayscale',
          description: 'Convert to grayscale',
          parameters: [],
          inputNodes: [inputNodeId]
        },
        position: { x: 300, y: 250 }
      },
      {
        id: thresholdNodeId,
        type: 'transformation' as const,
        transformation: {
          id: thresholdNodeId,
          type: 'threshold' as const,
          name: 'Binary Threshold',
          description: 'Create binary image',
          parameters: [
            {
              name: 'threshold',
              type: 'number' as const,
              value: 128,
              min: 0,
              max: 255,
              step: 1
            }
          ],
          inputNodes: [grayscaleNodeId]
        },
        position: { x: 500, y: 250 }
      },
      {
        id: fillHolesNodeId,
        type: 'transformation' as const,
        transformation: {
          id: fillHolesNodeId,
          type: 'fillHoles' as const,
          name: 'Fill Holes',
          description: 'Fill holes in objects',
          parameters: [],
          inputNodes: [thresholdNodeId]
        },
        position: { x: 700, y: 250 }
      },
      {
        id: watershedNodeId,
        type: 'transformation' as const,
        transformation: createWatershedTransformation([fillHolesNodeId]),
        position: { x: 900, y: 250 }
      },
      {
        id: shapeAnalysisNodeId,
        type: 'transformation' as const,
        transformation: createShapeAnalysisTransformation([watershedNodeId]),
        position: { x: 1100, y: 250 }
      },
      {
        id: outputNodeId,
        type: 'output' as const,
        position: { x: 1300, y: 250 }
      }
    ],
    edges: [
      { id: `${inputNodeId}-${grayscaleNodeId}`, source: inputNodeId, target: grayscaleNodeId },
      { id: `${grayscaleNodeId}-${thresholdNodeId}`, source: grayscaleNodeId, target: thresholdNodeId },
      { id: `${thresholdNodeId}-${fillHolesNodeId}`, source: thresholdNodeId, target: fillHolesNodeId },
      { id: `${fillHolesNodeId}-${watershedNodeId}`, source: fillHolesNodeId, target: watershedNodeId },
      { id: `${watershedNodeId}-${shapeAnalysisNodeId}`, source: watershedNodeId, target: shapeAnalysisNodeId },
      { id: `${shapeAnalysisNodeId}-${outputNodeId}`, source: shapeAnalysisNodeId, target: outputNodeId }
    ]
  };
};

/**
 * Available shape detection transformations
 */
export const shapeDetectionTransformations = {
  watershed: createWatershedTransformation,
  distanceTransform: createDistanceTransformTransformation,
  shapeAnalysis: createShapeAnalysisTransformation
};

/**
 * Creates a boundary detection (bwperim) transformation
 */
export const createBwPerimTransformation = (): Transformation => ({
  id: uuidv4(),
  type: 'bwperim',
  name: 'Boundary Detection',
  description: 'Extract object boundaries from binary images',
  inputNodes: [],
  parameters: [
    {
      name: 'connectivity',
      type: 'select',
      value: '8',
      options: ['4', '8'],
      label: 'Connectivity',
      description: 'Pixel connectivity for boundary detection'
    },
    {
      name: 'method',
      type: 'select',
      value: 'internal',
      options: ['internal', 'external', 'both'],
      label: 'Boundary Method',
      description: 'Type of boundary to extract'
    },
    {
      name: 'thickness',
      type: 'number',
      value: 1,
      min: 1,
      max: 10,
      label: 'Boundary Thickness',
      description: 'Thickness of the boundary lines'
    },
    {
      name: 'smoothing',
      type: 'boolean',
      value: false,
      label: 'Smooth Boundaries',
      description: 'Apply morphological smoothing to boundaries'
    },
    {
      name: 'includeHoles',
      type: 'boolean',
      value: false,
      label: 'Include Internal Holes',
      description: 'Include boundaries of holes within objects'
    }
  ]
});

/**
 * Creates a comprehensive cell detection transformation
 */
export const createCellDetectionTransformation = (): Transformation => ({
  id: uuidv4(),
  type: 'cellDetection',
  name: 'Cell Detection Pipeline',
  description: 'Comprehensive cell detection and analysis combining multiple operations',
  inputNodes: [],
  parameters: [
    // Preprocessing parameters
    {
      name: 'enablePreprocessing',
      type: 'boolean',
      value: true,
      label: 'Enable Preprocessing',
      description: 'Apply noise reduction and enhancement'
    },
    {
      name: 'gaussianBlur',
      type: 'number',
      value: 2,
      min: 0,
      max: 10,
      label: 'Gaussian Blur',
      description: 'Gaussian blur sigma for noise reduction'
    },
    {
      name: 'medianFilterSize',
      type: 'number',
      value: 3,
      min: 1,
      max: 15,
      step: 2,
      label: 'Median Filter Size',
      description: 'Median filter kernel size (odd numbers only)'
    },
    {
      name: 'medianIterations',
      type: 'number',
      value: 2,
      min: 1,
      max: 5,
      label: 'Median Iterations',
      description: 'Number of median filter passes'
    },
    
    // Thresholding parameters
    {
      name: 'thresholdMethod',
      type: 'select',
      value: 'otsu',
      options: ['otsu', 'adaptive', 'manual'],
      label: 'Threshold Method',
      description: 'Method for binary thresholding'
    },
    {
      name: 'manualThreshold',
      type: 'number',
      value: 128,
      min: 0,
      max: 255,
      label: 'Manual Threshold',
      description: 'Threshold value for manual method'
    },
    {
      name: 'adaptiveBlockSize',
      type: 'number',
      value: 15,
      min: 3,
      max: 99,
      step: 2,
      label: 'Adaptive Block Size',
      description: 'Block size for adaptive thresholding'
    },
    {
      name: 'adaptiveC',
      type: 'number',
      value: 5,
      min: 0,
      max: 20,
      label: 'Adaptive C',
      description: 'Constant subtracted from mean for adaptive threshold'
    },
    {
      name: 'invertBinary',
      type: 'boolean',
      value: false,
      label: 'Invert Binary',
      description: 'Invert the binary image after thresholding'
    },
    
    // Morphological parameters
    {
      name: 'enableMorphology',
      type: 'boolean',
      value: true,
      label: 'Enable Morphology',
      description: 'Apply morphological operations'
    },
    {
      name: 'openingKernel',
      type: 'number',
      value: 3,
      min: 0,
      max: 15,
      label: 'Opening Kernel',
      description: 'Kernel size for morphological opening'
    },
    {
      name: 'closingKernel',
      type: 'number',
      value: 5,
      min: 0,
      max: 15,
      label: 'Closing Kernel',
      description: 'Kernel size for morphological closing'
    },
    {
      name: 'fillHoles',
      type: 'boolean',
      value: true,
      label: 'Fill Holes',
      description: 'Fill holes in detected objects'
    },
    {
      name: 'clearBorder',
      type: 'boolean',
      value: true,
      label: 'Clear Border',
      description: 'Remove objects touching image border'
    },
    {
      name: 'borderWidth',
      type: 'number',
      value: 5,
      min: 1,
      max: 20,
      label: 'Border Width',
      description: 'Width of border region to clear'
    },
    
    // Segmentation parameters
    {
      name: 'segmentationMethod',
      type: 'select',
      value: 'watershed',
      options: ['watershed', 'distance', 'contours', 'components'],
      label: 'Segmentation Method',
      description: 'Algorithm for cell segmentation'
    },
    {
      name: 'minCellSize',
      type: 'number',
      value: 100,
      min: 10,
      max: 1000,
      label: 'Min Cell Size',
      description: 'Minimum cell area in pixels'
    },
    {
      name: 'maxCellSize',
      type: 'number',
      value: 5000,
      min: 500,
      max: 50000,
      label: 'Max Cell Size',
      description: 'Maximum cell area in pixels'
    },
    {
      name: 'watershedThreshold',
      type: 'number',
      value: 0.4,
      min: 0.1,
      max: 1.0,
      step: 0.1,
      label: 'Watershed Threshold',
      description: 'Threshold for watershed segmentation'
    },
    {
      name: 'minDistance',
      type: 'number',
      value: 10,
      min: 5,
      max: 50,
      label: 'Min Distance',
      description: 'Minimum distance between cell centers'
    },
    
    // Shape analysis parameters
    {
      name: 'enableShapeAnalysis',
      type: 'boolean',
      value: true,
      label: 'Enable Shape Analysis',
      description: 'Filter cells by geometric properties'
    },
    {
      name: 'minCircularity',
      type: 'number',
      value: 0.3,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: 'Min Circularity',
      description: 'Minimum circularity (0=line, 1=circle)'
    },
    {
      name: 'maxCircularity',
      type: 'number',
      value: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: 'Max Circularity',
      description: 'Maximum circularity (0=line, 1=circle)'
    },
    {
      name: 'minAspectRatio',
      type: 'number',
      value: 0.5,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      label: 'Min Aspect Ratio',
      description: 'Minimum width/height ratio'
    },
    {
      name: 'maxAspectRatio',
      type: 'number',
      value: 2.0,
      min: 0.5,
      max: 10.0,
      step: 0.1,
      label: 'Max Aspect Ratio',
      description: 'Maximum width/height ratio'
    },
    {
      name: 'minSolidity',
      type: 'number',
      value: 0.7,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: 'Min Solidity',
      description: 'Minimum solidity (area/convex hull area)'
    },
    {
      name: 'maxSolidity',
      type: 'number',
      value: 1.0,
      min: 0.0,
      max: 1.0,
      step: 0.1,
      label: 'Max Solidity',
      description: 'Maximum solidity (area/convex hull area)'
    },
    
    // Output parameters
    {
      name: 'outputMode',
      type: 'select',
      value: 'overlay',
      options: ['segmented', 'labeled', 'overlay', 'boundaries', 'analysis'],
      label: 'Output Mode',
      description: 'Type of output visualization'
    },
    {
      name: 'colorCoding',
      type: 'boolean',
      value: true,
      label: 'Color Coding',
      description: 'Color-code cells by properties'
    },
    {
      name: 'showCellNumbers',
      type: 'boolean',
      value: false,
      label: 'Show Cell Numbers',
      description: 'Display cell ID numbers'
    },
    {
      name: 'boundaryThickness',
      type: 'number',
      value: 2,
      min: 1,
      max: 10,
      label: 'Boundary Thickness',
      description: 'Thickness of cell boundaries'
    }
  ]
}); 