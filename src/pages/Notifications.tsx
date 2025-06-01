import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface Invitation {
  _id: string;
  groupId: {
    _id: string;
    name: string;
  };
  invitedBy: {
    name: string;
  };
  createdAt: string;
  message?: string;
  expiresAt: string;
}

const Notifications = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch user invitations
  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/api/invitations');
        setInvitations(data);
      } catch (error) {
        console.error('Error fetching invitations:', error);
        setError('Failed to load notifications. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvitations();
  }, []);
  
  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setLoading(true);
      await api.post(`/api/invitations/${invitationId}/accept`);
      
      // Remove accepted invitation from the list
      setInvitations(invitations.filter(inv => inv._id !== invitationId));
      
      // Get the group details to navigate to
      const invitation = invitations.find(inv => inv._id === invitationId);
      if (invitation) {
        navigate(`/groups/${invitation.groupId._id}`);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRejectInvitation = async (invitationId: string) => {
    try {
      setLoading(true);
      await api.post(`/api/invitations/${invitationId}/reject`);
      
      // Remove rejected invitation from the list
      setInvitations(invitations.filter(inv => inv._id !== invitationId));
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      setError('Failed to reject invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {!loading && !error && (
          <div>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-md font-medium text-gray-700">Group Invitations</h2>
            </div>
            
            {invitations.length > 0 ? (
              <div>
                {invitations.map(invitation => (
                  <div key={invitation._id} className="px-6 py-4 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                      <div className="mb-4 md:mb-0">
                        <h3 className="text-lg font-medium text-gray-900">
                          {invitation.groupId.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Invited by {invitation.invitedBy.name} • {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                        {invitation.message && (
                          <p className="mt-2 text-sm text-gray-700 italic bg-gray-50 p-2 rounded">
                            "{invitation.message}"
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Expires on {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleAcceptInvitation(invitation._id)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          disabled={loading}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectInvitation(invitation._id)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          disabled={loading}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                <p className="mt-1 text-sm text-gray-500">You don't have any pending notifications or invitations.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications; 