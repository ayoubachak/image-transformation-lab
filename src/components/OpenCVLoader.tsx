import React, { useEffect, useState, useCallback, useRef } from 'react';
import { initOpenCV, getOpenCVInitStatus } from '../utils/imageProcessing';

interface OpenCVLoaderProps {
  onInitialized: () => void;
}

const OpenCVLoader: React.FC<OpenCVLoaderProps> = ({ onInitialized }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Initializing OpenCV...');
  const [retryCount, setRetryCount] = useState(0);
  const initCalled = useRef(false);

  // Memoize the load function to avoid re-creation on renders
  const loadOpenCV = useCallback(async () => {
    try {
      console.log('Starting OpenCV initialization');
      await initOpenCV();
      const { initialized, error } = getOpenCVInitStatus();
      
      if (initialized && !error) {
        setStatus('success');
        setMessage('OpenCV loaded successfully.');
        onInitialized();
      } else if (initialized && error) {
        // Initialized but with errors (using fallback)
        setStatus('success');
        setMessage(`OpenCV initialization had issues, using fallback implementation. ${error.message}`);
        onInitialized();
      } else {
        setStatus('error');
        setMessage(`Failed to initialize OpenCV: ${error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error initializing OpenCV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [onInitialized]);

  // Only run the initialization once plus on retries
  useEffect(() => {
    // Prevent double initialization
    if (initCalled.current) return;
    
    initCalled.current = true;
    loadOpenCV();
    
    // Reset the flag when retryCount changes
    return () => {
      initCalled.current = false;
    };
  }, [retryCount, loadOpenCV]);

  const handleRetry = () => {
    setStatus('loading');
    setMessage('Retrying OpenCV initialization...');
    setRetryCount(prev => prev + 1);
  };

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
        <div className="p-6 rounded-lg shadow-lg bg-white max-w-md">
          <div className="flex items-center mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-3"></div>
            <h2 className="text-xl font-semibold">Loading OpenCV</h2>
          </div>
          <p className="text-gray-600 mb-4">{message}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-blue-500 h-2 rounded-full animate-pulse"></div>
          </div>
          <p className="text-xs text-gray-500">This may take a few seconds on first load...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
        <div className="p-6 rounded-lg shadow-lg bg-white max-w-md">
          <div className="flex items-center mb-4 text-red-500">
            <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold">OpenCV Loading Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{message}</p>
          <button 
            onClick={handleRetry}
            className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded transition duration-200"
          >
            Try Again
          </button>
          <p className="mt-4 text-sm text-gray-500">
            You can continue without OpenCV, but some image processing features may be limited.
          </p>
          <button 
            onClick={onInitialized}
            className="w-full mt-2 py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded transition duration-200"
          >
            Continue with Limited Features
          </button>
        </div>
      </div>
    );
  }

  // Success case - return nothing as we'll show the app
  return null;
};

export default OpenCVLoader; 