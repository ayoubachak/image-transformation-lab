/**
 * Remove Noise Processor
 * Implements various noise removal techniques for binary and grayscale images
 */

export interface RemoveNoiseOptions {
  noiseType: 'saltPepper' | 'impulse' | 'small-objects' | 'holes';
  kernelSize?: number;
  minSize?: number;
  connectivity?: '4' | '8';
}

export class RemoveNoiseProcessor {
  /**
   * Remove noise from image based on specified type
   */
  static process(imageData: ImageData, options: RemoveNoiseOptions): ImageData {
    switch (options.noiseType) {
      case 'saltPepper':
        return this.removeSaltPepperNoise(imageData, options.kernelSize || 3);
      
      case 'impulse':
        return this.removeImpulseNoise(imageData, options.kernelSize || 3);
      
      case 'small-objects':
        return this.removeSmallObjects(imageData, options.minSize || 10, options.connectivity || '8');
      
      case 'holes':
        return this.removeSmallHoles(imageData, options.minSize || 10, options.connectivity || '8');
      
      default:
        return imageData;
    }
  }
  
  /**
   * Remove salt and pepper noise using median filtering
   */
  private static removeSaltPepperNoise(imageData: ImageData, kernelSize: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const pixels = result.data;
    
    const radius = Math.floor(kernelSize / 2);
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const centerIdx = (y * width + x) * 4;
        
        // Process each channel separately
        for (let channel = 0; channel < 3; channel++) {
          const values: number[] = [];
          
          // Collect neighborhood values
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              const idx = (ny * width + nx) * 4 + channel;
              values.push(data[idx]);
            }
          }
          
          // Apply median filter
          values.sort((a, b) => a - b);
          pixels[centerIdx + channel] = values[Math.floor(values.length / 2)];
        }
        
        pixels[centerIdx + 3] = 255; // Alpha
      }
    }
    
    return result;
  }
  
  /**
   * Remove impulse noise using rank-order filtering
   */
  private static removeImpulseNoise(imageData: ImageData, kernelSize: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const pixels = result.data;
    
    const radius = Math.floor(kernelSize / 2);
    const threshold = 30; // Threshold for detecting impulse noise
    
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const centerIdx = (y * width + x) * 4;
        
        for (let channel = 0; channel < 3; channel++) {
          const centerValue = data[centerIdx + channel];
          const neighbors: number[] = [];
          
          // Collect neighborhood values (excluding center)
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx === 0 && dy === 0) continue; // Skip center
              
              const nx = x + dx;
              const ny = y + dy;
              const idx = (ny * width + nx) * 4 + channel;
              neighbors.push(data[idx]);
            }
          }
          
          // Calculate median of neighbors
          neighbors.sort((a, b) => a - b);
          const median = neighbors[Math.floor(neighbors.length / 2)];
          
          // If center pixel deviates significantly from median, replace it
          if (Math.abs(centerValue - median) > threshold) {
            pixels[centerIdx + channel] = median;
          } else {
            pixels[centerIdx + channel] = centerValue;
          }
        }
        
        pixels[centerIdx + 3] = 255; // Alpha
      }
    }
    
    return result;
  }
  
  /**
   * Remove small objects from binary image
   */
  private static removeSmallObjects(imageData: ImageData, minSize: number, connectivity: string): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const pixels = result.data;
    
    // Convert to binary
    const binaryData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      binaryData[i / 4] = gray > 128 ? 1 : 0;
    }
    
    // Find connected components
    const visited = new Set<number>();
    const smallObjects = new Set<number>();
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (binaryData[idx] === 1 && !visited.has(idx)) {
          const component = this.floodFill(binaryData, width, height, x, y, connectivity === '8' ? 8 : 4, visited);
          
          // Mark small components for removal
          if (component.length < minSize) {
            for (const pixelIdx of component) {
              smallObjects.add(pixelIdx);
            }
          }
        }
      }
    }
    
    // Remove small objects
    for (const idx of smallObjects) {
      binaryData[idx] = 0;
    }
    
    // Convert back to RGBA
    for (let i = 0; i < binaryData.length; i++) {
      const value = binaryData[i] * 255;
      const rgbaIdx = i * 4;
      pixels[rgbaIdx] = value;
      pixels[rgbaIdx + 1] = value;
      pixels[rgbaIdx + 2] = value;
      pixels[rgbaIdx + 3] = 255;
    }
    
    return result;
  }
  
  /**
   * Remove small holes from binary image
   */
  private static removeSmallHoles(imageData: ImageData, minSize: number, connectivity: string): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const pixels = result.data;
    
    // Convert to binary
    const binaryData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      binaryData[i / 4] = gray > 128 ? 1 : 0;
    }
    
    // Create inverted image to find holes
    const invertedData = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      invertedData[i] = binaryData[i] === 0 ? 1 : 0;
    }
    
    // Find connected components in inverted image (holes become objects)
    const visited = new Set<number>();
    const smallHoles = new Set<number>();
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (invertedData[idx] === 1 && !visited.has(idx)) {
          const component = this.floodFill(invertedData, width, height, x, y, connectivity === '8' ? 8 : 4, visited);
          
          // Check if this is a boundary component (not a true hole)
          const isBoundary = component.some(pixelIdx => {
            const px = pixelIdx % width;
            const py = Math.floor(pixelIdx / width);
            return px === 0 || px === width - 1 || py === 0 || py === height - 1;
          });
          
          // Mark small internal holes for filling
          if (!isBoundary && component.length < minSize) {
            for (const pixelIdx of component) {
              smallHoles.add(pixelIdx);
            }
          }
        }
      }
    }
    
    // Fill small holes
    for (const idx of smallHoles) {
      binaryData[idx] = 1;
    }
    
    // Convert back to RGBA
    for (let i = 0; i < binaryData.length; i++) {
      const value = binaryData[i] * 255;
      const rgbaIdx = i * 4;
      pixels[rgbaIdx] = value;
      pixels[rgbaIdx + 1] = value;
      pixels[rgbaIdx + 2] = value;
      pixels[rgbaIdx + 3] = 255;
    }
    
    return result;
  }
  
  /**
   * Flood fill algorithm for connected component analysis
   */
  private static floodFill(
    data: Uint8Array,
    width: number,
    height: number,
    startX: number,
    startY: number,
    connectivity: 4 | 8,
    visited: Set<number>
  ): number[] {
    const component: number[] = [];
    const stack: [number, number][] = [[startX, startY]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited.has(idx) || data[idx] === 0) continue;
      
      visited.add(idx);
      component.push(idx);
      
      // Add neighbors based on connectivity
      if (connectivity === 4) {
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      } else {
        stack.push(
          [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
          [x + 1, y + 1], [x + 1, y - 1], [x - 1, y + 1], [x - 1, y - 1]
        );
      }
    }
    
    return component;
  }
} 