/**
 * BilateralProcessor - Edge-preserving smoothing filter
 * 
 * The bilateral filter reduces noise while preserving sharp edges by considering both
 * spatial distance and intensity difference between pixels.
 */

export interface BilateralFilterOptions {
  diameter: number;           // Neighborhood diameter
  sigmaColor: number;         // Filter sigma in color space
  sigmaSpace: number;         // Filter sigma in coordinate space
  borderType: 'constant' | 'reflect' | 'replicate' | 'wrap';
  iterations: number;
  adaptiveParameters: boolean; // Auto-adjust parameters based on image analysis
}

export interface BilateralAnalysis {
  recommendedDiameter: number;
  recommendedSigmaColor: number;
  recommendedSigmaSpace: number;
  noiseLevel: number;
  edgeDensity: number;
}

export class BilateralProcessor {
  
  /**
   * Apply bilateral filtering with edge preservation
   */
  static process(imageData: ImageData, options: BilateralFilterOptions): ImageData {
    const { data, width, height } = imageData;
    
    // Auto-adjust parameters if requested
    let finalOptions = { ...options };
    if (options.adaptiveParameters) {
      const analysis = this.analyzeImage(imageData);
      finalOptions.diameter = analysis.recommendedDiameter;
      finalOptions.sigmaColor = analysis.recommendedSigmaColor;
      finalOptions.sigmaSpace = analysis.recommendedSigmaSpace;
    }
    
    let result = new ImageData(new Uint8ClampedArray(data), width, height);
    
    // Apply bilateral filter multiple times if requested
    for (let iter = 0; iter < finalOptions.iterations; iter++) {
      result = this.applySingleBilateralFilter(result, finalOptions);
    }
    
    return result;
  }
  
  /**
   * Apply a single bilateral filter pass
   */
  private static applySingleBilateralFilter(
    imageData: ImageData, 
    options: BilateralFilterOptions
  ): ImageData {
    const { data, width, height } = imageData;
    const { diameter, sigmaColor, sigmaSpace } = options;
    
    const result = new ImageData(width, height);
    const resultData = result.data;
    
    const radius = Math.floor(diameter / 2);
    const colorCoeff = -1 / (2 * sigmaColor * sigmaColor);
    const spaceCoeff = -1 / (2 * sigmaSpace * sigmaSpace);
    
    // Pre-compute spatial weights
    const spatialWeights = new Array(diameter);
    for (let i = 0; i < diameter; i++) {
      spatialWeights[i] = new Array(diameter);
      for (let j = 0; j < diameter; j++) {
        const dx = i - radius;
        const dy = j - radius;
        const spatialDist = dx * dx + dy * dy;
        spatialWeights[i][j] = Math.exp(spatialDist * spaceCoeff);
      }
    }
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerIdx = (y * width + x) * 4;
        
        // Process each color channel
        for (let c = 0; c < 3; c++) {
          const centerIntensity = data[centerIdx + c];
          let weightedSum = 0;
          let weightSum = 0;
          
          // Process neighborhood
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              
              // Handle borders
              let sampledY = ny;
              let sampledX = nx;
              
              switch (options.borderType) {
                case 'reflect':
                  sampledY = ny < 0 ? -ny : (ny >= height ? 2 * height - ny - 1 : ny);
                  sampledX = nx < 0 ? -nx : (nx >= width ? 2 * width - nx - 1 : nx);
                  break;
                case 'replicate':
                  sampledY = Math.max(0, Math.min(height - 1, ny));
                  sampledX = Math.max(0, Math.min(width - 1, nx));
                  break;
                case 'wrap':
                  sampledY = ((ny % height) + height) % height;
                  sampledX = ((nx % width) + width) % width;
                  break;
                case 'constant':
                default:
                  if (ny < 0 || ny >= height || nx < 0 || nx >= width) {
                    continue; // Skip out-of-bounds pixels
                  }
                  sampledY = ny;
                  sampledX = nx;
                  break;
              }
              
              const neighborIdx = (sampledY * width + sampledX) * 4;
              const neighborIntensity = data[neighborIdx + c];
              
              // Calculate intensity weight
              const intensityDiff = centerIntensity - neighborIntensity;
              const intensityWeight = Math.exp(intensityDiff * intensityDiff * colorCoeff);
              
              // Get spatial weight
              const spatialWeight = spatialWeights[dy + radius][dx + radius];
              
              // Combine weights
              const totalWeight = spatialWeight * intensityWeight;
              
              weightedSum += neighborIntensity * totalWeight;
              weightSum += totalWeight;
            }
          }
          
          // Avoid division by zero
          resultData[centerIdx + c] = weightSum > 0 ? 
            Math.round(weightedSum / weightSum) : data[centerIdx + c];
        }
        
        // Preserve alpha
        resultData[centerIdx + 3] = data[centerIdx + 3];
      }
    }
    
    return result;
  }
  
  /**
   * Analyze image to recommend optimal bilateral filter parameters
   */
  static analyzeImage(imageData: ImageData): BilateralAnalysis {
    const { data, width, height } = imageData;
    
    let totalVariance = 0;
    let edgePixels = 0;
    let totalGradient = 0;
    const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 50)); // Sample for performance
    
    for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
      for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
        const centerIdx = (y * width + x) * 4;
        
        // Convert to grayscale for analysis
        const centerGray = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3;
        
        // Calculate local variance
        const neighbors: number[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            const idx = (ny * width + nx) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            neighbors.push(gray);
          }
        }
        
        const mean = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
        const variance = neighbors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / neighbors.length;
        totalVariance += variance;
        
        // Calculate gradient magnitude (edge strength)
        const rightIdx = (y * width + (x + 1)) * 4;
        const bottomIdx = ((y + 1) * width + x) * 4;
        
        const rightGray = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        const bottomGray = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
        
        const gx = rightGray - centerGray;
        const gy = bottomGray - centerGray;
        const gradientMag = Math.sqrt(gx * gx + gy * gy);
        
        totalGradient += gradientMag;
        
        if (gradientMag > 20) {
          edgePixels++;
        }
      }
    }
    
    const totalSamples = Math.pow(Math.floor((Math.min(width, height) - 2 * sampleStep) / sampleStep), 2);
    const avgVariance = totalVariance / totalSamples;
    const edgeDensity = edgePixels / totalSamples;
    
    // Determine noise level
    const noiseLevel = avgVariance > 400 ? 'high' : avgVariance > 200 ? 'medium' : 'low';
    
    // Recommend parameters based on analysis
    let diameter, sigmaColor, sigmaSpace;
    
    if (noiseLevel === 'high') {
      diameter = 9;
      sigmaColor = 80;
      sigmaSpace = 80;
    } else if (noiseLevel === 'medium') {
      diameter = 7;
      sigmaColor = 50;
      sigmaSpace = 50;
    } else {
      diameter = 5;
      sigmaColor = 30;
      sigmaSpace = 30;
    }
    
    // Adjust for edge density
    if (edgeDensity > 0.3) {
      // Many edges - be more conservative
      sigmaColor *= 0.7;
      diameter = Math.max(5, diameter - 2);
    } else if (edgeDensity < 0.1) {
      // Few edges - can be more aggressive
      sigmaColor *= 1.3;
      diameter += 2;
    }
    
    return {
      recommendedDiameter: diameter,
      recommendedSigmaColor: Math.round(sigmaColor),
      recommendedSigmaSpace: Math.round(sigmaSpace),
      noiseLevel: avgVariance,
      edgeDensity: edgeDensity
    };
  }
  
  /**
   * Compare different bilateral filter settings
   */
  static compareSettings(
    imageData: ImageData, 
    settingsArray: BilateralFilterOptions[]
  ): Array<{
    settings: BilateralFilterOptions;
    result: ImageData;
    metrics: {
      edgePreservation: number;
      noiseReduction: number;
      overallScore: number;
    };
  }> {
    const originalAnalysis = this.analyzeImage(imageData);
    
    return settingsArray.map(settings => {
      const result = this.process(imageData, settings);
      const resultAnalysis = this.analyzeImage(result);
      
      // Calculate metrics
      const noiseReduction = Math.max(0, 
        (originalAnalysis.noiseLevel - resultAnalysis.noiseLevel) / originalAnalysis.noiseLevel
      );
      
      const edgePreservation = Math.max(0, 
        1 - Math.abs(originalAnalysis.edgeDensity - resultAnalysis.edgeDensity) / originalAnalysis.edgeDensity
      );
      
      const overallScore = (noiseReduction * 0.6) + (edgePreservation * 0.4);
      
      return {
        settings,
        result,
        metrics: {
          edgePreservation,
          noiseReduction,
          overallScore
        }
      };
    });
  }
} 