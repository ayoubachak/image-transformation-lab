import React, { useRef, useEffect, useState } from 'react';
import type { HistogramData } from '../../utils/types';

interface HistogramChartProps {
  data: HistogramData;
  width?: number;
  height?: number;
  showStatistics?: boolean;
  interactive?: boolean;
}

export default function HistogramChart({ 
  data, 
  width = 400, 
  height = 300, 
  showStatistics = false,
  interactive = true 
}: HistogramChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    drawHistogram();
  }, [data, width, height, hoveredBin]);

  const drawHistogram = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set up drawing parameters
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Draw background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Draw chart background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padding, padding, chartWidth, chartHeight);

    // Draw border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, chartWidth, chartHeight);

    switch (data.imageType) {
      case 'rgb':
        drawRGBHistogram(ctx, padding, chartWidth, chartHeight);
        break;
      case 'grayscale':
        drawGrayscaleHistogram(ctx, padding, chartWidth, chartHeight);
        break;
      case 'binary':
        drawBinaryHistogram(ctx, padding, chartWidth, chartHeight);
        break;
    }

    // Draw axes
    drawAxes(ctx, padding, chartWidth, chartHeight);
  };

  const drawRGBHistogram = (ctx: CanvasRenderingContext2D, padding: number, chartWidth: number, chartHeight: number) => {
    if (!data.red || !data.green || !data.blue) return;

    const maxValue = Math.max(
      Math.max(...data.red),
      Math.max(...data.green),
      Math.max(...data.blue)
    );

    const binWidth = chartWidth / 256;

    // Draw channels with transparency for overlay effect
    const channels = [
      { data: data.red, color: 'rgba(239, 68, 68, 0.7)', name: 'Red' },
      { data: data.green, color: 'rgba(34, 197, 94, 0.7)', name: 'Green' },
      { data: data.blue, color: 'rgba(59, 130, 246, 0.7)', name: 'Blue' }
    ];

    channels.forEach(channel => {
      ctx.fillStyle = channel.color;
      ctx.strokeStyle = channel.color.replace('0.7', '1.0');
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let i = 0; i < 256; i++) {
        const x = padding + i * binWidth;
        const barHeight = (channel.data[i] / maxValue) * chartHeight;
        const y = padding + chartHeight - barHeight;

        if (i === 0) {
          ctx.moveTo(x, padding + chartHeight);
        }
        ctx.lineTo(x, y);
        ctx.lineTo(x + binWidth, y);
      }
      ctx.lineTo(padding + chartWidth, padding + chartHeight);
      ctx.closePath();
      ctx.fill();
    });
  };

  const drawGrayscaleHistogram = (ctx: CanvasRenderingContext2D, padding: number, chartWidth: number, chartHeight: number) => {
    if (!data.gray) return;

    const maxValue = Math.max(...data.gray);
    const binWidth = chartWidth / 256;

    ctx.fillStyle = 'rgba(75, 85, 99, 0.8)';
    ctx.strokeStyle = 'rgb(75, 85, 99)';
    ctx.lineWidth = 1;

    for (let i = 0; i < 256; i++) {
      const x = padding + i * binWidth;
      const barHeight = (data.gray[i] / maxValue) * chartHeight;
      const y = padding + chartHeight - barHeight;

      // Highlight hovered bin
      if (hoveredBin === i) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      } else {
        ctx.fillStyle = 'rgba(75, 85, 99, 0.8)';
      }

      ctx.fillRect(x, y, binWidth, barHeight);
    }
  };

  const drawBinaryHistogram = (ctx: CanvasRenderingContext2D, padding: number, chartWidth: number, chartHeight: number) => {
    if (!data.binary) return;

    const maxValue = Math.max(...data.binary);
    const barWidth = chartWidth / 3; // More space for just 2 bars
    const barSpacing = barWidth / 2;

    const bars = [
      { value: data.binary[0], label: 'Black (0)', color: 'rgba(0, 0, 0, 0.8)', x: padding + barSpacing },
      { value: data.binary[1], label: 'White (1)', color: 'rgba(255, 255, 255, 0.8)', x: padding + barSpacing + barWidth }
    ];

    bars.forEach((bar, index) => {
      const barHeight = (bar.value / maxValue) * chartHeight;
      const y = padding + chartHeight - barHeight;

      // Highlight hovered bar
      if (hoveredBin === index) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      } else {
        ctx.fillStyle = bar.color;
      }

      ctx.fillRect(bar.x, y, barWidth, barHeight);

      // Draw border for white bar
      if (index === 1) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bar.x, y, barWidth, barHeight);
      }

      // Draw value labels
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bar.value.toString(), bar.x + barWidth / 2, y - 5);
      ctx.fillText(bar.label, bar.x + barWidth / 2, padding + chartHeight + 20);
    });
  };

  const drawAxes = (ctx: CanvasRenderingContext2D, padding: number, chartWidth: number, chartHeight: number) => {
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();

    // X-axis labels
    if (data.imageType !== 'binary') {
      const tickCount = 5;
      for (let i = 0; i <= tickCount; i++) {
        const x = padding + (i / tickCount) * chartWidth;
        const value = Math.round((i / tickCount) * 255);
        
        ctx.beginPath();
        ctx.moveTo(x, padding + chartHeight);
        ctx.lineTo(x, padding + chartHeight + 5);
        ctx.stroke();
        
        ctx.fillText(value.toString(), x, padding + chartHeight + 18);
      }
    }

    // Labels
    ctx.save();
    ctx.translate(15, padding + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillText('Frequency', 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    const xLabel = data.imageType === 'binary' ? 'Binary Values' : 'Intensity (0-255)';
    ctx.fillText(xLabel, padding + chartWidth / 2, height - 5);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setMousePos({ x: event.clientX, y: event.clientY });

    const padding = 40;
    const chartWidth = width - 2 * padding;

    if (x >= padding && x <= padding + chartWidth && y >= padding && y <= padding + height - 2 * padding) {
      if (data.imageType === 'binary') {
        const barWidth = chartWidth / 3;
        const barSpacing = barWidth / 2;
        
        if (x >= padding + barSpacing && x < padding + barSpacing + barWidth) {
          setHoveredBin(0);
        } else if (x >= padding + barSpacing + barWidth && x < padding + barSpacing + 2 * barWidth) {
          setHoveredBin(1);
        } else {
          setHoveredBin(null);
        }
      } else {
        const binIndex = Math.floor(((x - padding) / chartWidth) * 256);
        setHoveredBin(Math.min(Math.max(binIndex, 0), 255));
      }
    } else {
      setHoveredBin(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredBin(null);
    setMousePos(null);
  };

  const getTooltipContent = () => {
    if (hoveredBin === null) return null;

    switch (data.imageType) {
      case 'rgb':
        return (
          <div className="bg-gray-800 text-white p-2 rounded shadow-lg text-xs">
            <div>Intensity: {hoveredBin}</div>
            {data.red && <div className="text-red-300">Red: {data.red[hoveredBin]}</div>}
            {data.green && <div className="text-green-300">Green: {data.green[hoveredBin]}</div>}
            {data.blue && <div className="text-blue-300">Blue: {data.blue[hoveredBin]}</div>}
          </div>
        );
      case 'grayscale':
        return (
          <div className="bg-gray-800 text-white p-2 rounded shadow-lg text-xs">
            <div>Intensity: {hoveredBin}</div>
            {data.gray && <div>Count: {data.gray[hoveredBin]}</div>}
          </div>
        );
      case 'binary':
        const label = hoveredBin === 0 ? 'Black' : 'White';
        const value = data.binary ? data.binary[hoveredBin] : 0;
        return (
          <div className="bg-gray-800 text-white p-2 rounded shadow-lg text-xs">
            <div>{label}: {value} pixels</div>
            <div>Percentage: {((value / data.totalPixels) * 100).toFixed(2)}%</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Tooltip */}
      {interactive && hoveredBin !== null && mousePos && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          {getTooltipContent()}
        </div>
      )}

      {/* Legend for RGB */}
      {data.imageType === 'rgb' && (
        <div className="flex justify-center mt-2 space-x-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 opacity-70 mr-1"></div>
            <span>Red</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 opacity-70 mr-1"></div>
            <span>Green</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 opacity-70 mr-1"></div>
            <span>Blue</span>
          </div>
        </div>
      )}
    </div>
  );
} 