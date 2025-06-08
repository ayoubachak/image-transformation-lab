/**
 * Fourier Transform Analyzer
 * Provides frequency domain analysis using Fast Fourier Transform
 */

export interface FFTResult {
  width: number;
  height: number;
  magnitudeSpectrum: Float32Array;
  phaseSpectrum: Float32Array;
  realPart: Float32Array;
  imaginaryPart: Float32Array;
  dcComponent: { real: number; imaginary: number };
  statistics: {
    maxMagnitude: number;
    minMagnitude: number;
    meanMagnitude: number;
    energyDistribution: {
      lowFreq: number;  // 0-25% of max frequency
      midFreq: number;  // 25-75% of max frequency  
      highFreq: number; // 75-100% of max frequency
    };
    dominantFrequencies: Array<{
      x: number;
      y: number;
      magnitude: number;
      frequency: number;
    }>;
  };
}

export interface FFTVisualizationOptions {
  visualizationMode: 'magnitude' | 'phase' | 'both' | 'spectrum';
  logScale: boolean;
  centerDC: boolean;
  normalize: boolean;
  colormap: 'jet' | 'hot' | 'cool' | 'gray' | 'hsv';
  filterType?: 'none' | 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  cutoffFrequency?: number;
  filterOrder?: number;
  windowFunction?: 'none' | 'hanning' | 'hamming' | 'blackman' | 'kaiser';
  showRadialProfile?: boolean;
}

export class FourierTransformAnalyzer {
  /**
   * Main analysis method - follows same pattern as HistogramAnalyzer
   */
  public analyze(imageData: ImageData, options: Partial<FFTVisualizationOptions> = {}): FFTResult {
    return this.analyzeFFT(imageData, options);
  }

  /**
   * Perform 2D FFT on grayscale image data
   */
  public analyzeFFT(imageData: ImageData, options: Partial<FFTVisualizationOptions> = {}): FFTResult {
    const { width, height, data } = imageData;
    
    // Convert to grayscale if needed
    const grayData = this.convertToGrayscale(data, width, height);
    
    // Apply windowing if specified
    const windowedData = this.applyWindowing(grayData, width, height, options.windowFunction || 'none');
    
    // Perform 2D FFT
    const fftResult = this.fft2D(windowedData, width, height);
    
    // Calculate magnitude and phase spectra
    const magnitudeSpectrum = this.calculateMagnitudeSpectrum(fftResult.real, fftResult.imaginary, width, height);
    const phaseSpectrum = this.calculatePhaseSpectrum(fftResult.real, fftResult.imaginary, width, height);
    
    // Center DC component if requested
    let centeredMagnitude = magnitudeSpectrum;
    let centeredPhase = phaseSpectrum;
    
    if (options.centerDC !== false) {
      centeredMagnitude = this.fftShift(magnitudeSpectrum, width, height);
      centeredPhase = this.fftShift(phaseSpectrum, width, height);
    }
    
    // Calculate statistics
    const statistics = this.calculateStatistics(centeredMagnitude, width, height);
    
    return {
      width,
      height,
      magnitudeSpectrum: centeredMagnitude,
      phaseSpectrum: centeredPhase,
      realPart: fftResult.real,
      imaginaryPart: fftResult.imaginary,
      dcComponent: {
        real: fftResult.real[0],
        imaginary: fftResult.imaginary[0]
      },
      statistics
    };
  }

  /**
   * Create visualization of FFT results
   */
  public createVisualization(fftResult: FFTResult, options: FFTVisualizationOptions): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const { width, height } = fftResult;
    
    switch (options.visualizationMode) {
      case 'magnitude':
        canvas.width = width;
        canvas.height = height;
        this.renderMagnitudeSpectrum(canvas, fftResult.magnitudeSpectrum, width, height, options);
        break;
      case 'phase':
        canvas.width = width;
        canvas.height = height;
        this.renderPhaseSpectrum(canvas, fftResult.phaseSpectrum, width, height, options);
        break;
      case 'both':
        canvas.width = width * 2;
        canvas.height = height;
        this.renderBothSpectra(canvas, fftResult, options);
        break;
      case 'spectrum':
        canvas.width = width;
        canvas.height = height + 100; // Extra space for radial profile
        this.renderFullSpectrum(canvas, fftResult, options);
        break;
    }
    
    return canvas;
  }

  /**
   * Convert RGBA image data to grayscale
   */
  private convertToGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
    const grayData = new Float32Array(width * height);
    
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      // Use luminance formula
      grayData[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    
    return grayData;
  }

  /**
   * Apply windowing function to reduce spectral leakage
   */
  private applyWindowing(data: Float32Array, width: number, height: number, windowType: string): Float32Array {
    if (windowType === 'none') return data;
    
    const windowed = new Float32Array(data.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        let windowValue = 1.0;
        
        switch (windowType) {
          case 'hanning':
            windowValue = this.hanningWindow(x, width) * this.hanningWindow(y, height);
            break;
          case 'hamming':
            windowValue = this.hammingWindow(x, width) * this.hammingWindow(y, height);
            break;
          case 'blackman':
            windowValue = this.blackmanWindow(x, width) * this.blackmanWindow(y, height);
            break;
          case 'kaiser':
            windowValue = this.kaiserWindow(x, width, 8.0) * this.kaiserWindow(y, height, 8.0);
            break;
        }
        
        windowed[idx] = data[idx] * windowValue;
      }
    }
    
    return windowed;
  }

  /**
   * Hanning window function
   */
  private hanningWindow(n: number, N: number): number {
    return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
  }

  /**
   * Hamming window function
   */
  private hammingWindow(n: number, N: number): number {
    return 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
  }

  /**
   * Blackman window function
   */
  private blackmanWindow(n: number, N: number): number {
    const a0 = 0.42659;
    const a1 = 0.49656;
    const a2 = 0.076849;
    return a0 - a1 * Math.cos(2 * Math.PI * n / (N - 1)) + a2 * Math.cos(4 * Math.PI * n / (N - 1));
  }

  /**
   * Kaiser window function (simplified)
   */
  private kaiserWindow(n: number, N: number, beta: number): number {
    const alpha = (N - 1) / 2;
    const arg = beta * Math.sqrt(1 - Math.pow((n - alpha) / alpha, 2));
    return this.modifiedBesselI0(arg) / this.modifiedBesselI0(beta);
  }

  /**
   * Modified Bessel function of the first kind (order 0) - approximation
   */
  private modifiedBesselI0(x: number): number {
    let sum = 1;
    let term = 1;
    const halfX = x / 2;
    
    for (let k = 1; k < 50; k++) {
      term *= (halfX * halfX) / (k * k);
      sum += term;
      if (term < 1e-12) break;
    }
    
    return sum;
  }

  /**
   * Perform 2D FFT using separable 1D FFTs
   */
  private fft2D(data: Float32Array, width: number, height: number): { real: Float32Array; imaginary: Float32Array } {
    const real = new Float32Array(width * height);
    const imaginary = new Float32Array(width * height);
    
    // Copy input data to real part
    real.set(data);
    
    // FFT along rows
    for (let y = 0; y < height; y++) {
      const rowReal = new Float32Array(width);
      const rowImag = new Float32Array(width);
      
      for (let x = 0; x < width; x++) {
        rowReal[x] = real[y * width + x];
        rowImag[x] = imaginary[y * width + x];
      }
      
      this.fft1D(rowReal, rowImag);
      
      for (let x = 0; x < width; x++) {
        real[y * width + x] = rowReal[x];
        imaginary[y * width + x] = rowImag[x];
      }
    }
    
    // FFT along columns
    for (let x = 0; x < width; x++) {
      const colReal = new Float32Array(height);
      const colImag = new Float32Array(height);
      
      for (let y = 0; y < height; y++) {
        colReal[y] = real[y * width + x];
        colImag[y] = imaginary[y * width + x];
      }
      
      this.fft1D(colReal, colImag);
      
      for (let y = 0; y < height; y++) {
        real[y * width + x] = colReal[y];
        imaginary[y * width + x] = colImag[y];
      }
    }
    
    return { real, imaginary };
  }

  /**
   * 1D FFT using Cooley-Tukey algorithm
   */
  private fft1D(real: Float32Array, imaginary: Float32Array): void {
    const N = real.length;
    
    // Bit-reversal permutation
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) {
        j ^= bit;
      }
      j ^= bit;
      
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]];
      }
    }
    
    // Cooley-Tukey FFT
    for (let len = 2; len <= N; len <<= 1) {
      const wlen = -2 * Math.PI / len;
      const wcos = Math.cos(wlen);
      const wsin = Math.sin(wlen);
      
      for (let i = 0; i < N; i += len) {
        let wreal = 1;
        let wimag = 0;
        
        for (let j = 0; j < len / 2; j++) {
          const u = real[i + j];
          const v = imaginary[i + j];
          const s = real[i + j + len / 2];
          const t = imaginary[i + j + len / 2];
          
          const prodReal = s * wreal - t * wimag;
          const prodImag = s * wimag + t * wreal;
          
          real[i + j] = u + prodReal;
          imaginary[i + j] = v + prodImag;
          real[i + j + len / 2] = u - prodReal;
          imaginary[i + j + len / 2] = v - prodImag;
          
          const nextWreal = wreal * wcos - wimag * wsin;
          const nextWimag = wreal * wsin + wimag * wcos;
          wreal = nextWreal;
          wimag = nextWimag;
        }
      }
    }
  }

  /**
   * Calculate magnitude spectrum
   */
  private calculateMagnitudeSpectrum(real: Float32Array, imaginary: Float32Array, width: number, height: number): Float32Array {
    const magnitude = new Float32Array(width * height);
    
    for (let i = 0; i < width * height; i++) {
      magnitude[i] = Math.sqrt(real[i] * real[i] + imaginary[i] * imaginary[i]);
    }
    
    return magnitude;
  }

  /**
   * Calculate phase spectrum
   */
  private calculatePhaseSpectrum(real: Float32Array, imaginary: Float32Array, width: number, height: number): Float32Array {
    const phase = new Float32Array(width * height);
    
    for (let i = 0; i < width * height; i++) {
      phase[i] = Math.atan2(imaginary[i], real[i]);
    }
    
    return phase;
  }

  /**
   * Shift zero frequency to center (fftshift)
   */
  private fftShift(data: Float32Array, width: number, height: number): Float32Array {
    const shifted = new Float32Array(data.length);
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const newY = (y + halfHeight) % height;
        const newX = (x + halfWidth) % width;
        shifted[newY * width + newX] = data[y * width + x];
      }
    }
    
    return shifted;
  }

  /**
   * Calculate statistics from magnitude spectrum
   */
  private calculateStatistics(magnitudeSpectrum: Float32Array, width: number, height: number) {
    let maxMagnitude = 0;
    let minMagnitude = Infinity;
    let sumMagnitude = 0;
    
    for (let i = 0; i < magnitudeSpectrum.length; i++) {
      const mag = magnitudeSpectrum[i];
      maxMagnitude = Math.max(maxMagnitude, mag);
      minMagnitude = Math.min(minMagnitude, mag);
      sumMagnitude += mag;
    }
    
    const meanMagnitude = sumMagnitude / magnitudeSpectrum.length;
    
    // Calculate energy distribution in frequency bands
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const maxRadius = Math.min(centerX, centerY);
    
    let lowFreqEnergy = 0, midFreqEnergy = 0, highFreqEnergy = 0;
    let lowFreqCount = 0, midFreqCount = 0, highFreqCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const normalizedRadius = radius / maxRadius;
        const mag = magnitudeSpectrum[y * width + x];
        
        if (normalizedRadius <= 0.25) {
          lowFreqEnergy += mag * mag;
          lowFreqCount++;
        } else if (normalizedRadius <= 0.75) {
          midFreqEnergy += mag * mag;
          midFreqCount++;
        } else {
          highFreqEnergy += mag * mag;
          highFreqCount++;
        }
      }
    }
    
    // Find dominant frequencies (peaks in magnitude spectrum)
    const dominantFrequencies = this.findDominantFrequencies(magnitudeSpectrum, width, height, 10);
    
    return {
      maxMagnitude,
      minMagnitude,
      meanMagnitude,
      energyDistribution: {
        lowFreq: lowFreqEnergy / Math.max(lowFreqCount, 1),
        midFreq: midFreqEnergy / Math.max(midFreqCount, 1),
        highFreq: highFreqEnergy / Math.max(highFreqCount, 1)
      },
      dominantFrequencies
    };
  }

  /**
   * Find dominant frequency components
   */
  private findDominantFrequencies(magnitudeSpectrum: Float32Array, width: number, height: number, count: number) {
    const peaks: Array<{ x: number; y: number; magnitude: number; frequency: number }> = [];
    
    // Find local maxima
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const mag = magnitudeSpectrum[idx];
        
        // Check if it's a local maximum
        let isMax = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const neighborIdx = (y + dy) * width + (x + dx);
            if (magnitudeSpectrum[neighborIdx] >= mag) {
              isMax = false;
              break;
            }
          }
          if (!isMax) break;
        }
        
        if (isMax) {
          const centerX = width / 2;
          const centerY = height / 2;
          const freqX = (x - centerX) / width;
          const freqY = (y - centerY) / height;
          const frequency = Math.sqrt(freqX * freqX + freqY * freqY);
          
          peaks.push({ x, y, magnitude: mag, frequency });
        }
      }
    }
    
    // Sort by magnitude and return top peaks
    peaks.sort((a, b) => b.magnitude - a.magnitude);
    return peaks.slice(0, count);
  }

  /**
   * Render magnitude spectrum
   */
  private renderMagnitudeSpectrum(canvas: HTMLCanvasElement, magnitudeSpectrum: Float32Array, width: number, height: number, options: FFTVisualizationOptions): void {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    
    // Find min/max for normalization
    let minVal = Infinity, maxVal = -Infinity;
    
    // Apply log scale if requested (recommended for FFT)
    const processedSpectrum = new Float32Array(magnitudeSpectrum.length);
    for (let i = 0; i < magnitudeSpectrum.length; i++) {
      if (options.logScale) {
        // Use log(1 + magnitude) to handle zero values and compress dynamic range
        processedSpectrum[i] = Math.log(1 + magnitudeSpectrum[i]);
      } else {
        processedSpectrum[i] = magnitudeSpectrum[i];
      }
      minVal = Math.min(minVal, processedSpectrum[i]);
      maxVal = Math.max(maxVal, processedSpectrum[i]);
    }
    
    // Handle edge case where all values are the same
    const range = maxVal - minVal;
    const safeRange = range > 0 ? range : 1;
    
    for (let i = 0; i < processedSpectrum.length; i++) {
      let normalizedVal;
      
      if (options.normalize) {
        // Normalize to [0, 1] range
        normalizedVal = (processedSpectrum[i] - minVal) / safeRange;
      } else {
        // Clamp to reasonable range without normalization
        normalizedVal = Math.min(1, processedSpectrum[i] / (maxVal || 1));
      }
      
      // Ensure value is in [0, 1] range for colormap
      normalizedVal = Math.max(0, Math.min(1, normalizedVal));
      
      const color = this.applyColormap(normalizedVal, options.colormap);
      const pixelIdx = i * 4;
      
      imageData.data[pixelIdx] = color.r;
      imageData.data[pixelIdx + 1] = color.g;
      imageData.data[pixelIdx + 2] = color.b;
      imageData.data[pixelIdx + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Render phase spectrum
   */
  private renderPhaseSpectrum(canvas: HTMLCanvasElement, phaseSpectrum: Float32Array, width: number, height: number, options: FFTVisualizationOptions): void {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    
    for (let i = 0; i < phaseSpectrum.length; i++) {
      // Map phase from [-π, π] to [0, 255]
      let val = ((phaseSpectrum[i] + Math.PI) / (2 * Math.PI)) * 255;
      val = Math.max(0, Math.min(255, val));
      
      const color = this.applyColormap(val / 255, options.colormap);
      const pixelIdx = i * 4;
      
      imageData.data[pixelIdx] = color.r;
      imageData.data[pixelIdx + 1] = color.g;
      imageData.data[pixelIdx + 2] = color.b;
      imageData.data[pixelIdx + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Render both magnitude and phase spectra side by side
   */
  private renderBothSpectra(canvas: HTMLCanvasElement, fftResult: FFTResult, options: FFTVisualizationOptions): void {
    const { width, height } = fftResult;
    
    // Create temporary canvases for each spectrum
    const magCanvas = document.createElement('canvas');
    magCanvas.width = width;
    magCanvas.height = height;
    this.renderMagnitudeSpectrum(magCanvas, fftResult.magnitudeSpectrum, width, height, options);
    
    const phaseCanvas = document.createElement('canvas');
    phaseCanvas.width = width;
    phaseCanvas.height = height;
    this.renderPhaseSpectrum(phaseCanvas, fftResult.phaseSpectrum, width, height, options);
    
    // Draw both on main canvas
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(magCanvas, 0, 0);
    ctx.drawImage(phaseCanvas, width, 0);
    
    // Add labels
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('Magnitude', 10, 25);
    ctx.fillText('Phase', width + 10, 25);
  }

  /**
   * Render full spectrum analysis with statistics
   */
  private renderFullSpectrum(canvas: HTMLCanvasElement, fftResult: FFTResult, options: FFTVisualizationOptions): void {
    const { width, height } = fftResult;
    const ctx = canvas.getContext('2d')!;
    
    // Render magnitude spectrum
    this.renderMagnitudeSpectrum(canvas, fftResult.magnitudeSpectrum, width, height, options);
    
    // Add statistics overlay
    if (options.showRadialProfile) {
      this.drawRadialProfile(ctx, fftResult, width, height + 50, 50);
    }
  }

  /**
   * Draw radial frequency profile
   */
  private drawRadialProfile(ctx: CanvasRenderingContext2D, fftResult: FFTResult, canvasWidth: number, startY: number, profileHeight: number): void {
    const { width, height, magnitudeSpectrum } = fftResult;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const maxRadius = Math.min(centerX, centerY);
    
    // Calculate radial profile
    const profile = new Array(maxRadius).fill(0);
    const counts = new Array(maxRadius).fill(0);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const radius = Math.floor(Math.sqrt(dx * dx + dy * dy));
        
        if (radius < maxRadius) {
          profile[radius] += magnitudeSpectrum[y * width + x];
          counts[radius]++;
        }
      }
    }
    
    // Average the profile
    for (let i = 0; i < maxRadius; i++) {
      if (counts[i] > 0) {
        profile[i] /= counts[i];
      }
    }
    
    // Draw profile
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, startY, canvasWidth, profileHeight);
    
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const maxProfileValue = Math.max(...profile);
    for (let i = 0; i < maxRadius; i++) {
      const x = (i / maxRadius) * canvasWidth;
      const y = startY + profileHeight - (profile[i] / maxProfileValue) * profileHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Add labels
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText('Radial Frequency Profile', 10, startY + 15);
  }

  /**
   * Apply colormap to normalized value [0, 1]
   */
  private applyColormap(value: number, colormap: string): { r: number; g: number; b: number } {
    value = Math.max(0, Math.min(1, value));
    
    switch (colormap) {
      case 'jet':
        return this.jetColormap(value);
      case 'hot':
        return this.hotColormap(value);
      case 'cool':
        return this.coolColormap(value);
      case 'gray':
        const gray = Math.floor(value * 255);
        return { r: gray, g: gray, b: gray };
      case 'hsv':
        return this.hsvColormap(value);
      default:
        return this.jetColormap(value);
    }
  }

  /**
   * Jet colormap
   */
  private jetColormap(value: number): { r: number; g: number; b: number } {
    const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * value - 3)));
    const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * value - 2)));
    const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * value - 1)));
    
    return {
      r: Math.floor(r * 255),
      g: Math.floor(g * 255),
      b: Math.floor(b * 255)
    };
  }

  /**
   * Hot colormap
   */
  private hotColormap(value: number): { r: number; g: number; b: number } {
    let r, g, b;
    
    if (value < 1/3) {
      r = value * 3;
      g = 0;
      b = 0;
    } else if (value < 2/3) {
      r = 1;
      g = (value - 1/3) * 3;
      b = 0;
    } else {
      r = 1;
      g = 1;
      b = (value - 2/3) * 3;
    }
    
    return {
      r: Math.floor(r * 255),
      g: Math.floor(g * 255),
      b: Math.floor(b * 255)
    };
  }

  /**
   * Cool colormap
   */
  private coolColormap(value: number): { r: number; g: number; b: number } {
    return {
      r: Math.floor(value * 255),
      g: Math.floor((1 - value) * 255),
      b: 255
    };
  }

  /**
   * HSV colormap
   */
  private hsvColormap(value: number): { r: number; g: number; b: number } {
    const hue = value * 360;
    const saturation = 1;
    const brightness = 1;
    
    const c = brightness * saturation;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = brightness - c;
    
    let r, g, b;
    
    if (hue < 60) {
      r = c; g = x; b = 0;
    } else if (hue < 120) {
      r = x; g = c; b = 0;
    } else if (hue < 180) {
      r = 0; g = c; b = x;
    } else if (hue < 240) {
      r = 0; g = x; b = c;
    } else if (hue < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    return {
      r: Math.floor((r + m) * 255),
      g: Math.floor((g + m) * 255),
      b: Math.floor((b + m) * 255)
    };
  }
}

// Export singleton instance - following same pattern as HistogramAnalyzer
export const fourierTransformAnalyzer = new FourierTransformAnalyzer(); 