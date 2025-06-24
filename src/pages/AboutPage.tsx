import { motion } from 'framer-motion';
import { 
  AcademicCapIcon,
  BookOpenIcon,
  BeakerIcon,
  CogIcon,
  LightBulbIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              About Image Transform Lab
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              An interactive learning platform for exploring image processing techniques and algorithms
            </p>
          </div>

          {/* Dedication Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8 border-l-4 border-blue-500"
          >
            <div className="flex items-center mb-4">
              <AcademicCapIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">Dedication</h2>
            </div>
            <p className="text-gray-700 text-lg leading-relaxed">
              This project is dedicated with deep gratitude to{' '}
              <span className="font-semibold text-blue-800">Professor Dr. A. Benzinou</span> and{' '}
              <span className="font-semibold text-blue-800">Dr. K. Nasserdine</span>, whose expertise, 
              guidance, and passion for image processing have inspired the creation of this educational platform. 
              Their commitment to advancing knowledge in computer vision and digital image processing has made 
              this interactive learning experience possible.
            </p>
          </motion.div>

          {/* Project Overview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <div className="flex items-center mb-6">
              <BookOpenIcon className="h-8 w-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">What is Image Transform Lab?</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700">
              <p className="mb-4">
                Image Transform Lab is an innovative educational platform designed to make image processing 
                concepts accessible and interactive. Built with modern web technologies, it provides students, 
                researchers, and enthusiasts with hands-on experience in digital image processing techniques.
              </p>
              <p className="mb-4">
                The platform combines theoretical knowledge with practical implementation, allowing users to 
                experiment with various image processing algorithms in real-time through an intuitive visual 
                pipeline interface.
              </p>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid md:grid-cols-2 gap-6 mb-8"
          >
            {/* Interactive Lab */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <BeakerIcon className="h-6 w-6 text-purple-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">Interactive Lab</h3>
              </div>
              <p className="text-gray-600">
                Build custom image processing pipelines using drag-and-drop nodes. Experiment with 
                different algorithms, adjust parameters in real-time, and see immediate results.
              </p>
            </div>

            {/* Comprehensive Lessons */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <LightBulbIcon className="h-6 w-6 text-yellow-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">Guided Lessons</h3>
              </div>
              <p className="text-gray-600">
                Learn through structured lessons covering edge detection, filtering, transformations, 
                and advanced techniques with mathematical explanations and practical examples.
              </p>
            </div>

            {/* Advanced Algorithms */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <CogIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">Advanced Algorithms</h3>
              </div>
              <p className="text-gray-600">
                Explore sophisticated image processing techniques including morphological operations, 
                histogram equalization, edge detection, and computer vision algorithms.
              </p>
            </div>

            {/* Real-time Processing */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <UserGroupIcon className="h-6 w-6 text-red-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">Educational Focus</h3>
              </div>
              <p className="text-gray-600">
                Designed specifically for educational purposes with clear explanations, 
                parameter descriptions, and visual feedback to enhance understanding.
              </p>
            </div>
          </motion.div>

          {/* Technology Stack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Technology Stack</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Frontend Technologies</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• React.js with TypeScript for type-safe development</li>
                  <li>• Tailwind CSS for modern, responsive design</li>
                  <li>• Framer Motion for smooth animations</li>
                  <li>• React Flow for interactive pipeline visualization</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Image Processing</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• OpenCV.js for advanced computer vision algorithms</li>
                  <li>• Canvas API for real-time image manipulation</li>
                  <li>• WebGL for high-performance processing</li>
                  <li>• Custom algorithms for educational purposes</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Educational Goals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white"
          >
            <h2 className="text-2xl font-semibold mb-6">Educational Goals</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Understanding</h3>
                <p className="text-blue-100">
                  Help students grasp fundamental concepts in digital image processing and computer vision.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Experimentation</h3>
                <p className="text-blue-100">
                  Provide a safe environment to experiment with algorithms and see immediate visual results.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Application</h3>
                <p className="text-blue-100">
                  Bridge the gap between theory and practice through interactive mini-projects and real examples.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Footer Credit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="text-center mt-12 text-gray-600"
          >
            <p className="text-sm">
              © {new Date().getFullYear()} Image Transform Lab. Built with passion for education and innovation in image processing.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 