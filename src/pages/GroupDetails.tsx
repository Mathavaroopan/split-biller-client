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
  settled: boolean;
  settledAt?: string;
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
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);
  const [showDeleteExpenseModal, setShowDeleteExpenseModal] = useState<string | null>(null);

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

  // State for settle confirmation modal
  const [showSettleDebtModal, setShowSettleDebtModal] = useState<{ userId: string; amount: number } | null>(null);

  // State for expense details modal
  const [selectedExpenseDetails, setSelectedExpenseDetails] = useState<Expense | null>(null);
  
  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

  useEffect(() => {
    if (group) {
      fetchExpenses();
      
      // Initialize custom splits with equal values when group members change
      resetCustomSplits();
    }
  }, [group]);

  // Reset custom splits when split type changes
  useEffect(() => {
    resetCustomSplits();
  }, [splitType]);

  // Function to reset custom splits based on the current split type
  const resetCustomSplits = () => {
    if (!group || !group.members) return;
    
    const splits: Record<string, number> = {};
    
    // Initialize selected members - set all to true by default
    const members: Record<string, boolean> = {};
    group.members.forEach(member => {
      members[member._id] = true;
    });
    setSelectedMembers(members);
    
    if (splitType === 'equal') {
      // For equal split, we don't need to pre-fill
      setCustomSplits({});
      return;
    }
    
    const amount = parseFloat(expenseAmount) || 0;
    
    if (splitType === 'percentage') {
      // For percentage split, divide equally initially
      const equalPercentage = Math.floor(100 / group.members.length);
      let remainingPercentage = 100 - (equalPercentage * group.members.length);
      
      group.members.forEach((member, index) => {
        // Add extra percentage points to the first few members to make sure total is 100%
        const percentage = equalPercentage + (index < remainingPercentage ? 1 : 0);
        splits[member._id] = percentage;
      });
    } else if (splitType === 'exact') {
      // For exact split, divide amount equally initially
      const equalAmount = amount / group.members.length;
      
      group.members.forEach(member => {
        splits[member._id] = parseFloat(equalAmount.toFixed(2));
      });
    }
    
    setCustomSplits(splits);
  };

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
      
      // Get the list of selected member IDs
      const selectedMemberIds = Object.entries(selectedMembers)
        .filter(([_, isSelected]) => isSelected)
        .map(([memberId, _]) => memberId);
      
      // Make sure at least one member is selected
      if (selectedMemberIds.length === 0) {
        setError('At least one group member must be selected for the expense');
        setExpenseLoading(false);
        return;
      }

      // Validate custom splits if not equal split
      if (splitType !== 'equal') {
        // For custom splits, we need to filter to only include selected members
        const filteredSplits: Record<string, number> = {};
        
        for (const memberId of selectedMemberIds) {
          filteredSplits[memberId] = customSplits[memberId] || 0;
        }
        
        if (splitType === 'percentage') {
          // For percentage split, make sure the sum is 100%
          const sum = Object.values(filteredSplits).reduce((sum, val) => sum + val, 0);
          if (Math.abs(sum - 100) > 0.01) {
            setError('Percentage splits must add up to 100%');
            setExpenseLoading(false);
            return;
          }
        } else if (splitType === 'exact') {
          // For exact split, make sure the sum matches the expense amount
          const sum = Object.values(filteredSplits).reduce((sum, val) => sum + val, 0);
          if (Math.abs(sum - amount) > 0.01) {
            setError(`Exact splits must add up to the expense amount ($${amount.toFixed(2)})`);
            setExpenseLoading(false);
            return;
          }
        }
        
        // Create the expense with filtered splits
        await api.post('/api/expenses', {
          title: expenseTitle,
          amount,
          groupId: id,
          splitType,
          splits: filteredSplits,
          category: expenseCategory,
          notes: expenseNotes
        });
      } else {
        // For equal split, just pass the selected member IDs
        await api.post('/api/expenses', {
          title: expenseTitle,
          amount,
          groupId: id,
          splitType,
          selectedMembers: selectedMemberIds, // Add selected members for equal split
          category: expenseCategory,
          notes: expenseNotes
        });
      }
      
      // Reset form
      setExpenseTitle('');
      setExpenseAmount('');
      setExpenseCategory('general');
      setExpenseNotes('');
      setSplitType('equal');
      resetCustomSplits();
      
      // Close form and refresh expenses
      setShowExpenseForm(false);
      fetchExpenses();
      fetchGroupDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add expense');
      console.error('Error adding expense:', err);
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await api.delete(`/api/expenses/${expenseId}`);
      fetchExpenses();
      setShowDeleteExpenseModal(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete expense');
      console.error('Error deleting expense:', err);
    }
  };

  // Handle settling an expense
  const handleSettleExpense = async (expenseId: string) => {
    try {
      await api.post(`/api/expenses/${expenseId}/settle`);
      setError('');
      
      // Refresh expenses to show updated settled status
      fetchExpenses();
      
      // Also refresh group details to update balances
      fetchGroupDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to settle expense');
      console.error('Error settling expense:', err);
    }
  };

  // Delete group handler
  const handleDeleteGroup = async () => {
    try {
      setDeleteGroupLoading(true);
      await api.delete(`/api/groups/${id}`);
      navigate('/groups');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete group');
      console.error('Error deleting group:', err);
      setDeleteGroupLoading(false);
      setShowDeleteGroupModal(false);
    }
  };

  // Calculate summary balances for the current user with the new logic
  const calculateUserBalanceSummary = () => {
    if (!expenses || !group?.members) {
      return { youOwe: 0, owedToYou: 0, netBalance: 0 };
    }

    const currentUserId = localStorage.getItem('userId') || '';
    
    // Your Share: sum of all split amounts involving the current user
    let totalShare = 0;
    
    // Total Contributions: sum of all amounts paid by the current user
    let totalContributions = 0;
    
    // Calculate both values by going through all expenses
    expenses.forEach(expense => {
      // Check if the current user is involved in this expense
      const userSplit = expense.splits.find(split => split.user._id === currentUserId);
      
      // Add to total share if the user was part of the expense
      if (userSplit) {
        totalShare += userSplit.share;
      }
      
      // Add to total contributions if the user paid for the expense
      if (expense.paidBy._id === currentUserId) {
        totalContributions += expense.amount;
      }
    });
    
    // Net balance: positive means others owe you, negative means you owe others
    const netBalance = totalContributions - totalShare;
    
    return {
      youOwe: totalShare,
      owedToYou: totalContributions,
      netBalance: netBalance
    };
  };

  const userBalanceSummary = calculateUserBalanceSummary();

  // Calculate direct debts between users based on the new logic
  const calculateDirectDebts = () => {
    if (!expenses || !group?.members) return [];
    
    const currentUserId = localStorage.getItem('userId') || '';
    const directDebts: {
      user: User;
      amount: number;
      isUserCreditor: boolean;
    }[] = [];
    
    // For each member except the current user
    group.members.forEach(member => {
      if (member._id === currentUserId) return; // Skip current user
      
      let amountUserPaidForMember = 0; // a: amount current user paid for member (not settled)
      let amountMemberPaidForUser = 0; // b: amount member paid for current user (not settled)
      
      // Go through all expenses
      expenses.forEach(expense => {
        // Case 1: Current user paid for the expense
        if (expense.paidBy._id === currentUserId) {
          // Check if this member is part of the expense
          const memberSplit = expense.splits.find(split => split.user._id === member._id);
          if (memberSplit && !memberSplit.settled) {
            amountUserPaidForMember += memberSplit.share;
          }
        }
        
        // Case 2: Member paid for the expense
        if (expense.paidBy._id === member._id) {
          // Check if current user is part of the expense
          const userSplit = expense.splits.find(split => split.user._id === currentUserId);
          if (userSplit && !userSplit.settled) {
            amountMemberPaidForUser += userSplit.share;
          }
        }
      });
      
      // Calculate the net amount
      const netAmount = amountUserPaidForMember - amountMemberPaidForUser;
      
      // If there's a non-zero balance, add to the debts list
      if (Math.abs(netAmount) > 0.01) { // Using a small threshold to handle floating point errors
        directDebts.push({
          user: member,
          amount: Math.abs(netAmount),
          isUserCreditor: netAmount > 0 // If positive, member owes user
        });
      }
    });
    
    return directDebts;
  };
  
  const directDebts = calculateDirectDebts();

  // Handle settling a debt
  const handleSettleDebt = (userId: string, amount: number) => {
    // First show confirmation modal
    setShowSettleDebtModal({ userId, amount });
  };
  
  // Actual settlement function after confirmation
  const confirmSettleDebt = async () => {
    if (!showSettleDebtModal) return;
    
    try {
      const userId = showSettleDebtModal.userId;
      
      // Find all relevant expenses between the current user and the selected user
      const currentUserId = localStorage.getItem('userId') || '';
      const relevantExpenses = expenses.filter(expense => {
        // Current user is the payer and the other user has an unsettled split
        return expense.paidBy._id === currentUserId && 
               expense.splits.some(split => 
                 split.user._id === userId && !split.settled
               );
      });
      
      // If no relevant expenses, show message and return
      if (relevantExpenses.length === 0) {
        alert('No expenses to settle!');
        setShowSettleDebtModal(null);
        return;
      }
      
      // Settle each split one by one
      for (const expense of relevantExpenses) {
        await api.post(`/api/expenses/${expense._id}/settle-split`, {
          userId: userId
        });
      }
      
      // Refresh data
      fetchExpenses();
      fetchGroupDetails();
      
      // Close modal
      setShowSettleDebtModal(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to settle debt');
      console.error('Error settling debt:', err);
    }
  };

  // Handle opening expense details
  const handleViewExpenseDetails = (expense: Expense) => {
    navigate(`/expense/${expense._id}`, { state: { expense } });
  };

  // Add a helper function to calculate total expenses
  const calculateTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  // Fix calculation of others' total contribution to use history data
  const calculateOthersTotalContributions = () => {
    // Get all expenses paid by others where the current user has a split that is settled
    const currentUserId = localStorage.getItem('userId') || '';
    const othersPaidSettledExpenses = expenses.filter(expense => 
      expense.paidBy._id !== currentUserId &&
      expense.splits.some(split => 
        split.user._id === currentUserId && 
        split.settled
      )
    );
    
    // Sum up the total of the current user's settled splits
    return othersPaidSettledExpenses.reduce((total, expense) => {
      const userSplit = expense.splits.find(split => 
        split.user._id === currentUserId && 
        split.settled
      );
      return total + (userSplit?.share || 0);
    }, 0);
  };

  // New function to calculate how much others still owe the user
  const calculateOthersYetToPay = () => {
    if (!expenses || !group?.members) return 0;
    
    const currentUserId = localStorage.getItem('userId') || '';
    
    // Find all unsettled amounts that others owe to the current user
    let totalOwed = 0;
    
    expenses.forEach(expense => {
      // Only consider expenses paid by the current user
      if (expense.paidBy._id === currentUserId) {
        // Sum up unsettled splits for other members
        expense.splits.forEach(split => {
          if (split.user._id !== currentUserId && !split.settled) {
            totalOwed += split.share;
          }
        });
      }
    });
    
    return totalOwed;
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>

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
          {group.createdBy?._id === localStorage.getItem('userId') && (
            <button
              onClick={() => setShowDeleteGroupModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Group
            </button>
          )}
        </div>
      </div>

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
            onClick={() => setActiveTab('balances')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'balances'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Balances
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History
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

                <div className="mt-4 bg-gray-50 rounded-lg p-4 text-center">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Expenditure</dt>
                  <dd className="mt-2 flex justify-center items-baseline">
                    <span className="text-2xl font-semibold text-red-600">${calculateTotalExpenses().toFixed(2)}</span>
                    <span className="ml-2 text-xs text-gray-500">spent</span>
                  </dd>
                </div>
              </div>
            </div>

            {/* Balance Summary */}
            <div className={`bg-white ${enhancedShadowClass} rounded-lg overflow-hidden`}>
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-red-500">Balance Summary</h3>
              </div>
              <div className="px-6 py-5">
                {Object.keys(userBalanceSummary).length > 0 ? (
                  <div className="space-y-6">
                    {/* Visualized balance stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-red-800">Your Share</p>
                            <p className="mt-1 text-2xl font-bold text-red-600">
                              ${userBalanceSummary.youOwe.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">How much you owe after splitting expenses</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-800">Your Total Contributions</p>
                            <p className="mt-1 text-2xl font-bold text-green-600">
                              ${userBalanceSummary.owedToYou.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Total amount you've paid so far</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional payment stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-800">Others' Total Contributions</p>
                            <p className="mt-1 text-2xl font-bold text-blue-600">
                              ${calculateOthersTotalContributions().toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Total amount others have paid</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`${userBalanceSummary.netBalance < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} rounded-lg p-4 border`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-800">You Need To Pay</p>
                            <p className={`mt-1 text-2xl font-bold ${userBalanceSummary.netBalance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              ${userBalanceSummary.netBalance < 0 ? Math.abs(userBalanceSummary.netBalance).toFixed(2) : '0.00'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Amount you need to pay to others</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* New card: Others Yet to Pay */}
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Others Yet to Pay</p>
                          <p className="mt-1 text-2xl font-bold text-yellow-600">
                            ${calculateOthersYetToPay().toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Amount others still owe you</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Button to view detailed balances */}
                    <div className="text-center py-2 border-t border-gray-100 pt-4">
                      <button
                        onClick={() => setActiveTab('balances')}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        View Detailed Balances
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-32">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">No expenses yet</p>
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
                  <label htmlFor="expense-split-type" className="block text-sm font-medium text-gray-700">
                    Split Type
                  </label>
                  <select
                    id="expense-split-type"
                    value={splitType}
                    onChange={(e) => setSplitType(e.target.value as 'equal' | 'percentage' | 'exact')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  >
                    <option value="equal">Equal Split</option>
                    <option value="percentage">Percentage Split</option>
                    <option value="exact">Exact Amounts</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Who's involved?
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select the members who should be part of this expense
                </p>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-md">
                  {group?.members.map((member) => (
                    <div key={member._id} className="flex items-center">
                      <input
                        id={`member-${member._id}`}
                        type="checkbox"
                        checked={selectedMembers[member._id] || false}
                        onChange={(e) => {
                          setSelectedMembers({
                            ...selectedMembers,
                            [member._id]: e.target.checked
                          });
                          
                          // If this is a non-equal split, update the custom splits
                          if (splitType !== 'equal') {
                            if (e.target.checked) {
                              // When adding a member, calculate their fair share
                              const updatedSplits = { ...customSplits };
                              const activeMembers = Object.entries(selectedMembers)
                                .filter(([id, isSelected]) => isSelected || id === member._id)
                                .map(([id]) => id);
                                
                              if (splitType === 'percentage') {
                                // Recalculate percentages
                                const equalPercentage = Math.floor(100 / activeMembers.length);
                                let remainingPercentage = 100 - (equalPercentage * activeMembers.length);
                                
                                activeMembers.forEach((memberId, index) => {
                                  updatedSplits[memberId] = equalPercentage + (index < remainingPercentage ? 1 : 0);
                                });
                              } else if (splitType === 'exact') {
                                // Recalculate exact amounts
                                const amount = parseFloat(expenseAmount) || 0;
                                const equalAmount = amount / activeMembers.length;
                                
                                activeMembers.forEach(memberId => {
                                  updatedSplits[memberId] = parseFloat(equalAmount.toFixed(2));
                                });
                              }
                              
                              setCustomSplits(updatedSplits);
                            } else {
                              // When removing a member, redistribute their share
                              const updatedSplits = { ...customSplits };
                              delete updatedSplits[member._id];
                              
                              const activeMembers = Object.entries(selectedMembers)
                                .filter(([id, isSelected]) => isSelected && id !== member._id)
                                .map(([id]) => id);
                              
                              if (activeMembers.length > 0) {
                                if (splitType === 'percentage') {
                                  // Recalculate percentages
                                  const equalPercentage = Math.floor(100 / activeMembers.length);
                                  let remainingPercentage = 100 - (equalPercentage * activeMembers.length);
                                  
                                  activeMembers.forEach((memberId, index) => {
                                    updatedSplits[memberId] = equalPercentage + (index < remainingPercentage ? 1 : 0);
                                  });
                                } else if (splitType === 'exact') {
                                  // Recalculate exact amounts
                                  const amount = parseFloat(expenseAmount) || 0;
                                  const equalAmount = amount / activeMembers.length;
                                  
                                  activeMembers.forEach(memberId => {
                                    updatedSplits[memberId] = parseFloat(equalAmount.toFixed(2));
                                  });
                                }
                                
                                setCustomSplits(updatedSplits);
                              }
                            }
                          }
                        }}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`member-${member._id}`} className="ml-3 text-sm text-gray-700 flex-1">
                        {member.name}
                        {member._id === localStorage.getItem('userId') && ' (You)'}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Select all members
                      const allSelected: Record<string, boolean> = {};
                      group?.members.forEach(member => {
                        allSelected[member._id] = true;
                      });
                      setSelectedMembers(allSelected);
                      resetCustomSplits();
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Only select yourself
                      const onlyYou: Record<string, boolean> = {};
                      const currentUserId = localStorage.getItem('userId');
                      if (currentUserId) {
                        onlyYou[currentUserId] = true;
                      }
                      setSelectedMembers(onlyYou);
                      
                      // Update the custom splits
                      if (splitType !== 'equal') {
                        const updatedSplits: Record<string, number> = {};
                        if (currentUserId) {
                          if (splitType === 'percentage') {
                            updatedSplits[currentUserId] = 100;
                          } else if (splitType === 'exact') {
                            const amount = parseFloat(expenseAmount) || 0;
                            updatedSplits[currentUserId] = amount;
                          }
                          setCustomSplits(updatedSplits);
                        }
                      }
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Only Me
                  </button>
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
              
              {/* Custom splits based on splitType */}
              {splitType !== 'equal' && group?.members && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      {splitType === 'percentage' ? 'Split by Percentage' : 'Split by Exact Amount'}
                    </h4>
                    {splitType === 'percentage' && (
                      <div className="text-sm text-gray-500">
                        Total: {Object.values(customSplits).reduce((sum, val) => sum + val, 0)}%
                        {Object.values(customSplits).reduce((sum, val) => sum + val, 0) !== 100 && (
                          <span className="ml-1 text-red-600">(must be 100%)</span>
                        )}
                      </div>
                    )}
                    {splitType === 'exact' && expenseAmount && (
                      <div className="text-sm text-gray-500">
                        Total: ${Object.values(customSplits).reduce((sum, val) => sum + val, 0).toFixed(2)} 
                        of ${parseFloat(expenseAmount).toFixed(2)}
                        {Math.abs(Object.values(customSplits).reduce((sum, val) => sum + val, 0) - parseFloat(expenseAmount)) > 0.01 && (
                          <span className="ml-1 text-red-600">(must match expense amount)</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mt-2">
                    {group.members
                      .filter(member => Boolean(selectedMembers[member._id]))
                      .map((member) => (
                      <li key={member._id} className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <label htmlFor={`split-${member._id}`} className="block text-sm font-medium text-gray-700 mb-1">
                            {member.name} {member._id === localStorage.getItem('userId') && '(You)'}
                          </label>
                          <input
                            type="number"
                            id={`split-${member._id}`}
                            min="0"
                            step={splitType === 'percentage' ? '1' : '0.01'}
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                            value={customSplits[member._id] || 0}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setCustomSplits({
                                ...customSplits,
                                [member._id]: value
                              });
                            }}
                          />
                        </div>
                        <div className="text-sm text-gray-500 min-w-[50px] text-right">
                          {splitType === 'percentage' ? '%' : '$'}
                        </div>
                      </li>
                    ))}
                  </ul>
                  
                  {splitType === 'percentage' && (
                    <button
                      type="button"
                      onClick={() => resetCustomSplits()}
                      className="mt-4 text-sm text-red-600 hover:text-red-800"
                    >
                      Reset to equal percentages
                    </button>
                  )}
                  
                  {splitType === 'exact' && (
                    <button
                      type="button"
                      onClick={() => resetCustomSplits()}
                      className="mt-4 text-sm text-red-600 hover:text-red-800"
                    >
                      Reset to equal amounts
                    </button>
                  )}
                </div>
              )}
              
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

          {/* Expenses List - Now only shown in overview tab */}
          <div className={`mt-6 bg-white ${enhancedShadowClass} rounded-lg overflow-hidden`}>
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-red-500">All Expenses</h3>
                <button
                onClick={() => setShowExpenseForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg"
                >
                Add Expense
                </button>
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
                      {expenses.map((expense) => {
                        const currentUserId = localStorage.getItem('userId') || '';
                        const isCurrentUserPayer = expense.paidBy._id === currentUserId;
                        
                        return (
                          <tr 
                            key={expense._id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleViewExpenseDetails(expense)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {expense.title}
                              {expense.notes && (
                                <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                                  {expense.notes.substring(0, 50)}{expense.notes.length > 50 ? '...' : ''}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${expense.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {expense.paidBy.name}
                              {isCurrentUserPayer && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  You
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {expense.category || 'General'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(expense.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {isCurrentUserPayer && (
                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent the row click from opening the details
                                    setShowDeleteExpenseModal(expense._id);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                >
                                  Delete
                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Add expenses to see the list here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'balances' && (
        <div>
          <div className={`bg-white ${enhancedShadowClass} rounded-lg overflow-hidden mb-6`}>
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-red-500">Group Balances</h3>
            </div>
            <div className="px-6 py-5">
              {/* Current user's balance summary - Updated to match overview */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4">Your Balance Summary</h4>
                
                {/* First row - same as overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-800">Your Share</p>
                        <p className="mt-1 text-xl font-bold text-red-600">
                          ${userBalanceSummary.youOwe.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">How much you owe after splitting expenses</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">Your Total Contributions</p>
                        <p className="mt-1 text-xl font-bold text-green-600">
                          ${userBalanceSummary.owedToYou.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Total amount you've paid so far</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Second row - same as overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800">Others' Total Contributions</p>
                        <p className="mt-1 text-xl font-bold text-blue-600">
                          ${calculateOthersTotalContributions().toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Total amount others have paid</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`${userBalanceSummary.netBalance < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} rounded-lg p-4 border`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">You Need To Pay</p>
                        <p className={`mt-1 text-xl font-bold ${userBalanceSummary.netBalance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          ${userBalanceSummary.netBalance < 0 ? Math.abs(userBalanceSummary.netBalance).toFixed(2) : '0.00'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Amount you need to pay to others</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* New card: Others Yet to Pay */}
                <div className="mt-4 bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Others Yet to Pay</p>
                      <p className="mt-1 text-xl font-bold text-yellow-600">
                        ${calculateOthersYetToPay().toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Amount others still owe you</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Money You'll Receive - SWAPPED POSITION - now appears first */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Money You'll Receive</h4>
                
                {directDebts.filter(debt => debt.isUserCreditor).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            From
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {directDebts
                          .filter(debt => debt.isUserCreditor)
                          .map((debt, index) => (
                            <tr key={index} className="bg-green-50 cursor-pointer hover:bg-green-100" onClick={() => handleSettleDebt(debt.user._id, debt.amount)}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {debt.user.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold text-green-600">
                                ${debt.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  className="text-green-600 bg-green-50 px-3 py-1 rounded-md text-xs hover:bg-green-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSettleDebt(debt.user._id, debt.amount);
                                  }}
                                >
                                  Mark as Settled
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No money to receive</h3>
                    <p className="mt-1 text-sm text-gray-500">Nobody owes you any money in this group.</p>
                  </div>
                )}
              </div>

              {/* Money you'll pay - SWAPPED POSITION - now appears second */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Money You'll Pay</h4>
                
                {directDebts.filter(debt => !debt.isUserCreditor).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            To
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {directDebts
                          .filter(debt => !debt.isUserCreditor)
                          .map((debt, index) => (
                            <tr key={index} className="bg-red-50 cursor-pointer hover:bg-red-100">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {debt.user.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold text-red-600">
                                ${debt.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md">
                                  Pending
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No payments due</h3>
                    <p className="mt-1 text-sm text-gray-500">You don't owe any money in this group.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <div className={`bg-white ${enhancedShadowClass} rounded-lg overflow-hidden mb-6`}>
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-red-500">Payment History</h3>
            </div>
            <div className="px-6 py-5">
              {/* Money You Paid Section */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">Money You Paid</h4>
                
                {expenses.filter(expense => 
                  expense.paidBy._id === localStorage.getItem('userId') &&
                  expense.splits.some(split => split.settled) // Only include if there's at least one settled split
                ).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Paid To
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Settlement Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {expenses
                          .filter(expense => expense.paidBy._id === localStorage.getItem('userId'))
                          .flatMap(expense => 
                            // Create a row for each SETTLED split in the expense
                            expense.splits
                              .filter(split => 
                                split.user._id !== localStorage.getItem('userId') && // Exclude yourself
                                split.settled // Only include settled splits
                              )
                              .map((split, idx) => ({
                                expenseId: expense._id,
                                expenseTitle: expense.title,
                                createdAt: expense.createdAt,
                                userName: split.user.name,
                                userId: split.user._id,
                                amount: split.share,
                                settled: split.settled,
                                settledAt: split.settledAt,
                                key: `${expense._id}-${split.user._id}-${idx}`
                              }))
                          )
                          .map((item) => (
                            <tr 
                              key={item.key} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => navigate(`/expense/${item.expenseId}`)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.expenseTitle}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.userName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold text-green-600">
                                ${item.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  {item.settledAt ? new Date(item.settledAt).toLocaleDateString() : 'Settled'}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No settled payments</h3>
                    <p className="mt-1 text-sm text-gray-500">No payments have been settled yet.</p>
                  </div>
                )}
              </div>

              {/* Money Others Paid You */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Money Others Paid You</h4>
                
                {expenses.filter(expense => 
                  expense.paidBy._id !== localStorage.getItem('userId') &&
                  expense.splits.some(split => 
                    split.user._id === localStorage.getItem('userId') && 
                    split.settled
                  )
                ).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Paid By
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Your Share
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Settlement Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {expenses
                          .filter(expense => 
                            expense.paidBy._id !== localStorage.getItem('userId') &&
                            expense.splits.some(split => 
                              split.user._id === localStorage.getItem('userId') && 
                              split.settled
                            )
                          )
                          .map((expense) => {
                            const currentUserSplit = expense.splits.find(split => 
                              split.user._id === localStorage.getItem('userId') && 
                              split.settled
                            );
                            
                            if (!currentUserSplit) return null;
                            
                            return (
                              <tr 
                                key={expense._id} 
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleViewExpenseDetails(expense)}
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {expense.title}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {expense.paidBy.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(expense.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold text-red-600">
                                  ${currentUserSplit.share.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    {currentUserSplit.settledAt ? new Date(currentUserSplit.settledAt).toLocaleDateString() : 'Settled'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No settled payments</h3>
                    <p className="mt-1 text-sm text-gray-500">You haven't settled any payments with others yet.</p>
                  </div>
                )}
              </div>
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
                          Sending Invitation...
                        </>
                      ) : (
                        <>
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
                        className="text-xs text-red-600 hover:text-red-900"
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
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-red-500">Group Members</h3>
          </div>
            <ul className="divide-y divide-gray-200">
              {group.members.map((member) => (
                <li key={member._id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-600 font-medium">{member.name.charAt(0)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        {member.name}
                        {member._id === localStorage.getItem('userId') && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            You
                          </span>
                        )}
                        {member._id === group.createdBy._id && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Expense Details Modal */}
      {selectedExpenseDetails && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedExpenseDetails(null)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Expense Details
                    </h3>
                    <button
                      type="button"
                      className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => setSelectedExpenseDetails(null)}
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mt-2 border-t border-gray-200 pt-4">
                    <dl className="sm:divide-y sm:divide-gray-200">
                      <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Title</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedExpenseDetails.title}</dd>
                      </div>
                      <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Amount</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">${selectedExpenseDetails.amount.toFixed(2)}</dd>
                      </div>
                      <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Paid by</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {selectedExpenseDetails.paidBy.name}
                          {selectedExpenseDetails.paidBy._id === localStorage.getItem('userId') && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              You
                            </span>
                          )}
                        </dd>
                      </div>
                      <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Date</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {new Date(selectedExpenseDetails.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </dd>
                      </div>
                      <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Category</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedExpenseDetails.category || 'General'}</dd>
                      </div>
                      {selectedExpenseDetails.notes && (
                        <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                          <dt className="text-sm font-medium text-gray-500">Notes</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{selectedExpenseDetails.notes}</dd>
                        </div>
                      )}
                      <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Split type</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {selectedExpenseDetails.splitType === 'equal' ? 'Equal split' : 
                           selectedExpenseDetails.splitType === 'percentage' ? 'Percentage split' : 'Exact amounts'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  {/* Show detailed splits */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900">Split Details</h4>
                    <div className="mt-2 flow-root">
                      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                          <table className="min-w-full divide-y divide-gray-300">
                            <thead>
                              <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Member</th>
                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Amount</th>
                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {selectedExpenseDetails.splits.map((split) => (
                                <tr key={split.user._id}>
                                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                                    {split.user.name}
                                    {split.user._id === localStorage.getItem('userId') && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                        You
                                      </span>
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">${split.share.toFixed(2)}</td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">
                                    {split.settled ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Settled
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={() => setSelectedExpenseDetails(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteGroupModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowDeleteGroupModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-50"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 relative z-50" onClick={(e) => e.stopPropagation()}>
              <div>
                <div className="mt-3 text-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Group</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this group? All expenses and balances will be permanently removed. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:text-sm"
                  onClick={handleDeleteGroup}
                  disabled={deleteGroupLoading}
                >
                  {deleteGroupLoading ? 'Deleting...' : 'Delete Group'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:text-sm"
                  onClick={() => setShowDeleteGroupModal(false)}
                  disabled={deleteGroupLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settle Debt Confirmation Modal */}
      {showSettleDebtModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowSettleDebtModal(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-50"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 relative z-50" onClick={(e) => e.stopPropagation()}>
              <div>
                <div className="mt-3 text-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Settle Debt</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to mark ${showSettleDebtModal.amount.toFixed(2)} from {group?.members.find(m => m._id === showSettleDebtModal.userId)?.name} as settled?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:text-sm"
                  onClick={confirmSettleDebt}
                >
                  Confirm Settlement
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:text-sm"
                  onClick={() => setShowSettleDebtModal(null)}
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

export default GroupDetails;

