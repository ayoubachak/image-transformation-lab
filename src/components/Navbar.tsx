import { useState, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

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
];

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Lab', href: '/lab' },
  { name: 'About', href: '/about' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Navbar() {
  const location = useLocation();
  
  // Check if the current path matches the given path
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  // Check if the current path is a lesson under a category
  const isCategoryActive = (category: typeof lessonCategories[0]) => {
    return category.lessons.some(lesson => location.pathname === lesson.href);
  };

  return (
    <Disclosure as="nav" className="bg-gray-800">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-between">
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                {/* Mobile menu button*/}
                <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
              <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                <div className="flex flex-shrink-0 items-center">
                  <span className="text-white font-bold text-xl">Image Transform Lab</span>
                </div>
                <div className="hidden sm:ml-6 sm:block">
                  <div className="flex space-x-4">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={classNames(
                          isActive(item.href)
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                          'rounded-md px-3 py-2 text-sm font-medium'
                        )}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                      >
                        {item.name}
                      </Link>
                    ))}
                    
                    {/* Lessons Dropdown */}
                    <Menu as="div" className="relative inline-block text-left">
                      <div>
                        <Menu.Button
                          className={classNames(
                            location.pathname.includes('/lessons') || location.pathname.includes('/lesson-categories')
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                            'rounded-md px-3 py-2 text-sm font-medium inline-flex items-center'
                          )}
                        >
                          Lessons
                          <ChevronDownIcon className="ml-1 -mr-1 h-5 w-5" aria-hidden="true" />
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
                        <Menu.Items className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                            <Link 
                              to="/lessons" 
                              className={classNames(
                                isActive('/lessons')
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'text-gray-700 hover:bg-gray-100',
                                'block px-4 py-2 text-sm border-b'
                              )}
                            >
                              All Lessons
                            </Link>
                            
                            {lessonCategories.map((category) => (
                              <Menu as="div" key={category.name} className="relative w-full">
                                <div>
                                  <Menu.Button
                                    className={classNames(
                                      isActive(category.href) || isCategoryActive(category)
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-700 hover:bg-gray-100',
                                      'block w-full text-left px-4 py-2 text-sm flex justify-between items-center'
                                    )}
                                  >
                                    {category.name}
                                    <ChevronDownIcon className="ml-1 h-4 w-4" aria-hidden="true" />
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
                                  <Menu.Items className="absolute left-full top-0 ml-1 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    <div className="py-1">
                                      {category.lessons.map((lesson) => (
                                        <Link
                                          key={lesson.name}
                                          to={lesson.href}
                                          className={classNames(
                                            isActive(lesson.href)
                                              ? 'bg-gray-100 text-gray-900'
                                              : 'text-gray-700 hover:bg-gray-100',
                                            'block px-4 py-2 text-sm'
                                          )}
                                        >
                                          {lesson.name}
                                        </Link>
                                      ))}
                                    </div>
                                  </Menu.Items>
                                </Transition>
                              </Menu>
                            ))}
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    isActive(item.href)
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    'block rounded-md px-3 py-2 text-base font-medium'
                  )}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile Lessons Section */}
              <Disclosure>
                {({ open }) => (
                  <>
                    <Disclosure.Button
                      className={classNames(
                        location.pathname.includes('/lessons') || location.pathname.includes('/lesson-categories')
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                        'flex justify-between w-full rounded-md px-3 py-2 text-base font-medium'
                      )}
                    >
                      <span>Lessons</span>
                      <ChevronDownIcon
                        className={classNames(
                          open ? 'rotate-180 transform' : '',
                          'h-5 w-5'
                        )}
                      />
                    </Disclosure.Button>
                    <Disclosure.Panel className="px-4 pt-2 pb-2 text-sm">
                      <Link
                        to="/lessons"
                        className="block py-2 text-gray-300 hover:text-white"
                      >
                        All Lessons
                      </Link>
                      {lessonCategories.map((category) => (
                        <Disclosure key={category.name}>
                          {({ open }) => (
                            <>
                              <Disclosure.Button
                                className="flex justify-between w-full py-2 text-gray-300 hover:text-white"
                              >
                                <span>{category.name}</span>
                                <ChevronDownIcon
                                  className={classNames(
                                    open ? 'rotate-180 transform' : '',
                                    'h-5 w-5'
                                  )}
                                />
                              </Disclosure.Button>
                              <Disclosure.Panel className="pl-4">
                                {category.lessons.map((lesson) => (
                                  <Link
                                    key={lesson.name}
                                    to={lesson.href}
                                    className="block py-2 text-gray-400 hover:text-white"
                                  >
                                    {lesson.name}
                                  </Link>
                                ))}
                              </Disclosure.Panel>
                            </>
                          )}
                        </Disclosure>
                      ))}
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
} 