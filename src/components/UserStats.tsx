import { useState, useEffect } from 'react';
import api from '../utils/api';

interface UserStatsProps {
  refreshTrigger?: number; // Optional prop to trigger refresh when expenses change
}

interface Stats {
  totalOwed: number; // Money others owe you (you paid for them)
  totalOwing: number; // Money you owe others (your share of expenses)
  overallBalance: number; // Net balance (positive: others owe you, negative: you owe others)
  totalGroups: number;
  totalExpenses: number;
  totalPaid: number; // Total amount you've paid
  othersPaidYou: number; // Total amount others have paid you
  youNeedToPay: number; // Amount you need to pay
  othersYetToPay: number; // Amount others yet to pay you
}

const UserStats = ({ refreshTrigger = 0 }: UserStatsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalOwed: 0,
    totalOwing: 0,
    overallBalance: 0,
    totalGroups: 0,
    totalExpenses: 0,
    totalPaid: 0,
    othersPaidYou: 0,
    youNeedToPay: 0,
    othersYetToPay: 0
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
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6 border border-gray-100">
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6 border border-gray-100">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-xl rounded-lg mb-6 overflow-hidden border border-gray-200">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-red-500">Financial Summary</h3>
      </div>
      <div className="px-6 py-5">
        <div className="space-y-6">
          {/* First row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Your Share</p>
                  <p className="mt-1 text-2xl font-bold text-red-600">
                    ${stats.totalOwing.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Your total share of expenses</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">You Paid</p>
                  <p className="mt-1 text-2xl font-bold text-green-600">
                    ${stats.totalPaid.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total amount you've paid so far</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Second row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Others Paid You</p>
                  <p className="mt-1 text-2xl font-bold text-blue-600">
                    ${stats.othersPaidYou.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total amount others have paid you</p>
                </div>
              </div>
            </div>
            
            <div className={`${stats.youNeedToPay > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} rounded-lg p-4 border`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">You Need To Pay</p>
                  <p className={`mt-1 text-2xl font-bold ${stats.youNeedToPay > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    ${stats.youNeedToPay.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Amount you need to pay to others</p>
                </div>
              </div>
            </div>
          </div>

          {/* Third row - Others Yet to Pay */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Others Yet to Pay</p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">
                  ${stats.othersYetToPay.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Amount others still owe you</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStats; 