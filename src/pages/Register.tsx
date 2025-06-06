import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

const Register = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const inviteToken = queryParams.get('invite');
  const emailParam = queryParams.get('email');

  // Pre-fill email if provided in URL
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Validate username
  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError('Username is required');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return false;
    }

    setUsernameError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUsernameError('');

    // Validate username
    if (!validateUsername(username)) {
      return;
    }

    // Password validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Register the user
      const { data } = await api.post('/api/auth/register', {
        name,
        username,
        email,
        phone,
        password,
      });
      
      // Store user info in localStorage
      localStorage.setItem('userInfo', JSON.stringify(data));
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data._id);
      
      // If there's an invite token, accept the invitation
      if (inviteToken) {
        try {
          const joinResponse = await api.get(`/api/groups/join/${inviteToken}`);
          // Redirect to the group page
          navigate(`/groups/${joinResponse.data.group._id}`);
        } catch (joinError: any) {
          console.error('Error joining group:', joinError);
          // Even if joining the group fails, redirect to dashboard
          navigate('/dashboard');
        }
      } else {
        // Redirect to dashboard if no invitation
        navigate('/dashboard');
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
      <div className="flex flex-col md:flex-row shadow-lg max-w-4xl rounded-lg overflow-hidden w-full bg-white"
           style={{ boxShadow: '0 10px 25px rgba(239, 68, 68, 0.5)' }}>
        {/* Left Panel - Red */}
        <div className="w-full md:w-1/2 bg-red-500 text-white p-8 md:p-12 flex flex-col justify-center items-center text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Welcome Back!</h2>
          <p className="mb-8">To keep connected with us please login with your personal info</p>
          <Link 
            to={`/login${location.search}`}
            className="border border-white text-white px-8 py-2 rounded-full hover:bg-white hover:text-red-500 transition duration-300"
          >
            SIGN IN
          </Link>
        </div>

        {/* Right Panel - White */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-red-500">Create Account</h2>
            
            {inviteToken && emailParam && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">You've been invited to join a group! Complete registration to join.</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className={`w-full px-3 py-2 border ${usernameError ? 'border-red-500' : 'border-gray-300'} rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                  placeholder="Username (letters, numbers, and _ only)"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    validateUsername(e.target.value);
                  }}
                />
                {usernameError && (
                  <p className="mt-1 text-xs text-red-500">{usernameError}</p>
                )}
              </div>
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
                  // Disable email field if it came from an invitation
                  readOnly={!!emailParam}
                />
              </div>
              <div className="mb-4">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="mb-6">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2 px-4 rounded-full text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Creating account...' : 'SIGN UP'}
                </button>
              </div>
              
              {/* Mobile only link */}
              <div className="mt-6 text-center md:hidden">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link to={`/login${location.search}`} className="font-medium text-red-500 hover:text-red-700">
                    Sign in
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

export default Register; 