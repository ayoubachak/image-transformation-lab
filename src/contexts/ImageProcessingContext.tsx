import { createContext, useContext, useState, type ReactNode, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  Transformation,
  ImageProcessingNode,
  ImageProcessingEdge,
  Lesson
} from '../utils/types';
import { sampleLessons } from '../utils/sampleData';

interface ImageProcessingContextType {
  nodes: ImageProcessingNode[];
  edges: ImageProcessingEdge[];
  selectedNodeId: string | null;
  processedImages: Record<string, HTMLCanvasElement>;
  lessons: Lesson[];
  currentLessonId: string | null;
  addNode: (type: 'input' | 'transformation' | 'output', transformation?: Transformation, nodeData?: Partial<ImageProcessingNode>) => string;
  updateNode: (nodeId: string, updatedData: Partial<ImageProcessingNode>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (source: string, target: string) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setProcessedImage: (nodeId: string, canvas: HTMLCanvasElement) => void;
  loadLesson: (lessonId: string) => void;
  clearPipeline: () => void;
  invalidateDownstreamNodes: (nodeId: string) => void;
}

const ImageProcessingContext = createContext<ImageProcessingContextType | undefined>(undefined);

export const useImageProcessing = (): ImageProcessingContextType => {
  const context = useContext(ImageProcessingContext);
  if (!context) {
    throw new Error('useImageProcessing must be used within an ImageProcessingProvider');
  }
  return context;
};

interface ImageProcessingProviderProps {
  children: ReactNode;
}

export const ImageProcessingProvider = ({ children }: ImageProcessingProviderProps) => {
  const [nodes, setNodes] = useState<ImageProcessingNode[]>([]);
  const [edges, setEdges] = useState<ImageProcessingEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<Record<string, HTMLCanvasElement>>({});
  const [lessons, setLessons] = useState<Lesson[]>(sampleLessons);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Load the first lesson pipeline when the component mounts
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      if (sampleLessons.length > 0 && nodes.length === 0 && !currentLessonId) {
        const firstLesson = sampleLessons[0];
        setNodes(firstLesson.pipeline.nodes);
        setEdges(firstLesson.pipeline.edges);
        setCurrentLessonId(firstLesson.id);
      }
    }
  }, []);

  // Calculate a good position for a new node based on existing nodes
  const calculateNodePosition = (type: 'input' | 'transformation' | 'output') => {
    // Default positions for each type when no nodes exist
    if (nodes.length === 0) {
      if (type === 'input') return { x: 100, y: 250 };
      if (type === 'transformation') return { x: 350, y: 250 };
      if (type === 'output') return { x: 600, y: 250 };
    }

    // Find the most right position for existing nodes
    const existingNodesByType = nodes.filter(node => node.type === type);
    
    // If no nodes of this type exist, use type-specific positioning
    if (existingNodesByType.length === 0) {
      if (type === 'input') return { x: 100, y: 250 };
      
      if (type === 'transformation') {
        // Find the rightmost input node, or use default if none exist
        const inputNodes = nodes.filter(node => node.type === 'input');
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
        const transformationNodes = nodes.filter(node => node.type === 'transformation');
        if (transformationNodes.length > 0) {
          const rightmostTransformation = transformationNodes.reduce((prev, current) => 
            (current.position.x > prev.position.x) ? current : prev
          );
          return { x: rightmostTransformation.position.x + 250, y: rightmostTransformation.position.y };
        }
        // If no transformation nodes but have input nodes
        const inputNodes = nodes.filter(node => node.type === 'input');
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
    return { x: baseNode.position.x, y: baseNode.position.y + verticalOffset };
  };

  const addNode = (
    type: 'input' | 'transformation' | 'output', 
    transformation?: Transformation,
    nodeData?: Partial<ImageProcessingNode>
  ): string => {
    const id = nodeData?.id || uuidv4();
    const position = nodeData?.position || calculateNodePosition(type);
    
    const newNode: ImageProcessingNode = {
      id,
      type,
      transformation,
      position,
    };
    
    setNodes((prev) => [...prev, newNode]);
    return id;
  };

  const updateNode = (nodeId: string, updatedData: Partial<ImageProcessingNode>) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, ...updatedData } : node
      )
    );
    
    // If transformation parameters were updated, invalidate downstream nodes
    if (updatedData.transformation?.parameters) {
      invalidateDownstreamNodes(nodeId);
    }
  };

  const removeNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setEdges((prev) => 
      prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    );
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const addEdge = (source: string, target: string) => {
    const id = `${source}-${target}`;
    // Check if edge already exists
    if (edges.some(edge => edge.id === id)) {
      return;
    }
    
    // Find the transformation node that this edge targets
    const targetNode = nodes.find(node => node.id === target);
    
    // If the target is a transformation node, update its inputNodes array
    if (targetNode?.type === 'transformation' && targetNode.transformation) {
      const updatedTransformation = {
        ...targetNode.transformation,
        inputNodes: [...targetNode.transformation.inputNodes, source]
      };
      updateNode(target, { transformation: updatedTransformation });
    }
    
    setEdges((prev) => [...prev, { id, source, target }]);
  };

  const removeEdge = (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    
    if (edge) {
      // Find the transformation node that this edge targets
      const targetNode = nodes.find(node => node.id === edge.target);
      
      // If the target is a transformation node, update its inputNodes array
      if (targetNode?.type === 'transformation' && targetNode.transformation) {
        const updatedInputNodes = targetNode.transformation.inputNodes.filter(
          nodeId => nodeId !== edge.source
        );
        const updatedTransformation = {
          ...targetNode.transformation,
          inputNodes: updatedInputNodes
        };
        updateNode(edge.target, { transformation: updatedTransformation });
      }
    }
    
    setEdges((prev) => prev.filter((edge) => edge.id !== edgeId));
  };

  const selectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  };

  const setProcessedImage = (nodeId: string, canvas: HTMLCanvasElement) => {
    setProcessedImages((prev) => ({ ...prev, [nodeId]: canvas }));
  };

  const loadLesson = (lessonId: string) => {
    const lesson = sampleLessons.find(l => l.id === lessonId);
    if (lesson) {
      setCurrentLessonId(lessonId);
      // Use a timeout to break the synchronous update cycle
      setTimeout(() => {
        setNodes(lesson.pipeline.nodes);
        setEdges(lesson.pipeline.edges);
        setProcessedImages({});
      }, 0);
    }
  };

  const clearPipeline = () => {
    setNodes([]);
    setEdges([]);
    setProcessedImages({});
    setSelectedNodeId(null);
    setCurrentLessonId(null);
  };

  // Find and invalidate all downstream nodes from a given node
  const invalidateDownstreamNodes = (nodeId: string) => {
    console.log(`Invalidating downstream nodes from: ${nodeId}`);
    
    // Get all edges and nodes for processing
    const allEdges = [...edges];
    const allNodes = [...nodes];
    
    // Find all direct downstream nodes
    const directDownstreamEdges = allEdges.filter(edge => edge.source === nodeId);
    const directDownstreamNodeIds = directDownstreamEdges.map(edge => edge.target);
    
    if (directDownstreamNodeIds.length === 0) {
      console.log(`No downstream nodes found for ${nodeId}`);
      return; // No downstream nodes to invalidate
    }
    
    console.log(`Direct downstream nodes: ${directDownstreamNodeIds.join(', ')}`);
    
    // Create a map of all node connections for efficient traversal
    const nodeConnections = new Map<string, string[]>();
    
    // Build the connection map (which nodes are connected to which)
    allEdges.forEach(edge => {
      if (!nodeConnections.has(edge.source)) {
        nodeConnections.set(edge.source, []);
      }
      nodeConnections.get(edge.source)?.push(edge.target);
    });
    
    // Set to keep track of all nodes we need to invalidate
    const nodesToInvalidate = new Set<string>();
    
    // Function to recursively traverse the graph and collect all nodes downstream
    const traverseDownstream = (currentNodeId: string, visited = new Set<string>()) => {
      // Skip if we've already visited this node to prevent cycles
      if (visited.has(currentNodeId)) {
        return;
      }
      
      // Mark node as visited
      visited.add(currentNodeId);
      
      // Add this node to the invalidation set (except the source node itself)
      if (currentNodeId !== nodeId) {
        nodesToInvalidate.add(currentNodeId);
      }
      
      // Get all connections from this node
      const connections = nodeConnections.get(currentNodeId) || [];
      
      // Recursively process all connected nodes
      connections.forEach(connectedNodeId => {
        traverseDownstream(connectedNodeId, visited);
      });
    };
    
    // Start traversal from all direct downstream nodes
    directDownstreamNodeIds.forEach(id => {
      traverseDownstream(id);
    });
    
    console.log(`Total nodes to invalidate: ${nodesToInvalidate.size}`);
    console.log(`Nodes to invalidate: ${Array.from(nodesToInvalidate).join(', ')}`);
    
    // Only proceed if we found nodes to invalidate
    if (nodesToInvalidate.size === 0) {
      return;
    }
    
    // Clone the existing processedImages to avoid direct mutation
    const updatedProcessedImages = { ...processedImages };
    let changesDetected = false;
    
    // Remove all affected nodes from processedImages
    nodesToInvalidate.forEach(id => {
      if (id in updatedProcessedImages) {
        console.log(`Invalidating cached image for node: ${id}`);
        delete updatedProcessedImages[id];
        changesDetected = true;
      }
    });
    
    // Update state only if we made changes
    if (changesDetected) {
      console.log('Updating processedImages state with invalidated nodes');
      // Use a timeout to ensure this happens after any current rendering cycle
      setTimeout(() => {
        setProcessedImages(updatedProcessedImages);
      }, 0);
    } else {
      console.log('No changes to processedImages were needed');
    }
  };

  const value = {
    nodes,
    edges,
    selectedNodeId,
    processedImages,
    lessons,
    currentLessonId,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    removeEdge,
    selectNode,
    setProcessedImage,
    loadLesson,
    clearPipeline,
    invalidateDownstreamNodes,
  };

  return (
    <ImageProcessingContext.Provider value={value}>
      {children}
    </ImageProcessingContext.Provider>
  );
}; 