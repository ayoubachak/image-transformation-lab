export interface EdgeDensityData {
  densityMap: Float32Array;
  regionCenters: Array<{ x: number; y: number; density: number; strength: number }>;
  width: number;
  height: number;
  regionSize: number;
  statistics: {
    meanDensity: number;
    maxDensity: number;
    minDensity: number;
    variance: number;
    distribution: number[];
    hotspots: Array<{ x: number; y: number; density: number }>;
  };
}

export interface EdgeDetectionStrategy {
  detectEdges(imageData: ImageData, params?: any): ImageData;
  getName(): string;
}

/**
 * Canny edge detection strategy
 */
export class CannyEdgeStrategy implements EdgeDetectionStrategy {
  detectEdges(imageData: ImageData, params: { lowThreshold: number; highThreshold: number } = { lowThreshold: 50, highThreshold: 150 }): ImageData {
    const { width, height, data } = imageData;
    const { lowThreshold, highThreshold } = params;

    // Convert to grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Apply Gaussian blur
    const blurred = this.gaussianBlur(gray, width, height, 1.4);

    // Calculate gradients
    const { gx, gy, magnitude } = this.calculateGradients(blurred, width, height);

    // Non-maximum suppression
    const suppressed = this.nonMaximumSuppression(magnitude, gx, gy, width, height);

    // Double thresholding and edge tracking
    const edges = this.doubleThreshold(suppressed, width, height, lowThreshold, highThreshold);

    // Convert back to ImageData
    const result = new ImageData(width, height);
    for (let i = 0; i < edges.length; i++) {
      const idx = i * 4;
      const value = edges[i] * 255;
      result.data[idx] = value;
      result.data[idx + 1] = value;
      result.data[idx + 2] = value;
      result.data[idx + 3] = 255;
    }

    return result;
  }

  private gaussianBlur(image: Float32Array, width: number, height: number, sigma: number): Float32Array {
    const result = new Float32Array(width * height);
    const kernel = this.createGaussianKernel(sigma);
    const radius = Math.floor(kernel.length / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.max(0, Math.min(width - 1, x + kx));
            const py = Math.max(0, Math.min(height - 1, y + ky));
            const weight = kernel[ky + radius][kx + radius];
            
            sum += image[py * width + px] * weight;
            weightSum += weight;
          }
        }

        result[y * width + x] = sum / weightSum;
      }
    }

    return result;
  }

  private createGaussianKernel(sigma: number): number[][] {
    const size = Math.ceil(sigma * 3) * 2 + 1;
    const kernel: number[][] = [];
    const center = Math.floor(size / 2);

    for (let y = 0; y < size; y++) {
      kernel[y] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        kernel[y][x] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      }
    }

    return kernel;
  }

  private calculateGradients(image: Float32Array, width: number, height: number): {
    gx: Float32Array;
    gy: Float32Array;
    magnitude: Float32Array;
  } {
    const gx = new Float32Array(width * height);
    const gy = new Float32Array(width * height);
    const magnitude = new Float32Array(width * height);

    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sumX = 0;
        let sumY = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            
            sumX += image[pixelIdx] * sobelX[kernelIdx];
            sumY += image[pixelIdx] * sobelY[kernelIdx];
          }
        }

        const idx = y * width + x;
        gx[idx] = sumX;
        gy[idx] = sumY;
        magnitude[idx] = Math.sqrt(sumX * sumX + sumY * sumY);
      }
    }

    return { gx, gy, magnitude };
  }

  private nonMaximumSuppression(
    magnitude: Float32Array,
    gx: Float32Array,
    gy: Float32Array,
    width: number,
    height: number
  ): Float32Array {
    const result = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const mag = magnitude[idx];
        
        if (mag === 0) continue;

        // Calculate gradient direction
        const angle = Math.atan2(gy[idx], gx[idx]) * 180 / Math.PI;
        const normalizedAngle = ((angle % 180) + 180) % 180;

        let neighbor1, neighbor2;

        if (normalizedAngle < 22.5 || normalizedAngle >= 157.5) {
          // Horizontal edge
          neighbor1 = magnitude[y * width + (x - 1)];
          neighbor2 = magnitude[y * width + (x + 1)];
        } else if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
          // Diagonal edge (/)
          neighbor1 = magnitude[(y - 1) * width + (x + 1)];
          neighbor2 = magnitude[(y + 1) * width + (x - 1)];
        } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
          // Vertical edge
          neighbor1 = magnitude[(y - 1) * width + x];
          neighbor2 = magnitude[(y + 1) * width + x];
        } else {
          // Diagonal edge (\)
          neighbor1 = magnitude[(y - 1) * width + (x - 1)];
          neighbor2 = magnitude[(y + 1) * width + (x + 1)];
        }

        if (mag >= neighbor1 && mag >= neighbor2) {
          result[idx] = mag;
        }
      }
    }

    return result;
  }

  private doubleThreshold(
    magnitude: Float32Array,
    width: number,
    height: number,
    lowThreshold: number,
    highThreshold: number
  ): Float32Array {
    const result = new Float32Array(width * height);
    const strongEdges = new Set<number>();
    const weakEdges = new Set<number>();

    // Apply thresholds
    for (let i = 0; i < magnitude.length; i++) {
      if (magnitude[i] >= highThreshold) {
        result[i] = 1;
        strongEdges.add(i);
      } else if (magnitude[i] >= lowThreshold) {
        result[i] = 0.5;
        weakEdges.add(i);
      }
    }

    // Edge tracking by hysteresis
    const visited = new Set<number>();
    const stack: number[] = Array.from(strongEdges);

    while (stack.length > 0) {
      const idx = stack.pop()!;
      if (visited.has(idx)) continue;
      visited.add(idx);

      const y = Math.floor(idx / width);
      const x = idx % width;

      // Check 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dy === 0 && dx === 0) continue;
          
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const neighborIdx = ny * width + nx;
            
            if (weakEdges.has(neighborIdx) && !visited.has(neighborIdx)) {
              result[neighborIdx] = 1;
              stack.push(neighborIdx);
            }
          }
        }
      }
    }

    // Remove weak edges that weren't connected to strong edges
    for (const idx of weakEdges) {
      if (result[idx] === 0.5) {
        result[idx] = 0;
      }
    }

    return result;
  }

  getName(): string {
    return 'Canny';
  }
}

/**
 * Sobel edge detection strategy
 */
export class SobelEdgeStrategy implements EdgeDetectionStrategy {
  detectEdges(imageData: ImageData, params: { threshold: number } = { threshold: 100 }): ImageData {
    const { width, height, data } = imageData;
    const { threshold } = params;

    // Convert to grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    const magnitude = new Float32Array(width * height);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sumX = 0;
        let sumY = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            
            sumX += gray[pixelIdx] * sobelX[kernelIdx];
            sumY += gray[pixelIdx] * sobelY[kernelIdx];
          }
        }

        magnitude[y * width + x] = Math.sqrt(sumX * sumX + sumY * sumY);
      }
    }

    // Apply threshold
    const result = new ImageData(width, height);
    for (let i = 0; i < magnitude.length; i++) {
      const idx = i * 4;
      const value = magnitude[i] > threshold ? 255 : 0;
      result.data[idx] = value;
      result.data[idx + 1] = value;
      result.data[idx + 2] = value;
      result.data[idx + 3] = 255;
    }

    return result;
  }

  getName(): string {
    return 'Sobel';
  }
}

/**
 * Edge Density Analyzer
 */
export class EdgeDensityAnalyzer {
  private strategy: EdgeDetectionStrategy;

  constructor(strategy: EdgeDetectionStrategy) {
    this.strategy = strategy;
  }

  /**
   * Analyze edge density in regions
   */
  public analyzeEdgeDensity(
    imageData: ImageData,
    options: {
      regionSize?: number;
      overlapRatio?: number;
      edgeParams?: any;
      heatmapMode?: 'density' | 'strength' | 'direction';
    } = {}
  ): EdgeDensityData {
    const {
      regionSize = 32,
      overlapRatio = 0.5,
      edgeParams = {},
      heatmapMode = 'density'
    } = options;

    const { width, height } = imageData;

    // Detect edges
    const edgeImage = this.strategy.detectEdges(imageData, edgeParams);

    // Calculate region step size
    const step = Math.round(regionSize * (1 - overlapRatio));
    const gridWidth = Math.ceil((width - regionSize) / step) + 1;
    const gridHeight = Math.ceil((height - regionSize) / step) + 1;

    // Analyze each region
    const regionCenters: Array<{ x: number; y: number; density: number; strength: number }> = [];
    const densityMap = new Float32Array(gridWidth * gridHeight);

    for (let gy = 0; gy < gridHeight; gy++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        const startX = Math.min(gx * step, width - regionSize);
        const startY = Math.min(gy * step, height - regionSize);
        const endX = Math.min(startX + regionSize, width);
        const endY = Math.min(startY + regionSize, height);

        const { density, strength } = this.analyzeRegion(
          edgeImage,
          startX,
          startY,
          endX,
          endY,
          heatmapMode
        );

        const centerX = startX + (endX - startX) / 2;
        const centerY = startY + (endY - startY) / 2;

        regionCenters.push({ x: centerX, y: centerY, density, strength });
        densityMap[gy * gridWidth + gx] = density;
      }
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(densityMap, regionCenters);

    return {
      densityMap,
      regionCenters,
      width: gridWidth,
      height: gridHeight,
      regionSize,
      statistics
    };
  }

  /**
   * Analyze a single region
   */
  private analyzeRegion(
    edgeImage: ImageData,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    mode: 'density' | 'strength' | 'direction'
  ): { density: number; strength: number } {
    const { width, data } = edgeImage;
    let edgePixels = 0;
    let totalStrength = 0;
    let totalPixels = 0;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = (y * width + x) * 4;
        const edgeValue = data[idx]; // Red channel (grayscale)
        
        totalPixels++;
        
        if (edgeValue > 0) {
          edgePixels++;
          totalStrength += edgeValue;
        }
      }
    }

    const density = totalPixels > 0 ? edgePixels / totalPixels : 0;
    const averageStrength = edgePixels > 0 ? totalStrength / edgePixels : 0;

    switch (mode) {
      case 'density':
        return { density, strength: averageStrength };
      case 'strength':
        return { density: averageStrength / 255, strength: averageStrength };
      case 'direction':
        // For direction mode, we'd need to analyze gradient directions
        // For now, return density
        return { density, strength: averageStrength };
      default:
        return { density, strength: averageStrength };
    }
  }

  /**
   * Calculate statistical measures
   */
  private calculateStatistics(
    densityMap: Float32Array,
    regionCenters: Array<{ x: number; y: number; density: number; strength: number }>
  ): EdgeDensityData['statistics'] {
    const nonZeroValues = Array.from(densityMap).filter(v => v > 0);
    
    if (nonZeroValues.length === 0) {
      return {
        meanDensity: 0,
        maxDensity: 0,
        minDensity: 0,
        variance: 0,
        distribution: [],
        hotspots: []
      };
    }

    const meanDensity = nonZeroValues.reduce((sum, val) => sum + val, 0) / nonZeroValues.length;
    const maxDensity = Math.max(...nonZeroValues);
    const minDensity = Math.min(...nonZeroValues);
    
    const variance = nonZeroValues.reduce((sum, val) => sum + Math.pow(val - meanDensity, 2), 0) / nonZeroValues.length;

    // Create distribution histogram
    const numBins = 20;
    const binSize = maxDensity / numBins;
    const distribution = new Array(numBins).fill(0);
    
    nonZeroValues.forEach(value => {
      const bin = Math.min(Math.floor(value / binSize), numBins - 1);
      distribution[bin]++;
    });

    // Find hotspots (top 10% of regions by density)
    const sortedRegions = [...regionCenters]
      .filter(r => r.density > 0)
      .sort((a, b) => b.density - a.density);
    
    const hotspotCount = Math.max(1, Math.floor(sortedRegions.length * 0.1));
    const hotspots = sortedRegions.slice(0, hotspotCount).map(r => ({
      x: r.x,
      y: r.y,
      density: r.density
    }));

    return {
      meanDensity,
      maxDensity,
      minDensity,
      variance,
      distribution,
      hotspots
    };
  }

  /**
   * Create visualization heatmap
   */
  public createVisualization(
    densityData: EdgeDensityData,
    options: {
      colormap?: string;
      interpolation?: boolean;
      showHotspots?: boolean;
    } = {}
  ): HTMLCanvasElement {
    const {
      colormap = 'hot',
      interpolation = true,
      showHotspots = true
    } = options;

    const { densityMap, width, height, statistics } = densityData;
    const canvas = document.createElement('canvas');
    canvas.width = width * 10; // Scale up for visibility
    canvas.height = height * 10;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    // Scale factor for visualization
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const gridX = Math.floor(x / scaleX);
        const gridY = Math.floor(y / scaleY);
        const density = densityMap[gridY * width + gridX];
        
        const normalizedDensity = statistics.maxDensity > 0 ? density / statistics.maxDensity : 0;
        const color = this.applyColormap(normalizedDensity, colormap);
        
        const idx = (y * canvas.width + x) * 4;
        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = density > 0 ? 255 : 50; // Semi-transparent for zero density
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw hotspots if enabled
    if (showHotspots) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '12px Arial';

      statistics.hotspots.forEach((hotspot, index) => {
        const x = (hotspot.x / width) * canvas.width;
        const y = (hotspot.y / height) * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.fillText(`${index + 1}`, x + 10, y - 10);
      });
    }

    return canvas;
  }

  /**
   * Apply colormap to normalized value
   */
  private applyColormap(value: number, colormap: string): { r: number, g: number, b: number } {
    value = Math.max(0, Math.min(1, value));

    switch (colormap) {
      case 'hot':
        return this.hotColormap(value);
      case 'jet':
        return this.jetColormap(value);
      case 'cool':
        return this.coolColormap(value);
      default:
        return this.hotColormap(value);
    }
  }

  private hotColormap(value: number): { r: number, g: number, b: number } {
    const r = value < 0.33 ? value * 3 : 1;
    const g = value < 0.33 ? 0 : value < 0.66 ? (value - 0.33) * 3 : 1;
    const b = value < 0.66 ? 0 : (value - 0.66) * 3;
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  private jetColormap(value: number): { r: number, g: number, b: number } {
    const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * value - 3)));
    const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * value - 2)));
    const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * value - 1)));
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  private coolColormap(value: number): { r: number, g: number, b: number } {
    return {
      r: Math.round((1 - value) * 255),
      g: Math.round(value * 255),
      b: 255
    };
  }
}

/**
 * Factory for creating edge detection strategies
 */
export class EdgeDetectionStrategyFactory {
  static create(method: string): EdgeDetectionStrategy {
    switch (method.toLowerCase()) {
      case 'canny':
        return new CannyEdgeStrategy();
      case 'sobel':
        return new SobelEdgeStrategy();
      default:
        return new CannyEdgeStrategy();
    }
  }
} 