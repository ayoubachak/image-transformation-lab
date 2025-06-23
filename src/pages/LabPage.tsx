import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePipeline } from '../contexts/PipelineContext';
import ImageProcessingPipeline from '../components/ImageProcessingPipeline';
import TransformationManager from '../components/TransformationManager';
import LabToolbar from '../components/LabToolbar';
import type { Transformation, TransformationType } from '../utils/types';
import ProjectsModal from '../components/modals/ProjectsModal';
import { projectManager } from '../services/ProjectManager';

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
        value: 'custom',
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
        showIf: (params: Record<string, any>) => params.kernelType !== 'custom'
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
        }
      }
    ],
    metadata: {
      advancedParameters: {
        borderType: 'reflect',
        sigmaX: 0,
        sigmaY: 0,
        useCustomKernel: false,
        customKernel: null,
        normalize: true
      }
    }
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
        label: 'Threshold Value',
        description: 'Intensity threshold for binarization'
      },
      {
        name: 'invert',
        type: 'boolean',
        value: false,
        label: 'Invert Result',
        description: 'Invert the binary result (swap black and white)'
      }
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
  advancedThreshold: {
    type: 'advancedThreshold',
    name: 'Advanced Thresholding',
    description: 'Advanced statistical and multi-level thresholding for noisy images',
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'statistical-combined',
        options: ['multi-otsu', 'triangle', 'minimum-error', 'hysteresis', 'statistical-combined', 'multi-scale'],
        label: 'Thresholding Method',
        description: 'Advanced thresholding algorithm to use'
      },
      {
        name: 'levels',
        type: 'number',
        value: 2,
        min: 1,
        max: 4,
        step: 1,
        label: 'Threshold Levels',
        description: 'Number of threshold levels for multi-level methods',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => ['multi-otsu', 'multi-scale'].includes(params.method as string)
      },
      {
        name: 'highThreshold',
        type: 'number',
        value: 180,
        min: 50,
        max: 255,
        step: 1,
        label: 'High Threshold',
        description: 'Upper threshold for hysteresis method',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'hysteresis'
      },
      {
        name: 'lowThreshold',
        type: 'number',
        value: 80,
        min: 10,
        max: 200,
        step: 1,
        label: 'Low Threshold',
        description: 'Lower threshold for hysteresis method',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'hysteresis'
      },
      {
        name: 'postProcessing',
        type: 'boolean',
        value: true,
        label: 'Morphological Cleanup',
        description: 'Apply automatic morphological post-processing'
      },
      {
        name: 'removeNoise',
        type: 'boolean',
        value: true,
        label: 'Remove Noise',
        description: 'Remove small noise components',
        dependsOn: 'postProcessing',
        showIf: (params: Record<string, any>) => params.postProcessing === true
      },
      {
        name: 'minComponentSize',
        type: 'number',
        value: 50,
        min: 5,
        max: 500,
        step: 5,
        label: 'Min Component Size',
        description: 'Minimum component size to keep (pixels)',
        dependsOn: 'removeNoise',
        showIf: (params: Record<string, any>) => params.removeNoise === true
      },
      {
        name: 'fillHoles',
        type: 'boolean',
        value: true,
        label: 'Fill Holes',
        description: 'Fill holes in thresholded regions',
        dependsOn: 'postProcessing',
        showIf: (params: Record<string, any>) => params.postProcessing === true
      },
      {
        name: 'preserveEdges',
        type: 'boolean',
        value: true,
        label: 'Preserve Edges',
        description: 'Try to preserve edge details during cleanup',
        dependsOn: 'postProcessing',
        showIf: (params: Record<string, any>) => params.postProcessing === true
      },
      {
        name: 'adaptiveLocalSize',
        type: 'number',
        value: 15,
        min: 5,
        max: 51,
        step: 2,
        label: 'Adaptive Window Size',
        description: 'Local window size for adaptive components (must be odd)',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => ['statistical-combined', 'multi-scale'].includes(params.method as string)
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
  colorFilter: {
    type: 'colorFilter',
    name: 'Color Filter',
    description: 'Remove or replace specific colors (e.g., yellow backgrounds in license plates)',
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'preset-colors',
        options: ['preset-colors', 'hsv-range', 'color-channel', 'rgb-distance'],
        label: 'Filter Method',
        description: 'Method for color filtering'
      },
      {
        name: 'presetColor',
        type: 'select',
        value: 'yellow',
        options: ['yellow', 'blue', 'red', 'green', 'white', 'black'],
        label: 'Color to Remove',
        description: 'Pre-configured color to remove',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'preset-colors'
      },
      {
        name: 'replacementAction',
        type: 'select',
        value: 'black',
        options: ['black', 'white', 'transparent'],
        label: 'Replace With',
        description: 'What to replace filtered colors with'
      },
      {
        name: 'tolerance',
        type: 'number',
        value: 15,
        min: 0,
        max: 50,
        step: 1,
        label: 'Tolerance',
        description: 'Color matching tolerance (higher = more inclusive)'
      }
    ],
    metadata: {
      advancedParameters: {
        // HSV range parameters
        hueMin: 20,
        hueMax: 30,
        saturationMin: 100,
        saturationMax: 255,
        valueMin: 100,
        valueMax: 255,
        
        // RGB distance parameters
        colorDistance: 80,
        targetR: 255,
        targetG: 255,
        targetB: 0,
        
        // Channel parameters
        targetChannel: 'blue',
        
        // Processing parameters
        smoothing: 2
      }
    }
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
        min: 3,
        max: 15,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of the median filter kernel (must be odd)'
      },
      {
        name: 'method',
        type: 'select',
        value: 'standard',
        options: ['standard', 'adaptive', 'cross-shaped', 'selective'],
        label: 'Filter Method',
        description: 'Type of median filtering to apply'
      },
      {
        name: 'iterations',
        type: 'number',
        value: 1,
        min: 1,
        max: 5,
        step: 1,
        label: 'Iterations',
        description: 'Number of times to apply the filter'
      },
      {
        name: 'preserveEdges',
        type: 'boolean',
        value: true,
        label: 'Preserve Edges',
        description: 'Try to preserve edge information'
      },
      {
        name: 'adaptiveWindowMax',
        type: 'number',
        value: 9,
        min: 5,
        max: 15,
        step: 2,
        label: 'Max Adaptive Window',
        description: 'Maximum window size for adaptive method',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'adaptive'
      },
      {
        name: 'selectiveThreshold',
        type: 'number',
        value: 100,
        min: 10,
        max: 500,
        step: 10,
        label: 'Selective Threshold',
        description: 'Variance threshold for selective filtering',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'selective'
      },
      {
        name: 'edgeThreshold',
        type: 'number',
        value: 50,
        min: 10,
        max: 200,
        step: 5,
        label: 'Edge Threshold',
        description: 'Threshold for edge detection'
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
        showIf: (params: Record<string, any>) => params.method === 'adaptive'
      },
      {
        name: 'tileGridSize',
        type: 'number',
        value: 8,
        min: 2,
        max: 32,
        step: 1,
        label: 'Tile Grid Size',
        description: 'Size of local tiles for adaptive method',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'adaptive'
      },
      {
        name: 'channels',
        type: 'select',
        value: 'auto',
        options: ['auto', 'grayscale', 'rgb', 'hsv'],
        label: 'Color Channels',
        description: 'Which color channels to process'
      },
      {
        name: 'preserveColors',
        type: 'boolean',
        value: true,
        label: 'Preserve Colors',
        description: 'For color images, preserve color information',
        dependsOn: 'channels',
        showIf: (params: Record<string, any>) => params.channels !== 'grayscale'
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
        showIf: (params: Record<string, any>) => params.method === 'scale'
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
        showIf: (params: Record<string, any>) => params.method === 'scale'
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
        showIf: (params: Record<string, any>) => params.method === 'dimensions'
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
        showIf: (params: Record<string, any>) => params.method === 'dimensions'
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
        showIf: (params: Record<string, any>) => params.method === 'manual'
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
        showIf: (params: Record<string, any>) => params.method === 'manual'
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
        showIf: (params: Record<string, any>) => params.method !== 'auto'
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
        showIf: (params: Record<string, any>) => params.method !== 'auto'
      },
      {
        name: 'aspectRatio',
        type: 'select',
        value: 'free',
        options: ['free', '1:1', '4:3', '16:9', '3:2'],
        label: 'Aspect Ratio',
        description: 'Maintain aspect ratio when cropping',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'center'
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
        showIf: (params: Record<string, any>) => params.mode === 'points'
      },
      {
        name: 'topRight',
        type: 'point',
        value: { x: 100, y: 0 },
        label: 'Top Right',
        description: 'Top-right corner coordinate',
        dependsOn: 'mode',
        showIf: (params: Record<string, any>) => params.mode === 'points'
      },
      {
        name: 'bottomLeft',
        type: 'point',
        value: { x: 0, y: 100 },
        label: 'Bottom Left',
        description: 'Bottom-left corner coordinate',
        dependsOn: 'mode',
        showIf: (params: Record<string, any>) => params.mode === 'points'
      },
      {
        name: 'bottomRight',
        type: 'point',
        value: { x: 100, y: 100 },
        label: 'Bottom Right',
        description: 'Bottom-right corner coordinate',
        dependsOn: 'mode',
        showIf: (params: Record<string, any>) => params.mode === 'points'
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
        showIf: (params: Record<string, any>) => params.mode === 'matrix'
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
  fillHoles: {
    type: 'fillHoles',
    name: 'Fill Holes',
    description: 'Fill enclosed regions in binary images',
    parameters: [
      {
        name: 'connectivity',
        type: 'select',
        value: '8',
        options: ['4', '8'],
        label: 'Connectivity',
        description: 'Pixel connectivity (4-connected or 8-connected)'
      },
      {
        name: 'minHoleSize',
        type: 'number',
        value: 0,
        min: 0,
        max: 10000,
        step: 1,
        label: 'Min Hole Size',
        description: 'Minimum hole size to fill (0 = fill all holes)'
      },
      {
        name: 'maxHoleSize',
        type: 'number',
        value: 0,
        min: 0,
        max: 50000,
        step: 1,
        label: 'Max Hole Size',
        description: 'Maximum hole size to fill (0 = no limit)'
      }
    ]
  },
  connectedComponents: {
    type: 'connectedComponents',
    name: 'Connected Components',
    description: 'Label and analyze connected regions in binary images',
    parameters: [
      {
        name: 'connectivity',
        type: 'select',
        value: '8',
        options: ['4', '8'],
        label: 'Connectivity',
        description: 'Pixel connectivity for component detection'
      },
      {
        name: 'minArea',
        type: 'number',
        value: 0,
        min: 0,
        max: 10000,
        step: 1,
        label: 'Min Area',
        description: 'Minimum component area (pixels)'
      },
      {
        name: 'maxArea',
        type: 'number',
        value: 0,
        min: 0,
        max: 100000,
        step: 1,
        label: 'Max Area',
        description: 'Maximum component area (0 = no limit)'
      },
      {
        name: 'outputMode',
        type: 'select',
        value: 'filtered',
        options: ['labeled', 'filtered', 'largest', 'statistics'],
        label: 'Output Mode',
        description: 'What to output: labeled image, filtered components, largest component, or statistics'
      }
    ]
  },
  clearBorder: {
    type: 'clearBorder',
    name: 'Clear Border',
    description: 'Remove objects touching image boundaries',
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
        name: 'borderWidth',
        type: 'number',
        value: 1,
        min: 1,
        max: 50,
        step: 1,
        label: 'Border Width',
        description: 'Width of border region to check'
      }
    ]
  },
  findContours: {
    type: 'findContours',
    name: 'Find Contours',
    description: 'Extract object boundaries and perimeters',
    parameters: [
      {
        name: 'mode',
        type: 'select',
        value: 'external',
        options: ['external', 'list', 'tree', 'ccomp'],
        label: 'Retrieval Mode',
        description: 'Contour retrieval mode'
      },
      {
        name: 'method',
        type: 'select',
        value: 'simple',
        options: ['none', 'simple', 'tc89l1', 'tc89kcos'],
        label: 'Approximation Method',
        description: 'Contour approximation method'
      },
      {
        name: 'minContourArea',
        type: 'number',
        value: 0,
        min: 0,
        max: 10000,
        step: 1,
        label: 'Min Contour Area',
        description: 'Minimum contour area to include'
      },
      {
        name: 'thickness',
        type: 'number',
        value: 2,
        min: 1,
        max: 10,
        step: 1,
        label: 'Line Thickness',
        description: 'Thickness of drawn contour lines'
      },
      {
        name: 'color',
        type: 'select',
        value: 'auto',
        options: ['auto', 'white', 'black', 'red', 'green', 'blue'],
        label: 'Contour Color',
        description: 'Color for drawing contours'
      }
    ]
  },
  skeletonize: {
    type: 'skeletonize',
    name: 'Skeletonize',
    description: 'Reduce objects to skeletal structure',
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'zhang-suen',
        options: ['zhang-suen', 'morphological'],
        label: 'Algorithm',
        description: 'Skeletonization algorithm to use'
      },
      {
        name: 'iterations',
        type: 'number',
        value: 50,
        min: 1,
        max: 200,
        step: 1,
        label: 'Max Iterations',
        description: 'Maximum number of iterations'
      },
      {
        name: 'preserveEndpoints',
        type: 'boolean',
        value: true,
        label: 'Preserve Endpoints',
        description: 'Preserve endpoint pixels in skeleton'
      }
    ]
  },
  otsuThreshold: {
    type: 'otsuThreshold',
    name: 'Otsu Threshold',
    description: 'Automatic threshold selection using Otsu\'s method',
    parameters: [
      {
        name: 'channels',
        type: 'select',
        value: 'grayscale',
        options: ['grayscale', 'red', 'green', 'blue', 'max', 'min'],
        label: 'Channel',
        description: 'Which channel to analyze for threshold'
      },
      {
        name: 'invert',
        type: 'boolean',
        value: false,
        label: 'Invert Result',
        description: 'Invert the binary result'
      }
    ]
  },
  removeNoise: {
    type: 'removeNoise',
    name: 'Remove Noise',
    description: 'Remove noise from binary and grayscale images',
    parameters: [
      {
        name: 'noiseType',
        type: 'select',
        value: 'saltPepper',
        options: ['saltPepper', 'impulse', 'small-objects', 'holes'],
        label: 'Noise Type',
        description: 'Type of noise to remove'
      },
      {
        name: 'kernelSize',
        type: 'number',
        value: 3,
        min: 3,
        max: 15,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of the noise removal kernel',
        dependsOn: 'noiseType',
        showIf: (params: Record<string, any>) => ['saltPepper', 'impulse'].includes(params.noiseType as string)
      },
      {
        name: 'minSize',
        type: 'number',
        value: 10,
        min: 1,
        max: 1000,
        step: 1,
        label: 'Min Object Size',
        description: 'Minimum size to keep (smaller objects removed)',
        dependsOn: 'noiseType',
        showIf: (params: Record<string, any>) => params.noiseType === 'small-objects'
      },
      {
        name: 'connectivity',
        type: 'select',
        value: '8',
        options: ['4', '8'],
        label: 'Connectivity',
        description: 'Pixel connectivity for object detection',
        dependsOn: 'noiseType',
        showIf: (params: Record<string, any>) => ['small-objects', 'holes'].includes(params.noiseType as string)
      }
    ]
  },
  houghLines: {
    type: 'houghLines',
    name: 'Hough Lines',
    description: 'Detect straight lines using Hough transform',
    parameters: [
      {
        name: 'rho',
        type: 'number',
        value: 1,
        min: 0.1,
        max: 10,
        step: 0.1,
        label: 'Rho Resolution',
        description: 'Distance resolution in pixels'
      },
      {
        name: 'theta',
        type: 'number',
        value: 1,
        min: 0.1,
        max: 10,
        step: 0.1,
        label: 'Theta Resolution',
        description: 'Angle resolution in degrees'
      },
      {
        name: 'threshold',
        type: 'number',
        value: 50,
        min: 1,
        max: 500,
        step: 1,
        label: 'Threshold',
        description: 'Minimum votes for line detection'
      },
      {
        name: 'minLineLength',
        type: 'number',
        value: 50,
        min: 0,
        max: 1000,
        step: 1,
        label: 'Min Line Length',
        description: 'Minimum line length (0 = standard Hough)'
      },
      {
        name: 'maxLineGap',
        type: 'number',
        value: 10,
        min: 0,
        max: 100,
        step: 1,
        label: 'Max Line Gap',
        description: 'Maximum gap between line segments',
        dependsOn: 'minLineLength',
        showIf: (params: Record<string, any>) => params.minLineLength > 0
      },
      {
        name: 'lineColor',
        type: 'select',
        value: 'red',
        options: ['red', 'green', 'blue', 'white', 'black'],
        label: 'Line Color',
        description: 'Color for drawing detected lines'
      },
      {
        name: 'lineThickness',
        type: 'number',
        value: 2,
        min: 1,
        max: 10,
        step: 1,
        label: 'Line Thickness',
        description: 'Thickness of drawn lines'
      }
    ]
  },
  backgroundSubtraction: {
    type: 'backgroundSubtraction',
    name: 'Background Subtraction',
    description: 'Remove uneven background illumination from images',
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'morphological',
        options: ['morphological', 'gaussian', 'rolling-ball', 'polynomial'],
        label: 'Method',
        description: 'Background estimation method'
      },
      {
        name: 'kernelSize',
        type: 'number',
        value: 51,
        min: 3,
        max: 201,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of the structuring element (must be odd)',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'morphological'
      },
      {
        name: 'sigmaX',
        type: 'number',
        value: 50,
        min: 1,
        max: 200,
        step: 1,
        label: 'Sigma X',
        description: 'Standard deviation in X direction',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'gaussian'
      },
      {
        name: 'sigmaY',
        type: 'number',
        value: 50,
        min: 1,
        max: 200,
        step: 1,
        label: 'Sigma Y',
        description: 'Standard deviation in Y direction',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'gaussian'
      },
      {
        name: 'ballRadius',
        type: 'number',
        value: 25,
        min: 5,
        max: 100,
        step: 1,
        label: 'Ball Radius',
        description: 'Radius of rolling ball',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'rolling-ball'
      },
      {
        name: 'polynomialOrder',
        type: 'number',
        value: 3,
        min: 1,
        max: 6,
        step: 1,
        label: 'Polynomial Order',
        description: 'Order of polynomial fitting',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'polynomial'
      },
      {
        name: 'normalize',
        type: 'boolean',
        value: true,
        label: 'Normalize Result',
        description: 'Normalize output to full intensity range'
      }
    ]
  },
  illuminationCorrection: {
    type: 'illuminationCorrection',
    name: 'Illumination Correction',
    description: 'Correct uneven lighting and illumination gradients',
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'homomorphic',
        options: ['homomorphic', 'retinex', 'clahe', 'gamma-correction'],
        label: 'Method',
        description: 'Illumination correction technique'
      },
      {
        name: 'gammaHigh',
        type: 'number',
        value: 2.0,
        min: 0.1,
        max: 5.0,
        step: 0.1,
        label: 'Gamma High',
        description: 'Gamma value for high frequency enhancement',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'homomorphic'
      },
      {
        name: 'gammaLow',
        type: 'number',
        value: 0.5,
        min: 0.1,
        max: 2.0,
        step: 0.1,
        label: 'Gamma Low',
        description: 'Gamma value for low frequency suppression',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'homomorphic'
      },
      {
        name: 'sigma',
        type: 'number',
        value: 80,
        min: 10,
        max: 200,
        step: 5,
        label: 'Sigma',
        description: 'Scale parameter for Retinex',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'retinex'
      },
      {
        name: 'clipLimit',
        type: 'number',
        value: 2.0,
        min: 0.5,
        max: 10.0,
        step: 0.5,
        label: 'Clip Limit',
        description: 'Contrast limiting parameter',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'clahe'
      },
      {
        name: 'tileGridSize',
        type: 'number',
        value: 8,
        min: 2,
        max: 32,
        step: 1,
        label: 'Tile Grid Size',
        description: 'Size of local tiles for CLAHE',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'clahe'
      },
      {
        name: 'gamma',
        type: 'number',
        value: 1.2,
        min: 0.1,
        max: 3.0,
        step: 0.1,
        label: 'Gamma',
        description: 'Gamma correction value',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'gamma-correction'
      }
    ]
  },
  topHat: {
    type: 'topHat',
    name: 'Top Hat Transform',
    description: 'Morphological top-hat for detecting bright objects on dark background',
    parameters: [
      {
        name: 'kernelSize',
        type: 'number',
        value: 15,
        min: 3,
        max: 101,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of structuring element (must be odd)'
      },
      {
        name: 'kernelShape',
        type: 'select',
        value: 'ellipse',
        options: ['rect', 'ellipse', 'cross'],
        label: 'Kernel Shape',
        description: 'Shape of structuring element'
      },
      {
        name: 'enhanceContrast',
        type: 'boolean',
        value: true,
        label: 'Enhance Contrast',
        description: 'Apply contrast enhancement to result'
      }
    ]
  },
  bottomHat: {
    type: 'bottomHat',
    name: 'Bottom Hat Transform',
    description: 'Morphological bottom-hat for detecting dark objects on bright background',
    parameters: [
      {
        name: 'kernelSize',
        type: 'number',
        value: 15,
        min: 3,
        max: 101,
        step: 2,
        label: 'Kernel Size',
        description: 'Size of structuring element (must be odd)'
      },
      {
        name: 'kernelShape',
        type: 'select',
        value: 'ellipse',
        options: ['rect', 'ellipse', 'cross'],
        label: 'Kernel Shape',
        description: 'Shape of structuring element'
      },
      {
        name: 'enhanceContrast',
        type: 'boolean',
        value: true,
        label: 'Enhance Contrast',
        description: 'Apply contrast enhancement to result'
      }
    ]
  },
  localNormalization: {
    type: 'localNormalization',
    name: 'Local Normalization',
    description: 'Normalize intensity locally to handle uneven illumination',
    parameters: [
      {
        name: 'method',
        type: 'select',
        value: 'mean-std',
        options: ['mean-std', 'min-max', 'percentile'],
        label: 'Normalization Method',
        description: 'Local normalization technique'
      },
      {
        name: 'windowSize',
        type: 'number',
        value: 31,
        min: 5,
        max: 101,
        step: 2,
        label: 'Window Size',
        description: 'Size of local neighborhood window (must be odd)'
      },
      {
        name: 'targetMean',
        type: 'number',
        value: 128,
        min: 50,
        max: 200,
        step: 1,
        label: 'Target Mean',
        description: 'Target mean intensity value',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'mean-std'
      },
      {
        name: 'targetStd',
        type: 'number',
        value: 50,
        min: 10,
        max: 100,
        step: 1,
        label: 'Target Standard Deviation',
        description: 'Target standard deviation',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'mean-std'
      },
      {
        name: 'lowPercentile',
        type: 'number',
        value: 2,
        min: 0,
        max: 25,
        step: 1,
        label: 'Low Percentile',
        description: 'Lower percentile for normalization',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'percentile'
      },
      {
        name: 'highPercentile',
        type: 'number',
        value: 98,
        min: 75,
        max: 100,
        step: 1,
        label: 'High Percentile',
        description: 'Higher percentile for normalization',
        dependsOn: 'method',
        showIf: (params: Record<string, any>) => params.method === 'percentile'
      }
    ]
  },
};

export default function LabPage() {
  const { 
    selectedNodeId, 
    removeNode, 
    addEdge, 
    removeEdge, 
    duplicateNode
  } = usePipeline();
  const [transformationManagerOpen, setTransformationManagerOpen] = useState(false);
  const [operationMode, setOperationMode] = useState<'select' | 'connect' | 'disconnect' | null>(null);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [projectsModalMode, setProjectsModalMode] = useState<'save' | 'load' | 'new'>('save');
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

  // Check for existing project on load
  useEffect(() => {
    const currentProject = projectManager.getCurrentProject();
    if (currentProject) {
      // Project already loaded from localStorage
      console.log(`Current project: ${currentProject.name}`);
    }
  }, []);

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

  const handleOpenProjectsModal = (mode: 'save' | 'load' | 'new') => {
    setProjectsModalMode(mode);
    setProjectsModalOpen(true);
  };
  
  const handleProjectActionSuccess = (projectId: string) => {
    // Optional: provide feedback or refresh UI after project action
    console.log(`Project action successful: ${projectId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50" ref={pageRef}>
      <LabToolbar 
        onOpenTransformationManager={() => setTransformationManagerOpen(true)}
        operationMode={operationMode}
        onChangeOperationMode={setOperationMode}
        onOpenProjectsModal={handleOpenProjectsModal}
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
        {transformationManagerOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute top-0 right-0 bottom-0 w-96 bg-white shadow-xl border-l border-gray-200 overflow-y-auto z-20 rounded-l-md"
          >
            <TransformationManager onClose={() => setTransformationManagerOpen(false)} />
          </motion.div>
        )}
      </div>

      {/* Status indicator for connect mode */}
      {connectStartNodeId && operationMode === 'connect' && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg">
          Now select a target node to complete the connection
        </div>
      )}

      {/* Projects modal */}
      <ProjectsModal
        isOpen={projectsModalOpen}
        onClose={() => setProjectsModalOpen(false)}
        mode={projectsModalMode}
        onSuccess={handleProjectActionSuccess}
      />
    </div>
  );
} 