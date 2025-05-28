import { v4 as uuidv4 } from 'uuid';
import type { 
  ImageProcessingNode, 
  ImageProcessingEdge, 
  Transformation,
  TransformationParameter
} from '../utils/types';
import { processImage } from '../utils/imageProcessing';

/**
 * Event types for pipeline processing
 */
export enum PipelineEventType {
  NODE_ADDED = 'node_added',
  NODE_REMOVED = 'node_removed',
  NODE_UPDATED = 'node_updated',
  EDGE_ADDED = 'edge_added',
  EDGE_REMOVED = 'edge_removed',
  PROCESSING_STARTED = 'processing_started',
  PROCESSING_COMPLETED = 'processing_completed',
  PROCESSING_FAILED = 'processing_failed',
  PIPELINE_RESET = 'pipeline_reset',
  PIPELINE_INVALIDATED = 'pipeline_invalidated'
}

/**
 * Event payload for pipeline events
 */
export interface PipelineEvent {
  type: PipelineEventType;
  payload: any;
  timestamp: number;
}

/**
 * Observer interface for pipeline events
 */
export interface PipelineObserver {
  onPipelineEvent(event: PipelineEvent): void;
}

/**
 * Result of a node processing operation
 */
export interface NodeProcessingResult {
  nodeId: string;
  canvas: HTMLCanvasElement | null;
  error: Error | null;
  processingTime: number;
  status: 'success' | 'error' | 'pending' | 'idle';
}

/**
 * PipelineManager Service
 * 
 * Responsible for managing the image processing pipeline, including:
 * - Managing nodes and edges
 * - Tracking dependencies between nodes
 * - Processing images through the pipeline
 * - Notifying observers of pipeline events
 */
export class PipelineManager {
  private nodes: Map<string, ImageProcessingNode> = new Map();
  private edges: Map<string, ImageProcessingEdge> = new Map();
  private observers: Set<PipelineObserver> = new Set();
  private processingResults: Map<string, NodeProcessingResult> = new Map();
  private processingQueue: Set<string> = new Set();
  private dependencyGraph: Map<string, Set<string>> = new Map(); // nodeId -> Set of dependent node IDs
  private inputImages: Map<string, HTMLImageElement> = new Map(); // nodeId -> input image

  /**
   * Initialize a new PipelineManager
   */
  constructor() {
    this.resetPipeline();
  }

  /**
   * Reset the pipeline to its initial state
   */
  public resetPipeline(): void {
    this.nodes.clear();
    this.edges.clear();
    this.processingResults.clear();
    this.processingQueue.clear();
    this.dependencyGraph.clear();
    this.inputImages.clear();
    
    this.notifyObservers({
      type: PipelineEventType.PIPELINE_RESET,
      payload: null,
      timestamp: Date.now()
    });
  }

  /**
   * Register an observer for pipeline events
   */
  public registerObserver(observer: PipelineObserver): void {
    this.observers.add(observer);
  }

  /**
   * Unregister an observer
   */
  public unregisterObserver(observer: PipelineObserver): void {
    this.observers.delete(observer);
  }

  /**
   * Notify all observers of an event
   */
  private notifyObservers(event: PipelineEvent): void {
    this.observers.forEach(observer => {
      observer.onPipelineEvent(event);
    });
  }

  /**
   * Get all nodes in the pipeline
   */
  public getNodes(): ImageProcessingNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get a specific node by ID
   */
  public getNode(nodeId: string): ImageProcessingNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all edges in the pipeline
   */
  public getEdges(): ImageProcessingEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get the processing result for a node
   */
  public getNodeResult(nodeId: string): NodeProcessingResult | undefined {
    return this.processingResults.get(nodeId);
  }

  /**
   * Get all processing results
   */
  public getAllResults(): Map<string, NodeProcessingResult> {
    return new Map(this.processingResults);
  }

  /**
   * Add a node to the pipeline
   */
  public addNode(
    type: 'input' | 'transformation' | 'output', 
    position: { x: number, y: number },
    transformation?: Transformation | Omit<Transformation, 'id' | 'inputNodes'>
  ): string {
    const id = uuidv4();
    
    // Ensure transformation has the required fields if provided
    let nodeTransformation: Transformation | undefined = undefined;
    
    if (transformation) {
      nodeTransformation = {
        // For TypeScript safety, check if 'id' exists on the transformation
        // If it doesn't, we're dealing with a partial transformation
        ...(('id' in transformation) ? transformation : { 
          ...transformation,
          id,
          inputNodes: []
        }),
        // Ensure these properties exist
        id,
        inputNodes: ('inputNodes' in transformation) ? 
          (transformation as Transformation).inputNodes : []
      };
    }
    
    const node: ImageProcessingNode = {
      id,
      type,
      position,
      transformation: nodeTransformation
    };
    
    this.nodes.set(id, node);
    this.dependencyGraph.set(id, new Set());
    
    // Initialize node processing result
    this.processingResults.set(id, {
      nodeId: id,
      canvas: null,
      error: null,
      processingTime: 0,
      status: 'idle'
    });
    
    this.notifyObservers({
      type: PipelineEventType.NODE_ADDED,
      payload: { node },
      timestamp: Date.now()
    });
    
    return id;
  }

  /**
   * Update a node in the pipeline
   */
  public updateNode(nodeId: string, updates: Partial<ImageProcessingNode>): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    
    // Apply updates to the node
    const updatedNode: ImageProcessingNode = {
      ...node,
      ...updates,
      // Handle special case for transformation to ensure proper structure
      transformation: updates.transformation ? {
        ...node.transformation,
        ...updates.transformation,
        id: nodeId,
      } : node.transformation
    };
    
    this.nodes.set(nodeId, updatedNode);
    
    this.notifyObservers({
      type: PipelineEventType.NODE_UPDATED,
      payload: { nodeId, updates, node: updatedNode },
      timestamp: Date.now()
    });
    
    // If this is a transformation node and parameters were updated, invalidate downstream
    if (
      node.type === 'transformation' && 
      updates.transformation?.parameters &&
      updatedNode.transformation
    ) {
      this.invalidateNodeAndDownstream(nodeId);
    }
    
    return true;
  }

  /**
   * Update a transformation parameter
   */
  public updateParameter(
    nodeId: string, 
    paramName: string, 
    value: number | string | boolean
  ): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.type !== 'transformation' || !node.transformation) {
      return false;
    }
    
    // Find and update the parameter
    const updatedParameters = node.transformation.parameters?.map(param => 
      param.name === paramName ? { ...param, value } : param
    ) || [];
    
    // Update the node's transformation
    const updatedTransformation = {
      ...node.transformation,
      parameters: updatedParameters
    };
    
    // Update the node
    this.updateNode(nodeId, { transformation: updatedTransformation });
    
    // Invalidate this node and all downstream nodes
    this.invalidateNodeAndDownstream(nodeId);
    
    // Start processing this node immediately
    // This will also trigger processing of downstream nodes due to the improved processNode method
    setTimeout(() => {
      this.processNode(nodeId);
    }, 0);
    
    return true;
  }

  /**
   * Remove a node from the pipeline
   */
  public removeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    
    // Remove all edges connected to this node
    const edgesToRemove = Array.from(this.edges.values())
      .filter(edge => edge.source === nodeId || edge.target === nodeId);
    
    edgesToRemove.forEach(edge => {
      this.removeEdge(edge.id);
    });
    
    // Remove the node
    this.nodes.delete(nodeId);
    this.processingResults.delete(nodeId);
    this.dependencyGraph.delete(nodeId);
    
    // Remove the node from all dependency lists
    this.dependencyGraph.forEach((deps, _) => {
      deps.delete(nodeId);
    });
    
    this.notifyObservers({
      type: PipelineEventType.NODE_REMOVED,
      payload: { nodeId, node },
      timestamp: Date.now()
    });
    
    return true;
  }

  /**
   * Add an edge to the pipeline
   */
  public addEdge(sourceId: string, targetId: string): string | null {
    // Validate nodes exist
    const sourceNode = this.nodes.get(sourceId);
    const targetNode = this.nodes.get(targetId);
    
    if (!sourceNode || !targetNode) {
      return null;
    }
    
    // Prevent cycles or duplicate edges
    if (this.wouldCreateCycle(sourceId, targetId) || this.edgeExists(sourceId, targetId)) {
      return null;
    }
    
    const edgeId = `${sourceId}-${targetId}`;
    const edge: ImageProcessingEdge = {
      id: edgeId,
      source: sourceId,
      target: targetId
    };
    
    this.edges.set(edgeId, edge);
    
    // Update the target transformation's inputNodes if it's a transformation
    if (targetNode.type === 'transformation' && targetNode.transformation) {
      const updatedTransformation = {
        ...targetNode.transformation,
        inputNodes: [...targetNode.transformation.inputNodes, sourceId]
      };
      
      this.updateNode(targetId, { transformation: updatedTransformation });
    }
    
    // Update dependency graph
    if (!this.dependencyGraph.has(sourceId)) {
      this.dependencyGraph.set(sourceId, new Set());
    }
    this.dependencyGraph.get(sourceId)!.add(targetId);
    
    this.notifyObservers({
      type: PipelineEventType.EDGE_ADDED,
      payload: { edge },
      timestamp: Date.now()
    });
    
    // Invalidate the target node to trigger processing
    this.invalidateNodeAndDownstream(targetId);
    
    return edgeId;
  }

  /**
   * Remove an edge from the pipeline
   */
  public removeEdge(edgeId: string): boolean {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;
    
    // Get the target node
    const targetNode = this.nodes.get(edge.target);
    
    // Update the target node's inputNodes if it's a transformation
    if (targetNode?.type === 'transformation' && targetNode.transformation) {
      const updatedInputNodes = targetNode.transformation.inputNodes.filter(
        id => id !== edge.source
      );
      
      const updatedTransformation = {
        ...targetNode.transformation,
        inputNodes: updatedInputNodes
      };
      
      this.updateNode(edge.target, { transformation: updatedTransformation });
    }
    
    // Update dependency graph
    const deps = this.dependencyGraph.get(edge.source);
    if (deps) {
      deps.delete(edge.target);
    }
    
    // Remove the edge
    this.edges.delete(edgeId);
    
    this.notifyObservers({
      type: PipelineEventType.EDGE_REMOVED,
      payload: { edgeId, edge },
      timestamp: Date.now()
    });
    
    // Invalidate the target node since its input changed
    this.invalidateNodeAndDownstream(edge.target);
    
    return true;
  }

  /**
   * Check if an edge already exists between two nodes
   */
  private edgeExists(sourceId: string, targetId: string): boolean {
    const edgeId = `${sourceId}-${targetId}`;
    return this.edges.has(edgeId);
  }

  /**
   * Check if adding an edge would create a cycle in the graph
   */
  private wouldCreateCycle(sourceId: string, targetId: string): boolean {
    // If target is already upstream of source, adding this edge would create a cycle
    return this.isUpstream(targetId, sourceId);
  }

  /**
   * Check if nodeA is upstream of nodeB
   */
  private isUpstream(nodeA: string, nodeB: string): boolean {
    if (nodeA === nodeB) return true;
    
    // Get all nodes that input to nodeB
    const inputsToB = Array.from(this.edges.values())
      .filter(edge => edge.target === nodeB)
      .map(edge => edge.source);
    
    // If any of them are nodeA or have nodeA as an upstream node, return true
    return inputsToB.some(input => this.isUpstream(nodeA, input));
  }

  /**
   * Set an input image for an input node
   */
  public setInputImage(nodeId: string, image: HTMLImageElement): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.type !== 'input') return false;
    
    this.inputImages.set(nodeId, image);
    
    // Create a canvas with the image data for processing
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (ctx) {
      ctx.drawImage(image, 0, 0);
      
      // Store the result
      this.processingResults.set(nodeId, {
        nodeId,
        canvas,
        error: null,
        processingTime: 0,
        status: 'success'
      });
      
      // Invalidate downstream nodes
      this.invalidateDownstreamNodes(nodeId);
      
      return true;
    }
    
    return false;
  }

  /**
   * Get all nodes that directly depend on the given node
   */
  private getDirectDependents(nodeId: string): string[] {
    const dependents = this.dependencyGraph.get(nodeId);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * Get all nodes downstream of the given node (including indirect dependencies)
   */
  private getAllDownstreamNodes(nodeId: string): string[] {
    const visited = new Set<string>();
    const downstreamNodes = new Set<string>();
    
    const visit = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      
      if (currentId !== nodeId) {
        downstreamNodes.add(currentId);
      }
      
      const dependents = this.getDirectDependents(currentId);
      dependents.forEach(dependent => visit(dependent));
    };
    
    visit(nodeId);
    return Array.from(downstreamNodes);
  }

  /**
   * Invalidate a node and all its downstream nodes
   */
  public invalidateNodeAndDownstream(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    // Reset the processing result for this node
    const currentResult = this.processingResults.get(nodeId);
    if (currentResult) {
      this.processingResults.set(nodeId, {
        ...currentResult,
        status: 'idle',
        error: null
      });
    }
    
    // Notify that the node has been invalidated
    this.notifyObservers({
      type: PipelineEventType.PIPELINE_INVALIDATED,
      payload: { nodeId },
      timestamp: Date.now()
    });
    
    // Invalidate all downstream nodes recursively
    this.invalidateDownstreamNodes(nodeId);
    
    // Process the node if it's not an input node (input nodes need to be processed manually)
    if (node.type !== 'input') {
      setTimeout(() => {
        this.processNode(nodeId);
      }, 0);
    }
  }

  /**
   * Invalidate all downstream nodes of a given node
   */
  private invalidateDownstreamNodes(nodeId: string): void {
    const downstreamNodes = this.getAllDownstreamNodes(nodeId);
    
    // Mark all downstream nodes as invalidated
    downstreamNodes.forEach(id => {
      const result = this.processingResults.get(id);
      if (result) {
        this.processingResults.set(id, {
          ...result,
          status: 'idle',
          error: null
        });
        
        // Notify that this downstream node has been invalidated
        this.notifyObservers({
          type: PipelineEventType.PIPELINE_INVALIDATED,
          payload: { nodeId: id },
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Process a specific node in the pipeline
   */
  public async processNode(nodeId: string): Promise<NodeProcessingResult | null> {
    const node = this.nodes.get(nodeId);
    if (!node) return null;
    
    // If the node is already in the processing queue, mark it for reprocessing
    // but don't start a new processing operation yet
    if (this.processingQueue.has(nodeId)) {
      // Mark the node as needing reprocessing once the current processing is done
      const currentResult = this.processingResults.get(nodeId);
      if (currentResult && currentResult.status === 'pending') {
        this.processingResults.set(nodeId, {
          ...currentResult,
          status: 'idle'  // Will be picked up for reprocessing once current processing completes
        });
      }
      return null;
    }
    
    // For transformation nodes, ensure all input nodes are processed first
    if (node.type === 'transformation' && node.transformation) {
      const inputNodeIds = node.transformation.inputNodes;
      
      // Check if any input nodes are still processing
      const pendingInputs = inputNodeIds.filter(id => {
        const inputResult = this.processingResults.get(id);
        return !inputResult || inputResult.status === 'pending' || inputResult.status === 'idle';
      });
      
      if (pendingInputs.length > 0) {
        // Mark this node as idle so it will be processed once inputs are done
        const currentResult = this.processingResults.get(nodeId) || {
          nodeId,
          canvas: null,
          error: null,
          processingTime: 0,
          status: 'idle'
        };
        
        this.processingResults.set(nodeId, {
          ...currentResult,
          status: 'idle'
        });
        
        // Schedule this node to be processed again after a short delay
        setTimeout(() => {
          this.processNode(nodeId);
        }, 50);
        
        return null;
      }
    }
    
    // Add the node to the processing queue
    this.processingQueue.add(nodeId);
    
    // Update the node's processing status
    let result = this.processingResults.get(nodeId) || {
      nodeId,
      canvas: null,
      error: null,
      processingTime: 0,
      status: 'idle'
    };
    
    this.processingResults.set(nodeId, {
      ...result,
      status: 'pending'
    });
    
    this.notifyObservers({
      type: PipelineEventType.PROCESSING_STARTED,
      payload: { nodeId },
      timestamp: Date.now()
    });
    
    try {
      let canvas: HTMLCanvasElement | null = null;
      const startTime = performance.now();
      
      // Process based on node type
      if (node.type === 'input') {
        // Input nodes use their set image
        const inputResult = this.processingResults.get(nodeId);
        canvas = inputResult?.canvas || null;
      } 
      else if (node.type === 'transformation' && node.transformation) {
        // Ensure all input nodes have been processed
        const inputNodeIds = node.transformation.inputNodes;
        
        // If no input nodes, can't process
        if (inputNodeIds.length === 0) {
          throw new Error('Transformation node has no input nodes');
        }
        
        // Get the first input node's result (for now we only support one input)
        const inputNodeId = inputNodeIds[0];
        const inputResult = this.processingResults.get(inputNodeId);
        
        // Double-check that input is successful
        if (!inputResult || inputResult.status !== 'success' || !inputResult.canvas) {
          throw new Error('Input node has not been successfully processed');
        }
        
        // Get image data from the input canvas
        const ctx = inputResult.canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Failed to get context from input canvas');
        }
        
        const imageData = ctx.getImageData(
          0, 0, inputResult.canvas.width, inputResult.canvas.height
        );
        
        // Process the image
        const processResult = await processImage(
          imageData,
          node.transformation,
          true // Include intermediate results
        );
        
        // Create a canvas with the result
        canvas = document.createElement('canvas');
        canvas.width = processResult.result.width;
        canvas.height = processResult.result.height;
        
        const resultCtx = canvas.getContext('2d', { willReadFrequently: true });
        if (!resultCtx) {
          throw new Error('Failed to get context for result canvas');
        }
        
        resultCtx.putImageData(processResult.result, 0, 0);
      }
      else if (node.type === 'output') {
        // Output nodes just pass through their input
        const inputEdges = Array.from(this.edges.values())
          .filter(edge => edge.target === nodeId);
        
        if (inputEdges.length > 0) {
          const inputNodeId = inputEdges[0].source;
          const inputResult = this.processingResults.get(inputNodeId);
          
          if (inputResult && inputResult.status === 'success' && inputResult.canvas) {
            // Create a new canvas instead of using the reference directly
            canvas = document.createElement('canvas');
            canvas.width = inputResult.canvas.width;
            canvas.height = inputResult.canvas.height;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Draw the input canvas onto the new canvas
              ctx.drawImage(inputResult.canvas, 0, 0);
            }
          } else {
            // If input isn't ready, schedule this node to be processed later
            setTimeout(() => {
              this.processNode(nodeId);
            }, 50);
            throw new Error('Input node not yet processed, retrying later');
          }
        }
      }
      
      const processingTime = performance.now() - startTime;
      
      // Update the processing result
      this.processingResults.set(nodeId, {
        nodeId,
        canvas,
        error: null,
        processingTime,
        status: canvas ? 'success' : 'error'
      });
      
      // Notify that processing completed successfully
      this.notifyObservers({
        type: PipelineEventType.PROCESSING_COMPLETED,
        payload: { 
          nodeId, 
          processingTime,
          hasResult: !!canvas
        },
        timestamp: Date.now()
      });
      
      // Process downstream nodes immediately after successful processing
      const downstreamNodes = this.getDirectDependents(nodeId);
      if (downstreamNodes.length > 0) {
        // Use a small timeout to prevent stack overflow with deep pipelines
        setTimeout(() => {
          downstreamNodes.forEach(dependentId => {
            this.processNode(dependentId);
          });
        }, 0);
      }
    } 
    catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Only update as error if it's not a retry-able error
      if (error.message !== 'Input node not yet processed, retrying later') {
        // Update the processing result with the error
        this.processingResults.set(nodeId, {
          nodeId,
          canvas: null,
          error,
          processingTime: 0,
          status: 'error'
        });
        
        this.notifyObservers({
          type: PipelineEventType.PROCESSING_FAILED,
          payload: { 
            nodeId, 
            error: error.message
          },
          timestamp: Date.now()
        });
      }
    }
    finally {
      // Remove the node from the processing queue
      this.processingQueue.delete(nodeId);
      
      // Check if the node needs to be reprocessed (marked as idle during processing)
      const currentResult = this.processingResults.get(nodeId);
      if (currentResult && currentResult.status === 'idle') {
        // Schedule reprocessing in the next tick to avoid recursion
        setTimeout(() => {
          this.processNode(nodeId);
        }, 0);
      }
    }
    
    return this.processingResults.get(nodeId) || null;
  }

  /**
   * Process the entire pipeline, starting from input nodes
   */
  public async processPipeline(): Promise<void> {
    // Find all input nodes
    const inputNodes = Array.from(this.nodes.values())
      .filter(node => node.type === 'input');
    
    // Process each input node
    for (const node of inputNodes) {
      await this.processNode(node.id);
    }
  }

  /**
   * Get a topologically sorted list of nodes (for ordered processing)
   */
  public getTopologicalOrder(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>(); // For cycle detection
    
    const visit = (nodeId: string) => {
      if (temp.has(nodeId)) {
        // Cycle detected
        return;
      }
      if (visited.has(nodeId)) {
        return;
      }
      
      temp.add(nodeId);
      
      // Visit all nodes that this node depends on
      const node = this.nodes.get(nodeId);
      if (node && node.type === 'transformation' && node.transformation) {
        for (const inputId of node.transformation.inputNodes) {
          visit(inputId);
        }
      }
      
      temp.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };
    
    // Visit all nodes
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }
    
    return result.reverse(); // Reverse to get correct order
  }

  // Add the method to the PipelineManager class
  public duplicateNode(nodeId: string): string | null {
    const sourceNode = this.nodes.get(nodeId);
    if (!sourceNode) return null;
    
    // Create a new position slightly offset from the original
    const newPosition = {
      x: sourceNode.position.x + 50,
      y: sourceNode.position.y + 50
    };
    
    let newNodeId: string | null = null;
    
    if (sourceNode.type === 'input' || sourceNode.type === 'output') {
      // For input and output nodes, just create a new node of the same type
      newNodeId = this.addNode(sourceNode.type, newPosition);
    } else if (sourceNode.type === 'transformation' && sourceNode.transformation) {
      // For transformation nodes, clone the transformation without id and inputNodes
      const { id, inputNodes, ...transformationData } = sourceNode.transformation;
      
      // Create a new transformation node with the cloned data
      newNodeId = this.addNode(
        'transformation',
        newPosition,
        transformationData as Omit<Transformation, 'id' | 'inputNodes'>
      );
    }
    
    // Notify observers
    if (newNodeId) {
      this.notifyObservers({
        type: PipelineEventType.NODE_ADDED,
        payload: { nodeId: newNodeId },
        timestamp: Date.now()
      });
    }
    
    return newNodeId;
  }
}

// Create a singleton instance
export const pipelineManager = new PipelineManager();

export default pipelineManager; 