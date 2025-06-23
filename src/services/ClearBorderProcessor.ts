/**
 * Clear Border Processor
 * Removes objects touching image boundaries in binary images
 */

export interface ClearBorderOptions {
  connectivity: '4' | '8';
  borderWidth: number;
}

export class ClearBorderProcessor {
  /**
   * Remove objects touching image borders
   */
  static process(imageData: ImageData, options: ClearBorderOptions): ImageData {
    const { data, width, height } = imageData;
    const connectivity = parseInt(options.connectivity) as 4 | 8;
    
    // Create working copy
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const pixels = result.data;
    
    // Convert to binary
    const binaryData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      binaryData[i / 4] = gray > 128 ? 1 : 0;
    }
    
    // Find and mark border-connected components
    const visited = new Set<number>();
    const borderComponents = new Set<number>();
    
    // Check all border pixels
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        // Check if pixel is within border width of edges
        const isBorderRegion = 
          x < options.borderWidth || 
          x >= width - options.borderWidth || 
          y < options.borderWidth || 
          y >= height - options.borderWidth;
        
        if (isBorderRegion) {
          const idx = y * width + x;
          
          if (binaryData[idx] === 1 && !visited.has(idx)) {
            // Find connected component starting from this border pixel
            const component = this.floodFill(binaryData, width, height, x, y, connectivity, visited);
            
            // Mark all pixels in this component for removal
            for (const pixelIdx of component) {
              borderComponents.add(pixelIdx);
            }
          }
        }
      }
    }
    
    // Clear border-connected pixels
    for (const idx of borderComponents) {
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
   * Flood fill to find connected component
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
      
      // Add neighbors
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