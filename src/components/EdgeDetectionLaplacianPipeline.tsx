import { useEffect, useState } from 'react';
import { usePipeline } from '../contexts/PipelineContext';
import { v4 as uuidv4 } from 'uuid';
import type { Transformation, TransformationType } from '../utils/types';

/**
 * Creates a specialized Laplacian edge detection pipeline that shows all intermediate steps
 * This demonstrates the complete process: grayscale → blur → Laplacian
 */
export default function EdgeDetectionLaplacianPipeline() {
  const { addNode, addEdge, nodes, edges } = usePipeline();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once and when the context is ready
    if (initialized || nodes.length > 0) return;
    
    // Prevent multiple initializations
    setInitialized(true);
    
    // Create input node
    const inputId = addNode('input', undefined, { x: 100, y: 250 });
    
    // Create grayscale node
    const grayscaleTransform = {
      type: 'grayscale' as TransformationType,
      name: 'Grayscale',
      description: 'Convert image to grayscale',
      parameters: [],
      showPreprocessingSteps: true,
      outputToDisplay: 'intermediate' as const
    };
    const grayscaleId = addNode('transformation', grayscaleTransform, { x: 350, y: 150 });
    
    // Create blur node
    const blurTransform = {
      type: 'blur' as TransformationType,
      name: 'Gaussian Blur',
      description: 'Apply Gaussian blur to reduce noise',
      parameters: [
        {
          name: 'kernelSize',
          type: 'number' as const,
          value: 3,
          min: 1,
          max: 31,
          step: 2,
        },
      ],
      showPreprocessingSteps: true,
      outputToDisplay: 'intermediate' as const
    };
    const blurId = addNode('transformation', blurTransform, { x: 350, y: 300 });
    
    // Create Laplacian node
    const laplacianTransform = {
      type: 'laplacian' as TransformationType,
      name: 'Laplacian Edge Detection',
      description: 'Detect edges using Laplacian operator',
      parameters: [
        {
          name: 'kernelSize',
          type: 'number' as const,
          value: 3,
          min: 1,
          max: 31,
          step: 2,
        },
      ],
      showPreprocessingSteps: true,
      outputToDisplay: 'final' as const
    };
    const laplacianId = addNode('transformation', laplacianTransform, { x: 350, y: 450 });
    
    // Create output node
    const outputId = addNode('output', undefined, { x: 600, y: 300 });
    
    // Create connections between nodes
    setTimeout(() => {
      // Add a timeout to ensure nodes are fully added before creating edges
      addEdge(inputId, grayscaleId);
      addEdge(grayscaleId, blurId);
      addEdge(blurId, laplacianId);
      addEdge(laplacianId, outputId);
    }, 100);
    
  }, [addNode, addEdge, nodes, edges, initialized]);

  return null; // This is just a setup component, it doesn't render anything
} 