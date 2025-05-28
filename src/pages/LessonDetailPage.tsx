import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePipeline } from '../contexts/PipelineContext';
import { sampleLessons } from '../utils/sampleData';
import ImageProcessingPipeline from '../components/ImageProcessingPipeline';

// LaTeX-like formula renderer (simplified version)
const Formula = ({ formula }: { formula: string }) => {
  return (
    <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
      <pre className="text-lg font-mono">{formula}</pre>
    </div>
  );
};

export default function LessonDetailPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { nodes, addNode, removeNode, addEdge, removeEdge, clearPipeline } = usePipeline();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current && lessonId) {
      hasInitialized.current = true;
      
      // Try to find the lesson in sample data
      const foundLesson = sampleLessons.find(l => l.id === lessonId);
      
      if (foundLesson) {
        setLesson(foundLesson);
        
        // Load the lesson pipeline
        clearPipeline(); // Clear existing nodes
        
        // Add all nodes from the lesson
        foundLesson.pipeline.nodes.forEach(node => {
          if (node.type === 'input') {
            addNode('input', undefined, node.position);
          } else if (node.type === 'output') {
            addNode('output', undefined, node.position);
          } else if (node.type === 'transformation' && node.transformation) {
            // We need to omit id and inputNodes from the transformation
            const { id, inputNodes, ...transformData } = node.transformation;
            addNode('transformation', transformData, node.position);
          }
        });
        
        // Add all edges
        setTimeout(() => {
          foundLesson.pipeline.edges.forEach(edge => {
            addEdge(edge.source, edge.target);
          });
        }, 100);
      }
      
      setLoading(false);
    }
  }, [lessonId, addNode, addEdge, removeNode, removeEdge, clearPipeline]);

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
    }
    
    return null;
  };

  // Debug: Check if nodes are loaded
  const hasNodes = nodes.length > 0;

  const handleReloadPipeline = () => {
    if (lessonId) {
      clearPipeline();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lesson...</p>
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
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-3">Experiment</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting the parameters in each transformation node to see how they affect the output:
              </p>
              <ul className="list-disc list-inside text-gray-600 mt-2 ml-4 space-y-2">
                <li>Try different kernel sizes for the Gaussian blur to see how noise reduction affects edge detection</li>
                <li>Adjust the kernel size of the Laplacian operator to change the sensitivity of edge detection</li>
                <li>Try processing different types of images to see how the edge detection performs</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 