import type { KernelValue } from './types';

/**
 * Deep clones a kernel value to avoid reference issues
 */
export const cloneKernelValue = (kernel: KernelValue): KernelValue => {
  if (!kernel) return kernel;
  
  return {
    ...kernel,
    values: kernel.values?.map(row => [...row]) || []
  };
};

/**
 * Normalizes kernel values so they sum to 1.0
 */
export const normalizeKernelValues = (values: number[][]): number[][] => {
  // Calculate sum of all values
  const sum = getKernelSum(values);
  
  // Handle special cases
  if (sum === 0) {
    // Cannot normalize an all-zero kernel
    return values.map(row => [...row]);
  }
  
  if (sum === 1) {
    // Already normalized
    return values.map(row => [...row]);
  }
  
  // Create new array with normalized values
  return values.map(row => 
    row.map(value => value / sum)
  );
};

/**
 * Creates a kernel matrix with the specified dimensions
 */
export const createKernelMatrix = (width: number, height: number, centerValue = 1, otherValue = 0): number[][] => {
  // Create matrix filled with otherValue
  const matrix: number[][] = [];
  for (let i = 0; i < height; i++) {
    const row: number[] = [];
    for (let j = 0; j < width; j++) {
      row.push(otherValue);
    }
    matrix.push(row);
  }
  
  // Set center value if dimensions are valid
  if (width > 0 && height > 0) {
    const centerRow = Math.floor(height / 2);
    const centerCol = Math.floor(width / 2);
    matrix[centerRow][centerCol] = centerValue;
  }
  
  return matrix;
};

/**
 * Get a kernel preset by name.
 * Creates kernels that work with various sizes
 */
export const getKernelPreset = (preset: string): { values: number[][], width: number, height: number } => {
  switch (preset) {
    case 'identity': {
      const size = 3;
      const values = createKernelMatrix(size, size, 1, 0);
      return { values, width: size, height: size };
    }
      
    case 'boxBlur': {
      const size = 3;
      const value = 1 / (size * size);
      const values = Array(size).fill(0).map(() => Array(size).fill(value));
      return { values, width: size, height: size };
    }
      
    case 'boxBlur5x5': {
      const size = 5;
      const value = 1 / (size * size);
      const values = Array(size).fill(0).map(() => Array(size).fill(value));
      return { values, width: size, height: size };
    }
      
    case 'gaussianBlur': {
      // 3x3 Gaussian kernel
      const values = [
        [1/16, 2/16, 1/16],
        [2/16, 4/16, 2/16],
        [1/16, 2/16, 1/16]
      ];
      return { values, width: 3, height: 3 };
    }
      
    case 'gaussianBlur5x5': {
      // 5x5 Gaussian kernel
      const values = [
        [1/256, 4/256, 6/256, 4/256, 1/256],
        [4/256, 16/256, 24/256, 16/256, 4/256],
        [6/256, 24/256, 36/256, 24/256, 6/256],
        [4/256, 16/256, 24/256, 16/256, 4/256],
        [1/256, 4/256, 6/256, 4/256, 1/256]
      ];
      return { values, width: 5, height: 5 };
    }
      
    case 'sharpen': {
      const values = [
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
      ];
      return { values, width: 3, height: 3 };
    }
    
    case 'sharpen5x5': {
      const values = [
        [-1/8, -1/8, -1/8, -1/8, -1/8],
        [-1/8, 2/8, 2/8, 2/8, -1/8],
        [-1/8, 2/8, 1, 2/8, -1/8],
        [-1/8, 2/8, 2/8, 2/8, -1/8],
        [-1/8, -1/8, -1/8, -1/8, -1/8]
      ];
      return { values, width: 5, height: 5 };
    }
      
    case 'unsharpMask': {
      const values = [
        [1/25, 1/25, 1/25, 1/25, 1/25],
        [1/25, 1/25, 1/25, 1/25, 1/25],
        [1/25, 1/25, -24/25, 1/25, 1/25],
        [1/25, 1/25, 1/25, 1/25, 1/25],
        [1/25, 1/25, 1/25, 1/25, 1/25]
      ];
      return { values, width: 5, height: 5 };
    }
      
    case 'edgeDetect': {
      const values = [
        [-1, -1, -1],
        [-1, 8, -1],
        [-1, -1, -1]
      ];
      return { values, width: 3, height: 3 };
    }
      
    case 'sobelHorizontal': {
      const values = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1]
      ];
      return { values, width: 3, height: 3 };
    }
      
    case 'sobelVertical': {
      const values = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]
      ];
      return { values, width: 3, height: 3 };
    }
      
    case 'emboss': {
      const values = [
        [-2, -1, 0],
        [-1, 1, 1],
        [0, 1, 2]
      ];
      return { values, width: 3, height: 3 };
    }
      
    case 'motionBlur': {
      const values = [
        [1/9, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1/9, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1/9, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1/9, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1/9, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1/9, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1/9, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1/9, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1/9]
      ];
      return { values, width: 9, height: 9 };
    }
      
    case 'highPass': {
      const values = [
        [0, -1, 0],
        [-1, 4, -1],
        [0, -1, 0]
      ];
      return { values, width: 3, height: 3 };
    }
    
    // Adding specialized kernels for larger sizes
    case 'laplacian5x5': {
      const values = [
        [-1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1],
        [-1, -1, 24, -1, -1],
        [-1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1]
      ];
      return { values, width: 5, height: 5 };
    }
      
    case 'circularBlur': {
      // Circular pattern blur (works well for defocus simulation)
      const values = createCircularKernel(5);
      return { values, width: 5, height: 5 };
    }
    
    case 'circularBlur7x7': {
      // Larger circular blur
      const values = createCircularKernel(7);
      return { values, width: 7, height: 7 };
    }
      
    default: {
      // Default to identity
      const values = [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0]
      ];
      return { values, width: 3, height: 3 };
    }
  }
};

/**
 * Calculate the sum of all values in a kernel
 */
export const getKernelSum = (values: number[][]): number => {
  return values.reduce(
    (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell, 0),
    0
  );
};

/**
 * Ensure dimensions are odd (required for proper convolution)
 */
export const ensureOddDimensions = (width: number, height: number): { width: number, height: number } => {
  return {
    width: width % 2 === 0 ? width + 1 : width,
    height: height % 2 === 0 ? height + 1 : height
  };
};

/**
 * Resize a kernel matrix, preserving the center values when possible
 */
export const resizeKernelMatrix = (
  values: number[][], 
  newWidth: number, 
  newHeight: number
): number[][] => {
  // Ensure dimensions are odd
  const { width, height } = ensureOddDimensions(newWidth, newHeight);
  
  // Create new values array with flexible number type
  const newValues: number[][] = [];
  for (let i = 0; i < height; i++) {
    newValues.push(Array(width).fill(0));
  }
  
  // Calculate centers
  const centerRow = Math.floor(height / 2);
  const centerCol = Math.floor(width / 2);
  const oldCenterRow = Math.floor(values.length / 2);
  const oldCenterCol = Math.floor((values[0] || []).length / 2);
  
  // Copy existing values where possible, centered in the new kernel
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      // Calculate corresponding position in old kernel (centered)
      const oldR = r - centerRow + oldCenterRow;
      const oldC = c - centerCol + oldCenterCol;
      
      // Copy values if they exist in the old kernel
      if (oldR >= 0 && oldR < values.length && 
          oldC >= 0 && oldC < (values[oldR] || []).length) {
        newValues[r][c] = values[oldR][oldC];
      }
    }
  }
  
  // If new kernel is all zeros, set the center to 1
  const isAllZeros = newValues.every(row => row.every(cell => cell === 0));
  if (isAllZeros && centerRow < newValues.length && centerCol < newValues[centerRow].length) {
    // Create completely new matrix with 1 in center to avoid type issues
    const result = newValues.map((row: number[]) => [...row]);
    result[centerRow][centerCol] = 1;
    return result;
  }
  
  return newValues;
};

/**
 * Creates a circular kernel for specialized blur operations
 */
export const createCircularKernel = (size: number): number[][] => {
  // Ensure size is odd
  const adjustedSize = size % 2 === 0 ? size + 1 : size;
  
  // Create matrix filled with zeros
  const kernel: number[][] = [];
  for (let i = 0; i < adjustedSize; i++) {
    kernel.push(Array(adjustedSize).fill(0));
  }
  
  // Calculate center and radius
  const center = Math.floor(adjustedSize / 2);
  const radius = center;
  
  // Count how many cells we'll fill (for normalization)
  let cellCount = 0;
  
  // Fill circle
  for (let y = 0; y < adjustedSize; y++) {
    for (let x = 0; x < adjustedSize; x++) {
      // Calculate distance from center
      const distance = Math.sqrt(Math.pow(y - center, 2) + Math.pow(x - center, 2));
      
      // If distance <= radius, include in circle
      if (distance <= radius) {
        kernel[y][x] = 1;
        cellCount++;
      }
    }
  }
  
  // Normalize so sum = 1
  if (cellCount > 0) {
    const value = 1 / cellCount;
    for (let y = 0; y < adjustedSize; y++) {
      for (let x = 0; x < adjustedSize; x++) {
        if (kernel[y][x] === 1) {
          kernel[y][x] = value;
        }
      }
    }
  }
  
  return kernel;
};

/**
 * Creates a Gaussian kernel of specified size
 * @param size The size of the kernel (will be adjusted to odd)
 * @param sigma The standard deviation of the Gaussian distribution
 */
export const createGaussianKernel = (size: number, sigma = 1): number[][] => {
  // Ensure size is odd
  const adjustedSize = size % 2 === 0 ? size + 1 : size;
  
  // Create matrix filled with zeros
  const kernel: number[][] = [];
  for (let i = 0; i < adjustedSize; i++) {
    kernel.push(Array(adjustedSize).fill(0));
  }
  
  // Calculate center
  const center = Math.floor(adjustedSize / 2);
  
  // Accumulate sum for normalization
  let sum = 0;
  
  // Fill with Gaussian values
  for (let y = 0; y < adjustedSize; y++) {
    for (let x = 0; x < adjustedSize; x++) {
      // Calculate 2D Gaussian function value
      const exponent = -((Math.pow(x - center, 2) + Math.pow(y - center, 2)) / (2 * sigma * sigma));
      const value = Math.exp(exponent) / (2 * Math.PI * sigma * sigma);
      
      kernel[y][x] = value;
      sum += value;
    }
  }
  
  // Normalize so sum = 1
  if (sum > 0) {
    for (let y = 0; y < adjustedSize; y++) {
      for (let x = 0; x < adjustedSize; x++) {
        kernel[y][x] /= sum;
      }
    }
  }
  
  return kernel;
};

/**
 * Inverts all values in a kernel
 */
export const invertKernel = (kernel: number[][]): number[][] => {
  return kernel.map(row => row.map(value => -value));
};

/**
 * Creates a sharpening kernel for any size
 */
export const createSharpeningKernel = (size: number): number[][] => {
  // Ensure size is odd
  const adjustedSize = size % 2 === 0 ? size + 1 : size;
  
  // Create matrix filled with negative values
  const kernel: number[][] = [];
  for (let i = 0; i < adjustedSize; i++) {
    kernel.push(Array(adjustedSize).fill(-1 / (adjustedSize * adjustedSize)));
  }
  
  // Calculate center
  const center = Math.floor(adjustedSize / 2);
  
  // Set center value to create sharpening effect
  // The center value needs to be larger to create the sharpening effect
  // For a standard sharpening kernel, center = 2 - (all other values summed)
  const centerValue = 2 + (adjustedSize * adjustedSize - 1) / (adjustedSize * adjustedSize);
  kernel[center][center] = centerValue;
  
  return kernel;
};

/**
 * Apply emphasis to center of kernel for any size
 */
export const emphasizeKernelCenter = (kernel: number[][], factor = 2): number[][] => {
  // Deep clone the kernel
  const result = kernel.map(row => [...row]);
  
  if (result.length === 0) return result;
  
  // Calculate center
  const centerRow = Math.floor(result.length / 2);
  const centerCol = Math.floor(result[0].length / 2);
  
  // Emphasize center value
  if (centerRow < result.length && centerCol < result[centerRow].length) {
    result[centerRow][centerCol] *= factor;
  }
  
  return result;
};

/**
 * Create a smooth falloff kernel (gaussian-like) for any size
 */
export const createSmoothKernel = (size: number): number[][] => {
  return createGaussianKernel(size, size / 6);
}; 