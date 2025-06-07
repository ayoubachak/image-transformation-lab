export type TransformationType = 
  | 'grayscale'
  | 'blur'
  | 'customBlur'
  | 'threshold'
  | 'adaptiveThreshold'
  | 'laplacian'
  | 'sobel'
  | 'canny'
  | 'dilate'
  | 'erode'
  | 'morphology'
  | 'colorAdjust'
  | 'sharpen'
  | 'median'
  | 'bilateral'
  | 'histogram'
  | 'rotate'
  | 'resize'
  | 'flip'
  | 'crop'
  | 'perspective'
  | 'custom';

// New inspection node types
export type InspectionType = 
  | 'histogram'
  | 'statistics'
  | 'colorProfile'
  | 'dimensionInfo'
  | 'moduleCalculator'    // Calculate magnitude/module of gradients
  | 'phaseCalculator'     // Calculate phase/direction of gradients
  | 'edgeDensity'         // Analyze edge density in regions
  | 'colorDistribution'   // Advanced color distribution analysis
  | 'textureAnalysis';    // Texture analysis using various descriptors

export type ParameterType = 
  | 'number' 
  | 'string' 
  | 'boolean' 
  | 'select'
  | 'color'
  | 'kernel'
  | 'point'
  | 'range'
  | 'matrix'
  | 'vector';

export interface KernelValue {
  width: number;
  height: number;
  values: number[][];
  normalize?: boolean;
}

export interface MatrixValue {
  width: number;
  height: number;
  values: number[][];
}

export interface PointValue {
  x: number;
  y: number;
}

export interface VectorValue {
  values: number[];
}

export interface RangeValue {
  min: number;
  max: number;
}

export interface TransformationParameter {
  name: string;
  type: ParameterType;
  value: number | string | boolean | KernelValue | PointValue | MatrixValue | VectorValue | RangeValue;
  label?: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  advanced?: boolean;
  group?: string;
  dependsOn?: string;
  showIf?: (params: Record<string, any>) => boolean;
  validate?: (value: any, params: Record<string, any>) => boolean | string;
}

// Base interface for inspection parameters (same as transformation parameters)
export interface InspectionParameter extends TransformationParameter {}

// Inspection interface - similar to Transformation but for visualization
export interface Inspection {
  id: string;
  type: InspectionType;
  name: string;
  description: string;
  parameters: InspectionParameter[];
  inputNodes: string[];
  
  // Inspection-specific properties
  visualizationType: 'chart' | 'table' | 'overlay' | 'info';
  isRealTime?: boolean; // Whether to update in real-time or on demand
  
  // Configuration and metadata
  metadata?: {
    advancedParameters?: Record<string, any>;
    chartConfig?: Record<string, any>;
    displayOptions?: Record<string, any>;
    notes?: string;
    [key: string]: any;
  };
}

export interface Transformation {
  id: string;
  type: TransformationType;
  name: string;
  description: string;
  parameters: TransformationParameter[];
  inputNodes: string[];
  
  // Optional properties to control transformation behavior
  showPreprocessingSteps?: boolean;
  dependsOn?: string[]; // IDs of transformations this one depends on
  outputToDisplay?: 'final' | 'intermediate' | 'all'; // What to display in the preview
  
  // Advanced configuration and metadata
  metadata?: {
    advancedParameters?: Record<string, any>;
    notes?: string;
    [key: string]: any;
  };
}

export interface ImageProcessingNode {
  id: string;
  type: 'input' | 'transformation' | 'output' | 'inspection';
  transformation?: Transformation;
  inspection?: Inspection;
  position: { x: number; y: number };
}

export interface ImageProcessingEdge {
  id: string;
  source: string;
  target: string;
}

export interface Pipeline {
  nodes: ImageProcessingNode[];
  edges: ImageProcessingEdge[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  image: string; // URL to lesson cover image
  pipeline: Pipeline;
}

/**
 * Project saving/loading types
 */
export interface SavedProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  version: string; // For migrations if schema changes
  thumbnailDataUrl?: string; // Preview image
  state: SerializedPipelineState;
}

export interface SerializedPipelineState {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  inputImages: Record<string, string>; // nodeId -> base64 encoded image
}

export interface SerializedNode {
  id: string;
  type: 'input' | 'transformation' | 'output' | 'inspection';
  position: { x: number; y: number };
  transformation?: Transformation;
  inspection?: Inspection;
  metadata?: Record<string, any>;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
}

// Histogram-specific data structures
export interface HistogramData {
  red?: number[];
  green?: number[];
  blue?: number[];
  gray?: number[];
  binary?: number[];
  imageType: 'rgb' | 'grayscale' | 'binary';
  totalPixels: number;
  width: number;
  height: number;
}

// Inspection result interface
export interface InspectionResult {
  nodeId: string;
  type: InspectionType;
  data: HistogramData | Record<string, any>; // Generic data structure for different inspection types
  timestamp: number;
  processingTime: number;
}

// Structuring element shape types
export type StructuringElementShape = 'rect' | 'ellipse' | 'cross' | 'stick' | 'bipoint' | 'circle' | 'square' | 'custom';

export interface StructuringElement {
  shape: StructuringElementShape;
  width: number;
  height: number;
  // For stick
  angle?: number;
  length?: number;
  // For bipoint
  point1?: { x: number, y: number };
  point2?: { x: number, y: number };
  // For circle
  radius?: number;
  // For custom shape
  matrix?: number[][];
} 