import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import UserStats from '../components/UserStats';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Split {
  user: User;
  share: number;
}

interface Expense {
  _id: string;
  title: string;
  amount: number;
  paidBy: User;
  groupId: string;
  splitType: 'equal' | 'percentage' | 'exact';
  splits: Split[];
  category: string;
  notes?: string;
  createdAt: string;
}

interface Group {
  _id: string;
  name: string;
  members: User[];
  expenses: string[] | Expense[];
  createdBy: User;
  createdAt: string;
}

// CSS class for enhanced box shadows
const enhancedShadowClass = "shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-100";

const GroupDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // New expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('general');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'exact'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [expenseLoading, setExpenseLoading] = useState(false);

  // Additional state for user's overall stats
  const [userStats, setUserStats] = useState({
    totalGroups: 0,
    totalExpenses: 0,
    totalOwed: 0,
    totalOwe: 0
  });

  // Additional state for invitations
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteMessage, setInviteMessage] = useState('');

  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

  useEffect(() => {
    if (group) {
      fetchExpenses();
    }
  }, [group]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/groups/${id}`);
      setGroup(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch group details');
      console.error('Error fetching group details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    if (!id) return;
    
    try {
      const { data } = await api.get(`/api/groups/${id}/expenses`);
      setExpenses(data);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
    }
  };

  // Fetch pending invitations
  const fetchInvitations = async () => {
    if (!id) return;
    
    try {
      setInviteLoading(true);
      const { data } = await api.get(`/api/groups/${id}/invitations`);
      
      // Validate the data before setting it
      if (Array.isArray(data)) {
        // Ensure each invitation has a valid _id (MongoDB ObjectIDs are 24 characters)
        const validInvitations = data.filter(invite => {
          if (!invite || !invite._id) {
            console.warn('Invitation missing _id:', invite);
            return false;
          }
          
          const idString = invite._id.toString();
          if (idString.length !== 24) {
            console.warn('Invalid ObjectID length for invitation:', idString);
            return false;
          }
          
          return true;
        });
        
        console.log(`Loaded ${validInvitations.length} valid invitations`);
        setInvitations(validInvitations);
        
        if (validInvitations.length !== data.length) {
          console.warn(`Filtered out ${data.length - validInvitations.length} invalid invitations`);
        }
      } else {
        console.error('Invalid invitations data received:', data);
        setInvitations([]);
      }
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
      setError('Failed to load invitations');
    } finally {
      setInviteLoading(false);
    }
  };

  useEffect(() => {
    if (group && activeTab === 'members') {
      fetchInvitations();
    }
  }, [group, activeTab]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      setError('Email is required');
      return;
    }
    
    try {
      setInviteLoading(true);
      setError('');
      setInviteSuccess('');
      
      await api.post(`/api/groups/${id}/invite`, { 
        email: inviteEmail,
        message: inviteMessage // Optional personalized message
      });
      
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteMessage('');
      
      // Refresh invitations list
      fetchInvitations();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send invitation');
      console.error('Error inviting member:', err);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseTitle.trim() || !expenseAmount.trim()) {
      setError('Title and amount are required');
      return;
    }
    
    try {
      setExpenseLoading(true);
      setError('');
      
      const amount = parseFloat(expenseAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount');
        setExpenseLoading(false);
        return;
      }
      
      // Prepare the expense data
      const expenseData = {
        title: expenseTitle,
        amount,
        groupId: id,
        splitType,
        category: expenseCategory,
        notes: expenseNotes
      };
      
      // Add custom splits data if not equal split
      if (splitType !== 'equal' && Object.keys(customSplits).length > 0) {
        Object.assign(expenseData, { splits: customSplits });
      }
      
      await api.post('/api/expenses', expenseData);
      
      // Reset form
      setExpenseTitle('');
      setExpenseAmount('');
      setExpenseCategory('general');
      setExpenseNotes('');
      setSplitType('equal');
      setCustomSplits({});
      setShowExpenseForm(false);
      
      // Refresh expenses
      fetchExpenses();
      fetchGroupDetails(); // Refresh group data too
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add expense');
      console.error('Error adding expense:', err);
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }
    
    try {
      await api.delete(`/api/expenses/${expenseId}`);
      fetchExpenses();
      fetchGroupDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete expense');
      console.error('Error deleting expense:', err);
    }
  };

  // Calculate balances and debts
  const calculateBalances = () => {
    if (!expenses || !group?.members) return {};
    
    // Initialize balances for all members
    const balances: Record<string, number> = {};
    group.members.forEach(member => {
      balances[member._id] = 0;
    });
    
    // Calculate balances based on expenses
    expenses.forEach(expense => {
      // Add full amount to payer's balance
      balances[expense.paidBy._id] += expense.amount;
      
      // Deduct shares from each participant based on the splits
      expense.splits.forEach(split => {
        balances[split.user._id] -= split.share;
      });
    });
    
    return balances;
  };

  const balances = calculateBalances();

  // Calculate summary balances for the current user
  const calculateUserBalanceSummary = () => {
    if (!balances || Object.keys(balances).length === 0) {
      return { youOwe: 0, owedToYou: 0, netBalance: 0 };
    }

    // Assuming the current user is the one who's logged in
    // In a real app, this would be from the auth context
    const currentUserId = localStorage.getItem('userId') || '';
    
    const currentUserBalance = balances[currentUserId] || 0;
    
    // If balance is positive, others owe you money
    // If balance is negative, you owe others money
    return {
      youOwe: currentUserBalance < 0 ? Math.abs(currentUserBalance) : 0,
      owedToYou: currentUserBalance > 0 ? currentUserBalance : 0,
      netBalance: currentUserBalance
    };
  };

  const userBalanceSummary = calculateUserBalanceSummary();

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>

        {/* User Stats */}
        <UserStats refreshTrigger={expenses.length} />

        <div className="mt-4">
          <button
            onClick={() => navigate('/groups')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600"
          >
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Group not found</h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/groups')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600"
            >
              Back to Groups
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {group.members.length} {group.members.length === 1 ? 'member' : 'members'} · Created {new Date(group.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button
            onClick={() => setActiveTab('members')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Manage Members
          </button>
        </div>
      </div>

      {/* User Stats */}
      <UserStats refreshTrigger={expenses.length} />

      {inviteSuccess && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-md" role="alert">
          <span className="block sm:inline">{inviteSuccess}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Members
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Group Summary */}
            <div className={`bg-white ${enhancedShadowClass} rounded-lg overflow-hidden`}>
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-red-500">Group Summary</h3>
              </div>
              <div className="px-6 py-5">
                <dl className="grid grid-cols-1 gap-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <dt className="text-sm font-medium text-gray-500">Group name</dt>
                    <dd className="text-sm font-semibold text-gray-900">{group.name}</dd>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <dt className="text-sm font-medium text-gray-500">Created by</dt>
                    <dd className="text-sm font-semibold text-gray-900 flex items-center">
                      {group.createdBy?.name || 'Unknown'}
                      {group.createdBy._id === localStorage.getItem('userId') && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          You
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <dt className="text-sm font-medium text-gray-500">Date created</dt>
                    <dd className="text-sm font-semibold text-gray-900">
                      {new Date(group.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Members</dt>
                    <dd className="mt-2 flex justify-center items-baseline">
                      <span className="text-2xl font-semibold text-red-600">{group.members.length}</span>
                      <span className="ml-2 text-xs text-gray-500">people</span>
                    </dd>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expenses</dt>
                    <dd className="mt-2 flex justify-center items-baseline">
                      <span className="text-2xl font-semibold text-red-600">{expenses.length}</span>
                      <span className="ml-2 text-xs text-gray-500">total</span>
                    </dd>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Summary */}
            <div className={`bg-white ${enhancedShadowClass} rounded-lg overflow-hidden`}>
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-red-500">Balance Summary</h3>
              </div>
              <div className="px-6 py-5">
                {Object.keys(balances).length > 0 ? (
                  <div className="space-y-6">
                    {/* Visualized balance stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-red-800">You owe</p>
                            <p className="mt-1 text-2xl font-bold text-red-600">
                              ${userBalanceSummary.youOwe.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-800">You are owed</p>
                            <p className="mt-1 text-2xl font-bold text-green-600">
                              ${userBalanceSummary.owedToYou.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Net balance */}
                    <div className="text-center py-2 border-t border-gray-100 pt-4">
                      <p className="text-sm font-medium text-gray-600">Overall balance</p>
                      <div className={`text-2xl font-bold ${
                        userBalanceSummary.netBalance > 0 
                          ? 'text-green-600' 
                          : userBalanceSummary.netBalance < 0 
                            ? 'text-red-600' 
                            : 'text-gray-600'
                      }`}>
                        {userBalanceSummary.netBalance === 0 
                          ? '$0.00 (settled up)' 
                          : userBalanceSummary.netBalance > 0 
                            ? `+$${userBalanceSummary.netBalance.toFixed(2)}` 
                            : `-$${Math.abs(userBalanceSummary.netBalance).toFixed(2)}`}
                      </div>
                    </div>
                    
                    {/* Quick actions */}
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => setShowExpenseForm(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Expense
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-32">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">No expenses yet</p>
                      <button
                        onClick={() => setShowExpenseForm(true)}
                        className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add First Expense
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add Expense Form */}
          {showExpenseForm && (
            <div className={`my-6 bg-white ${enhancedShadowClass} rounded-lg overflow-hidden`}>
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-red-500">Add New Expense</h3>
              </div>
              <div className="px-6 py-5">
                <form onSubmit={handleAddExpense}>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="expense-title" className="block text-sm font-medium text-gray-700">
                        Title
                      </label>
                      <input
                        type="text"
                        id="expense-title"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                        value={expenseTitle}
                        onChange={(e) => setExpenseTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="expense-amount" className="block text-sm font-medium text-gray-700">
                        Amount
                      </label>
                      <input
                        type="number"
                        id="expense-amount"
                        required
                        min="0.01"
                        step="0.01"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="expense-category" className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select
                        id="expense-category"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                      >
                        <option value="general">General</option>
                        <option value="food">Food</option>
                        <option value="transportation">Transportation</option>
                        <option value="housing">Housing</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="utilities">Utilities</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="split-type" className="block text-sm font-medium text-gray-700">
                        Split Type
                      </label>
                      <select
                        id="split-type"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                        value={splitType}
                        onChange={(e) => setSplitType(e.target.value as 'equal' | 'percentage' | 'exact')}
                      >
                        <option value="equal">Equal</option>
                        <option value="percentage">By Percentage</option>
                        <option value="exact">Exact Amounts</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label htmlFor="expense-notes" className="block text-sm font-medium text-gray-700">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="expense-notes"
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      value={expenseNotes}
                      onChange={(e) => setExpenseNotes(e.target.value)}
                    />
                  </div>
                  
                  {/* Custom splits would be implemented here based on splitType */}
                  
                  {error && (
                    <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                      <span className="block sm:inline">{error}</span>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowExpenseForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={expenseLoading}
                      className={`px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        expenseLoading ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {expenseLoading ? 'Adding...' : 'Add Expense'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* All Balances Section */}
          <div className={`mt-6 bg-white ${enhancedShadowClass} rounded-lg overflow-hidden`}>
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-red-500">Group Balances</h3>
            </div>
            <div className="px-6 py-5">
              {Object.keys(balances).length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {group.members.map((member) => {
                    const balance = balances[member._id] || 0;
                    return (
                      <li key={member._id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${
                          balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {balance === 0 
                            ? 'Settled up' 
                            : balance > 0 
                              ? `Gets back $${balance.toFixed(2)}` 
                              : `Owes $${Math.abs(balance).toFixed(2)}`}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No balances to show</p>
                </div>
              )}
            </div>
          </div>

          {/* Expenses List */}
          <div className={`mt-6 bg-white ${enhancedShadowClass} rounded-lg overflow-hidden`}>
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-red-500">All Expenses</h3>
            </div>
            <div className="px-6 py-5">
              {expenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid By
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expenses.map((expense) => (
                        <tr key={expense._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {expense.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${expense.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {expense.paidBy?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {expense.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(expense.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteExpense(expense._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating your first expense.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div>
          {/* Invite Member Card */}
          <div className={`bg-white ${enhancedShadowClass} rounded-lg overflow-hidden mb-6`}>
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-red-500">Invite New Member</h3>
            </div>
            <div className="px-6 py-5">
              <form onSubmit={handleInviteMember}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="invite-email"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      placeholder="friend@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="invite-message" className="block text-sm font-medium text-gray-700">
                      Personal Message (Optional)
                    </label>
                    <textarea
                      id="invite-message"
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      placeholder="Join our group to split expenses!"
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                    />
                  </div>
                  
                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                      <span className="block sm:inline">{error}</span>
                    </div>
                  )}
                  
                  {inviteSuccess && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                      <span className="block sm:inline">{inviteSuccess}</span>
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-md hover:shadow-lg ${
                        inviteLoading ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {inviteLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending Invitation...
                        </>
                      ) : (
                        <>
                          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Send Invitation
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
              
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900">How it works:</h4>
                <ol className="mt-2 text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Enter your friend's email address</li>
                  <li>They'll receive an invitation with a secure link</li>
                  <li>Once they accept, they'll join the group automatically</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className={`bg-white ${enhancedShadowClass} rounded-lg overflow-hidden mb-6`}>
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-red-500">Pending Invitations</h3>
              </div>
              <ul className="divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <li key={invitation._id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{invitation.email}</h4>
                      <p className="text-xs text-gray-500">
                        Sent {new Date(invitation.createdAt).toLocaleDateString()} • Expires in {Math.ceil((new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          // Validate invitation ID first
                          if (!invitation._id) {
                            setError('Invalid invitation ID');
                            return;
                          }
                          
                          // Ensure we have the complete ID (MongoDB ObjectIDs are 24 characters)
                          const inviteId = invitation._id.toString();
                          console.log('Using invitation ID for resend:', inviteId);
                          
                          if (inviteId.length !== 24) {
                            console.error('Invalid ObjectID length:', inviteId);
                            setError('Invalid invitation ID format');
                            return;
                          }
                          
                          // Resend invitation
                          setInviteLoading(true);
                          setError('');
                          setInviteSuccess('');
                          
                          try {
                            api.post(`/api/groups/${id}/invite/resend/${inviteId}`)
                              .then((response) => {
                                console.log('Invitation resent successfully:', response.data);
                                setInviteSuccess(`Invitation resent to ${invitation.email}`);
                                // Refresh invitations list to update expiry dates
                                fetchInvitations();
                              })
                              .catch((err) => {
                                console.error('Error resending invitation:', err);
                                setError(err.response?.data?.message || 'Failed to resend invitation');
                              })
                              .finally(() => {
                                setInviteLoading(false);
                              });
                          } catch (error) {
                            console.error('Exception in resend invitation:', error);
                            setError('An unexpected error occurred');
                            setInviteLoading(false);
                          }
                        }}
                        disabled={inviteLoading}
                        className={`text-xs text-red-600 hover:text-red-900 ${
                          inviteLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {inviteLoading ? 'Sending...' : 'Resend'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Members List */}
          <div className={`bg-white ${enhancedShadowClass} rounded-lg overflow-hidden`}>
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-red-500">Group Members</h3>
              <span className="bg-red-100 text-red-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                {group.members.length} {group.members.length === 1 ? 'Member' : 'Members'}
              </span>
            </div>
            <ul className="divide-y divide-gray-200">
              {group.members.map((member) => (
                <li key={member._id} className="px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 font-semibold text-lg">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {member._id === group.createdBy._id && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                        Admin
                      </span>
                    )}
                    {member._id === localStorage.getItem('userId') && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        You
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetails; 