import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Lesson } from '../utils/types';

interface LessonCardProps {
  lesson: Lesson;
}

export default function LessonCard({ lesson }: LessonCardProps) {
  return (
    <motion.div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
      whileHover={{ y: -5 }}
    >
      <Link to={`/lessons/${lesson.id}`}>
        <img 
          src={lesson.image} 
          alt={lesson.title} 
          className="w-full h-48 object-cover"
        />
        <div className="p-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{lesson.title}</h3>
          <p className="text-gray-600 line-clamp-3">{lesson.description}</p>
          <div className="mt-4 flex justify-end">
            <span className="text-blue-600 font-medium">Start Lesson →</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
} 