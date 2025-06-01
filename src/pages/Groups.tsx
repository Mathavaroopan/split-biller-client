import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import UserStats from '../components/UserStats';

interface Group {
  _id: string;
  name: string;
  members: any[];
  expenses: any[];
  createdBy: string;
  createdAt: string;
}

const Groups = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statsTrigger, setStatsTrigger] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/groups');
      setGroups(data);
      setError('');
      // Trigger a refresh of stats after groups are loaded
      setStatsTrigger(prev => prev + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch groups');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    
    try {
      setLoading(true);
      await api.post('/api/groups', { 
        name: groupName, 
        // The backend doesn't currently support description, but we'll keep it in the UI
        // description: groupDescription 
      });
      
      // Reset form
      setGroupName('');
      setGroupDescription('');
      setShowCreateForm(false);
      setError('');
      
      // Fetch updated groups list
      fetchGroups();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create group');
      console.error('Error creating group:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter groups by name
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your expense sharing groups</p>
      </div>

      {/* User Stats Component */}
      <UserStats refreshTrigger={statsTrigger} />

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Create Group Card */}
      <div className="bg-white overflow-hidden shadow-lg rounded-lg mb-8">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-red-500">Create a New Group</h3>
            <p className="mt-1 text-sm text-gray-500">Start tracking shared expenses with friends, roommates or family</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {showCreateForm ? 'Cancel' : 'Create Group'}
          </button>
        </div>

        {showCreateForm && (
          <div className="px-6 py-5">
            <form onSubmit={handleCreateGroup}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="group-name" className="block text-sm font-medium text-gray-700">
                    Group Name
                  </label>
                  <input
                    type="text"
                    id="group-name"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    id="description"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        )}

        {!showCreateForm && (
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-semibold text-red-500">Track Expenses</div>
                <p className="mt-2 text-sm text-gray-600">
                  Easily track who paid for what and split bills fairly
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-semibold text-red-500">Settle Debts</div>
                <p className="mt-2 text-sm text-gray-600">
                  See who owes what and settle up with minimal transactions
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-semibold text-red-500">Stay Organized</div>
                <p className="mt-2 text-sm text-gray-600">
                  Keep all your shared expenses organized by group
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Existing Groups */}
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Your Groups</h3>
        <div className="relative">
          <input
            type="text"
            className="border border-gray-300 rounded-md py-2 px-3 pl-10 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {loading && !showCreateForm ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
        </div>
      ) : filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <div 
              key={group._id}
              className="bg-white overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => navigate(`/groups/${group._id}`)}
            >
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-red-500">{group.name}</h3>
                {/* Date formatting */}
                <p className="mt-1 text-sm text-gray-500">
                  Created {new Date(group.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="px-6 py-5">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">{group.members.length} members</div>
                  <div className="text-sm font-medium text-gray-600">
                    {group.expenses.length} expenses
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white overflow-hidden shadow-lg rounded-lg">
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No groups yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first group</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Create a Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups; 