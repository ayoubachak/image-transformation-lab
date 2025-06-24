import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePipeline } from '../contexts/PipelineContext';
import { sampleLessons } from '../utils/sampleData';
import ImageProcessingPipeline from '../components/ImageProcessingPipeline';
import type { Lesson } from '../utils/types';

// Type declaration for OpenCV
declare global {
  interface Window {
    cv: any;
  }
}

// LaTeX-like formula renderer (simplified version)
const Formula = ({ formula }: { formula: string }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-md font-mono text-sm whitespace-pre-line border-l-4 border-blue-500">
      {formula}
    </div>
  );
};

export default function LessonDetailPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { 
    nodes, 
    addNode, 
    addEdge, 
    removeNode, 
    removeEdge, 
    clearPipeline, 
    setInputImage 
  } = usePipeline();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCVReady, setOpenCVReady] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const checkOpenCV = () => {
      if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
        setOpenCVReady(true);
      } else {
        // Keep checking every 100ms until OpenCV is ready
        setTimeout(checkOpenCV, 100);
      }
    };
    
    checkOpenCV();
  }, []);

  useEffect(() => {
    if (!hasInitialized.current && lessonId && openCVReady) {
      hasInitialized.current = true;
      
      console.log(`Loading lesson: ${lessonId}`);
      
      // Try to find the lesson in sample data
      const foundLesson = sampleLessons.find(l => l.id === lessonId);
      
      if (foundLesson) {
        console.log(`Found lesson: ${foundLesson.title}`);
        console.log(`Pipeline has ${foundLesson.pipeline.nodes.length} nodes and ${foundLesson.pipeline.edges.length} edges`);
        
        setLesson(foundLesson);
        
        // Load the lesson pipeline
        clearPipeline(); // Clear existing nodes
        
        // Create a mapping of old IDs to new IDs
        const idMapping: Record<string, string> = {};
        
        // Add all nodes from the lesson and track ID mapping
        foundLesson.pipeline.nodes.forEach((node, index) => {
          console.log(`Adding node ${index + 1}/${foundLesson.pipeline.nodes.length}: ${node.type}`, node);
          
          let newNodeId: string;
          
          if (node.type === 'input') {
            newNodeId = addNode('input', undefined, node.position);
          } else if (node.type === 'output') {
            newNodeId = addNode('output', undefined, node.position);
          } else if (node.type === 'transformation' && node.transformation) {
            // We need to omit id and inputNodes from the transformation
            const { id, inputNodes, ...transformData } = node.transformation;
            newNodeId = addNode('transformation', transformData, node.position);
          } else {
            console.warn(`Skipping unknown node type: ${node.type}`);
            return; // Skip unknown node types
          }
          
          // Map the old ID to the new ID
          idMapping[node.id] = newNodeId;
          console.log(`Mapped ${node.id} -> ${newNodeId}`);
        });
        
        // Add all edges using the new IDs
        setTimeout(() => {
          console.log(`Adding ${foundLesson.pipeline.edges.length} edges...`);
          
          foundLesson.pipeline.edges.forEach((edge, index) => {
            const newSourceId = idMapping[edge.source];
            const newTargetId = idMapping[edge.target];
            
            console.log(`Adding edge ${index + 1}: ${edge.source} -> ${edge.target} (mapped: ${newSourceId} -> ${newTargetId})`);
            
            if (newSourceId && newTargetId) {
              addEdge(newSourceId, newTargetId);
            } else {
              console.warn(`Failed to add edge: source=${newSourceId}, target=${newTargetId}`);
            }
          });
          
          console.log('Pipeline loading complete!');
          
          // Load sample image for mini-projects (single attempt)
          if (lessonId === 'license-plate-detection' || lessonId === 'line-segmentation' || lessonId === 'cell-detection') {
            setTimeout(() => {
              loadSampleImage(lessonId);
            }, 1000);
          }
        }, 500); // Increased delay to ensure all nodes are added
      } else {
        console.error(`Lesson not found: ${lessonId}`);
      }
      
      setLoading(false);
    }
  }, [lessonId, openCVReady, addNode, addEdge, removeNode, removeEdge, clearPipeline]);

  // Function to load sample images for mini-projects
  const loadSampleImage = async (projectId: string) => {
    try {
      let imagePath: string;
      
      if (projectId === 'license-plate-detection') {
        imagePath = '/assets/projects/plaque.jpg';
      } else if (projectId === 'line-segmentation') {
        imagePath = '/assets/projects/MP3.gif';
      } else if (projectId === 'cell-detection') {
        imagePath = '/assets/projects/cell-detection.jpg';
      } else {
        console.warn('Unknown project ID for sample image loading:', projectId);
        return;
      }
      
      console.log(`Loading sample image: ${imagePath}`);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log(`Sample image loaded successfully: ${img.width}x${img.height}`);
        
        // Single attempt to set the image
        setTimeout(() => {
          const inputNode = nodes.find(node => node.type === 'input');
          if (inputNode) {
            console.log(`Setting input image for node: ${inputNode.id}`);
            setInputImage(inputNode.id, img);
            console.log('Input image set successfully!');
          } else {
            console.warn('Input node not found. Use the manual "Load Sample Image" button.');
          }
        }, 500);
      };
      
      img.onerror = (error) => {
        console.error(`Sample image failed to load: ${imagePath}`, error);
        console.warn('Use the manual "Load Sample Image" button to try again.');
      };
      
      img.src = imagePath;
    } catch (error) {
      console.error('Could not load sample image:', error);
    }
  };

  // Get the mathematical explanation based on lesson ID
  const getLessonMathFormulas = () => {
    if (lesson?.id === 'edge-detection-laplacian') {
      return (
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-3">Mathematical Background</h3>
          <p className="text-gray-600 mb-4">
            The Laplacian operator is a second-order derivative operator. For a 2D image function f(x,y),
            the Laplacian is defined as:
          </p>
          <Formula formula="∇²f = ∂²f/∂x² + ∂²f/∂y²" />
          <p className="text-gray-600 mb-4">
            In discrete form, the Laplacian can be approximated using a convolution kernel.
            The most common Laplacian kernel for 4-connectivity is:
          </p>
          <Formula formula="L₄ = [ 0  1  0 ]\n     [ 1 -4  1 ]\n     [ 0  1  0 ]" />
          <p className="text-gray-600 mb-4">
            For 8-connectivity, the kernel becomes:
          </p>
          <Formula formula="L₈ = [ 1  1  1 ]\n     [ 1 -8  1 ]\n     [ 1  1  1 ]" />
          <p className="text-gray-600 mb-4">
            Since the Laplacian is very sensitive to noise, we typically apply Gaussian blur first:
          </p>
          <Formula formula="LoG = ∇²(G * I)" />
          <p className="text-gray-600">
            Where G is the Gaussian function and I is the image. This is known as the Laplacian of Gaussian (LoG).
          </p>
        </div>
      );
    } else if (lesson?.id === 'edge-detection-sobel') {
      return (
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-3">Mathematical Background</h3>
          <p className="text-gray-600 mb-4">
            The Sobel operator uses two 3×3 kernels to approximate the gradient of the image intensity.
          </p>
          <Formula formula="Gₓ = [ -1  0  1 ]\n     [ -2  0  2 ]\n     [ -1  0  1 ]" />
          <Formula formula="Gᵧ = [  1  2  1 ]\n     [  0  0  0 ]\n     [ -1 -2 -1 ]" />
          <p className="text-gray-600">
            The gradient magnitude is then calculated as: √(Gₓ² + Gᵧ²)
          </p>
        </div>
      );
    } else if (lesson?.id === 'license-plate-detection') {
      return (
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-3">Technical Approach</h3>
          
          <h4 className="text-lg font-medium mb-2">1. Grayscale Conversion</h4>
          <p className="text-gray-600 mb-4">
            Convert the input image to grayscale to simplify processing and remove color information:
          </p>
          <Formula formula="Gray = 0.299×R + 0.587×G + 0.114×B" />
          
          <h4 className="text-lg font-medium mb-2">2. Binary Thresholding</h4>
          <p className="text-gray-600 mb-4">
            Apply binary thresholding with inversion to separate foreground from background:
          </p>
          <Formula formula="Binary(x,y) = {255 if I(x,y) < T, 0 if I(x,y) ≥ T}\nwhere T = 54 (threshold value)" />
          
          <h4 className="text-lg font-medium mb-2">3. Median Filtering</h4>
          <p className="text-gray-600 mb-4">
            Apply median filtering to reduce noise while preserving edges:
          </p>
          <Formula formula="Output(x,y) = median{I(x+i,y+j) | (i,j) ∈ N}\nwhere N is the 3×3 neighborhood" />
          <p className="text-gray-600 mb-4">
            The filter is applied 3 times iteratively for enhanced noise reduction.
          </p>
          
          <h4 className="text-lg font-medium mb-2">4. Skeletonization</h4>
          <p className="text-gray-600 mb-4">
            Reduce objects to their skeletal structure using the Zhang-Suen algorithm:
          </p>
          <Formula formula="Skeleton = iterative thinning while preserving topology\nMax iterations: 48\nPreserve endpoints: true" />
          <p className="text-gray-600">
            This creates a one-pixel-wide representation of the objects while maintaining their essential structure and connectivity.
          </p>
        </div>
      );
    } else if (lesson?.id === 'line-segmentation') {
      return (
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-3">Technical Approach</h3>
          
          <h4 className="text-lg font-medium mb-2">1. Background Subtraction</h4>
          <p className="text-gray-600 mb-4">
            Remove uneven illumination using morphological background estimation:
          </p>
          <Formula formula="Background = Opening(I, large_SE)\nForeground = I - Background" />
          
          <h4 className="text-lg font-medium mb-2">2. Canny Edge Detection</h4>
          <p className="text-gray-600 mb-4">
            Multi-stage edge detection with non-maximum suppression:
          </p>
          <Formula formula="1. Gaussian smoothing: G = I * G_σ\n2. Gradient: ∇G = √(G_x² + G_y²)\n3. Non-max suppression\n4. Hysteresis thresholding" />
          
          <h4 className="text-lg font-medium mb-2">3. Hough Line Transform</h4>
          <p className="text-gray-600 mb-4">
            Detect straight lines using the parametric representation:
          </p>
          <Formula formula="ρ = x·cos(θ) + y·sin(θ)" />
          <p className="text-gray-600 mb-4">
            Where ρ is the distance from origin to the line, and θ is the angle.
          </p>
          
          <h4 className="text-lg font-medium mb-2">4. Line Validation and Refinement</h4>
          <p className="text-gray-600 mb-4">
            Filter detected lines based on:
          </p>
          <Formula formula="• Length ≥ min_length\n• Gap ≤ max_gap\n• Votes ≥ threshold" />
          
          <h4 className="text-lg font-medium mb-2">5. Post-Processing</h4>
          <p className="text-gray-600">
            Use morphological operations to connect broken segments and fill gaps:
            Closing → Dilation → Hole Filling → Component Filtering
          </p>
        </div>
      );
    } else if (lesson?.id === 'cell-detection') {
      return (
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-3">Technical Approach</h3>
          
          <h4 className="text-lg font-medium mb-2">1. Median Filtering</h4>
          <p className="text-gray-600 mb-4">
            Apply cross-shaped median filtering for noise reduction while preserving cell structures:
          </p>
          <Formula formula="Output(x,y) = median{I(x+i,y+j) | (i,j) ∈ N_cross}\nKernel size: 5×5, Iterations: 3" />
          
          <h4 className="text-lg font-medium mb-2">2. Background Subtraction</h4>
          <p className="text-gray-600 mb-4">
            Remove uneven illumination using morphological background estimation:
          </p>
          <Formula formula="Background = Opening(I, SE_71×71)\nForeground = normalize(I - Background)" />
          
          <h4 className="text-lg font-medium mb-2">3. Advanced Thresholding</h4>
          <p className="text-gray-600 mb-4">
            Statistical combined thresholding for cell separation:
          </p>
          <Formula formula="T_high = 180, T_low = 80\nBinary = hysteresis_threshold(I, T_low, T_high)\n+ morphological cleanup + noise removal" />
          
          <h4 className="text-lg font-medium mb-2">4. Morphological Operations</h4>
          <p className="text-gray-600 mb-4">
            Opening operation to separate touching cells:
          </p>
          <Formula formula="Opening = Dilation(Erosion(I, SE), SE)\nSE = elliptical, size = 5×5" />
          
          <h4 className="text-lg font-medium mb-2">5. Cell Detection & Analysis</h4>
          <p className="text-gray-600 mb-4">
            Contour-based segmentation with shape analysis:
          </p>
          <Formula formula="Circularity = 4π × Area / Perimeter²\nAspect Ratio = Major Axis / Minor Axis\nSolidity = Area / Convex Hull Area" />
          
          <h4 className="text-lg font-medium mb-2">6. Filtering Criteria</h4>
          <p className="text-gray-600">
            Filter detected objects based on cell-like properties:
            • Area: 50-2000 pixels • Circularity: 0.2-1.0 • Aspect Ratio: 0.3-3.0
          </p>
        </div>
      );
    }
    
    return null;
  };

  // Debug: Check if nodes are loaded
  const hasNodes = nodes.length > 0;

  const handleReloadPipeline = () => {
    if (lessonId) {
      clearPipeline();
      hasInitialized.current = false; // Reset initialization flag
    }
  };

  const handleManualLoadImage = () => {
    if (lesson && (lesson.id === 'license-plate-detection' || lesson.id === 'line-segmentation' || lesson.id === 'cell-detection')) {
      console.log('Manual image load triggered');
      loadSampleImage(lesson.id);
    }
  };

  if (loading || !openCVReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {!openCVReady ? 'Initializing OpenCV...' : 'Loading lesson...'}
          </p>
          {!openCVReady && (
            <p className="mt-2 text-sm text-gray-500">
              Please wait while OpenCV library loads for image processing
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Lesson Not Found</h1>
          <p className="text-xl text-gray-600 mb-8">
            The lesson you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/lessons"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Lessons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <Link
              to="/lessons"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Back to Lessons
            </Link>
          </div>

          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {lesson.title}
            </h1>
            <p className="text-xl text-gray-600">{lesson.description}</p>
          </header>

          <div className="bg-white rounded-xl shadow-md p-6 mb-12">
            <h2 className="text-2xl font-semibold mb-6">Image Processing Pipeline</h2>
            <p className="text-gray-600 mb-8">
              Below is the visual representation of the image processing pipeline for this lesson.
              Upload an image to the input node and observe how each transformation affects the output.
            </p>
            
            {/* Sample image note for mini-projects */}
            {(lesson?.id === 'license-plate-detection' || lesson?.id === 'line-segmentation' || lesson?.id === 'cell-detection') && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">📸 Sample Image Auto-Loading</h4>
                <p className="text-purple-700 text-sm">
                  This mini-project automatically loads a sample image optimized for the solution pipeline. 
                  The sample image {lesson.id === 'license-plate-detection' ? '(plaque.jpg)' : lesson.id === 'line-segmentation' ? '(MP3.gif)' : '(cell-detection.jpg)'} will be 
                  loaded into the input node to demonstrate the complete solution.
                </p>
                <p className="text-purple-600 text-xs mt-2">
                  💡 You can also upload your own images to test the algorithm on different data.
                </p>
              </div>
            )}
            
            {!hasNodes && (
              <div className="text-amber-600 mb-4 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <p className="font-medium">Note: If the diagram is empty, please try clicking "Reload Pipeline" to load the nodes.</p>
                <button 
                  onClick={handleReloadPipeline}
                  className="mt-2 px-4 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
                >
                  Reload Pipeline
                </button>
              </div>
            )}

            {/* Manual image load button for mini-projects */}
            {hasNodes && (lesson?.id === 'license-plate-detection' || lesson?.id === 'line-segmentation' || lesson?.id === 'cell-detection') && (
              <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="font-medium text-green-800">Manual Controls:</p>
                <button 
                  onClick={handleManualLoadImage}
                  className="mt-2 px-4 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                >
                  Load Sample Image
                </button>
                <p className="text-green-600 text-xs mt-1">
                  Click this button if the sample image didn't load automatically.
                </p>
              </div>
            )}
            
            <div className="h-[600px] border border-gray-200 rounded-lg">
              <ImageProcessingPipeline readOnly={false} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-6">Learning Resources</h2>
            
            {/* Mathematical formulas section */}
            {getLessonMathFormulas()}
            
            <div className="mb-8">
              <h3 className="text-xl font-medium mb-3">How It Works</h3>
              {lesson?.id === 'license-plate-detection' ? (
                <>
                  <p className="text-gray-600 mb-4">
                    This mini-project demonstrates an image processing pipeline for license plate analysis using grayscale conversion, binary thresholding, noise reduction, and structural analysis techniques.
                  </p>
                  <p className="text-gray-600 mb-4">
                    The pipeline applies the following transformations in sequence:
                  </p>
                  <ol className="list-decimal list-inside text-gray-600 mt-2 ml-4 space-y-3">
                    <li><strong>Grayscale Conversion:</strong> Convert the color image to grayscale to simplify processing and focus on intensity variations</li>
                    <li><strong>Binary Thresholding:</strong> Apply threshold with value 54 and invert the result to separate foreground objects from background</li>
                    <li><strong>Median Filtering:</strong> Apply median filter with 3 iterations to reduce noise while preserving important edge information</li>
                    <li><strong>Skeletonization:</strong> Reduce objects to their skeletal structure using Zhang-Suen algorithm with 48 max iterations while preserving endpoints</li>
                  </ol>
                  <p className="text-gray-600 mt-4">
                    This pipeline is particularly effective for analyzing the structural properties of license plates and extracting their essential geometric features.
                  </p>
                </>
              ) : lesson?.id === 'line-segmentation' ? (
                <>
                  <p className="text-gray-600 mb-4">
                    This mini-project demonstrates simplified line segmentation in document images using advanced thresholding and morphological operations. The solution handles uneven lighting and noise efficiently.
                  </p>
                  <p className="text-gray-600 mb-4">
                    The pipeline applies the following transformations in sequence:
                  </p>
                  <ol className="list-decimal list-inside text-gray-600 mt-2 ml-4 space-y-3">
                    <li><strong>Median Filtering:</strong> Apply standard median filter with 3×3 kernel and 2 iterations to reduce noise while preserving text boundaries</li>
                    <li><strong>Background Subtraction:</strong> Remove uneven illumination using morphological background estimation with 71×71 kernel</li>
                    <li><strong>Advanced Thresholding:</strong> Use local adaptive thresholding with high (200) and low (100) thresholds for optimal text separation</li>
                    <li><strong>Morphological Closing:</strong> Apply closing operation with 7×7 kernel and 2 iterations to connect broken line segments</li>
                  </ol>
                  <p className="text-gray-600 mt-4">
                    This simplified pipeline effectively segments text lines from document images while being more robust to different image conditions.
                  </p>
                </>
              ) : lesson?.id === 'cell-detection' ? (
                <>
                  <p className="text-gray-600 mb-4">
                    This mini-project demonstrates comprehensive cell detection and analysis using advanced image processing techniques for biological applications. The solution handles uneven illumination, noise, and touching cells.
                  </p>
                  <p className="text-gray-600 mb-4">
                    The pipeline applies the following transformations in sequence:
                  </p>
                  <ol className="list-decimal list-inside text-gray-600 mt-2 ml-4 space-y-3">
                    <li><strong>Median Filtering:</strong> Apply cross-shaped median filter with 5×5 kernel and 3 iterations to reduce noise while preserving cell boundaries</li>
                    <li><strong>Background Subtraction:</strong> Remove uneven illumination using morphological background estimation with 71×71 kernel</li>
                    <li><strong>Advanced Thresholding:</strong> Use statistical combined thresholding with high (180) and low (80) thresholds plus morphological cleanup</li>
                    <li><strong>Morphological Opening:</strong> Apply opening operation with 5×5 kernel to separate touching cells while preserving individual cell shapes</li>
                    <li><strong>Cell Detection:</strong> Use contour-based segmentation to identify individual cells and extract their properties</li>
                    <li><strong>Shape Analysis:</strong> Filter detected objects based on cell-like properties (circularity, area, aspect ratio)</li>
                  </ol>
                  <p className="text-gray-600 mt-4">
                    This pipeline is designed for biological cell analysis and can detect, count, and analyze the morphological properties of cells in microscopy images.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    In this lesson, you'll learn how edge detection works using the Laplacian operator.
                    The Laplacian operator is a second derivative operator that highlights regions of rapid intensity change.
                  </p>
                  <p className="text-gray-600">
                    The pipeline applies the following transformations:
                  </p>
                  <ol className="list-decimal list-inside text-gray-600 mt-2 ml-4 space-y-2">
                    <li>Convert the image to grayscale to simplify processing</li>
                    <li>Apply Gaussian blur to reduce noise which can affect edge detection</li>
                    <li>Apply the Laplacian operator to detect edges based on rapid changes in pixel intensity</li>
                  </ol>
                </>
              )}
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-3">Experiment</h3>
              {lesson?.id === 'license-plate-detection' ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Try adjusting the parameters in each transformation node to see how they affect the license plate analysis:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 mt-2 ml-4 space-y-2">
                    <li><strong>Threshold Value:</strong> Adjust the threshold value (currently 54) to change the binary separation point</li>
                    <li><strong>Invert Result:</strong> Toggle inversion to swap foreground and background</li>
                    <li><strong>Median Filter Iterations:</strong> Change the number of iterations (currently 3) for different noise reduction levels</li>
                    <li><strong>Median Filter Method:</strong> Try different methods (standard, adaptive, cross-shaped, selective)</li>
                    <li><strong>Skeletonization Iterations:</strong> Adjust max iterations (currently 48) to control thinning process</li>
                    <li><strong>Preserve Endpoints:</strong> Toggle endpoint preservation to see its effect on skeleton structure</li>
                  </ul>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-800 font-medium">💡 Tip:</p>
                    <p className="text-blue-700 text-sm mt-1">
                      Load the sample license plate image (plaque.jpg) from the assets to see the complete solution in action.
                      The pipeline extracts structural features that can be useful for character recognition and plate analysis.
                    </p>
                  </div>
                </>
              ) : lesson?.id === 'line-segmentation' ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Try adjusting the parameters in each transformation node to see how they affect the line segmentation:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 mt-2 ml-4 space-y-2">
                    <li><strong>Median Filter:</strong> Adjust kernel size (3-15) and iterations (1-5) for different noise levels</li>
                    <li><strong>Background Subtraction:</strong> Change kernel size (15-201) for different background patterns</li>
                    <li><strong>Advanced Thresholding:</strong> Modify thresholding method and threshold levels for better text separation</li>
                    <li><strong>Morphological Closing:</strong> Adjust kernel size (3-31) and iterations (1-10) for line connectivity</li>
                  </ul>
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800 font-medium">💡 Tip:</p>
                    <p className="text-green-700 text-sm mt-1">
                      Load the sample document image (MP3.gif) from the assets to see the complete solution in action.
                      This simplified approach is more robust and efficient than complex edge detection methods.
                    </p>
                  </div>
                </>
              ) : lesson?.id === 'cell-detection' ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Try adjusting the parameters in each transformation node to see how they affect the cell detection and analysis:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 mt-2 ml-4 space-y-2">
                    <li><strong>Median Filter Parameters:</strong> Adjust kernel size (3-15) and iterations (1-5) for different noise reduction levels</li>
                    <li><strong>Background Subtraction:</strong> Change kernel size (15-201) to handle different illumination patterns</li>
                    <li><strong>Advanced Thresholding:</strong> Modify high/low thresholds and try different thresholding methods</li>
                    <li><strong>Morphological Operations:</strong> Adjust operation type and kernel size to better separate touching cells</li>
                    <li><strong>Cell Detection Filters:</strong> Change size range (50-2000 pixels) to detect different cell populations</li>
                    <li><strong>Shape Analysis:</strong> Modify circularity (0.2-1.0) and aspect ratio (0.3-3.0) filters for cell-like shapes</li>
                    <li><strong>Output Visualization:</strong> Try different output modes (overlay, labeled, boundaries, analysis) to view results</li>
                  </ul>
                  <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                    <p className="text-purple-800 font-medium">💡 Tip:</p>
                    <p className="text-purple-700 text-sm mt-1">
                      Load the sample cell image (cell-detection.jpg) from the assets to see the complete solution in action.
                      The pipeline can detect individual cells, count them, and analyze their morphological properties for biological research.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    Try adjusting the parameters in each transformation node to see how they affect the output:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 mt-2 ml-4 space-y-2">
                    <li>Try different kernel sizes for the Gaussian blur to see how noise reduction affects edge detection</li>
                    <li>Adjust the kernel size of the Laplacian operator to change the sensitivity of edge detection</li>
                    <li>Try processing different types of images to see how the edge detection performs</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 