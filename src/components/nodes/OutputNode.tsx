import { useEffect, useState, useRef } from 'react';
import { Position } from 'reactflow';
import { usePipeline } from '../../contexts/PipelineContext';
import { PhotoIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import BaseNode from './BaseNode';

interface OutputNodeProps {
  id: string;
  data: { node: any };
  selected: boolean;
}

export default function OutputNode({ id, data, selected }: OutputNodeProps) {
  const { edges, results } = usePipeline();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const lastProcessedInputRef = useRef<string | null>(null);
  const lastSourceNodeRef = useRef<string | null>(null);

  // Find connected nodes to get the image
  useEffect(() => {
    // Find the edge that connects to this output node
    const inputEdges = edges.filter(edge => edge.target === id);
    
    if (inputEdges.length > 0) {
      // Get the source node ID (there should only be one input to an output node)
      const sourceNodeId = inputEdges[0].source;
      lastSourceNodeRef.current = sourceNodeId;
      
      // Get the result from the pipeline
      const nodeResult = results.get(id);
      
      // If we have a result with a canvas, display it
      if (nodeResult && nodeResult.canvas && nodeResult.status === 'success') {
        setImageUrl(nodeResult.canvas.toDataURL());
      } else {
        setImageUrl(null);
      }
    } else {
      // No input connected
      setImageUrl(null);
    }
  }, [id, edges, results]);

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