import { Fragment, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
  BeakerIcon,
  BookOpenIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Lesson categories and their lessons
const lessonCategories = [
  {
    name: 'Edge Detection',
    href: '/lesson-categories/edge-detection',
    lessons: [
      { name: 'Laplacian Edge Detection', href: '/lessons/edge-detection-laplacian' },
      { name: 'Sobel Edge Detection', href: '/lessons/edge-detection-sobel' },
      { name: 'Canny Edge Detection', href: '/lessons/edge-detection-canny' },
    ],
  },
  {
    name: 'Filters',
    href: '/lesson-categories/filters',
    lessons: [
      { name: 'Gaussian Blur', href: '/lessons/gaussian-blur' },
      { name: 'Median Filter', href: '/lessons/median-filter' },
    ],
  },
  {
    name: 'Transformations',
    href: '/lesson-categories/transformations',
    lessons: [
      { name: 'Grayscale', href: '/lessons/grayscale' },
      { name: 'Threshold', href: '/lessons/threshold' },
    ],
  },
  {
    name: 'Mini-Projects',
    href: '/lesson-categories/mini-projects',
    lessons: [
      { name: 'License Plate Detection', href: '/lessons/license-plate-detection' },
      { name: 'Line Segmentation', href: '/lessons/line-segmentation' },
      { name: 'Cell Detection', href: '/lessons/cell-detection' },
    ],
  },
];

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Lab', href: '/lab', icon: BeakerIcon },
  { name: 'About', href: '/about', icon: InformationCircleIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Navbar() {
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Check if the current path matches the given path
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  // Check if the current path is a lesson under a category
  const isCategoryActive = (category: typeof lessonCategories[0]) => {
    return category.lessons.some(lesson => location.pathname === lesson.href);
  };

  // Toggle category expansion
  const toggleCategory = (categoryName: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Logo/Brand with Home Icon - Left Aligned */}
          <div className="flex flex-shrink-0 items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <HomeIcon className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-white font-bold text-xl group-hover:text-gray-300 transition-colors">
                Image Transform Lab
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation - Right Side */}
          <div className="flex items-center space-x-4">
            {navigation.slice(1).map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    isActive(item.href)
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    'rounded-md px-3 py-2 text-sm font-medium inline-flex items-center space-x-1'
                  )}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            {/* Lessons Dropdown */}
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button
                  className={classNames(
                    location.pathname.includes('/lessons') || location.pathname.includes('/lesson-categories')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    'rounded-md px-3 py-2 text-sm font-medium inline-flex items-center space-x-1'
                  )}
                >
                  <BookOpenIcon className="h-4 w-4" />
                  <span>Lessons</span>
                  <ChevronDownIcon className="ml-1 -mr-1 h-4 w-4" aria-hidden="true" />
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-96 overflow-y-auto">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <Link 
                          to="/lessons" 
                          className={classNames(
                            active || isActive('/lessons')
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700',
                            'block px-4 py-2 text-sm border-b font-medium hover:bg-gray-100'
                          )}
                        >
                          📚 All Lessons
                        </Link>
                      )}
                    </Menu.Item>
                    
                    {lessonCategories.map((category) => (
                      <div key={category.name}>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => toggleCategory(category.name, e)}
                              className={classNames(
                                active || isActive(category.href) || isCategoryActive(category)
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'text-gray-700',
                                'w-full text-left px-4 py-2 text-sm flex justify-between items-center hover:bg-gray-100'
                              )}
                            >
                              <span className="flex items-center space-x-2">
                                <span>
                                  {category.name === 'Edge Detection' && '🔍'}
                                  {category.name === 'Filters' && '🎛️'}
                                  {category.name === 'Transformations' && '⚡'}
                                  {category.name === 'Mini-Projects' && '🚀'}
                                </span>
                                <span>{category.name}</span>
                              </span>
                              {expandedCategories.has(category.name) ? (
                                <ChevronDownIcon className="h-4 w-4 transition-transform" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4 transition-transform" />
                              )}
                            </button>
                          )}
                        </Menu.Item>
                        
                        {expandedCategories.has(category.name) && (
                          <div className="bg-gray-50 border-l-2 border-blue-200">
                            {category.lessons.map((lesson) => (
                              <Menu.Item key={lesson.name}>
                                {({ active }) => (
                                  <Link
                                    to={lesson.href}
                                    className={classNames(
                                      active || isActive(lesson.href)
                                        ? 'bg-blue-50 text-blue-900 border-l-2 border-blue-500'
                                        : 'text-gray-700',
                                      'block px-6 py-2 text-sm hover:bg-blue-50 hover:text-blue-900'
                                    )}
                                  >
                                    {lesson.name}
                                  </Link>
                                )}
                              </Menu.Item>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </nav>
  );
} 