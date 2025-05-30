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
  const sum = values.reduce(
    (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell, 0),
    0
  );
  
  // If sum is 0 or 1, no normalization needed
  if (sum === 0 || sum === 1) return values;
  
  // Normalize by dividing each value by the sum
  return values.map(row => 
    row.map(value => value / sum)
  );
};

/**
 * Creates a kernel matrix with the specified dimensions
 */
export const createKernelMatrix = (width: number, height: number, centerValue = 1, otherValue = 0): number[][] => {
  // Create matrix filled with otherValue
  const matrix = Array(height)
    .fill(0)
    .map(() => Array(width).fill(otherValue));
  
  // Set center value if dimensions are valid
  if (width > 0 && height > 0) {
    const centerRow = Math.floor(height / 2);
    const centerCol = Math.floor(width / 2);
    matrix[centerRow][centerCol] = centerValue;
  }
  
  return matrix;
};

/**
 * Returns common kernel presets
 */
export const getKernelPreset = (preset: string): { values: number[][], width: number, height: number } => {
  switch (preset) {
    case 'boxBlur':
      return {
        width: 3,
        height: 3,
        values: [
          [1/9, 1/9, 1/9],
          [1/9, 1/9, 1/9],
          [1/9, 1/9, 1/9]
        ]
      };
    case 'gaussianBlur':
      return {
        width: 3,
        height: 3,
        values: [
          [1/16, 2/16, 1/16],
          [2/16, 4/16, 2/16],
          [1/16, 2/16, 1/16]
        ]
      };
    case 'sharpen':
      return {
        width: 3,
        height: 3,
        values: [
          [0, -1, 0],
          [-1, 5, -1],
          [0, -1, 0]
        ]
      };
    case 'edgeDetect':
      return {
        width: 3,
        height: 3,
        values: [
          [-1, -1, -1],
          [-1, 8, -1],
          [-1, -1, -1]
        ]
      };
    case 'gaussianBlur5x5':
      return {
        width: 5,
        height: 5,
        values: [
          [1/256, 4/256, 6/256, 4/256, 1/256],
          [4/256, 16/256, 24/256, 16/256, 4/256],
          [6/256, 24/256, 36/256, 24/256, 6/256],
          [4/256, 16/256, 24/256, 16/256, 4/256],
          [1/256, 4/256, 6/256, 4/256, 1/256]
        ]
      };
    case 'identity':
    default:
      return {
        width: 3,
        height: 3,
        values: [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0]
        ]
      };
  }
};

/**
 * Gets kernel sum (for display purposes)
 */
export const getKernelSum = (values: number[][]): number => {
  return values.reduce(
    (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell, 0),
    0
  );
};

/**
 * Ensures kernel dimensions are odd (for better centering)
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
    const result = newValues.map(row => [...row]);
    result[centerRow][centerCol] = 1 as number;
    return result;
  }
  
  return newValues;
}; 