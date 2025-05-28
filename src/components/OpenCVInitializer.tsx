import { useEffect, useState, useCallback } from 'react';
import { initOpenCV, getOpenCVInitStatus } from '../utils/imageProcessing';
import OpenCVLoader from './OpenCVLoader';

/**
 * Component that initializes OpenCV when the app starts
 * Uses a modal for initial load and displays initialization status and errors if needed
 */
export default function OpenCVInitializer() {
  const [showLoader, setShowLoader] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // Use useCallback to prevent excessive re-renders
  const handleInitialized = useCallback(() => {
    // Check status after initialization
    const status = getOpenCVInitStatus();
    
    setShowLoader(false);
    
    if (status.error) {
      setNotificationType('error');
      setNotificationMessage(`OpenCV loaded with limitations: ${status.error.message}`);
    } else {
      setNotificationType('success');
      setNotificationMessage('OpenCV loaded successfully');
    }
    
    setShowNotification(true);
    
    // Hide success notification after 3 seconds
    const timeoutId = setTimeout(() => {
      setShowNotification(false);
    }, 3000);
    
    // Clean up the timeout when component unmounts
    return () => clearTimeout(timeoutId);
  }, []);
  
  // If loader is active, show the full-screen loader
  if (showLoader) {
    return <OpenCVLoader onInitialized={handleInitialized} />;
  }
  
  // Otherwise show just the notification
  return (
    <>
      {showNotification && (
        <div className="fixed bottom-4 right-4 z-50 transition-all duration-300 opacity-100 animate-fade-in">
          {notificationType === 'success' && (
            <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-2 rounded-md shadow-md flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{notificationMessage}</span>
              <button 
                onClick={() => setShowNotification(false)}
                className="ml-4 text-green-700 hover:text-green-900"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {notificationType === 'error' && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-md shadow-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{notificationMessage}</span>
                <button 
                  onClick={() => setShowNotification(false)}
                  className="ml-4 text-red-700 hover:text-red-900"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-1 text-xs ml-7">
                Some image processing features may be limited.
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 ml-7 bg-red-700 hover:bg-red-800 text-white text-xs px-2 py-1 rounded"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
} 