import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Split {
  user: User;
  share: number;
  settled?: boolean;
  settledAt?: string;
}

interface Group {
  _id: string;
  name: string;
}

interface Expense {
  _id: string;
  title: string;
  amount: number;
  paidBy: User;
  groupId: string | Group;
  splitType: 'equal' | 'percentage' | 'exact';
  splits: Split[];
  category: string;
  notes?: string;
  createdAt: string;
  groupName?: string; // Optional field that might be populated
}

const ExpenseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [settleSuccess, setSettleSuccess] = useState('');
  const [groupData, setGroupData] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    // If the expense is passed in location state, use it directly
    if (location.state && location.state.expense) {
      setExpense(location.state.expense);
      extractGroupInfo(location.state.expense);
      setLoading(false);
    } else if (id) {
      // Otherwise fetch it from the API
      fetchExpenseDetails();
    }
  }, [id, location.state]);

  const extractGroupInfo = (expenseData: Expense) => {
    // Handle different possible formats of groupId
    if (typeof expenseData.groupId === 'string') {
      // If it's just a string ID, try to use the groupName property or fetch the group
      if (expenseData.groupName) {
        setGroupData({
          id: expenseData.groupId,
          name: expenseData.groupName
        });
      } else {
        // Fetch group details if needed
        fetchGroupDetails(expenseData.groupId);
      }
    } else if (typeof expenseData.groupId === 'object' && expenseData.groupId !== null) {
      // If it's an object with name property
      setGroupData({
        id: expenseData.groupId._id,
        name: expenseData.groupId.name
      });
    }
  };

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const { data } = await api.get(`/api/groups/${groupId}`);
      setGroupData({
        id: data._id,
        name: data.name
      });
    } catch (err) {
      console.error('Error fetching group details:', err);
      // Set a fallback name if we can't fetch it
      setGroupData({
        id: groupId,
        name: 'Group'
      });
    }
  };

  const fetchExpenseDetails = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/expenses/${id}`);
      setExpense(data);
      extractGroupInfo(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch expense details');
      console.error('Error fetching expense details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expense) return;
    
    try {
      setDeleteLoading(true);
      await api.delete(`/api/expenses/${expense._id}`);
      
      // Redirect back to the group or expenses page
      if (groupData) {
        navigate(`/groups/${groupData.id}`);
      } else {
        navigate('/expenses');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete expense');
      console.error('Error deleting expense:', err);
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleSettleExpense = async (userId: string) => {
    if (!expense) return;
    
    try {
      // Call the API to settle just this specific split
      await api.post(`/api/expenses/${expense._id}/settle-split`, { userId });
      
      // Show success message
      setSettleSuccess(`Payment from ${expense.splits.find(s => s.user._id === userId)?.user.name || 'user'} marked as settled successfully`);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSettleSuccess('');
      }, 3000);
      
      // Refresh expense details
      fetchExpenseDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to settle expense split');
      console.error('Error settling expense split:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>

        <div className="mt-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Expense not found</h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/expenses')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600"
            >
              Back to Expenses
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentUserId = localStorage.getItem('userId') || '';
  const isCurrentUserPayer = expense.paidBy._id === currentUserId;
  const currentUserSplit = expense.splits.find(split => split.user._id === currentUserId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
        </div>
        
        <div className="flex space-x-3">
          {isCurrentUserPayer && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Expense
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {expense.title}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Added on {new Date(expense.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Amount</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-bold">${expense.amount.toFixed(2)}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Group</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {groupData && (
                  <Link to={`/groups/${groupData.id}`} className="text-red-500 hover:text-red-700">
                    {groupData.name}
                  </Link>
                )}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Paid by</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {expense.paidBy.name}
                {isCurrentUserPayer && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                    You
                  </span>
                )}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                  {expense.category || 'General'}
                </span>
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Split type</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {expense.splitType === 'equal' 
                  ? 'Equal split' 
                  : expense.splitType === 'percentage' 
                    ? 'Percentage split' 
                    : 'Exact amounts'}
              </dd>
            </div>
            {expense.notes && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{expense.notes}</dd>
              </div>
            )}
            <div className="bg-white px-4 py-5 sm:px-6">
              <div className="border-t border-gray-200 pt-4">
                <dt className="text-sm font-medium text-gray-500 mb-4">How it's split</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                    {expense.splits.map(split => (
                      <li key={split.user._id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                        <div className="w-0 flex-1 flex items-center">
                          <span className="ml-2 flex-1">
                            {split.user.name}
                            {split.user._id === currentUserId && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                You
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium mr-4">${split.share.toFixed(2)}</span>
                          {split.settled ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Settled
                              {split.settledAt && ` on ${new Date(split.settledAt).toLocaleDateString()}`}
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">
                                Pending
                              </span>
                              {isCurrentUserPayer && split.user._id !== currentUserId && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSettleExpense(split.user._id);
                                  }}
                                  className="text-green-600 hover:text-green-800 text-xs font-medium"
                                >
                                  Mark as Settled
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {settleSuccess && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-md" role="alert">
          <span className="block sm:inline">{settleSuccess}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowDeleteModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-50"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 relative z-50" onClick={(e) => e.stopPropagation()}>
              <div>
                <div className="mt-3 text-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Expense</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this expense? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:text-sm"
                  onClick={handleDeleteExpense}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:text-sm"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseDetails; 