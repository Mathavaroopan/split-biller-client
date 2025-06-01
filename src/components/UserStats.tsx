import { useState, useEffect } from 'react';
import api from '../utils/api';

interface UserStatsProps {
  refreshTrigger?: number; // Optional prop to trigger refresh when expenses change
}

interface Stats {
  totalOwed: number;
  totalOwing: number;
  overallBalance: number;
  totalGroups: number;
  totalExpenses: number;
}

const UserStats = ({ refreshTrigger = 0 }: UserStatsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalOwed: 0,
    totalOwing: 0,
    overallBalance: 0,
    totalGroups: 0,
    totalExpenses: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/api/users/stats');
        setStats(data);
        setError('');
      } catch (err: any) {
        console.error('Error fetching user stats:', err);
        setError('Could not load balance information');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [refreshTrigger]); // Refresh when trigger changes

  if (loading) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-700 mb-1">Pending Receivables</h2>
        <p className="text-3xl font-bold text-gray-800 mb-4">
          ${stats.overallBalance.toFixed(2)}
          <span className="text-base ml-2 font-normal text-gray-500">
            {stats.overallBalance === 0 
              ? '(settled up)' 
              : stats.overallBalance > 0 
                ? '(others owe you)' 
                : '(you owe others)'}
          </span>
        </p>
        
        <div className="grid grid-cols-2 gap-8 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Your Share</p>
            <p className="text-xl font-bold text-red-500">
              ${Math.abs(stats.totalOwing).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">How much you owe after splitting expenses</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Your Total Contributions</p>
            <p className="text-xl font-bold text-green-500">
              ${stats.totalOwed.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total amount you've paid so far</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStats; 