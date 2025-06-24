/**
 * MedianProcessor - Advanced median filtering for noise reduction and image smoothing
 * 
 * Provides multiple median filtering modes:
 * - Standard: Traditional median filter for general noise reduction
 * - Adaptive: Adaptive median filter for impulse noise
 * - Cross-shaped: Cross-shaped kernel for preserving edges
 * - Selective: Only apply median where needed (edge-preserving)
 */

export interface MedianFilterOptions {
  kernelSize: number;
  method: 'standard' | 'adaptive' | 'cross-shaped' | 'selective';
  preserveEdges: boolean;
  edgeThreshold: number;
  iterations: number;
  adaptiveWindowMax: number; // For adaptive method
  selectiveThreshold: number; // For selective method
}

export interface MedianFilterResult {
  imageData: ImageData;
  noiseRemoved: number;
  edgesPreserved: number;
  processingTime: number;
}

export class MedianProcessor {
  
  /**
   * Apply median filtering with the specified options
   */
  static process(imageData: ImageData, options: MedianFilterOptions): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);
    const resultData = result.data;
    
    // Copy original data as starting point
    resultData.set(data);
    
    // Pre-compute edge map if edge preservation is enabled
    let edgeMap: boolean[][] | null = null;
    if (options.preserveEdges) {
      edgeMap = this.computeEdgeMap(data, width, height, options.edgeThreshold);
    }
    
    // Apply median filtering based on method
    switch (options.method) {
      case 'standard':
        this.applyStandardMedian(resultData, width, height, options, edgeMap);
        break;
      case 'adaptive':
        this.applyAdaptiveMedian(resultData, width, height, options, edgeMap);
        break;
      case 'cross-shaped':
        this.applyCrossShapedMedian(resultData, width, height, options, edgeMap);
        break;
      case 'selective':
        this.applySelectiveMedian(resultData, width, height, options, edgeMap);
        break;
    }
    
    // Apply multiple iterations if specified
    for (let iter = 1; iter < options.iterations; iter++) {
      // Recompute edge map for additional iterations if needed
      if (options.preserveEdges && iter > 1) {
        edgeMap = this.computeEdgeMap(resultData, width, height, options.edgeThreshold);
      }
      
      switch (options.method) {
        case 'standard':
          this.applyStandardMedian(resultData, width, height, options, edgeMap);
          break;
        case 'adaptive':
          this.applyAdaptiveMedian(resultData, width, height, options, edgeMap);
          break;
        case 'cross-shaped':
          this.applyCrossShapedMedian(resultData, width, height, options, edgeMap);
          break;
        case 'selective':
          this.applySelectiveMedian(resultData, width, height, options, edgeMap);
          break;
      }
    }
    
    return result;
  }
  
  /**
   * Compute edge map for edge preservation
   */
  private static computeEdgeMap(
    data: Uint8ClampedArray, 
    width: number, 
    height: number, 
    edgeThreshold: number
  ): boolean[][] {
    const edgeMap: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Calculate gradient using Sobel-like operator
        const topIdx = ((y - 1) * width + x) * 4;
        const bottomIdx = ((y + 1) * width + x) * 4;
        const leftIdx = (y * width + (x - 1)) * 4;
        const rightIdx = (y * width + (x + 1)) * 4;
        
        const topGray = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3;
        const bottomGray = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
        const leftGray = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
        const rightGray = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        
        // Gradient magnitude
        const gx = rightGray - leftGray;
        const gy = bottomGray - topGray;
        const gradientMag = Math.sqrt(gx * gx + gy * gy);
        
        edgeMap[y][x] = gradientMag > edgeThreshold;
      }
    }
    
    return edgeMap;
  }
  
  /**
   * Standard median filter - traditional square kernel
   */
  private static applyStandardMedian(
    data: Uint8ClampedArray, 
    width: number, 
    height: number, 
    options: MedianFilterOptions,
    edgeMap: boolean[][] | null = null
  ): void {
    const { kernelSize } = options;
    const radius = Math.floor(kernelSize / 2);
    const originalData = new Uint8ClampedArray(data);
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        // Skip edge pixels if edge preservation is enabled
        if (edgeMap && edgeMap[y][x]) {
          continue;
        }
        
        const centerIdx = (y * width + x) * 4;
        
        // Process each color channel
        for (let c = 0; c < 3; c++) {
          const neighbors: number[] = [];
          
          // Collect neighborhood values
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              const idx = (ny * width + nx) * 4 + c;
              neighbors.push(originalData[idx]);
            }
          }
          
          // Sort and find median
          neighbors.sort((a, b) => a - b);
          const median = neighbors[Math.floor(neighbors.length / 2)];
          
          data[centerIdx + c] = median;
        }
        
        // Preserve alpha
        data[centerIdx + 3] = originalData[centerIdx + 3];
      }
    }
  }
  
  /**
   * Adaptive median filter - adjusts window size based on noise level
   */
  private static applyAdaptiveMedian(
    data: Uint8ClampedArray, 
    width: number, 
    height: number, 
    options: MedianFilterOptions,
    edgeMap: boolean[][] | null = null
  ): void {
    const { kernelSize, adaptiveWindowMax } = options;
    const originalData = new Uint8ClampedArray(data);
    
    for (let y = Math.floor(adaptiveWindowMax / 2); y < height - Math.floor(adaptiveWindowMax / 2); y++) {
      for (let x = Math.floor(adaptiveWindowMax / 2); x < width - Math.floor(adaptiveWindowMax / 2); x++) {
        // Skip edge pixels if edge preservation is enabled
        if (edgeMap && edgeMap[y] && edgeMap[y][x]) {
          continue;
        }
        
        const centerIdx = (y * width + x) * 4;
        
        // Process each color channel
        for (let c = 0; c < 3; c++) {
          const centerValue = originalData[centerIdx + c];
          let currentWindowSize = kernelSize;
          let median = centerValue;
          let zmin, zmax, zmed;
          
          // Stage A & B of adaptive median algorithm
          while (currentWindowSize <= adaptiveWindowMax) {
            const radius = Math.floor(currentWindowSize / 2);
            const neighbors: number[] = [];
            
            // Collect neighborhood values
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                  const idx = (ny * width + nx) * 4 + c;
                  neighbors.push(originalData[idx]);
                }
              }
            }
            
            neighbors.sort((a, b) => a - b);
            zmin = neighbors[0];
            zmax = neighbors[neighbors.length - 1];
            zmed = neighbors[Math.floor(neighbors.length / 2)];
            
            // Stage A
            const A1 = zmed - zmin;
            const A2 = zmed - zmax;
            
            if (A1 > 0 && A2 < 0) {
              // Stage B
              const B1 = centerValue - zmin;
              const B2 = centerValue - zmax;
              
              if (B1 > 0 && B2 < 0) {
                median = centerValue;
              } else {
                median = zmed;
              }
              break;
            } else {
              currentWindowSize += 2;
            }
          }
          
          data[centerIdx + c] = median;
        }
        
        // Preserve alpha
        data[centerIdx + 3] = originalData[centerIdx + 3];
      }
    }
  }
  
  /**
   * Cross-shaped median filter - better edge preservation
   */
  private static applyCrossShapedMedian(
    data: Uint8ClampedArray, 
    width: number, 
    height: number, 
    options: MedianFilterOptions,
    edgeMap: boolean[][] | null = null
  ): void {
    const { kernelSize } = options;
    const radius = Math.floor(kernelSize / 2);
    const originalData = new Uint8ClampedArray(data);
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        // Skip edge pixels if edge preservation is enabled
        if (edgeMap && edgeMap[y][x]) {
          continue;
        }
        
        const centerIdx = (y * width + x) * 4;
        
        // Process each color channel
        for (let c = 0; c < 3; c++) {
          const neighbors: number[] = [];
          
          // Collect cross-shaped neighborhood
          // Horizontal line
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const idx = (y * width + nx) * 4 + c;
            neighbors.push(originalData[idx]);
          }
          
          // Vertical line
          for (let dy = -radius; dy <= radius; dy++) {
            if (dy !== 0) { // Don't double-count center
              const ny = y + dy;
              const idx = (ny * width + x) * 4 + c;
              neighbors.push(originalData[idx]);
            }
          }
          
          // Sort and find median
          neighbors.sort((a, b) => a - b);
          const median = neighbors[Math.floor(neighbors.length / 2)];
          
          data[centerIdx + c] = median;
        }
        
        // Preserve alpha
        data[centerIdx + 3] = originalData[centerIdx + 3];
      }
    }
  }
  
  /**
   * Selective median filter - only apply where noise is detected
   */
  private static applySelectiveMedian(
    data: Uint8ClampedArray, 
    width: number, 
    height: number, 
    options: MedianFilterOptions,
    edgeMap: boolean[][] | null = null
  ): void {
    const { kernelSize, selectiveThreshold } = options;
    const radius = Math.floor(kernelSize / 2);
    const originalData = new Uint8ClampedArray(data);
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const centerIdx = (y * width + x) * 4;
        
        // Process each color channel
        for (let c = 0; c < 3; c++) {
          const centerValue = originalData[centerIdx + c];
          const neighbors: number[] = [];
          
          // Collect neighborhood values
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              const idx = (ny * width + nx) * 4 + c;
              neighbors.push(originalData[idx]);
            }
          }
          
          // Calculate variance to detect noise
          const mean = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
          const variance = neighbors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / neighbors.length;
          
          // Apply edge preservation logic
          const isEdgePixel = edgeMap && edgeMap[y][x];
          const shouldPreserveEdge = isEdgePixel && options.preserveEdges;
          
          // Only apply median if variance is high (indicating noise) AND not preserving edges
          if (variance > selectiveThreshold && !shouldPreserveEdge) {
            neighbors.sort((a, b) => a - b);
            const median = neighbors[Math.floor(neighbors.length / 2)];
            data[centerIdx + c] = median;
          } else {
            data[centerIdx + c] = centerValue;
          }
        }
        
        // Preserve alpha
        data[centerIdx + 3] = originalData[centerIdx + 3];
      }
    }
  }
  
  /**
   * Analyze the effectiveness of median filtering
   */
  static analyzeNoise(imageData: ImageData, kernelSize: number = 3): {
    noisyPixels: number;
    noiseVariance: number;
    recommendedMethod: 'standard' | 'adaptive' | 'cross-shaped' | 'selective';
  } {
    const { data, width, height } = imageData;
    const radius = Math.floor(kernelSize / 2);
    let noisyPixels = 0;
    let totalVariance = 0;
    let edgePixels = 0;
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const centerIdx = (y * width + x) * 4;
        
        // Analyze grayscale values
        const centerGray = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3;
        const neighbors: number[] = [];
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            const idx = (ny * width + nx) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            neighbors.push(gray);
          }
        }
        
        // Calculate local variance
        const mean = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
        const variance = neighbors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / neighbors.length;
        totalVariance += variance;
        
        // Check for noise (high deviation from neighbors)
        neighbors.sort((a, b) => a - b);
        const median = neighbors[Math.floor(neighbors.length / 2)];
        if (Math.abs(centerGray - median) > 30) {
          noisyPixels++;
        }
        
        // Check for edges (high gradient)
        const maxVal = Math.max(...neighbors);
        const minVal = Math.min(...neighbors);
        if (maxVal - minVal > 50) {
          edgePixels++;
        }
      }
    }
    
    const totalPixels = (width - 2 * radius) * (height - 2 * radius);
    const noiseRatio = noisyPixels / totalPixels;
    const edgeRatio = edgePixels / totalPixels;
    const avgVariance = totalVariance / totalPixels;
    
    // Recommend method based on analysis
    let recommendedMethod: 'standard' | 'adaptive' | 'cross-shaped' | 'selective';
    
    if (noiseRatio > 0.1) {
      recommendedMethod = 'adaptive'; // High noise
    } else if (edgeRatio > 0.2) {
      recommendedMethod = 'cross-shaped'; // Many edges
    } else if (avgVariance < 200) {
      recommendedMethod = 'selective'; // Low noise
    } else {
      recommendedMethod = 'standard'; // General case
    }
    
    return {
      noisyPixels,
      noiseVariance: avgVariance,
      recommendedMethod
    };
  }
} 