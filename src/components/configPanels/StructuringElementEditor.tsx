import React, { useState, useEffect, useRef } from 'react';
import type { StructuringElement, StructuringElementShape } from '../../utils/types';

interface StructuringElementEditorProps {
  value: StructuringElement;
  onChange: (element: StructuringElement) => void;
  maxSize?: number;
}

const StructuringElementEditor: React.FC<StructuringElementEditorProps> = ({
  value,
  onChange,
  maxSize = 31
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [customMatrix, setCustomMatrix] = useState<number[][]>(() => {
    // Ensure we have a valid matrix with the correct dimensions
    if (value.matrix && value.matrix.length === value.height && 
        value.matrix[0] && value.matrix[0].length === value.width) {
      return value.matrix;
    } else {
      // Create a new matrix with the correct dimensions
      return Array(value.height).fill(0).map(() => Array(value.width).fill(0));
    }
  });

  // Initialize with default values if needed
  useEffect(() => {
    if (!value.matrix && value.shape === 'custom') {
      // Create a default matrix if not provided
      const newMatrix = Array(value.height).fill(0).map(() => Array(value.width).fill(0));
      // Set center pixel to 1
      const centerY = Math.floor(value.height / 2);
      const centerX = Math.floor(value.width / 2);
      newMatrix[centerY][centerX] = 1;
      
      setCustomMatrix(newMatrix);
      onChange({
        ...value,
        matrix: newMatrix
      });
    } else if (value.matrix) {
      // If we have a matrix but dimensions don't match, create a new one with correct dimensions
      if (value.matrix.length !== value.height || value.matrix[0]?.length !== value.width) {
        const newMatrix = Array(value.height).fill(0).map(() => Array(value.width).fill(0));
        
        // Copy values from the old matrix where possible
        for (let y = 0; y < Math.min(value.height, value.matrix.length); y++) {
          for (let x = 0; x < Math.min(value.width, value.matrix[y]?.length || 0); x++) {
            newMatrix[y][x] = value.matrix[y][x];
          }
        }
        
        setCustomMatrix(newMatrix);
        onChange({
          ...value,
          matrix: newMatrix
        });
      } else {
        setCustomMatrix(value.matrix);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.shape, value.width, value.height, value.matrix]);

  // Update canvas when shape or dimensions change
  useEffect(() => {
    renderCanvas();
  }, [value, customMatrix]);

  // Render the structuring element on canvas
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = Math.floor(canvas.width / Math.max(value.width, value.height));
    const offsetX = Math.floor((canvas.width - cellSize * value.width) / 2);
    const offsetY = Math.floor((canvas.height - cellSize * value.height) / 2);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    for (let i = 0; i <= value.width; i++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + i * cellSize, offsetY);
      ctx.lineTo(offsetX + i * cellSize, offsetY + value.height * cellSize);
      ctx.stroke();
    }

    for (let i = 0; i <= value.height; i++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * cellSize);
      ctx.lineTo(offsetX + value.width * cellSize, offsetY + i * cellSize);
      ctx.stroke();
    }

    // Draw the structuring element
    if (value.shape === 'custom' && customMatrix) {
      // Draw custom matrix
      for (let y = 0; y < value.height; y++) {
        // Ensure row exists
        if (!customMatrix[y]) continue;
        
        for (let x = 0; x < value.width; x++) {
          // Ensure column exists before checking value
          if (customMatrix[y][x] === 1) {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(
              offsetX + x * cellSize + 1,
              offsetY + y * cellSize + 1,
              cellSize - 2,
              cellSize - 2
            );
          }
        }
      }
    } else {
      drawShapePreview(ctx, offsetX, offsetY, cellSize);
    }
  };

  // Draw preview of built-in shapes
  const drawShapePreview = (
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    cellSize: number
  ) => {
    const centerX = offsetX + (value.width * cellSize) / 2;
    const centerY = offsetY + (value.height * cellSize) / 2;
    const width = value.width * cellSize;
    const height = value.height * cellSize;

    ctx.fillStyle = '#3b82f6';

    switch (value.shape) {
      case 'rect':
        ctx.fillRect(
          offsetX + 1,
          offsetY + 1,
          width - 2,
          height - 2
        );
        break;

      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(
          centerX,
          centerY,
          width / 2 - 2,
          height / 2 - 2,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
        break;

      case 'cross':
        const crossWidth = Math.ceil(value.width / 3);
        const crossHeight = Math.ceil(value.height / 3);
        
        // Horizontal bar
        ctx.fillRect(
          offsetX + 1,
          offsetY + (value.height - crossHeight) / 2 * cellSize + 1,
          width - 2,
          crossHeight * cellSize - 2
        );
        
        // Vertical bar
        ctx.fillRect(
          offsetX + (value.width - crossWidth) / 2 * cellSize + 1,
          offsetY + 1,
          crossWidth * cellSize - 2,
          height - 2
        );
        break;

      case 'circle':
        const radius = value.radius || Math.min(value.width, value.height) / 2;
        ctx.beginPath();
        ctx.arc(
          centerX,
          centerY,
          radius * cellSize - 2,
          0,
          2 * Math.PI
        );
        ctx.fill();
        break;

      case 'square':
        const squareSize = Math.min(value.width, value.height);
        ctx.fillRect(
          centerX - (squareSize * cellSize) / 2 + 1,
          centerY - (squareSize * cellSize) / 2 + 1,
          squareSize * cellSize - 2,
          squareSize * cellSize - 2
        );
        break;

      case 'stick':
        const angle = value.angle || 0;
        const length = value.length || Math.min(value.width, value.height);
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.fillRect(
          -length * cellSize / 2 + 1,
          -cellSize / 2 + 1,
          length * cellSize - 2,
          cellSize - 2
        );
        ctx.restore();
        break;

      case 'bipoint':
        const p1 = value.point1 || { x: Math.floor(value.width / 4), y: Math.floor(value.height / 4) };
        const p2 = value.point2 || { x: Math.floor(value.width * 3 / 4), y: Math.floor(value.height * 3 / 4) };
        
        // Draw points
        ctx.beginPath();
        ctx.arc(
          offsetX + p1.x * cellSize + cellSize / 2,
          offsetY + p1.y * cellSize + cellSize / 2,
          cellSize / 2 - 1,
          0,
          2 * Math.PI
        );
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(
          offsetX + p2.x * cellSize + cellSize / 2,
          offsetY + p2.y * cellSize + cellSize / 2,
          cellSize / 2 - 1,
          0,
          2 * Math.PI
        );
        ctx.fill();
        
        // Draw line connecting points
        ctx.beginPath();
        ctx.lineWidth = cellSize / 2;
        ctx.strokeStyle = '#3b82f6';
        ctx.moveTo(
          offsetX + p1.x * cellSize + cellSize / 2,
          offsetY + p1.y * cellSize + cellSize / 2
        );
        ctx.lineTo(
          offsetX + p2.x * cellSize + cellSize / 2,
          offsetY + p2.y * cellSize + cellSize / 2
        );
        ctx.stroke();
        break;
    }
  };

  // Handle canvas mouse interactions for custom drawing
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (value.shape !== 'custom') return;
    setIsDrawing(true);
    updateCustomMatrix(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || value.shape !== 'custom') return;
    updateCustomMatrix(e);
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  // Update matrix based on mouse position
  const updateCustomMatrix = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellSize = Math.floor(canvas.width / Math.max(value.width, value.height));
    const offsetX = Math.floor((canvas.width - cellSize * value.width) / 2);
    const offsetY = Math.floor((canvas.height - cellSize * value.height) / 2);

    // Calculate grid cell
    const gridX = Math.floor((x - offsetX) / cellSize);
    const gridY = Math.floor((y - offsetY) / cellSize);

    // Check if within bounds
    if (
      gridX >= 0 &&
      gridX < value.width &&
      gridY >= 0 &&
      gridY < value.height
    ) {
      // Ensure the matrix is initialized properly
      if (!customMatrix || customMatrix.length !== value.height) {
        console.error('Custom matrix has incorrect dimensions, reinitializing');
        const newMatrix = Array(value.height).fill(0).map(() => Array(value.width).fill(0));
        setCustomMatrix(newMatrix);
        onChange({
          ...value,
          matrix: newMatrix
        });
        return;
      }
      
      // Ensure row exists
      if (!customMatrix[gridY]) {
        console.error('Row does not exist in custom matrix, reinitializing row');
        const newMatrix = [...customMatrix];
        newMatrix[gridY] = Array(value.width).fill(0);
        setCustomMatrix(newMatrix);
        onChange({
          ...value,
          matrix: newMatrix
        });
        return;
      }

      // Toggle cell value (1 -> 0, 0 -> 1)
      const newMatrix = [...customMatrix];
      newMatrix[gridY][gridX] = newMatrix[gridY][gridX] === 1 ? 0 : 1;
      setCustomMatrix(newMatrix);

      // Update parent component
      onChange({
        ...value,
        matrix: newMatrix
      });
    }
  };

  // Handle shape change
  const handleShapeChange = (shape: StructuringElementShape) => {
    let updatedElement: StructuringElement = {
      ...value,
      shape
    };

    // Set shape-specific default values
    switch (shape) {
      case 'stick':
        updatedElement.angle = 0;
        updatedElement.length = Math.min(value.width, value.height);
        break;
      case 'bipoint':
        updatedElement.point1 = { x: Math.floor(value.width / 4), y: Math.floor(value.height / 4) };
        updatedElement.point2 = { x: Math.floor(value.width * 3 / 4), y: Math.floor(value.height * 3 / 4) };
        break;
      case 'circle':
        updatedElement.radius = Math.min(value.width, value.height) / 2;
        break;
      case 'custom':
        // Create a new matrix with a single center pixel set
        const newMatrix = Array(value.height).fill(0).map(() => Array(value.width).fill(0));
        const centerY = Math.floor(value.height / 2);
        const centerX = Math.floor(value.width / 2);
        newMatrix[centerY][centerX] = 1;
        updatedElement.matrix = newMatrix;
        break;
    }

    onChange(updatedElement);
  };

  // Handle dimension changes
  const handleDimensionChange = (dimension: 'width' | 'height', newValue: number) => {
    if (newValue < 1 || newValue > maxSize) return;

    // Ensure dimensions are odd for most morphological operations
    const adjustedValue = newValue % 2 === 0 ? newValue + 1 : newValue;
    
    let updatedElement: StructuringElement = {
      ...value,
      [dimension]: adjustedValue
    };

    // If shape is custom, we need to resize the matrix
    if (value.shape === 'custom') {
      const oldMatrix = value.matrix || customMatrix;
      const newWidth = dimension === 'width' ? adjustedValue : value.width;
      const newHeight = dimension === 'height' ? adjustedValue : value.height;
      
      // Create a new matrix with the new dimensions
      const newMatrix = Array(newHeight).fill(0).map(() => Array(newWidth).fill(0));
      
      // Copy values from the old matrix where possible
      for (let y = 0; y < Math.min(newHeight, oldMatrix.length); y++) {
        for (let x = 0; x < Math.min(newWidth, oldMatrix[y].length); x++) {
          newMatrix[y][x] = oldMatrix[y][x];
        }
      }
      
      updatedElement.matrix = newMatrix;
    }

    onChange(updatedElement);
  };

  // Handle changes to specific parameters
  const handleParamChange = (paramName: string, paramValue: number) => {
    onChange({
      ...value,
      [paramName]: paramValue
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Shape Type</h3>
        <select
          value={value.shape}
          onChange={(e) => handleShapeChange(e.target.value as StructuringElementShape)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="rect">Rectangle</option>
          <option value="ellipse">Ellipse</option>
          <option value="cross">Cross</option>
          <option value="circle">Circle</option>
          <option value="square">Square</option>
          <option value="stick">Stick</option>
          <option value="bipoint">Bi-point</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Dimensions</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width</label>
            <input
              type="number"
              min="1"
              max={maxSize}
              value={value.width}
              onChange={(e) => handleDimensionChange('width', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height</label>
            <input
              type="number"
              min="1"
              max={maxSize}
              value={value.height}
              onChange={(e) => handleDimensionChange('height', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Recommended to use odd dimensions for morphological operations.
        </p>
      </div>

      {/* Shape-specific parameters */}
      {value.shape === 'stick' && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Stick Parameters</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Angle (°)</label>
              <input
                type="number"
                min="0"
                max="359"
                value={value.angle || 0}
                onChange={(e) => handleParamChange('angle', parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Length</label>
              <input
                type="number"
                min="1"
                max={Math.max(value.width, value.height)}
                value={value.length || Math.min(value.width, value.height)}
                onChange={(e) => handleParamChange('length', parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {value.shape === 'bipoint' && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Bi-point Parameters</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Point 1 X</label>
              <input
                type="number"
                min="0"
                max={value.width - 1}
                value={value.point1?.x || 0}
                onChange={(e) => {
                  const point1 = { ...(value.point1 || { x: 0, y: 0 }), x: parseInt(e.target.value) };
                  onChange({ ...value, point1 });
                }}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Point 1 Y</label>
              <input
                type="number"
                min="0"
                max={value.height - 1}
                value={value.point1?.y || 0}
                onChange={(e) => {
                  const point1 = { ...(value.point1 || { x: 0, y: 0 }), y: parseInt(e.target.value) };
                  onChange({ ...value, point1 });
                }}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Point 2 X</label>
              <input
                type="number"
                min="0"
                max={value.width - 1}
                value={value.point2?.x || 0}
                onChange={(e) => {
                  const point2 = { ...(value.point2 || { x: 0, y: 0 }), x: parseInt(e.target.value) };
                  onChange({ ...value, point2 });
                }}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Point 2 Y</label>
              <input
                type="number"
                min="0"
                max={value.height - 1}
                value={value.point2?.y || 0}
                onChange={(e) => {
                  const point2 = { ...(value.point2 || { x: 0, y: 0 }), y: parseInt(e.target.value) };
                  onChange({ ...value, point2 });
                }}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {value.shape === 'circle' && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Circle Parameters</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Radius</label>
            <input
              type="number"
              min="1"
              max={Math.min(value.width, value.height) / 2}
              value={value.radius || Math.min(value.width, value.height) / 2}
              onChange={(e) => handleParamChange('radius', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Preview canvas */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
        <div className="border border-gray-200 rounded-md bg-white p-2 flex justify-center">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className={`border border-gray-300 rounded ${value.shape === 'custom' ? 'cursor-pointer' : ''}`}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>
        {value.shape === 'custom' && (
          <p className="text-xs text-gray-500 mt-1">
            Click on cells to toggle them on/off and create a custom shape.
          </p>
        )}
      </div>
    </div>
  );
};

export default StructuringElementEditor; 