import { v4 as uuidv4 } from 'uuid';
import type { 
  SavedProject, 
  SerializedPipelineState, 
  SerializedNode, 
  SerializedEdge,
  ImageProcessingNode,
  ImageProcessingEdge,
  Inspection,
  Transformation
} from '../utils/types';
import { pipelineManager } from './PipelineManager';

// Constants
const STORAGE_KEY_PREFIX = 'image_transform_lab_project_';
const PROJECTS_LIST_KEY = 'image_transform_lab_projects';
const CURRENT_PROJECT_KEY = 'image_transform_lab_current_project';
const APP_VERSION = '1.0.0'; // Update when making breaking changes to the schema

// Storage optimization constants
const MAX_IMAGE_SIZE = 512; // Max dimension for stored images
const IMAGE_QUALITY = 0.8; // JPEG quality for compression
const MAX_PROJECT_SIZE = 3 * 1024 * 1024; // 3MB limit per project
const MAX_TOTAL_STORAGE = 8 * 1024 * 1024; // 8MB total storage limit

// Migration and validation
interface ProjectValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  migratedData?: SerializedPipelineState;
}

// Storage utilities
interface StorageInfo {
  usedSpace: number;
  totalProjects: number;
  availableSpace: number;
  canSave: boolean;
}

/**
 * ProjectManager handles saving and loading projects from localStorage
 * Uses proper error handling, validation, compression, and storage optimization
 */
export class ProjectManager {
  /**
   * Get current storage information
   */
  public getStorageInfo(): StorageInfo {
    try {
      let usedSpace = 0;
      const projectsList = this.getProjectsList();
      
      // Calculate total used space
      for (const project of projectsList) {
        const projectData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${project.id}`);
        if (projectData) {
          usedSpace += new Blob([projectData]).size;
        }
      }
      
      // Add projects list size
      const projectsListData = localStorage.getItem(PROJECTS_LIST_KEY);
      if (projectsListData) {
        usedSpace += new Blob([projectsListData]).size;
      }
      
      const availableSpace = MAX_TOTAL_STORAGE - usedSpace;
      
      return {
        usedSpace,
        totalProjects: projectsList.length,
        availableSpace,
        canSave: availableSpace > MAX_PROJECT_SIZE
      };
    } catch (error) {
      console.error('❌ Error calculating storage info:', error);
      return {
        usedSpace: 0,
        totalProjects: 0,
        availableSpace: MAX_TOTAL_STORAGE,
        canSave: false
      };
    }
  }
  
  /**
   * Clean up old projects to free space
   */
  public cleanupStorage(targetFreeSpace: number = MAX_PROJECT_SIZE): boolean {
    try {
      const storageInfo = this.getStorageInfo();
      if (storageInfo.availableSpace >= targetFreeSpace) {
        return true; // Already enough space
      }
      
      const projectsList = this.getProjectsList();
      
      // Sort projects by last updated (oldest first)
      const sortedProjects = [...projectsList].sort((a, b) => a.updatedAt - b.updatedAt);
      
      let freedSpace = 0;
      const deletedProjects: string[] = [];
      
      for (const project of sortedProjects) {
        if (storageInfo.availableSpace + freedSpace >= targetFreeSpace) {
          break;
        }
        
        const projectData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${project.id}`);
        if (projectData) {
          const projectSize = new Blob([projectData]).size;
          this.deleteProject(project.id);
          freedSpace += projectSize;
          deletedProjects.push(project.name);
        }
      }
      
      if (deletedProjects.length > 0) {
        console.log(`🧹 Cleaned up ${deletedProjects.length} old projects: ${deletedProjects.join(', ')}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error during storage cleanup:', error);
      return false;
    }
  }
  
  /**
   * Save the current pipeline state as a project
   */
  public saveProject(name: string): SavedProject {
    try {
      // Check storage space before attempting to save
      const storageInfo = this.getStorageInfo();
      if (!storageInfo.canSave) {
        console.log('⚠️ Low storage space, attempting cleanup...');
        const cleanupSuccess = this.cleanupStorage();
        if (!cleanupSuccess) {
          throw new Error('Insufficient storage space. Please delete some projects manually.');
        }
      }
      
    // Generate unique ID if not updating an existing project
    const projectId = uuidv4();
    const timestamp = Date.now();
    
      // Serialize the current state with compression
    const state = this.serializeCurrentState();
    
    // Generate thumbnail from the output node if available
    const thumbnailDataUrl = this.generateThumbnail();
    
    // Create the project object
    const project: SavedProject = {
      id: projectId,
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: APP_VERSION,
      thumbnailDataUrl,
      state
    };
    
      // Validate the project before saving
      const validation = this.validateProject(project);
      if (!validation.isValid) {
        throw new Error(`Project validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Save to localStorage with proper error handling
    this.saveProjectToStorage(project);
    
    // Update the projects list
    this.addProjectToList(project);
    
    // Set as current project
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
    
      console.log(`✅ Project "${name}" saved successfully with ID: ${projectId}`);
    return project;
    } catch (error) {
      console.error('❌ Failed to save project:', error);
      throw new Error(`Failed to save project "${name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Update an existing project with the current state
   */
  public updateProject(projectId: string, name?: string): SavedProject | null {
    try {
    // Check if project exists
    const existingProject = this.getProject(projectId);
      if (!existingProject) {
        throw new Error(`Project with ID "${projectId}" not found`);
      }
      
      // Check storage space for the update
      const storageInfo = this.getStorageInfo();
      if (!storageInfo.canSave) {
        console.log('⚠️ Low storage space, attempting cleanup...');
        const cleanupSuccess = this.cleanupStorage();
        if (!cleanupSuccess) {
          throw new Error('Insufficient storage space. Please delete some projects to continue.');
        }
      }
    
    // Serialize the current state
    const state = this.serializeCurrentState();
    
    // Generate thumbnail from the output node if available
    const thumbnailDataUrl = this.generateThumbnail();
    
    // Create the updated project
    const updatedProject: SavedProject = {
      ...existingProject,
      name: name || existingProject.name,
      updatedAt: Date.now(),
      thumbnailDataUrl,
      state
    };
      
      // Validate the updated project
      const validation = this.validateProject(updatedProject);
      if (!validation.isValid) {
        throw new Error(`Project validation failed: ${validation.errors.join(', ')}`);
      }
    
    // Save to localStorage
    this.saveProjectToStorage(updatedProject);
    
      console.log(`✅ Project "${updatedProject.name}" updated successfully`);
    return updatedProject;
    } catch (error) {
      console.error('❌ Failed to update project:', error);
      throw new Error(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Load a project from localStorage and apply to the current pipeline
   */
  public loadProject(projectId: string): SavedProject | null {
    try {
    const project = this.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID "${projectId}" not found`);
      }
      
      console.log(`🔄 Loading project "${project.name}"...`);
      
      // Validate the project data before applying
      const validation = this.validateProject(project);
      if (!validation.isValid) {
        console.warn('⚠️ Project validation issues:', validation.warnings);
        if (validation.errors.length > 0) {
          throw new Error(`Project validation failed: ${validation.errors.join(', ')}`);
        }
      }
      
      // Use migrated data if available, otherwise use original
      const stateToLoad = validation.migratedData || project.state;
      
      // Deserialize and apply the state with comprehensive error handling
      const success = this.deserializeAndApplyState(stateToLoad);
      if (!success) {
        throw new Error('Failed to apply project state to pipeline');
      }
    
    // Set as current project
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
    
      console.log(`✅ Project "${project.name}" loaded successfully`);
    return project;
    } catch (error) {
      console.error('❌ Failed to load project:', error);
      throw new Error(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get a project by ID with error handling
   */
  public getProject(projectId: string): SavedProject | null {
    try {
      const projectJson = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
      if (!projectJson) {
        return null;
      }
      
      const project = JSON.parse(projectJson) as SavedProject;
      
      // Basic structure validation
      if (!project.id || !project.name || !project.state) {
        console.warn(`⚠️ Invalid project structure for ID "${projectId}"`);
        return null;
      }
      
      return project;
    } catch (error) {
      console.error('❌ Error parsing project:', error);
      return null;
    }
  }
  
  /**
   * Get the current project if one is active
   */
  public getCurrentProject(): SavedProject | null {
    try {
    const currentProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (!currentProjectId) return null;
    
    return this.getProject(currentProjectId);
    } catch (error) {
      console.error('❌ Error getting current project:', error);
      return null;
    }
  }
  
  /**
   * Get a list of all saved projects with error handling
   */
  public getProjectsList(): { id: string; name: string; updatedAt: number; thumbnailDataUrl?: string }[] {
    try {
    const projectsListJson = localStorage.getItem(PROJECTS_LIST_KEY);
    if (!projectsListJson) return [];
    
      const projectsList = JSON.parse(projectsListJson);
      
      // Validate the projects list structure
      if (!Array.isArray(projectsList)) {
        console.warn('⚠️ Invalid projects list structure, resetting...');
        localStorage.removeItem(PROJECTS_LIST_KEY);
        return [];
      }
      
      return projectsList.filter(project => 
        project && typeof project === 'object' && project.id && project.name
      );
    } catch (error) {
      console.error('❌ Error parsing projects list:', error);
      // Reset corrupted projects list
      localStorage.removeItem(PROJECTS_LIST_KEY);
      return [];
    }
  }
  
  /**
   * Delete a project from localStorage
   */
  public deleteProject(projectId: string): boolean {
    try {
    // Remove the project
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    
    // Update the projects list
    const projectsList = this.getProjectsList().filter(p => p.id !== projectId);
    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projectsList));
    
    // Clear current project if it's the deleted one
    const currentProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (currentProjectId === projectId) {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
    
      console.log(`✅ Project "${projectId}" deleted successfully`);
    return true;
    } catch (error) {
      console.error('❌ Error deleting project:', error);
      return false;
    }
  }
  
  /**
   * Create a new empty project
   */
  public createNewProject(): void {
    try {
    // Reset the pipeline
    pipelineManager.resetPipeline();
    
    // Clear current project
    localStorage.removeItem(CURRENT_PROJECT_KEY);
      
      console.log('✅ New project created');
    } catch (error) {
      console.error('❌ Error creating new project:', error);
      throw new Error(`Failed to create new project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Optimize and compress image data for storage
   */
  private optimizeImageForStorage(canvas: HTMLCanvasElement): string {
    try {
      // Create a temporary canvas for optimization
      const optimizedCanvas = document.createElement('canvas');
      const ctx = optimizedCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context for optimization');
      }
      
      // Calculate optimal dimensions while maintaining aspect ratio
      const { width: originalWidth, height: originalHeight } = canvas;
      const aspectRatio = originalWidth / originalHeight;
      
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;
      
      // Resize if too large
      if (Math.max(originalWidth, originalHeight) > MAX_IMAGE_SIZE) {
        if (originalWidth > originalHeight) {
          targetWidth = MAX_IMAGE_SIZE;
          targetHeight = Math.round(MAX_IMAGE_SIZE / aspectRatio);
        } else {
          targetHeight = MAX_IMAGE_SIZE;
          targetWidth = Math.round(MAX_IMAGE_SIZE * aspectRatio);
        }
      }
      
      optimizedCanvas.width = targetWidth;
      optimizedCanvas.height = targetHeight;
      
      // Draw the optimized image
      ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
      
      // Return compressed JPEG data URL
      return optimizedCanvas.toDataURL('image/jpeg', IMAGE_QUALITY);
    } catch (error) {
      console.warn('⚠️ Failed to optimize image, using original:', error);
      // Fallback to original canvas data
      try {
        return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
      } catch (fallbackError) {
        console.warn('⚠️ Failed to convert to JPEG, using PNG:', fallbackError);
        return canvas.toDataURL('image/png');
      }
    }
  }
  
  /**
   * Clean transformation/inspection data to reduce size
   */
  private cleanNodeData<T extends Transformation | Inspection>(data: T): T {
    const cleaned = this.deepClone(data);
    
    // Remove large or unnecessary metadata
    if (cleaned.metadata) {
      // Keep only essential metadata
      const essentialKeys = ['advancedParameters', 'chartConfig', 'displayOptions'];
      const filteredMetadata: Record<string, any> = {};
      
      for (const key of essentialKeys) {
        if (cleaned.metadata[key]) {
          filteredMetadata[key] = cleaned.metadata[key];
        }
      }
      
      cleaned.metadata = filteredMetadata;
    }
    
    // Clean up parameters to remove unnecessary data
    if (cleaned.parameters) {
      cleaned.parameters = cleaned.parameters.map(param => ({
        name: param.name,
        type: param.type,
        value: param.value,
        label: param.label,
        description: param.description,
        min: param.min,
        max: param.max,
        step: param.step,
        options: param.options,
        advanced: param.advanced,
        group: param.group,
        dependsOn: param.dependsOn
        // Remove functions like showIf and validate to reduce size
      }));
    }
    
    return cleaned;
  }
  
  /**
   * Serialize the current pipeline state with comprehensive optimization
   */
  private serializeCurrentState(): SerializedPipelineState {
    try {
      console.log('🔄 Serializing pipeline state with optimization...');
      
    // Get nodes and edges from pipeline manager
    const nodes = pipelineManager.getNodes();
    const edges = pipelineManager.getEdges();
    
      console.log(`📊 Serializing ${nodes.length} nodes and ${edges.length} edges`);
      
      // Collect input images with optimization
    const inputImages: Record<string, string> = {};
    
      // Convert nodes to serializable format with enhanced validation and optimization
    const serializedNodes: SerializedNode[] = nodes.map(node => {
        try {
          // Validate node structure
          if (!node.id || !node.type || !node.position) {
            throw new Error(`Invalid node structure: missing required fields`);
          }
          
      // If this is an input node, we need to grab the image data
      if (node.type === 'input') {
        const canvas = pipelineManager.getNodeResult(node.id)?.canvas;
        if (canvas) {
          try {
                // Optimize and compress the image data
                inputImages[node.id] = this.optimizeImageForStorage(canvas);
                console.log(`📸 Optimized and serialized input image for node ${node.id}`);
          } catch (error) {
                console.warn(`⚠️ Failed to serialize input image for node ${node.id}:`, error);
              }
            }
          }
          
          // Validate and clean transformation if present
          let cleanedTransformation: Transformation | undefined;
          if (node.type === 'transformation' && node.transformation) {
            this.validateTransformation(node.transformation);
            cleanedTransformation = this.cleanNodeData(node.transformation);
          }
          
          // Validate and clean inspection if present
          let cleanedInspection: Inspection | undefined;
          if (node.type === 'inspection' && node.inspection) {
            this.validateInspection(node.inspection);
            cleanedInspection = this.cleanNodeData(node.inspection);
          }
          
          // Return serialized node with optimized data
          const serializedNode: SerializedNode = {
        id: node.id,
        type: node.type,
        position: { ...node.position },
            transformation: cleanedTransformation,
            inspection: cleanedInspection,
        metadata: undefined // Remove metadata reference as it doesn't exist in ImageProcessingNode
      };
          
          console.log(`✅ Serialized ${node.type} node: ${node.id}`);
          return serializedNode;
        } catch (error) {
          console.error(`❌ Failed to serialize node ${node.id}:`, error);
          throw error;
        }
      });
      
      // Convert edges to serializable format with validation
      const serializedEdges: SerializedEdge[] = edges.map(edge => {
        try {
          if (!edge.id || !edge.source || !edge.target) {
            throw new Error(`Invalid edge structure: missing required fields`);
          }
          
          return {
      id: edge.id,
      source: edge.source,
      target: edge.target
          };
        } catch (error) {
          console.error(`❌ Failed to serialize edge ${edge.id}:`, error);
          throw error;
        }
      });
      
      const state: SerializedPipelineState = {
      nodes: serializedNodes,
      edges: serializedEdges,
      inputImages
    };
      
      // Log the final size
      const stateSize = new Blob([JSON.stringify(state)]).size;
      console.log(`✅ Pipeline state serialized successfully (${(stateSize / 1024).toFixed(2)}KB)`);
      
      return state;
    } catch (error) {
      console.error('❌ Failed to serialize pipeline state:', error);
      throw new Error(`Serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Deserialize and apply a saved state with comprehensive error handling
   */
  private deserializeAndApplyState(state: SerializedPipelineState): boolean {
    try {
      console.log('🔄 Deserializing pipeline state...');
      
      // Validate state structure
      if (!state.nodes || !Array.isArray(state.nodes) || !state.edges || !Array.isArray(state.edges)) {
        throw new Error('Invalid state structure: missing or invalid nodes/edges arrays');
      }
      
      console.log(`📊 Deserializing ${state.nodes.length} nodes and ${state.edges.length} edges`);
      
    // Start with a clean pipeline
    pipelineManager.resetPipeline();
    
      // Create a map to store nodes by ID for validation
    const nodesMap = new Map<string, ImageProcessingNode>();
      const createdNodeIds = new Set<string>();
    
      // First pass: create all nodes with enhanced error handling
    for (const serializedNode of state.nodes) {
        try {
          if (!serializedNode.id || !serializedNode.type || !serializedNode.position) {
            throw new Error(`Invalid serialized node: missing required fields`);
          }
          
      let node: ImageProcessingNode | null = null;
      
      // Create the node with the right type
      if (serializedNode.type === 'input') {
        node = pipelineManager.createNode('input', serializedNode.id, serializedNode.position);
      } else if (serializedNode.type === 'output') {
        node = pipelineManager.createNode('output', serializedNode.id, serializedNode.position);
      } else if (serializedNode.type === 'transformation' && serializedNode.transformation) {
            // Validate transformation before creating
            this.validateTransformation(serializedNode.transformation);
        node = pipelineManager.createNode('transformation', serializedNode.id, serializedNode.position, serializedNode.transformation);
      } else if (serializedNode.type === 'inspection' && serializedNode.inspection) {
            // Validate inspection before creating
            this.validateInspection(serializedNode.inspection);
        node = pipelineManager.createInspectionNode(serializedNode.id, serializedNode.position, serializedNode.inspection);
          } else {
            throw new Error(`Unsupported node type or missing configuration: ${serializedNode.type}`);
          }
          
          // Store in map if created successfully
          if (node) {
            nodesMap.set(serializedNode.id, node);
            createdNodeIds.add(serializedNode.id);
            console.log(`✅ Created ${serializedNode.type} node: ${serializedNode.id}`);
          } else {
            throw new Error(`Failed to create node: ${serializedNode.id}`);
          }
        } catch (error) {
          console.error(`❌ Failed to create node ${serializedNode.id}:`, error);
          throw error;
        }
      }
      
      // Validate that all nodes were created
      if (createdNodeIds.size !== state.nodes.length) {
        throw new Error(`Node creation mismatch: expected ${state.nodes.length}, created ${createdNodeIds.size}`);
      }
      
      // Second pass: restore connections (edges) with validation
      const createdEdgeIds = new Set<string>();
      for (const serializedEdge of state.edges) {
        try {
          if (!serializedEdge.id || !serializedEdge.source || !serializedEdge.target) {
            throw new Error(`Invalid serialized edge: missing required fields`);
          }
          
          // Validate that source and target nodes exist
          if (!createdNodeIds.has(serializedEdge.source)) {
            throw new Error(`Source node not found: ${serializedEdge.source}`);
          }
          if (!createdNodeIds.has(serializedEdge.target)) {
            throw new Error(`Target node not found: ${serializedEdge.target}`);
          }
          
          const edgeId = pipelineManager.addEdge(serializedEdge.source, serializedEdge.target, serializedEdge.id);
          if (edgeId) {
            createdEdgeIds.add(edgeId);
            console.log(`✅ Created edge: ${serializedEdge.source} → ${serializedEdge.target}`);
          } else {
            throw new Error(`Failed to create edge: ${serializedEdge.id}`);
          }
        } catch (error) {
          console.error(`❌ Failed to create edge ${serializedEdge.id}:`, error);
          throw error;
        }
      }
      
      // Third pass: load input images with error handling
      if (state.inputImages) {
    for (const [nodeId, imageDataUrl] of Object.entries(state.inputImages)) {
      try {
            if (!createdNodeIds.has(nodeId)) {
              console.warn(`⚠️ Skipping input image for non-existent node: ${nodeId}`);
              continue;
            }
            
            // Load the image asynchronously
        const img = new Image();
        img.onload = () => {
              const success = pipelineManager.setInputImage(nodeId, img);
              if (success) {
                console.log(`✅ Loaded input image for node: ${nodeId}`);
              } else {
                console.warn(`⚠️ Failed to set input image for node: ${nodeId}`);
              }
            };
            img.onerror = () => {
              console.warn(`⚠️ Failed to load input image for node: ${nodeId}`);
        };
        img.src = imageDataUrl;
      } catch (error) {
            console.error(`❌ Error loading image for node ${nodeId}:`, error);
          }
        }
      }
      
      console.log(`✅ Pipeline state deserialized successfully`);
      return true;
    } catch (error) {
      console.error('❌ Failed to deserialize pipeline state:', error);
      
      // Clean up on failure
      try {
        pipelineManager.resetPipeline();
      } catch (cleanupError) {
        console.error('❌ Failed to clean up after deserialization error:', cleanupError);
      }
      
      return false;
    }
  }
  
  /**
   * Validate a project structure
   */
  private validateProject(project: SavedProject): ProjectValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Basic project validation
      if (!project.id) errors.push('Missing project ID');
      if (!project.name) errors.push('Missing project name');
      if (!project.state) errors.push('Missing project state');
      if (!project.version) warnings.push('Missing version information');
      
      // State validation
      if (project.state) {
        if (!Array.isArray(project.state.nodes)) errors.push('Invalid nodes array');
        if (!Array.isArray(project.state.edges)) errors.push('Invalid edges array');
        
        // Node validation
        project.state.nodes.forEach((node, index) => {
          if (!node.id) errors.push(`Node ${index}: missing ID`);
          if (!node.type) errors.push(`Node ${index}: missing type`);
          if (!node.position) errors.push(`Node ${index}: missing position`);
          
          // Type-specific validation
          if (node.type === 'transformation' && !node.transformation) {
            errors.push(`Transformation node ${node.id}: missing transformation config`);
          }
          if (node.type === 'inspection' && !node.inspection) {
            errors.push(`Inspection node ${node.id}: missing inspection config`);
          }
        });
        
        // Edge validation
        project.state.edges.forEach((edge, index) => {
          if (!edge.id) errors.push(`Edge ${index}: missing ID`);
          if (!edge.source) errors.push(`Edge ${index}: missing source`);
          if (!edge.target) errors.push(`Edge ${index}: missing target`);
        });
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }
  
  /**
   * Validate transformation configuration
   */
  private validateTransformation(transformation: Transformation): void {
    if (!transformation.id) throw new Error('Transformation missing ID');
    if (!transformation.type) throw new Error('Transformation missing type');
    if (!transformation.name) throw new Error('Transformation missing name');
    if (!Array.isArray(transformation.parameters)) throw new Error('Transformation missing parameters array');
    if (!Array.isArray(transformation.inputNodes)) throw new Error('Transformation missing inputNodes array');
  }
  
  /**
   * Validate inspection configuration
   */
  private validateInspection(inspection: Inspection): void {
    if (!inspection.id) throw new Error('Inspection missing ID');
    if (!inspection.type) throw new Error('Inspection missing type');
    if (!inspection.name) throw new Error('Inspection missing name');
    if (!inspection.visualizationType) throw new Error('Inspection missing visualizationType');
    if (!Array.isArray(inspection.parameters)) throw new Error('Inspection missing parameters array');
    if (!Array.isArray(inspection.inputNodes)) throw new Error('Inspection missing inputNodes array');
  }
  
  /**
   * Deep clone an object to avoid reference issues
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }
  
  /**
   * Generate a thumbnail from the output node
   */
  private generateThumbnail(): string | undefined {
    try {
    const nodes = pipelineManager.getNodes();
    const outputNode = nodes.find(node => node.type === 'output');
    
    if (outputNode) {
      const canvas = pipelineManager.getNodeResult(outputNode.id)?.canvas;
      if (canvas) {
        try {
          // Create a smaller thumbnail
          const thumbnailCanvas = document.createElement('canvas');
          const thumbnailCtx = thumbnailCanvas.getContext('2d');
          
          if (thumbnailCtx) {
              // Set thumbnail size (max 150px in either dimension to save space)
              const maxSize = 150;
            const aspectRatio = canvas.width / canvas.height;
            
            let width = maxSize;
            let height = maxSize;
            
            if (aspectRatio > 1) {
              // Landscape
              height = width / aspectRatio;
            } else {
              // Portrait
              width = height * aspectRatio;
            }
            
            thumbnailCanvas.width = width;
            thumbnailCanvas.height = height;
            
            // Draw the image at the reduced size
            thumbnailCtx.drawImage(canvas, 0, 0, width, height);
            
              // Return compressed JPEG data URL
              return thumbnailCanvas.toDataURL('image/jpeg', 0.6); // Lower quality for thumbnails
            }
          } catch (error) {
            console.warn('⚠️ Error generating thumbnail:', error);
        }
      }
    }
    
    return undefined;
    } catch (error) {
      console.warn('⚠️ Error in thumbnail generation:', error);
      return undefined;
    }
  }
  
  /**
   * Save a project to localStorage with comprehensive error handling and size management
   */
  private saveProjectToStorage(project: SavedProject): void {
    try {
      const projectJson = JSON.stringify(project);
      
      // Check if the serialized project is too large
      const sizeInBytes = new Blob([projectJson]).size;
      
      if (sizeInBytes > MAX_PROJECT_SIZE) {
        throw new Error(`Project too large for storage (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB > ${(MAX_PROJECT_SIZE / 1024 / 1024).toFixed(2)}MB). Consider reducing image sizes or simplifying the pipeline.`);
      }
      
      // Check total storage usage
      const storageInfo = this.getStorageInfo();
      if (storageInfo.usedSpace + sizeInBytes > MAX_TOTAL_STORAGE) {
        // Try to clean up space
        const cleanupSuccess = this.cleanupStorage(sizeInBytes);
        if (!cleanupSuccess) {
          throw new Error(`Storage quota exceeded. Used: ${(storageInfo.usedSpace / 1024 / 1024).toFixed(2)}MB, Need: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB, Limit: ${(MAX_TOTAL_STORAGE / 1024 / 1024).toFixed(2)}MB. Please delete some projects manually.`);
        }
      }
      
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${project.id}`,
        projectJson
      );
      
      console.log(`💾 Project saved to localStorage (${(sizeInBytes / 1024).toFixed(2)}KB)`);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please delete some projects or clear browser data.');
      }
      
      console.error('❌ Error saving project to localStorage:', error);
      throw new Error(`Failed to save project to storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Add a project to the projects list with error handling
   */
  private addProjectToList(project: SavedProject): void {
    try {
    const projectsList = this.getProjectsList();
    
    // Check if project already exists in list
    const existingIndex = projectsList.findIndex(p => p.id === project.id);
    
      const projectListItem = {
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
        thumbnailDataUrl: project.thumbnailDataUrl
      };
      
      if (existingIndex >= 0) {
        // Update existing entry
        projectsList[existingIndex] = projectListItem;
    } else {
      // Add new entry
        projectsList.push(projectListItem);
    }
    
    // Save updated list
    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projectsList));
      
      console.log(`📝 Updated projects list`);
    } catch (error) {
      console.error('❌ Error updating projects list:', error);
      throw new Error(`Failed to update projects list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const projectManager = new ProjectManager(); 