import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    
    if (!userInfo) {
      navigate('/login');
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const { data } = await api.get('/api/auth/me');
        setUser(data);
      } catch (error) {
        console.error('Failed to fetch user profile', error);
        localStorage.removeItem('userInfo');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome to your split-billing dashboard</p>
      </div>
      
      {user && (
        <div className="bg-white overflow-hidden shadow-lg rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-red-500">User Profile</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details</p>
          </div>
          <div className="px-6 py-5">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Full name</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email address</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone number</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.phone}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity Card */}
        <div className="bg-white overflow-hidden shadow-lg rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-red-500">Recent Activity</h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-500">No recent activity to show.</p>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="bg-white overflow-hidden shadow-lg rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-red-500">Total Balance</h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-3xl font-bold text-gray-900">$0.00</p>
            <p className="mt-1 text-sm text-gray-500">You're all settled up!</p>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white overflow-hidden shadow-lg rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-red-500">Quick Actions</h3>
          </div>
          <div className="px-6 py-5 space-y-2">
            <button className="w-full px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Create a new group
            </button>
            <button className="w-full px-4 py-2 text-sm font-medium text-red-500 border border-red-500 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Add an expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 