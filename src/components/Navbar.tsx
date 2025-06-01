import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  // Check if the current route is login or register
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  // Don't show navbar on login or register pages
  if (isAuthPage) return null;

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/dashboard" className="text-red-500 font-bold text-2xl">
                SplitBiller
              </Link>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/dashboard'
                  ? 'text-white bg-red-500'
                  : 'text-gray-700 hover:bg-red-100 hover:text-red-500'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/groups"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/groups'
                  ? 'text-white bg-red-500'
                  : 'text-gray-700 hover:bg-red-100 hover:text-red-500'
              }`}
            >
              Groups
            </Link>
            <Link
              to="/expenses"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/expenses'
                  ? 'text-white bg-red-500'
                  : 'text-gray-700 hover:bg-red-100 hover:text-red-500'
              }`}
            >
              Expenses
            </Link>
            <Link
              to="/settings"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/settings'
                  ? 'text-white bg-red-500'
                  : 'text-gray-700 hover:bg-red-100 hover:text-red-500'
              }`}
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              {!isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/dashboard"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/dashboard'
                  ? 'text-white bg-red-500'
                  : 'text-gray-700 hover:bg-red-100 hover:text-red-500'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/groups"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/groups'
                  ? 'text-white bg-red-500'
                  : 'text-gray-700 hover:bg-red-100 hover:text-red-500'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Groups
            </Link>
            <Link
              to="/expenses"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/expenses'
                  ? 'text-white bg-red-500'
                  : 'text-gray-700 hover:bg-red-100 hover:text-red-500'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Expenses
            </Link>
            <Link
              to="/settings"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/settings'
                  ? 'text-white bg-red-500'
                  : 'text-gray-700 hover:bg-red-100 hover:text-red-500'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Settings
            </Link>
            <button
              onClick={() => {
                handleLogout();
                setIsMenuOpen(false);
              }}
              className="w-full text-left mt-2 px-3 py-2 rounded-md text-base font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 