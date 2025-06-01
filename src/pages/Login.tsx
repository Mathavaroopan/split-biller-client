import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      
      // Store user info and token in localStorage
      localStorage.setItem('userInfo', JSON.stringify(data));
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data._id);
      
      // If redirectUrl is an invite link, handle it
      if (redirectUrl.startsWith('/invite/')) {
        navigate(redirectUrl);
      } else {
        // Otherwise redirect to dashboard or another specified page
        navigate(redirectUrl);
      }
    } catch (error: any) {
      setError(
        error.response?.data?.message || 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="flex flex-col md:flex-row shadow-xl max-w-4xl rounded-lg overflow-hidden w-full bg-white box-shadow-lg" 
           style={{ boxShadow: '0 10px 25px rgba(239, 68, 68, 0.5)' }}>
        {/* Left Panel - Red */}
        <div className="w-full md:w-1/2 bg-red-500 text-white p-8 md:p-12 flex flex-col justify-center items-center text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Hello, Friend!</h2>
          <p className="mb-8">Enter your personal details and start your journey with us</p>
          <Link 
            to={`/register${location.search}`} 
            className="border border-white text-white px-8 py-2 rounded-full hover:bg-white hover:text-red-500 transition duration-300"
          >
            SIGN UP
          </Link>
        </div>

        {/* Right Panel - White */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-red-500">Sign in</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="mb-6">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div className="mb-4 text-right">
                <a href="#" className="text-sm text-gray-600 hover:text-red-500">
                  Forgot your password?
                </a>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2 px-4 rounded-full text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Signing in...' : 'SIGN IN'}
                </button>
              </div>
              
              {/* Mobile only link */}
              <div className="mt-6 text-center md:hidden">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link to={`/register${location.search}`} className="font-medium text-red-500 hover:text-red-700">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 