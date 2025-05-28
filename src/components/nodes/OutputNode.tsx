import { useEffect, useState, useRef } from 'react';
import { Position } from 'reactflow';
import { useImageProcessing } from '../../contexts/ImageProcessingContext';
import { PhotoIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import BaseNode from './BaseNode';

interface OutputNodeProps {
  id: string;
  data: { node: any };
  selected: boolean;
}

export default function OutputNode({ id, data, selected }: OutputNodeProps) {
  const { processedImages, edges } = useImageProcessing();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const lastProcessedInputRef = useRef<string | null>(null);
  const lastSourceNodeRef = useRef<string | null>(null);

  // Find connected nodes to get the image
  useEffect(() => {
    // Find the edge that connects to this output node
    const inputEdges = edges.filter(edge => edge.target === id);
    
    // Log for debugging
    console.log(`OutputNode ${id}: Checking for updates with ${inputEdges.length} input edges`);
    
    if (inputEdges.length > 0) {
      // Get the source node ID (there should only be one input to an output node)
      const sourceNodeId = inputEdges[0].source;
      console.log(`OutputNode ${id}: Connected to source ${sourceNodeId}`);
      
      // If source changed, force update
      const sourceChanged = lastSourceNodeRef.current !== sourceNodeId;
      lastSourceNodeRef.current = sourceNodeId;
      
      // Check if we have a processed image for this source
      const inputCanvas = processedImages[sourceNodeId];
      
      if (inputCanvas) {
        console.log(`OutputNode ${id}: Found processed image from ${sourceNodeId}`);
        
        // Always update when the source changes
        if (sourceChanged) {
          console.log(`OutputNode ${id}: Source node changed, forcing update`);
          setImageUrl(inputCanvas.toDataURL());
          return;
        }
        
        // Otherwise check for content changes by sampling pixel data
        try {
          const ctx = inputCanvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            console.warn(`OutputNode ${id}: Failed to get context from input canvas`);
            return;
          }
          
          // Sample pixels from the center of the image
          const sampleSize = 10;
          const centerX = Math.floor(inputCanvas.width / 2);
          const centerY = Math.floor(inputCanvas.height / 2);
          
          const pixelData = ctx.getImageData(
            Math.max(0, centerX - sampleSize/2), 
            Math.max(0, centerY - sampleSize/2), 
            sampleSize, 
            sampleSize
          ).data;
          
          // Create a fingerprint of the image content
          const fingerprint = `${sourceNodeId}_${inputCanvas.width}x${inputCanvas.height}_${
            Array.from(pixelData.slice(0, 100)).join(',')
          }`;
          
          // Check if content has changed
          const contentChanged = lastProcessedInputRef.current !== fingerprint;
          lastProcessedInputRef.current = fingerprint;
          
          if (contentChanged) {
            console.log(`OutputNode ${id}: Input content changed, updating`);
            setImageUrl(inputCanvas.toDataURL());
          } else {
            console.log(`OutputNode ${id}: No changes detected in input`);
          }
        } catch (error) {
          console.warn(`OutputNode ${id}: Error checking for input changes:`, error);
          // On error, update anyway to be safe
          setImageUrl(inputCanvas.toDataURL());
        }
      } else {
        console.log(`OutputNode ${id}: No processed image available from ${sourceNodeId}`);
        // If the upstream node has been invalidated, clear our image too
        if (imageUrl !== null) {
          console.log(`OutputNode ${id}: Clearing image URL`);
          setImageUrl(null);
        }
      }
    } else {
      console.log(`OutputNode ${id}: No input connections`);
      // No input connected
      if (imageUrl !== null) {
        setImageUrl(null);
      }
    }
  }, [processedImages, edges, id, imageUrl]);

  const handleDownload = () => {
    if (!imageUrl) return;
    
    setDownloading(true);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'processed-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setDownloading(false);
  };

  return (
    <BaseNode
      id={id}
      type="output"
      selected={selected}
      title="Output Result"
      color={{
        border: 'border-green-200',
        background: 'bg-gradient-to-br from-green-50 to-white',
        header: 'bg-green-600',
        headerText: 'text-white'
      }}
      handles={{
        input: true,
        output: false,
        inputPosition: Position.Left
      }}
    >
      <div className="flex flex-col">
        {imageUrl ? (
          <>
            <div className="mb-3 bg-slate-800 rounded-md overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Output" 
                className="max-h-52 w-full object-contain mx-auto"
              />
            </div>
            
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="mt-1 px-4 py-2 bg-green-600 text-white rounded-md flex items-center justify-center hover:bg-green-700 transition-colors disabled:bg-green-400 shadow-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {downloading ? 'Downloading...' : 'Download Image'}
            </button>
          </>
        ) : (
          <div className="p-6 border-2 border-dashed border-green-200 rounded-lg bg-green-50/50 flex flex-col items-center justify-center h-[160px]">
            <PhotoIcon className="h-10 w-10 text-green-300 mb-2" />
            <p className="text-sm text-green-600 font-medium text-center">
              Connect a transformation<br />to see the output
            </p>
          </div>
        )}
      </div>
    </BaseNode>
  );
} 