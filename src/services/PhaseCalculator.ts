import type { GradientResult, GradientStrategy } from './ModuleCalculator';

export interface PhaseData {
  phaseMap: Float32Array;
  magnitudeMap: Float32Array;
  width: number;
  height: number;
  angleUnit: 'degrees' | 'radians';
  statistics: {
    dominantDirections: Array<{
      angle: number;
      percentage: number;
      strength: number;
    }>;
    coherence: number;
    averagePhase: number;
    phaseDistribution: number[];
  };
}

export interface DirectionVector {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
}

/**
 * Phase Calculator for analyzing gradient directions/orientations
 */
export class PhaseCalculator {
  private strategy: GradientStrategy;

  constructor(strategy: GradientStrategy) {
    this.strategy = strategy;
  }

  /**
   * Calculate phase/direction analysis
   */
  public calculatePhase(
    imageData: ImageData,
    options: {
      angleUnit?: 'degrees' | 'radians';
      magnitudeThreshold?: number;
      smoothing?: boolean;
      generateStatistics?: boolean;
    } = {}
  ): PhaseData {
    const {
      angleUnit = 'degrees',
      magnitudeThreshold = 10,
      smoothing = false,
      generateStatistics = true
    } = options;

    // Calculate gradients
    const gradientResult = this.strategy.calculateGradients(imageData);
    const { gx, gy, magnitude, width, height } = gradientResult;

    // Calculate phase angles
    const phaseMap = new Float32Array(width * height);
    const filteredMagnitude = new Float32Array(width * height);

    for (let i = 0; i < gx.length; i++) {
      if (magnitude[i] >= magnitudeThreshold) {
        let angle = Math.atan2(gy[i], gx[i]);
        
        // Convert to desired unit
        if (angleUnit === 'degrees') {
          angle = (angle * 180) / Math.PI;
          // Normalize to [0, 360)
          angle = angle < 0 ? angle + 360 : angle;
        } else {
          // Normalize to [0, 2π)
          angle = angle < 0 ? angle + 2 * Math.PI : angle;
        }
        
        phaseMap[i] = angle;
        filteredMagnitude[i] = magnitude[i];
      } else {
        phaseMap[i] = 0;
        filteredMagnitude[i] = 0;
      }
    }

    // Apply smoothing if requested
    if (smoothing) {
      this.smoothPhaseMap(phaseMap, filteredMagnitude, width, height);
    }

    // Generate statistics
    let statistics = {
      dominantDirections: [],
      coherence: 0,
      averagePhase: 0,
      phaseDistribution: []
    } as PhaseData['statistics'];

    if (generateStatistics) {
      statistics = this.generatePhaseStatistics(
        phaseMap, 
        filteredMagnitude, 
        angleUnit
      );
    }

    return {
      phaseMap,
      magnitudeMap: filteredMagnitude,
      width,
      height,
      angleUnit,
      statistics
    };
  }

  /**
   * Generate statistical analysis of phase data
   */
  private generatePhaseStatistics(
    phaseMap: Float32Array,
    magnitudeMap: Float32Array,
    angleUnit: 'degrees' | 'radians'
  ): PhaseData['statistics'] {
    const maxAngle = angleUnit === 'degrees' ? 360 : 2 * Math.PI;
    const numBins = 36; // 10-degree bins for degrees, equivalent for radians
    const binSize = maxAngle / numBins;
    
    const phaseDistribution = new Array(numBins).fill(0);
    const weightedAngles: number[] = [];
    const magnitudes: number[] = [];

    // Build weighted histogram
    for (let i = 0; i < phaseMap.length; i++) {
      if (magnitudeMap[i] > 0) {
        const bin = Math.floor(phaseMap[i] / binSize) % numBins;
        phaseDistribution[bin] += magnitudeMap[i];
        weightedAngles.push(phaseMap[i]);
        magnitudes.push(magnitudeMap[i]);
      }
    }

    // Find dominant directions
    const dominantDirections = this.findDominantDirections(
      phaseDistribution, 
      binSize, 
      angleUnit
    );

    // Calculate coherence (how aligned the gradients are)
    const coherence = this.calculateCoherence(weightedAngles, magnitudes, angleUnit);

    // Calculate average phase (circular mean)
    const averagePhase = this.calculateCircularMean(weightedAngles, magnitudes, angleUnit);

    return {
      dominantDirections,
      coherence,
      averagePhase,
      phaseDistribution
    };
  }

  /**
   * Find dominant directions in the phase distribution
   */
  private findDominantDirections(
    distribution: number[], 
    binSize: number, 
    angleUnit: 'degrees' | 'radians'
  ): Array<{ angle: number; percentage: number; strength: number }> {
    const totalWeight = distribution.reduce((sum, val) => sum + val, 0);
    
    if (totalWeight === 0) return [];

    const directions: Array<{ angle: number; percentage: number; strength: number }> = [];

    // Find peaks in the distribution
    for (let i = 0; i < distribution.length; i++) {
      const current = distribution[i];
      const prev = distribution[(i - 1 + distribution.length) % distribution.length];
      const next = distribution[(i + 1) % distribution.length];

      // Check if this is a local maximum
      if (current > prev && current > next && current > totalWeight * 0.05) {
        const angle = i * binSize + binSize / 2; // Center of bin
        const percentage = (current / totalWeight) * 100;
        const strength = current;

        directions.push({ angle, percentage, strength });
      }
    }

    // Sort by strength and return top 3
    return directions
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3);
  }

  /**
   * Calculate coherence (alignment) of gradients
   */
  private calculateCoherence(
    angles: number[], 
    magnitudes: number[], 
    angleUnit: 'degrees' | 'radians'
  ): number {
    if (angles.length === 0) return 0;

    // Convert to complex exponentials for coherence calculation
    let sumReal = 0;
    let sumImag = 0;
    let totalMagnitude = 0;

    for (let i = 0; i < angles.length; i++) {
      const angleRad = angleUnit === 'degrees' ? (angles[i] * Math.PI) / 180 : angles[i];
      const weight = magnitudes[i];
      
      sumReal += weight * Math.cos(angleRad);
      sumImag += weight * Math.sin(angleRad);
      totalMagnitude += weight;
    }

    if (totalMagnitude === 0) return 0;

    // Coherence is the magnitude of the average complex vector
    const coherence = Math.sqrt(sumReal * sumReal + sumImag * sumImag) / totalMagnitude;
    return coherence;
  }

  /**
   * Calculate circular mean of angles
   */
  private calculateCircularMean(
    angles: number[], 
    magnitudes: number[], 
    angleUnit: 'degrees' | 'radians'
  ): number {
    if (angles.length === 0) return 0;

    let sumReal = 0;
    let sumImag = 0;
    let totalWeight = 0;

    for (let i = 0; i < angles.length; i++) {
      const angleRad = angleUnit === 'degrees' ? (angles[i] * Math.PI) / 180 : angles[i];
      const weight = magnitudes[i];
      
      sumReal += weight * Math.cos(angleRad);
      sumImag += weight * Math.sin(angleRad);
      totalWeight += weight;
    }

    if (totalWeight === 0) return 0;

    const meanAngleRad = Math.atan2(sumImag, sumReal);
    let meanAngle = angleUnit === 'degrees' ? (meanAngleRad * 180) / Math.PI : meanAngleRad;
    
    // Normalize to positive range
    if (angleUnit === 'degrees') {
      meanAngle = meanAngle < 0 ? meanAngle + 360 : meanAngle;
    } else {
      meanAngle = meanAngle < 0 ? meanAngle + 2 * Math.PI : meanAngle;
    }

    return meanAngle;
  }

  /**
   * Apply smoothing to phase map
   */
  private smoothPhaseMap(
    phaseMap: Float32Array, 
    magnitudeMap: Float32Array, 
    width: number, 
    height: number
  ): void {
    const smoothedPhase = new Float32Array(phaseMap.length);
    const kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ];
    const kernelSum = 16;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = y * width + x;
        
        if (magnitudeMap[centerIdx] > 0) {
          let sumReal = 0;
          let sumImag = 0;
          let totalWeight = 0;

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = (y + ky) * width + (x + kx);
              if (magnitudeMap[idx] > 0) {
                const weight = kernel[ky + 1][kx + 1];
                const angleRad = (phaseMap[idx] * Math.PI) / 180; // Assume degrees
                
                sumReal += weight * Math.cos(angleRad);
                sumImag += weight * Math.sin(angleRad);
                totalWeight += weight;
              }
            }
          }

          if (totalWeight > 0) {
            const smoothedAngleRad = Math.atan2(sumImag, sumReal);
            let smoothedAngle = (smoothedAngleRad * 180) / Math.PI;
            smoothedAngle = smoothedAngle < 0 ? smoothedAngle + 360 : smoothedAngle;
            smoothedPhase[centerIdx] = smoothedAngle;
          } else {
            smoothedPhase[centerIdx] = phaseMap[centerIdx];
          }
        }
      }
    }

    // Copy smoothed values back
    for (let i = 0; i < phaseMap.length; i++) {
      if (magnitudeMap[i] > 0) {
        phaseMap[i] = smoothedPhase[i];
      }
    }
  }

  /**
   * Create phase visualization with HSV coloring
   */
  public createVisualization(
    phaseData: PhaseData,
    options: {
      showColorwheel?: boolean;
      overlayMode?: 'color' | 'arrows' | 'both';
      arrowDensity?: number;
      saturation?: number;
      brightness?: number;
    } = {}
  ): HTMLCanvasElement {
    const {
      showColorwheel = false,
      overlayMode = 'color',
      arrowDensity = 20,
      saturation = 0.8,
      brightness = 0.9
    } = options;

    const { phaseMap, magnitudeMap, width, height, angleUnit } = phaseData;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    if (overlayMode === 'color' || overlayMode === 'both') {
      this.renderColorPhase(ctx, phaseMap, magnitudeMap, width, height, angleUnit, saturation, brightness);
    }

    if (overlayMode === 'arrows' || overlayMode === 'both') {
      this.renderArrows(ctx, phaseMap, magnitudeMap, width, height, angleUnit, arrowDensity);
    }

    return canvas;
  }

  /**
   * Render phase as color using HSV mapping
   */
  private renderColorPhase(
    ctx: CanvasRenderingContext2D,
    phaseMap: Float32Array,
    magnitudeMap: Float32Array,
    width: number,
    height: number,
    angleUnit: 'degrees' | 'radians',
    saturation: number,
    brightness: number
  ): void {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const maxAngle = angleUnit === 'degrees' ? 360 : 2 * Math.PI;

    for (let i = 0; i < phaseMap.length; i++) {
      if (magnitudeMap[i] > 0) {
        // Map angle to hue (0-360 degrees)
        const hue = (phaseMap[i] / maxAngle) * 360;
        const rgb = this.hsvToRgb(hue, saturation, brightness);
        
        const idx = i * 4;
        data[idx] = rgb.r;
        data[idx + 1] = rgb.g;
        data[idx + 2] = rgb.b;
        data[idx + 3] = Math.min(255, magnitudeMap[i] * 2); // Alpha based on magnitude
      } else {
        const idx = i * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Render direction arrows
   */
  private renderArrows(
    ctx: CanvasRenderingContext2D,
    phaseMap: Float32Array,
    magnitudeMap: Float32Array,
    width: number,
    height: number,
    angleUnit: 'degrees' | 'radians',
    density: number
  ): void {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    const step = Math.max(1, Math.floor(Math.min(width, height) / density));

    for (let y = step; y < height - step; y += step) {
      for (let x = step; x < width - step; x += step) {
        const idx = y * width + x;
        
        if (magnitudeMap[idx] > 0) {
          let angle = phaseMap[idx];
          if (angleUnit === 'degrees') {
            angle = (angle * Math.PI) / 180;
          }

          const length = Math.min(step * 0.8, magnitudeMap[idx] / 10);
          const dx = Math.cos(angle) * length;
          const dy = Math.sin(angle) * length;

          // Draw arrow
          ctx.beginPath();
          ctx.moveTo(x - dx/2, y - dy/2);
          ctx.lineTo(x + dx/2, y + dy/2);
          ctx.stroke();

          // Draw arrowhead
          const headLength = length * 0.3;
          const headAngle = 0.5;
          
          ctx.beginPath();
          ctx.moveTo(x + dx/2, y + dy/2);
          ctx.lineTo(
            x + dx/2 - headLength * Math.cos(angle - headAngle),
            y + dy/2 - headLength * Math.sin(angle - headAngle)
          );
          ctx.moveTo(x + dx/2, y + dy/2);
          ctx.lineTo(
            x + dx/2 - headLength * Math.cos(angle + headAngle),
            y + dy/2 - headLength * Math.sin(angle + headAngle)
          );
          ctx.stroke();
        }
      }
    }
  }

  /**
   * Convert HSV to RGB
   */
  private hsvToRgb(h: number, s: number, v: number): { r: number, g: number, b: number } {
    h = h % 360;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }
} 