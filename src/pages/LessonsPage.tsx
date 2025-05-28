import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import LessonCard from '../components/LessonCard';
import { usePipeline } from '../contexts/PipelineContext';
import { sampleLessons } from '../utils/sampleData';
import type { Lesson } from '../utils/types';

// Group lessons by category based on ID prefix
const groupLessonsByCategory = (lessons: Lesson[]) => {
  const categories: Record<string, { name: string, lessons: Lesson[] }> = {
    'edge-detection': {
      name: 'Edge Detection',
      lessons: []
    },
    'filters': {
      name: 'Filters',
      lessons: []
    },
    'transformations': {
      name: 'Transformations',
      lessons: []
    }
  };
  
  lessons.forEach(lesson => {
    if (lesson.id.startsWith('edge-detection')) {
      categories['edge-detection'].lessons.push(lesson);
    } else if (lesson.id.startsWith('gaussian') || lesson.id.includes('filter')) {
      categories['filters'].lessons.push(lesson);
    } else {
      categories['transformations'].lessons.push(lesson);
    }
  });
  
  return Object.values(categories).filter(category => category.lessons.length > 0);
};

export default function LessonsPage() {
  // Get available lessons from sample data since the PipelineContext doesn't have lessons
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Use sample lessons directly
  const allLessons = sampleLessons;
  const categories = groupLessonsByCategory(allLessons);
  
  // Filter lessons by active category, or show all if no category is selected
  const displayLessons = activeCategory 
    ? categories.find(category => category.name === activeCategory)?.lessons || []
    : allLessons;
  
  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Image Processing Lessons
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Explore our curated lessons to learn various image processing techniques
            through interactive visualizations and step-by-step guides.
          </p>
          
          {/* Category filters */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
              onClick={() => setActiveCategory(null)}
            >
              All Lessons
            </button>
            {categories.map(category => (
              <button
                key={category.name}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
                onClick={() => setActiveCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </header>
        
        {activeCategory === null ? (
          // Display lessons by category when no filter is applied
          <div className="space-y-16">
            {categories.map(category => (
              <section key={category.name}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">{category.name}</h2>
                  <button
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    onClick={() => setActiveCategory(category.name)}
                  >
                    View All {category.name} Lessons →
                  </button>
                </div>
                
                <motion.div 
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {category.lessons.slice(0, 3).map((lesson) => (
                    <motion.div key={lesson.id} variants={itemVariants}>
                      <LessonCard lesson={lesson} />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            ))}
          </div>
        ) : (
          // Display filtered lessons when a category is selected
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {displayLessons.map((lesson) => (
              <motion.div key={lesson.id} variants={itemVariants}>
                <LessonCard lesson={lesson} />
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {displayLessons.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No lessons available yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
} 