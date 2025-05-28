import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { pipelineManager, type PipelineObserver, type PipelineEvent, PipelineEventType, type NodeProcessingResult } from '../services/PipelineManager';
import type { ImageProcessingNode, ImageProcessingEdge, Transformation } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';

interface PipelineContextType {
  // Pipeline state
  nodes: ImageProcessingNode[];
  edges: ImageProcessingEdge[];
  selectedNodeId: string | null;
  results: Map<string, NodeProcessingResult>;
  
  // Actions
  addNode: (
    type: 'input' | 'transformation' | 'output', 
    transformation?: Omit<Transformation, 'id' | 'inputNodes'>, 
    position?: { x: number, y: number }
  ) => string;
  updateNode: (nodeId: string, updates: Partial<ImageProcessingNode>) => void;
  removeNode: (nodeId: string) => void;
  updateParameter: (nodeId: string, paramName: string, value: number | string | boolean) => void;
  addEdge: (sourceId: string, targetId: string) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setInputImage: (nodeId: string, image: HTMLImageElement) => void;
  invalidateNode: (nodeId: string) => void;
  clearPipeline: () => void;
  getProcessedCanvas: (nodeId: string) => HTMLCanvasElement | null;
  duplicateNode: (nodeId: string) => string | null;
}

const PipelineContext = createContext<PipelineContextType | null>(null);

export const usePipeline = (): PipelineContextType => {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
};

interface PipelineProviderProps {
  children: React.ReactNode;
}

export const PipelineProvider: React.FC<PipelineProviderProps> = ({ children }) => {
  const [nodes, setNodes] = useState<ImageProcessingNode[]>([]);
  const [edges, setEdges] = useState<ImageProcessingEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [results, setResults] = useState<Map<string, NodeProcessingResult>>(new Map());
  
  // Update state from the pipeline manager whenever it changes
  const syncStateFromManager = useCallback(() => {
    setNodes(pipelineManager.getNodes());
    setEdges(pipelineManager.getEdges());
    setResults(pipelineManager.getAllResults());
  }, []);
  
  // Initialize and set up the observer
  useEffect(() => {
    // Create an observer to listen for pipeline events
    const observer: PipelineObserver = {
      onPipelineEvent(event: PipelineEvent) {
        // Update state when relevant events occur
        switch(event.type) {
          case PipelineEventType.NODE_ADDED:
          case PipelineEventType.NODE_REMOVED:
          case PipelineEventType.NODE_UPDATED:
          case PipelineEventType.EDGE_ADDED:
          case PipelineEventType.EDGE_REMOVED:
          case PipelineEventType.PIPELINE_RESET:
          case PipelineEventType.PROCESSING_COMPLETED:
          case PipelineEventType.PROCESSING_FAILED:
            syncStateFromManager();
            break;
        }
      }
    };
    
    // Register the observer
    pipelineManager.registerObserver(observer);
    
    // Initial sync
    syncStateFromManager();
    
    // Clean up
    return () => {
      pipelineManager.unregisterObserver(observer);
    };
  }, [syncStateFromManager]);
  
  // Add a node to the pipeline
  const addNode = useCallback((
    type: 'input' | 'transformation' | 'output', 
    transformation?: Omit<Transformation, 'id' | 'inputNodes'>,
    position?: { x: number, y: number }
  ): string => {
    // Calculate position if not provided
    const calculatedPosition = position || calculateNodePosition(type, nodes);
    
    // Create a complete Transformation object if one was provided
    const completeTransformation = transformation ? {
      ...transformation,
      id: uuidv4(), // Add temporary ID (will be replaced by PipelineManager)
      inputNodes: [] // Initialize empty inputNodes array
    } : undefined;
    
    return pipelineManager.addNode(type, calculatedPosition, completeTransformation);
  }, [nodes]);
  
  // Update a node
  const updateNode = useCallback((nodeId: string, updates: Partial<ImageProcessingNode>): void => {
    pipelineManager.updateNode(nodeId, updates);
  }, []);
  
  // Remove a node
  const removeNode = useCallback((nodeId: string): void => {
    pipelineManager.removeNode(nodeId);
  }, []);
  
  // Update a parameter
  const updateParameter = useCallback((
    nodeId: string, 
    paramName: string, 
    value: number | string | boolean
  ): void => {
    pipelineManager.updateParameter(nodeId, paramName, value);
  }, []);
  
  // Add an edge
  const addEdge = useCallback((sourceId: string, targetId: string): void => {
    pipelineManager.addEdge(sourceId, targetId);
  }, []);
  
  // Remove an edge
  const removeEdge = useCallback((edgeId: string): void => {
    pipelineManager.removeEdge(edgeId);
  }, []);
  
  // Select a node
  const selectNode = useCallback((nodeId: string | null): void => {
    setSelectedNodeId(nodeId);
  }, []);
  
  // Set an input image
  const setInputImage = useCallback((nodeId: string, image: HTMLImageElement): void => {
    pipelineManager.setInputImage(nodeId, image);
  }, []);
  
  // Invalidate a node (force reprocessing)
  const invalidateNode = useCallback((nodeId: string): void => {
    pipelineManager.invalidateNodeAndDownstream(nodeId);
  }, []);
  
  // Clear the pipeline
  const clearPipeline = useCallback((): void => {
    pipelineManager.resetPipeline();
  }, []);
  
  // Get the processed canvas for a node
  const getProcessedCanvas = useCallback((nodeId: string): HTMLCanvasElement | null => {
    const result = pipelineManager.getNodeResult(nodeId);
    return result?.canvas || null;
  }, []);
  
  // Helper function to calculate node position
  const calculateNodePosition = (
    type: 'input' | 'transformation' | 'output',
    currentNodes: ImageProcessingNode[]
  ): { x: number, y: number } => {
    // Default positions for each type when no nodes exist
    if (currentNodes.length === 0) {
      if (type === 'input') return { x: 100, y: 250 };
      if (type === 'transformation') return { x: 350, y: 250 };
      if (type === 'output') return { x: 600, y: 250 };
    }

    // Find nodes of the same type
    const existingNodesByType = currentNodes.filter(node => node.type === type);
    
    // If no nodes of this type exist, use type-specific positioning
    if (existingNodesByType.length === 0) {
      if (type === 'input') return { x: 100, y: 250 };
      
      if (type === 'transformation') {
        // Find the rightmost input node, or use default if none exist
        const inputNodes = currentNodes.filter(node => node.type === 'input');
        if (inputNodes.length > 0) {
          const rightmostInput = inputNodes.reduce((prev, current) => 
            (current.position.x > prev.position.x) ? current : prev
          );
          return { x: rightmostInput.position.x + 250, y: rightmostInput.position.y };
        }
        return { x: 350, y: 250 };
      }
      
      if (type === 'output') {
        // Find the rightmost transformation node, or use default if none exist
        const transformationNodes = currentNodes.filter(node => node.type === 'transformation');
        if (transformationNodes.length > 0) {
          const rightmostTransformation = transformationNodes.reduce((prev, current) => 
            (current.position.x > prev.position.x) ? current : prev
          );
          return { x: rightmostTransformation.position.x + 250, y: rightmostTransformation.position.y };
        }
        
        // If no transformation nodes but have input nodes
        const inputNodes = currentNodes.filter(node => node.type === 'input');
        if (inputNodes.length > 0) {
          const rightmostInput = inputNodes.reduce((prev, current) => 
            (current.position.x > prev.position.x) ? current : prev
          );
          return { x: rightmostInput.position.x + 450, y: rightmostInput.position.y };
        }
        
        return { x: 600, y: 250 };
      }
    }
    
    // For nodes of the same type, arrange vertically with spacing
    const verticalOffset = existingNodesByType.length * 150;
    
    // Use the position of the first node of this type with vertical offset
    const baseNode = existingNodesByType[0];
    return { 
      x: baseNode.position.x, 
      y: baseNode.position.y + verticalOffset 
    };
  };
  
  // Duplicate a node with its configuration
  const duplicateNode = useCallback((nodeId: string): string | null => {
    const node = pipelineManager.getNode(nodeId);
    if (!node) return null;
    
    // Calculate a position offset for the new node
    const offsetPosition = {
      x: node.position.x + 50,
      y: node.position.y + 50
    };
    
    // Create a new node based on the type
    if (node.type === 'input' || node.type === 'output') {
      return pipelineManager.addNode(node.type, offsetPosition);
    } else if (node.type === 'transformation' && node.transformation) {
      // Deep clone the transformation, removing id and inputNodes
      const { id, inputNodes, ...transformationData } = node.transformation;
      return pipelineManager.addNode('transformation', offsetPosition, transformationData as Omit<Transformation, 'id' | 'inputNodes'>);
    }
    
    return null;
  }, []);
  
  const contextValue: PipelineContextType = {
    nodes,
    edges,
    selectedNodeId,
    results,
    addNode,
    updateNode,
    removeNode,
    updateParameter,
    addEdge,
    removeEdge,
    selectNode,
    setInputImage,
    invalidateNode,
    clearPipeline,
    getProcessedCanvas,
    duplicateNode
  };
  
  return (
    <PipelineContext.Provider value={contextValue}>
      {children}
    </PipelineContext.Provider>
  );
}; 