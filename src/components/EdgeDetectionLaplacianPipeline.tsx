import { useEffect, useState } from 'react';
import { useImageProcessing } from '../contexts/ImageProcessingContext';
import { v4 as uuidv4 } from 'uuid';
import type { Transformation, ImageProcessingNode, ImageProcessingEdge } from '../utils/types';

/**
 * Creates a specialized Laplacian edge detection pipeline that shows all intermediate steps
 * This demonstrates the complete process: grayscale → blur → Laplacian
 */
export default function EdgeDetectionLaplacianPipeline() {
  const { addNode, addEdge, nodes, edges } = useImageProcessing();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once and when the context is ready
    if (initialized || nodes.length > 0) return;
    
    // Prevent multiple initializations
    setInitialized(true);
    
    // Create input node
    const inputId = uuidv4();
    const inputNode: ImageProcessingNode = {
      id: inputId,
      type: 'input',
      position: { x: 100, y: 250 }
    };
    
    // Create grayscale node
    const grayscaleId = uuidv4();
    const grayscaleNode: ImageProcessingNode = {
      id: grayscaleId,
      type: 'transformation',
      transformation: {
        id: grayscaleId,
        type: 'grayscale',
        name: 'Grayscale',
        description: 'Convert image to grayscale',
        parameters: [],
        inputNodes: [inputId],
        showPreprocessingSteps: true,
        outputToDisplay: 'intermediate'
      },
      position: { x: 350, y: 150 }
    };
    
    // Create blur node
    const blurId = uuidv4();
    const blurNode: ImageProcessingNode = {
      id: blurId,
      type: 'transformation',
      transformation: {
        id: blurId,
        type: 'blur',
        name: 'Gaussian Blur',
        description: 'Apply Gaussian blur to reduce noise',
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
        inputNodes: [grayscaleId],
        showPreprocessingSteps: true,
        outputToDisplay: 'intermediate',
        dependsOn: [grayscaleId]
      },
      position: { x: 350, y: 300 }
    };
    
    // Create Laplacian node
    const laplacianId = uuidv4();
    const laplacianNode: ImageProcessingNode = {
      id: laplacianId,
      type: 'transformation',
      transformation: {
        id: laplacianId,
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
        inputNodes: [blurId],
        showPreprocessingSteps: true,
        outputToDisplay: 'final',
        dependsOn: [blurId]
      },
      position: { x: 350, y: 450 }
    };
    
    // Create output node
    const outputId = uuidv4();
    const outputNode: ImageProcessingNode = {
      id: outputId,
      type: 'output',
      position: { x: 600, y: 300 }
    };
    
    // Add all nodes to the pipeline
    addNode('input', undefined, inputNode);
    addNode('transformation', grayscaleNode.transformation, grayscaleNode);
    addNode('transformation', blurNode.transformation, blurNode);
    addNode('transformation', laplacianNode.transformation, laplacianNode);
    addNode('output', undefined, outputNode);
    
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