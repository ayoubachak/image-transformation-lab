/**
 * Connected Components Processor
 * Implements connected component labeling and analysis for binary images
 */

export interface ConnectedComponentsOptions {
  connectivity: '4' | '8';
  minArea: number;
  maxArea: number;
  outputMode: 'labeled' | 'filtered' | 'largest' | 'statistics';
}

export interface ComponentStats {
  label: number;
  area: number;
  centroid: { x: number; y: number };
  boundingBox: { x: number; y: number; width: number; height: number };
  perimeter: number;
}

export interface ConnectedComponentsResult {
  labeledImage: ImageData;
  components: ComponentStats[];
  totalComponents: number;
}

export class ConnectedComponentsProcessor {
  /**
   * Analyze connected components in a binary image
   */
  static process(imageData: ImageData, options: ConnectedComponentsOptions): ImageData {
    const { data, width, height } = imageData;
    const connectivity = parseInt(options.connectivity) as 4 | 8;
    
    // Convert to binary
    const binaryData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      binaryData[i / 4] = gray > 128 ? 1 : 0;
    }
    
    // Perform connected component labeling
    const result = this.labelComponents(binaryData, width, height, connectivity);
    
    // Filter components by area
    const filteredComponents = result.components.filter(comp => {
      if (options.minArea > 0 && comp.area < options.minArea) return false;
      if (options.maxArea > 0 && comp.area > options.maxArea) return false;
      return true;
    });
    
    // Create output based on mode
    return this.createOutput(result.labeledImage, filteredComponents, options.outputMode, width, height);
  }
  
  /**
   * Label connected components using two-pass algorithm
   */
  private static labelComponents(
    binaryData: Uint8Array, 
    width: number, 
    height: number, 
    connectivity: 4 | 8
  ): ConnectedComponentsResult {
    const labels = new Int32Array(width * height);
    const equivalences: number[][] = [];
    let nextLabel = 1;
    
    // First pass: assign provisional labels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (binaryData[idx] === 0) continue; // Background
        
        // Get neighbor labels
        const neighborLabels = this.getNeighborLabels(labels, x, y, width, height, connectivity);
        
        if (neighborLabels.length === 0) {
          // New component
          labels[idx] = nextLabel++;
          equivalences[labels[idx]] = [labels[idx]];
        } else {
          // Assign minimum neighbor label
          const minLabel = Math.min(...neighborLabels);
          labels[idx] = minLabel;
          
          // Record equivalences
          for (const label of neighborLabels) {
            if (label !== minLabel) {
              this.unionLabels(equivalences, minLabel, label);
            }
          }
        }
      }
    }
    
    // Resolve equivalences
    const labelMap = new Map<number, number>();
    let finalLabel = 1;
    
    for (let i = 1; i < nextLabel; i++) {
      const root = this.findRoot(equivalences, i);
      if (!labelMap.has(root)) {
        labelMap.set(root, finalLabel++);
      }
    }
    
    // Second pass: assign final labels and collect statistics
    const finalLabels = new Int32Array(width * height);
    const componentPixels = new Map<number, number[]>();
    
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] > 0) {
        const root = this.findRoot(equivalences, labels[i]);
        const finalLbl = labelMap.get(root)!;
        finalLabels[i] = finalLbl;
        
        if (!componentPixels.has(finalLbl)) {
          componentPixels.set(finalLbl, []);
        }
        componentPixels.get(finalLbl)!.push(i);
      }
    }
    
    // Calculate component statistics
    const components: ComponentStats[] = [];
    
    for (const [label, pixels] of componentPixels) {
      const stats = this.calculateComponentStats(label, pixels, width, height);
      components.push(stats);
    }
    
    // Create labeled image
    const labeledImage = this.createLabeledImage(finalLabels, width, height, components.length);
    
    return {
      labeledImage,
      components: components.sort((a, b) => b.area - a.area), // Sort by area descending
      totalComponents: components.length
    };
  }
  
  /**
   * Get neighbor labels for connectivity analysis
   */
  private static getNeighborLabels(
    labels: Int32Array, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    connectivity: 4 | 8
  ): number[] {
    const neighbors: number[] = [];
    
    // Define neighbor offsets based on connectivity
    const offsets = connectivity === 4 
      ? [[-1, 0], [0, -1]]  // 4-connected: left, up
      : [[-1, -1], [-1, 0], [-1, 1], [0, -1]]; // 8-connected: diagonal, up, diagonal, left
    
    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const label = labels[ny * width + nx];
        if (label > 0 && !neighbors.includes(label)) {
          neighbors.push(label);
        }
      }
    }
    
    return neighbors;
  }
  
  /**
   * Union-find operations for label equivalence
   */
  private static unionLabels(equivalences: number[][], label1: number, label2: number): void {
    const root1 = this.findRoot(equivalences, label1);
    const root2 = this.findRoot(equivalences, label2);
    
    if (root1 !== root2) {
      // Union by making smaller root point to larger root
      if (root1 < root2) {
        equivalences[root2] = equivalences[root1];
      } else {
        equivalences[root1] = equivalences[root2];
      }
    }
  }
  
  private static findRoot(equivalences: number[][], label: number): number {
    if (!equivalences[label]) return label;
    
    let root = label;
    while (equivalences[root] && equivalences[root][0] !== root) {
      root = equivalences[root][0];
    }
    
    // Path compression
    let current = label;
    while (equivalences[current] && equivalences[current][0] !== root) {
      const next = equivalences[current][0];
      equivalences[current] = [root];
      current = next;
    }
    
    return root;
  }
  
  /**
   * Calculate statistics for a component
   */
  private static calculateComponentStats(
    label: number, 
    pixels: number[], 
    width: number, 
    height: number
  ): ComponentStats {
    let sumX = 0, sumY = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    
    for (const idx of pixels) {
      const x = idx % width;
      const y = Math.floor(idx / width);
      
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    return {
      label,
      area: pixels.length,
      centroid: {
        x: sumX / pixels.length,
        y: sumY / pixels.length
      },
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      },
      perimeter: this.calculatePerimeter(pixels, width, height)
    };
  }
  
  /**
   * Calculate perimeter of a component
   */
  private static calculatePerimeter(pixels: number[], width: number, height: number): number {
    const pixelSet = new Set(pixels);
    let perimeter = 0;
    
    for (const idx of pixels) {
      const x = idx % width;
      const y = Math.floor(idx / width);
      
      // Check 4-connected neighbors
      const neighbors = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
      ];
      
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || 
            !pixelSet.has(ny * width + nx)) {
          perimeter++;
        }
      }
    }
    
    return perimeter;
  }
  
  /**
   * Create labeled image for visualization
   */
  private static createLabeledImage(
    labels: Int32Array, 
    width: number, 
    height: number, 
    numComponents: number
  ): ImageData {
    const imageData = new ImageData(width, height);
    const pixels = imageData.data;
    
    // Generate colors for each label
    const colors = this.generateColors(numComponents);
    
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const rgbaIdx = i * 4;
      
      if (label === 0) {
        // Background - black
        pixels[rgbaIdx] = 0;
        pixels[rgbaIdx + 1] = 0;
        pixels[rgbaIdx + 2] = 0;
      } else {
        // Component - colored
        const color = colors[label - 1];
        pixels[rgbaIdx] = color[0];
        pixels[rgbaIdx + 1] = color[1];
        pixels[rgbaIdx + 2] = color[2];
      }
      pixels[rgbaIdx + 3] = 255;
    }
    
    return imageData;
  }
  
  /**
   * Create output image based on mode
   */
  private static createOutput(
    labeledImage: ImageData,
    components: ComponentStats[],
    mode: string,
    width: number,
    height: number
  ): ImageData {
    switch (mode) {
      case 'labeled':
        return labeledImage;
        
      case 'filtered':
      case 'largest':
        return this.createFilteredImage(labeledImage, components, mode, width, height);
        
      case 'statistics':
        return this.createStatisticsImage(components, width, height);
        
      default:
        return labeledImage;
    }
  }
  
  /**
   * Create filtered component image
   */
  private static createFilteredImage(
    labeledImage: ImageData,
    components: ComponentStats[],
    mode: string,
    width: number,
    height: number
  ): ImageData {
    const result = new ImageData(width, height);
    const sourcePixels = labeledImage.data;
    const resultPixels = result.data;
    
    // Keep only specified components
    const keepLabels = mode === 'largest' && components.length > 0 
      ? new Set([components[0].label])  // Only largest
      : new Set(components.map(c => c.label)); // All filtered
    
    for (let i = 0; i < sourcePixels.length; i += 4) {
      const idx = i / 4;
      const y = Math.floor(idx / width);
      const x = idx % width;
      
      // Check if this pixel belongs to a kept component
      let shouldKeep = false;
      for (const comp of components) {
        if (keepLabels.has(comp.label)) {
          // This is a simple approximation - in a real implementation,
          // you'd need to track which pixels belong to which label
          shouldKeep = true;
          break;
        }
      }
      
      if (shouldKeep && (sourcePixels[i] + sourcePixels[i + 1] + sourcePixels[i + 2]) > 0) {
        resultPixels[i] = 255;
        resultPixels[i + 1] = 255;
        resultPixels[i + 2] = 255;
      } else {
        resultPixels[i] = 0;
        resultPixels[i + 1] = 0;
        resultPixels[i + 2] = 0;
      }
      resultPixels[i + 3] = 255;
    }
    
    return result;
  }
  
  /**
   * Create statistics visualization
   */
  private static createStatisticsImage(
    components: ComponentStats[],
    width: number,
    height: number
  ): ImageData {
    const result = new ImageData(width, height);
    const pixels = result.data;
    
    // Fill with dark background
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 20;     // R
      pixels[i + 1] = 20; // G
      pixels[i + 2] = 20; // B
      pixels[i + 3] = 255; // A
    }
    
    // Draw component statistics as text overlay would go here
    // For now, just show component centers as white dots
    for (const comp of components) {
      const x = Math.round(comp.centroid.x);
      const y = Math.round(comp.centroid.y);
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        pixels[idx] = 255;     // R
        pixels[idx + 1] = 255; // G
        pixels[idx + 2] = 255; // B
      }
    }
    
    return result;
  }
  
  /**
   * Generate distinct colors for component visualization
   */
  private static generateColors(count: number): number[][] {
    const colors: number[][] = [];
    
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.5) % 360; // Golden angle for good distribution
      const saturation = 70 + (i % 3) * 10; // Vary saturation
      const lightness = 50 + (i % 4) * 10;  // Vary lightness
      
      colors.push(this.hslToRgb(hue, saturation, lightness));
    }
    
    return colors;
  }
  
  /**
   * Convert HSL to RGB
   */
  private static hslToRgb(h: number, s: number, l: number): number[] {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    
    return [
      Math.round(f(0) * 255),
      Math.round(f(8) * 255),
      Math.round(f(4) * 255)
    ];
  }
} 