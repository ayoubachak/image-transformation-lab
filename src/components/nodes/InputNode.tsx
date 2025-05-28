import { useState, useRef, useEffect } from 'react';
import { Position } from 'reactflow';
import { usePipeline } from '../../contexts/PipelineContext';
import { PhotoIcon, ArrowUpTrayIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import BaseNode from './BaseNode';

interface InputNodeProps {
  id: string;
  data: { node: any };
  selected: boolean;
}

export default function InputNode({ id, data, selected }: InputNodeProps) {
  const [image, setImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{width: number, height: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setInputImage, results } = usePipeline();

  // Update the display when the node result changes
  useEffect(() => {
    const nodeResult = results.get(id);
    if (nodeResult && nodeResult.canvas) {
      // If we have a processed canvas from the pipeline, use it
      setImage(nodeResult.canvas.toDataURL());
      setImageSize({
        width: nodeResult.canvas.width,
        height: nodeResult.canvas.height
      });
    }
  }, [id, results]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Store image dimensions
          setImageSize({
            width: img.width,
            height: img.height
          });
          
          // Display the image
          setImage(img.src);
          
          // Use the pipeline manager to set the input image
          setInputImage(id, img);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <BaseNode
      id={id}
      type="input"
      selected={selected}
      title="Input Image"
      color={{
        border: 'border-blue-200',
        background: 'bg-gradient-to-br from-blue-50 to-white',
        header: 'bg-blue-600',
        headerText: 'text-white'
      }}
      handles={{
        input: false,
        output: true,
        outputPosition: Position.Right
      }}
    >
      <div className="flex flex-col items-center">
        {!image ? (
          <div className="w-full">
            <div className="mb-3 p-5 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-all"
                onClick={() => fileInputRef.current?.click()}>
              <DocumentArrowUpIcon className="h-10 w-10 text-blue-400 mb-2" />
              <p className="text-sm text-blue-600 font-medium text-center">
                Drag & drop an image<br />or click to browse
              </p>
              <p className="text-xs text-blue-400 mt-1">Supports JPG, PNG, WEBP</p>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        ) : (
          <div className="w-full">
            <div className="relative group mb-3 bg-slate-800 rounded-md overflow-hidden">
              <img 
                src={image} 
                alt="Input" 
                className="max-h-52 w-full object-contain mx-auto"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                <button
                  className="px-3 py-1.5 bg-white text-gray-800 rounded-md text-sm font-medium shadow-sm hover:bg-blue-50 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Image
                </button>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>Size: {imageSize?.width}×{imageSize?.height}px</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-800"
              >
                Replace
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        )}
      </div>
    </BaseNode>
  );
} 