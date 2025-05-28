export type TransformationType = 
  | 'grayscale'
  | 'blur'
  | 'threshold'
  | 'laplacian'
  | 'sobel'
  | 'canny'
  | 'custom';

export interface TransformationParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
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
}

export interface ImageProcessingNode {
  id: string;
  type: 'input' | 'transformation' | 'output';
  transformation?: Transformation;
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