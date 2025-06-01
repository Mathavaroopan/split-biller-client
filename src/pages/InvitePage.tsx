import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [inviteInfo, setInviteInfo] = useState<{
    email?: string;
    groupId?: string;
    groupName?: string;
    hasAccount?: boolean;
  }>({});

  useEffect(() => {
    const verifyInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Check if the user is already logged in
        const isLoggedIn = localStorage.getItem('token');
        
        try {
          const { data } = await api.get(`/api/groups/verify-invite/${token}`);
          
          setInviteInfo(data);
          setGroupId(data.groupId);
          
          if (isLoggedIn) {
            // If user is logged in, try to join the group directly
            try {
              await api.get(`/api/groups/join/${token}`);
              // Successfully joined, redirect to the group page
              setSuccess(true);
              setTimeout(() => {
                navigate(`/groups/${data.groupId}`);
              }, 2000);
              return;
            } catch (joinError: any) {
              // If user is already a member, just navigate to the group
              if (joinError.response?.status === 400 && 
                  joinError.response?.data?.message?.includes('already a member')) {
                setSuccess(true);
                setTimeout(() => {
                  navigate(`/groups/${data.groupId}`);
                }, 2000);
                return;
              }
              // For other errors, continue with the flow
            }
          }

          // Determine where to redirect based on whether user has account
          if (data.hasAccount) {
            // User has an account but is not logged in
            // Save invite info for later use
            localStorage.setItem('inviteInfo', JSON.stringify({
              groupId: data.groupId,
              groupName: data.groupName,
              token: token
            }));
            navigate(`/login?redirect=/invite/${token}`);
          } else {
            // User doesn't have an account
            // Save invite info for later use
            localStorage.setItem('inviteInfo', JSON.stringify({
              groupId: data.groupId,
              groupName: data.groupName,
              token: token
            }));
            navigate(`/register?email=${encodeURIComponent(data.email)}&invite=${token}`);
          }
        } catch (err: any) {
          console.error('Error verifying invitation:', err);
          
          // Special case: Check if user is already logged in and part of the group
          if (isLoggedIn && err.response?.status === 400) {
            try {
              // Try to fetch user's groups
              const { data: groupsData } = await api.get('/api/groups');
              
              // Check if we have the invitation token in localStorage (from registration/login flow)
              const savedInviteInfo = localStorage.getItem('inviteInfo');
              if (savedInviteInfo) {
                const parsedInfo = JSON.parse(savedInviteInfo);
                
                // Check if the user is already in a group matching the invite's group
                const matchingGroup = groupsData.find((g: any) => g._id === parsedInfo.groupId);
                if (matchingGroup) {
                  // User is already in the group - this is actually a success case
                  setSuccess(true);
                  setGroupId(parsedInfo.groupId);
                  setLoading(false);
                  // Clean up localStorage
                  localStorage.removeItem('inviteInfo');
                  setTimeout(() => {
                    navigate(`/groups/${parsedInfo.groupId}`);
                  }, 2000);
                  return;
                }
              }
            } catch (groupsError) {
              console.error('Error checking groups:', groupsError);
            }
          }
          
          setError(err.response?.data?.message || 'Invalid or expired invitation');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error in verification process:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    verifyInvitation();
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Verifying Invitation</h2>
            <p className="mt-2 text-sm text-gray-600">Please wait while we process your invitation</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Success!</h2>
            <p className="mt-2 text-sm text-gray-600">You have successfully joined the group.</p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => navigate(`/groups/${groupId}`)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
            >
              Go to Group
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Invalid Invitation</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/groups')}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
            >
              Go to Groups
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null; // This component redirects, so it doesn't normally render anything
};

export default InvitePage; 