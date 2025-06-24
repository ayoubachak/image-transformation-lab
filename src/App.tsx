import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PipelineProvider } from './contexts/PipelineContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LessonsPage from './pages/LessonsPage';
import LessonDetailPage from './pages/LessonDetailPage';
import LabPage from './pages/LabPage';
import AboutPage from './pages/AboutPage';
import OpenCVInitializer from './components/OpenCVInitializer';
import './components/styles/tooltipStyles.css';
import './components/styles/modalStyles.css';

function App() {
  return (
    <Router>
      <PipelineProvider>
        <div className="min-h-screen flex flex-col bg-white text-gray-900">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/lessons" element={<LessonsPage />} />
              <Route path="/lessons/:lessonId" element={<LessonDetailPage />} />
              <Route path="/lab" element={<LabPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </main>
          <footer className="bg-gray-800 text-white p-4 text-center">
            <p>Image Transform Lab &copy; {new Date().getFullYear()} Dedicated to Professor Dr. A. Benzinou and Dr. K. Nasserdine</p>
          </footer>
          
          {/* Initialize OpenCV and show status notifications */}
          <OpenCVInitializer />
        </div>
      </PipelineProvider>
    </Router>
  );
}

export default App;
