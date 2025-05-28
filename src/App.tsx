import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ImageProcessingProvider } from './contexts/ImageProcessingContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LessonsPage from './pages/LessonsPage';
import LessonDetailPage from './pages/LessonDetailPage';
import LabPage from './pages/LabPage';
import OpenCVInitializer from './components/OpenCVInitializer';

function App() {
  return (
    <Router>
      <ImageProcessingProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/lessons" element={<LessonsPage />} />
              <Route path="/lessons/:lessonId" element={<LessonDetailPage />} />
              <Route path="/lab" element={<LabPage />} />
              <Route path="/about" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold">About Page</h1><p className="mt-4">This is a learning platform for image processing techniques.</p></div>} />
            </Routes>
          </main>
          <footer className="bg-gray-800 text-white p-4 text-center">
            <p>Image Transform Lab &copy; {new Date().getFullYear()} Dedicated to Professor Dr. A. Benzinou</p>
          </footer>
          
          {/* Initialize OpenCV and show status notifications */}
          <OpenCVInitializer />
        </div>
      </ImageProcessingProvider>
    </Router>
  );
}

export default App;
