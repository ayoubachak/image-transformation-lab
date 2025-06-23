/**
 * Skeletonize Processor
 * Reduces binary objects to their skeletal structure using Zhang-Suen thinning algorithm
 */

export interface SkeletonizeOptions {
  method: 'zhang-suen' | 'morphological';
  iterations: number;
  preserveEndpoints: boolean;
}

export class SkeletonizeProcessor {
  /**
   * Apply skeletonization to binary image
   */
  static process(imageData: ImageData, options: SkeletonizeOptions): ImageData {
    const { data, width, height } = imageData;
    
    // Convert to binary
    const binaryData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      binaryData[i / 4] = gray > 128 ? 1 : 0;
    }
    
    let skeletonData: Uint8Array;
    
    switch (options.method) {
      case 'zhang-suen':
        skeletonData = this.zhangSuenThinning(binaryData, width, height, options.iterations);
        break;
      
      case 'morphological':
        skeletonData = this.morphologicalSkeleton(binaryData, width, height, options.iterations);
        break;
      
      default:
        skeletonData = this.zhangSuenThinning(binaryData, width, height, options.iterations);
        break;
    }
    
    // Preserve endpoints if requested
    if (options.preserveEndpoints) {
      skeletonData = this.preserveEndpoints(skeletonData, width, height);
    }
    
    // Convert back to RGBA
    const result = new ImageData(width, height);
    const pixels = result.data;
    
    for (let i = 0; i < skeletonData.length; i++) {
      const value = skeletonData[i] * 255;
      const rgbaIdx = i * 4;
      pixels[rgbaIdx] = value;
      pixels[rgbaIdx + 1] = value;
      pixels[rgbaIdx + 2] = value;
      pixels[rgbaIdx + 3] = 255;
    }
    
    return result;
  }
  
  /**
   * Zhang-Suen thinning algorithm
   */
  private static zhangSuenThinning(
    data: Uint8Array,
    width: number,
    height: number,
    maxIterations: number
  ): Uint8Array {
    const result = new Uint8Array(data);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;
      
      // Two sub-iterations for Zhang-Suen
      for (let subIter = 0; subIter < 2; subIter++) {
        const toRemove: number[] = [];
        
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            
            if (result[idx] === 1) {
              if (this.shouldRemovePixel(result, x, y, width, height, subIter === 0)) {
                toRemove.push(idx);
              }
            }
          }
        }
        
        // Remove marked pixels
        for (const idx of toRemove) {
          result[idx] = 0;
          changed = true;
        }
      }
      
      // Stop if no changes
      if (!changed) break;
    }
    
    return result;
  }
  
  /**
   * Check if pixel should be removed in Zhang-Suen algorithm
   */
  private static shouldRemovePixel(
    data: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number,
    firstSubIteration: boolean
  ): boolean {
    // Get 8-connected neighbors (clockwise from top)
    const neighbors = [
      data[(y - 1) * width + x],     // P2
      data[(y - 1) * width + (x + 1)], // P3
      data[y * width + (x + 1)],        // P4
      data[(y + 1) * width + (x + 1)], // P5
      data[(y + 1) * width + x],        // P6
      data[(y + 1) * width + (x - 1)], // P7
      data[y * width + (x - 1)],        // P8
      data[(y - 1) * width + (x - 1)]  // P9
    ];
    
    // Condition 1: 2 <= B(P1) <= 6 (number of non-zero neighbors)
    const B = neighbors.reduce((sum, val) => sum + val, 0);
    if (B < 2 || B > 6) return false;
    
    // Condition 2: A(P1) = 1 (number of 0-1 transitions)
    let A = 0;
    for (let i = 0; i < 8; i++) {
      if (neighbors[i] === 0 && neighbors[(i + 1) % 8] === 1) {
        A++;
      }
    }
    if (A !== 1) return false;
    
    // Condition 3 & 4: depends on sub-iteration
    if (firstSubIteration) {
      // P2 * P4 * P6 = 0
      if (neighbors[0] * neighbors[2] * neighbors[4] !== 0) return false;
      // P4 * P6 * P8 = 0
      if (neighbors[2] * neighbors[4] * neighbors[6] !== 0) return false;
    } else {
      // P2 * P4 * P8 = 0
      if (neighbors[0] * neighbors[2] * neighbors[6] !== 0) return false;
      // P2 * P6 * P8 = 0
      if (neighbors[0] * neighbors[4] * neighbors[6] !== 0) return false;
    }
    
    return true;
  }
  
  /**
   * Morphological skeleton using erosion and opening
   */
  private static morphologicalSkeleton(
    data: Uint8Array,
    width: number,
    height: number,
    maxIterations: number
  ): Uint8Array {
    const skeleton = new Uint8Array(width * height);
    let currentImage = new Uint8Array(data);
    
    for (let k = 0; k < maxIterations; k++) {
      // Erode the image
      const erodedImage = this.erode(currentImage, width, height);
      
      // Check if erosion resulted in empty image
      if (erodedImage.every(pixel => pixel === 0)) break;
      
      // Open the eroded image
      const openedImage = this.open(erodedImage, width, height);
      
      // Subtract opened from eroded to get skeleton subset
      for (let i = 0; i < erodedImage.length; i++) {
        const skeletonPart = erodedImage[i] - openedImage[i];
        skeleton[i] = Math.max(skeleton[i], skeletonPart);
      }
      
      currentImage = erodedImage;
    }
    
    return skeleton;
  }
  
  /**
   * Morphological erosion
   */
  private static erode(data: Uint8Array, width: number, height: number): Uint8Array {
    const result = new Uint8Array(width * height);
    
    // 3x3 structuring element
    const structElement = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],  [0, 0],  [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (data[idx] === 1) {
          let allForeground = true;
          
          for (const [dy, dx] of structElement) {
            const ny = y + dy;
            const nx = x + dx;
            const nIdx = ny * width + nx;
            
            if (data[nIdx] === 0) {
              allForeground = false;
              break;
            }
          }
          
          result[idx] = allForeground ? 1 : 0;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Morphological opening (erosion followed by dilation)
   */
  private static open(data: Uint8Array, width: number, height: number): Uint8Array {
    const eroded = this.erode(data, width, height);
    return this.dilate(eroded, width, height);
  }
  
  /**
   * Morphological dilation
   */
  private static dilate(data: Uint8Array, width: number, height: number): Uint8Array {
    const result = new Uint8Array(width * height);
    
    // 3x3 structuring element
    const structElement = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],  [0, 0],  [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        let anyForeground = false;
        
        for (const [dy, dx] of structElement) {
          const ny = y + dy;
          const nx = x + dx;
          const nIdx = ny * width + nx;
          
          if (data[nIdx] === 1) {
            anyForeground = true;
            break;
          }
        }
        
        result[idx] = anyForeground ? 1 : 0;
      }
    }
    
    return result;
  }
  
  /**
   * Preserve endpoints in skeleton
   */
  private static preserveEndpoints(
    data: Uint8Array,
    width: number,
    height: number
  ): Uint8Array {
    const result = new Uint8Array(data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (data[idx] === 1) {
          // Count 8-connected neighbors
          let neighbors = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nIdx = (y + dy) * width + (x + dx);
              neighbors += data[nIdx];
            }
          }
          
          // If only one neighbor, it's an endpoint - preserve it
          if (neighbors === 1) {
            result[idx] = 1;
          }
        }
      }
    }
    
    return result;
  }
  
  /**
   * Analyze skeleton properties
   */
  static analyzeSkeleton(data: Uint8Array, width: number, height: number): {
    totalPixels: number;
    endpoints: number;
    junctions: number;
    averageBranchLength: number;
  } {
    let totalPixels = 0;
    let endpoints = 0;
    let junctions = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (data[idx] === 1) {
          totalPixels++;
          
          // Count 8-connected neighbors
          let neighbors = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nIdx = (y + dy) * width + (x + dx);
              neighbors += data[nIdx];
            }
          }
          
          if (neighbors === 1) {
            endpoints++;
          } else if (neighbors > 2) {
            junctions++;
          }
        }
      }
    }
    
    const averageBranchLength = junctions > 0 
      ? (totalPixels - junctions) / (endpoints + junctions)
      : totalPixels / Math.max(endpoints, 1);
    
    return {
      totalPixels,
      endpoints,
      junctions,
      averageBranchLength
    };
  }
} 