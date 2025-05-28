import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Image Transform Lab
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            An interactive platform for learning and experimenting with image processing
            algorithms and techniques through visual transformation pipelines.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/lessons"
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition-colors"
            >
              Explore Lessons
            </Link>
            <Link
              to="/lab"
              className="px-8 py-3 bg-gray-800 text-white font-medium rounded-lg shadow-md hover:bg-gray-900 transition-colors"
            >
              Open Lab
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Key Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              className="p-6 bg-blue-50 rounded-xl"
              whileHover={{ y: -5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <h3 className="text-xl font-semibold mb-3">Interactive Lessons</h3>
              <p className="text-gray-600">
                Learn through guided lessons with pre-built pipelines that demonstrate
                key concepts in image processing.
              </p>
            </motion.div>
            <motion.div
              className="p-6 bg-green-50 rounded-xl"
              whileHover={{ y: -5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <h3 className="text-xl font-semibold mb-3">Visual Pipeline Editor</h3>
              <p className="text-gray-600">
                Create custom image processing pipelines by connecting transformation
                nodes in an intuitive visual editor.
              </p>
            </motion.div>
            <motion.div
              className="p-6 bg-purple-50 rounded-xl"
              whileHover={{ y: -5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <h3 className="text-xl font-semibold mb-3">Real-time Processing</h3>
              <p className="text-gray-600">
                See the results of each transformation instantly and adjust parameters
                to understand their effect on the output.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Begin your journey into image processing with our curated lessons or jump
            straight into the lab to create your own transformations.
          </p>
          <Link
            to="/lessons"
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            Start Learning Now
          </Link>
        </div>
      </section>
    </div>
  );
} 