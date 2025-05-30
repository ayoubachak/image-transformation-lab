import { v4 as uuidv4 } from 'uuid';
import type { 
  SavedProject, 
  SerializedPipelineState, 
  SerializedNode, 
  SerializedEdge,
  ImageProcessingNode,
  ImageProcessingEdge
} from '../utils/types';
import { pipelineManager } from './PipelineManager';

// Constants
const STORAGE_KEY_PREFIX = 'image_transform_lab_project_';
const PROJECTS_LIST_KEY = 'image_transform_lab_projects';
const CURRENT_PROJECT_KEY = 'image_transform_lab_current_project';
const APP_VERSION = '1.0.0'; // Update when making breaking changes to the schema

/**
 * ProjectManager handles saving and loading projects from localStorage
 */
export class ProjectManager {
  /**
   * Save the current pipeline state as a project
   */
  public saveProject(name: string): SavedProject {
    // Generate unique ID if not updating an existing project
    const projectId = uuidv4();
    const timestamp = Date.now();
    
    // Serialize the current state
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
    
    // Save to localStorage
    this.saveProjectToStorage(project);
    
    // Update the projects list
    this.addProjectToList(project);
    
    // Set as current project
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
    
    return project;
  }
  
  /**
   * Update an existing project with the current state
   */
  public updateProject(projectId: string, name?: string): SavedProject | null {
    // Check if project exists
    const existingProject = this.getProject(projectId);
    if (!existingProject) return null;
    
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
    
    // Save to localStorage
    this.saveProjectToStorage(updatedProject);
    
    return updatedProject;
  }
  
  /**
   * Load a project from localStorage and apply to the current pipeline
   */
  public loadProject(projectId: string): SavedProject | null {
    const project = this.getProject(projectId);
    if (!project) return null;
    
    // Deserialize and apply the state
    this.deserializeAndApplyState(project.state);
    
    // Set as current project
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
    
    return project;
  }
  
  /**
   * Get a project by ID
   */
  public getProject(projectId: string): SavedProject | null {
    const projectJson = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    if (!projectJson) return null;
    
    try {
      return JSON.parse(projectJson) as SavedProject;
    } catch (error) {
      console.error('Error parsing project:', error);
      return null;
    }
  }
  
  /**
   * Get the current project if one is active
   */
  public getCurrentProject(): SavedProject | null {
    const currentProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (!currentProjectId) return null;
    
    return this.getProject(currentProjectId);
  }
  
  /**
   * Get a list of all saved projects
   */
  public getProjectsList(): { id: string; name: string; updatedAt: number; thumbnailDataUrl?: string }[] {
    const projectsListJson = localStorage.getItem(PROJECTS_LIST_KEY);
    if (!projectsListJson) return [];
    
    try {
      return JSON.parse(projectsListJson);
    } catch (error) {
      console.error('Error parsing projects list:', error);
      return [];
    }
  }
  
  /**
   * Delete a project from localStorage
   */
  public deleteProject(projectId: string): boolean {
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
    
    return true;
  }
  
  /**
   * Create a new empty project
   */
  public createNewProject(): void {
    // Reset the pipeline
    pipelineManager.resetPipeline();
    
    // Clear current project
    localStorage.removeItem(CURRENT_PROJECT_KEY);
  }
  
  /**
   * Serialize the current pipeline state
   */
  private serializeCurrentState(): SerializedPipelineState {
    // Get nodes and edges from pipeline manager
    const nodes = pipelineManager.getNodes();
    const edges = pipelineManager.getEdges();
    
    // Collect input images
    const inputImages: Record<string, string> = {};
    
    // Convert nodes to serializable format
    const serializedNodes: SerializedNode[] = nodes.map(node => {
      // If this is an input node, we need to grab the image data
      if (node.type === 'input') {
        const canvas = pipelineManager.getNodeResult(node.id)?.canvas;
        if (canvas) {
          try {
            // Convert canvas to data URL
            inputImages[node.id] = canvas.toDataURL('image/png');
          } catch (error) {
            console.error('Error serializing input image:', error);
          }
        }
      }
      
      // Return serialized node
      return {
        id: node.id,
        type: node.type,
        position: { ...node.position },
        transformation: node.transformation ? { ...node.transformation } : undefined,
        metadata: node.metadata ? { ...node.metadata } : undefined
      };
    });
    
    // Convert edges to serializable format
    const serializedEdges: SerializedEdge[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target
    }));
    
    return {
      nodes: serializedNodes,
      edges: serializedEdges,
      inputImages
    };
  }
  
  /**
   * Deserialize and apply a saved state
   */
  private deserializeAndApplyState(state: SerializedPipelineState): void {
    // Start with a clean pipeline
    pipelineManager.resetPipeline();
    
    // Create a map to store nodes by ID
    const nodesMap = new Map<string, ImageProcessingNode>();
    
    // First pass: create all nodes
    for (const serializedNode of state.nodes) {
      let node: ImageProcessingNode | null = null;
      
      // Create the node with the right type
      if (serializedNode.type === 'input') {
        node = pipelineManager.createNode('input', serializedNode.id, serializedNode.position);
      } else if (serializedNode.type === 'output') {
        node = pipelineManager.createNode('output', serializedNode.id, serializedNode.position);
      } else if (serializedNode.type === 'transformation' && serializedNode.transformation) {
        node = pipelineManager.createNode('transformation', serializedNode.id, serializedNode.position, serializedNode.transformation);
      }
      
      // Store in map if created
      if (node) {
        nodesMap.set(node.id, node);
      }
    }
    
    // Second pass: restore connections (edges)
    for (const serializedEdge of state.edges) {
      pipelineManager.addEdge(serializedEdge.source, serializedEdge.target, serializedEdge.id);
    }
    
    // Last pass: load input images
    for (const [nodeId, imageDataUrl] of Object.entries(state.inputImages)) {
      try {
        // Load the image
        const img = new Image();
        img.onload = () => {
          pipelineManager.setInputImage(nodeId, img);
        };
        img.src = imageDataUrl;
      } catch (error) {
        console.error(`Error loading image for node ${nodeId}:`, error);
      }
    }
  }
  
  /**
   * Generate a thumbnail from the output node
   */
  private generateThumbnail(): string | undefined {
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
            // Set thumbnail size (max 200px in either dimension)
            const maxSize = 200;
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
            
            // Return data URL
            return thumbnailCanvas.toDataURL('image/jpeg', 0.7); // Use JPEG for smaller size
          }
        } catch (error) {
          console.error('Error generating thumbnail:', error);
        }
      }
    }
    
    return undefined;
  }
  
  /**
   * Save a project to localStorage
   */
  private saveProjectToStorage(project: SavedProject): void {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${project.id}`,
        JSON.stringify(project)
      );
    } catch (error) {
      console.error('Error saving project to localStorage:', error);
      throw new Error('Failed to save project. The project may be too large for localStorage.');
    }
  }
  
  /**
   * Add a project to the projects list
   */
  private addProjectToList(project: SavedProject): void {
    const projectsList = this.getProjectsList();
    
    // Check if project already exists in list
    const existingIndex = projectsList.findIndex(p => p.id === project.id);
    
    if (existingIndex >= 0) {
      // Update existing entry
      projectsList[existingIndex] = {
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
        thumbnailDataUrl: project.thumbnailDataUrl
      };
    } else {
      // Add new entry
      projectsList.push({
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
        thumbnailDataUrl: project.thumbnailDataUrl
      });
    }
    
    // Save updated list
    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projectsList));
  }
}

// Export a singleton instance
export const projectManager = new ProjectManager(); 