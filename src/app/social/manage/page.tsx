'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useSession } from '@/contexts/SessionContext';
import { MobileNav } from '@/components/navigation/MobileNav';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { UserCard } from '@/components/social/UserCard';
import type { User } from '@/lib/supabase/types';
import type { FriendRequest } from '@/lib/supabase/types';

export default function SocialManagePage() {
  return (
    <ProtectedRoute>
      <SocialManageContent />
    </ProtectedRoute>
  );
}

function SocialManageContent() {
  const router = useRouter();
  const { logout } = useSession();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(''); // Separate state for input
  const [actualSearchQuery, setActualSearchQuery] = useState(''); // Actual search query (triggered by Enter)
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'pending' | 'friends'>('search');
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    async function fetchProfile() {
      // Prevent duplicate calls in development (React Strict Mode)
      const now = Date.now();
      if (fetchingRef.current || now - lastFetchRef.current < 200) {
        return;
      }

      fetchingRef.current = true;
      lastFetchRef.current = now;

      try {
        const response = await fetch('/api/spotify/profile');
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.id);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    }

    fetchProfile();
  }, []);

  useEffect(() => {
    async function fetchFriends() {
      try {
        const response = await fetch('/api/social/friends', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setFriends(data.friends || []);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    }

    async function fetchAllRequests() {
      try {
        // Fetch both received and sent requests in parallel
        const [receivedResponse, sentResponse] = await Promise.all([
          fetch('/api/social/friend-request', { credentials: 'include' }),
          fetch('/api/social/friend-request/sent', { credentials: 'include' }),
        ]);

        const allRequests: FriendRequest[] = [];

        if (receivedResponse.ok) {
          const receivedData = await receivedResponse.json();
          allRequests.push(...(receivedData.requests || []));
        }

        if (sentResponse.ok) {
          const sentData = await sentResponse.json();
          allRequests.push(...(sentData.requests || []));
        }

        // Remove duplicates based on ID
        const uniqueRequests = Array.from(
          new Map(allRequests.map((r) => [r.id, r])).values()
        );

        setPendingRequests(uniqueRequests);
      } catch (error) {
        console.error('Error fetching requests:', error);
      }
    }

    if (currentUserId) {
      fetchFriends();
      fetchAllRequests();
    }
  }, [currentUserId]);

  // Only search when actualSearchQuery changes (triggered by Enter key)
  useEffect(() => {
    if (actualSearchQuery.trim()) {
      setIsSearching(true);
      fetch(`/api/social/search?q=${encodeURIComponent(actualSearchQuery)}`, {
        credentials: 'include',
      })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.users || []);
          } else {
            setSearchResults([]);
          }
        })
        .catch((error) => {
          console.error('[Social Page] Error searching users:', error);
          setSearchResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [actualSearchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setActualSearchQuery(searchInput);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      const response = await fetch('/api/social/friend-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ toUserId: userId }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const newRequest = responseData.friendRequest;
        
        // Immediately add the request to pendingRequests so the button updates
        setPendingRequests((prev) => {
          // Check if request already exists to avoid duplicates
          const exists = prev.some(
            (r) => r.from_user_id === newRequest.from_user_id && 
                   r.to_user_id === newRequest.to_user_id &&
                   r.status === 'pending'
          );
          if (exists) {
            return prev;
          }
          return [...prev, newRequest];
        });
        
        // Refresh all requests in background to get the latest state from database
        setTimeout(async () => {
          try {
            const [receivedResponse, sentResponse] = await Promise.all([
              fetch('/api/social/friend-request', { credentials: 'include' }),
              fetch('/api/social/friend-request/sent', { credentials: 'include' }),
            ]);

            const allRequests: FriendRequest[] = [];

            if (receivedResponse.ok) {
              const receivedData = await receivedResponse.json();
              allRequests.push(...(receivedData.requests || []));
            }

            if (sentResponse.ok) {
              const sentData = await sentResponse.json();
              allRequests.push(...(sentData.requests || []));
            }

            // Remove duplicates based on ID
            const uniqueRequests = Array.from(
              new Map(allRequests.map((r) => [r.id, r])).values()
            );

            setPendingRequests(uniqueRequests);
          } catch (error) {
            console.error('Error refreshing requests:', error);
          }
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send friend request' }));
        // Don't show alert, just log the error
        console.error('Failed to send friend request:', errorData.error);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      // Don't show alert, just log the error
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/social/friend-request', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ requestId, action: 'accept' }),
      });

      if (response.ok) {
        // Refresh all requests and friends
        const [requestsReceived, requestsSent, friendsResponse] = await Promise.all([
          fetch('/api/social/friend-request', { credentials: 'include' }),
          fetch('/api/social/friend-request/sent', { credentials: 'include' }),
          fetch('/api/social/friends', { credentials: 'include' }),
        ]);

        const allRequests: FriendRequest[] = [];

        if (requestsReceived.ok) {
          const receivedData = await requestsReceived.json();
          allRequests.push(...(receivedData.requests || []));
        }

        if (requestsSent.ok) {
          const sentData = await requestsSent.json();
          allRequests.push(...(sentData.requests || []));
        }

        const uniqueRequests = Array.from(
          new Map(allRequests.map((r) => [r.id, r])).values()
        );

        setPendingRequests(uniqueRequests);

        if (friendsResponse.ok) {
          const friendsData = await friendsResponse.json();
          setFriends(friendsData.friends || []);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to accept friend request' }));
        alert(errorData.error || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('An error occurred while accepting friend request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/social/friend-request', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ requestId, action: 'reject' }),
      });

      if (response.ok) {
        // Refresh all requests
        const [requestsReceived, requestsSent] = await Promise.all([
          fetch('/api/social/friend-request', { credentials: 'include' }),
          fetch('/api/social/friend-request/sent', { credentials: 'include' }),
        ]);

        const allRequests: FriendRequest[] = [];

        if (requestsReceived.ok) {
          const receivedData = await requestsReceived.json();
          allRequests.push(...(receivedData.requests || []));
        }

        if (requestsSent.ok) {
          const sentData = await requestsSent.json();
          allRequests.push(...(sentData.requests || []));
        }

        const uniqueRequests = Array.from(
          new Map(allRequests.map((r) => [r.id, r])).values()
        );

        setPendingRequests(uniqueRequests);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to reject friend request' }));
        alert(errorData.error || 'Failed to reject friend request');
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('An error occurred while rejecting friend request');
    }
  };

  const getFriendRequestStatus = (user: User): 'none' | 'pending' | 'accepted' | 'received' => {
    if (!currentUserId) return 'none';
    
    // Check if already friends
    const isFriend = friends.some((f) => f.user_id === user.user_id);
    if (isFriend) return 'accepted';

    // Check if there's a pending request (sent by current user)
    const sentRequest = pendingRequests.find(
      (r) => r.from_user_id === currentUserId && 
             r.to_user_id === user.user_id && 
             r.status === 'pending'
    );
    if (sentRequest) return 'pending';

    // Check if there's a received request (sent to current user)
    const receivedRequest = pendingRequests.find(
      (r) => r.from_user_id === user.user_id && 
             r.to_user_id === currentUserId && 
             r.status === 'pending'
    );
    if (receivedRequest) return 'received';

    return 'none';
  };

  const getFriendRequestId = (user: User): string | undefined => {
    // Check for received request
    const receivedRequest = pendingRequests.find((r) => r.from_user_id === user.user_id && r.to_user_id === currentUserId);
    if (receivedRequest) return receivedRequest.id;
    
    // Check for sent request
    const sentRequest = pendingRequests.find((r) => r.from_user_id === currentUserId && r.to_user_id === user.user_id);
    if (sentRequest) return sentRequest.id;
    
    return undefined;
  };

  const handleRetractRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/social/friend-request', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        // Refresh all requests and friends
        const [requestsReceived, requestsSent, friendsResponse] = await Promise.all([
          fetch('/api/social/friend-request', { credentials: 'include' }),
          fetch('/api/social/friend-request/sent', { credentials: 'include' }),
          fetch('/api/social/friends', { credentials: 'include' }),
        ]);

        const allRequests: FriendRequest[] = [];

        if (requestsReceived.ok) {
          const receivedData = await requestsReceived.json();
          allRequests.push(...(receivedData.requests || []));
        }

        if (requestsSent.ok) {
          const sentData = await requestsSent.json();
          allRequests.push(...(sentData.requests || []));
        }

        const uniqueRequests = Array.from(
          new Map(allRequests.map((r) => [r.id, r])).values()
        );

        setPendingRequests(uniqueRequests);

        if (friendsResponse.ok) {
          const friendsData = await friendsResponse.json();
          setFriends(friendsData.friends || []);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to retract friend request' }));
        alert(errorData.error || 'Failed to retract friend request');
      }
    } catch (error) {
      console.error('Error retracting friend request:', error);
      alert('An error occurred while retracting friend request');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      const response = await fetch('/api/social/friends', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ friendId }),
      });

      if (response.ok) {
        // Refresh friends and requests
        const [friendsResponse, requestsReceived, requestsSent] = await Promise.all([
          fetch('/api/social/friends', { credentials: 'include' }),
          fetch('/api/social/friend-request', { credentials: 'include' }),
          fetch('/api/social/friend-request/sent', { credentials: 'include' }),
        ]);

        if (friendsResponse.ok) {
          const friendsData = await friendsResponse.json();
          setFriends(friendsData.friends || []);
        }

        const allRequests: FriendRequest[] = [];

        if (requestsReceived.ok) {
          const receivedData = await requestsReceived.json();
          allRequests.push(...(receivedData.requests || []));
        }

        if (requestsSent.ok) {
          const sentData = await requestsSent.json();
          allRequests.push(...(sentData.requests || []));
        }

        const uniqueRequests = Array.from(
          new Map(allRequests.map((r) => [r.id, r])).values()
        );

        setPendingRequests(uniqueRequests);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to remove friend' }));
        alert(errorData.error || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      alert('An error occurred while removing friend');
    }
  };

  if (isLoading || !currentUserId) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-[#121212]">
        <nav className="border-b border-[#2A2A2A] bg-[#000000]">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between sm:h-16">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => router.push('/social')}
                  className="text-xs font-medium text-[#B3B3B3] transition-colors hover:text-white sm:text-sm"
                >
                  ← Back
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1DB954]">
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <h1 className="text-lg font-bold text-white sm:text-xl">Wrappedify</h1>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <svg
              className="h-8 w-8 animate-spin text-[#1DB954]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#121212]">
      <nav className="border-b border-[#2A2A2A] bg-[#000000]">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => router.push('/social')}
                className="text-xs font-medium text-[#B3B3B3] transition-colors hover:text-white sm:text-sm"
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1DB954]">
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-white sm:text-xl">Wrappedify</h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Mobile Menu */}
              <MobileNav currentPage="social" />
              {/* Desktop Buttons */}
              <div className="hidden items-center gap-1.5 lg:flex lg:gap-3">
                <button
                  onClick={() => router.push('/home')}
                  className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-[#B3B3B3] transition-all hover:border-white hover:text-white active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Home
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-[#B3B3B3] transition-all hover:border-white hover:text-white active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/analytics')}
                  className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-white transition-all hover:border-white hover:bg-[#2A2A2A] active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Analytics
                </button>
                <button
                  onClick={() => router.push('/social')}
                  className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-white transition-all hover:border-white hover:bg-[#2A2A2A] active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Social
                </button>
                <button
                  onClick={() => router.push('/upload')}
                  className="rounded-full bg-[#1DB954] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#1ed760] active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
                >
                  Upload
                </button>
                <button
                  onClick={logout}
                  className="rounded-full px-3 py-2 text-xs font-medium text-[#B3B3B3] transition-colors hover:text-white active:scale-95 sm:px-3 sm:text-xs lg:px-4 lg:text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Manage Friends</h2>
            <p className="mt-2 text-sm text-[#B3B3B3] sm:text-base">
              Search for users, manage friend requests, and view your friends list
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-[#2A2A2A]">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'search'
                  ? 'border-b-2 border-[#1DB954] text-white'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              Search Users
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'pending'
                  ? 'border-b-2 border-[#1DB954] text-white'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              Pending Requests ({pendingRequests.filter((r) => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'friends'
                  ? 'border-b-2 border-[#1DB954] text-white'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              Friends ({friends.length})
            </button>
          </div>

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by username"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#181818] px-4 py-3 pl-12 pr-4 text-sm text-white placeholder-[#6A6A6A] transition-all focus:border-[#1DB954] focus:outline-none focus:ring-2 focus:ring-[#1DB954]/20 sm:px-5 sm:py-4 sm:pl-14 sm:text-base"
                />
                <svg
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6A6A6A] transition-colors group-focus-within:text-[#1DB954] sm:left-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setActualSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6A6A6A] hover:text-white sm:right-5"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <svg
                    className="h-6 w-6 animate-spin text-[#1DB954]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((user) => {
                    // Check database for existing request status
                    const status = getFriendRequestStatus(user);
                    const requestId = getFriendRequestId(user);
                    
                    return (
                      <UserCard
                        key={user.user_id}
                        user={user}
                        currentUserId={currentUserId!}
                        onSendRequest={handleSendRequest}
                        onAcceptRequest={handleAcceptRequest}
                        onRejectRequest={handleRejectRequest}
                        onRetractRequest={handleRetractRequest}
                        onRemoveFriend={handleRemoveFriend}
                        friendRequestStatus={status}
                        friendRequestId={requestId}
                      />
                    );
                  })}
                </div>
              )}

              {!isSearching && actualSearchQuery && searchResults.length === 0 && (
                <div className="rounded-lg bg-[#181818] p-6 text-center">
                  <p className="text-sm text-[#B3B3B3]">No users found</p>
                </div>
              )}
            </div>
          )}

          {/* Pending Requests Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              {/* Received Requests */}
              {pendingRequests.filter((r) => r.to_user_id === currentUserId && r.status === 'pending').length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-bold text-white">Received Requests</h3>
                  <div className="space-y-3">
                    {pendingRequests
                      .filter((r) => r.to_user_id === currentUserId && r.status === 'pending')
                      .map((request) => {
                        // Try to find user from search results first, then friends
                        let user = searchResults.find((u) => u.user_id === request.from_user_id) ||
                          friends.find((u) => u.user_id === request.from_user_id);
                        
                        // If user not found, create a minimal user object for display
                        if (!user) {
                          user = {
                            id: `temp-${request.from_user_id}`,
                            user_id: request.from_user_id,
                            display_name: request.from_user_id,
                            profile_image_url: null,
                            spotify_profile_url: null,
                            is_public: true,
                            created_at: request.created_at,
                            updated_at: request.updated_at,
                          };
                        }

                        return (
                          <UserCard
                            key={request.id}
                            user={user}
                            currentUserId={currentUserId!}
                            onAcceptRequest={handleAcceptRequest}
                            onRejectRequest={handleRejectRequest}
                            friendRequestStatus="received"
                            friendRequestId={request.id}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Sent Requests */}
              {pendingRequests.filter((r) => r.from_user_id === currentUserId && r.status === 'pending').length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-bold text-white">Sent Requests</h3>
                  <div className="space-y-3">
                    {pendingRequests
                      .filter((r) => r.from_user_id === currentUserId && r.status === 'pending')
                      .map((request) => {
                        // Try to find user from search results first, then friends
                        let user = searchResults.find((u) => u.user_id === request.to_user_id) ||
                          friends.find((u) => u.user_id === request.to_user_id);
                        
                        // If user not found, create a minimal user object for display
                        if (!user) {
                          user = {
                            id: `temp-${request.to_user_id}`,
                            user_id: request.to_user_id,
                            display_name: request.to_user_id,
                            profile_image_url: null,
                            spotify_profile_url: null,
                            is_public: true,
                            created_at: request.created_at,
                            updated_at: request.updated_at,
                          };
                        }

                        return (
                          <UserCard
                            key={request.id}
                            user={user}
                            currentUserId={currentUserId!}
                            onRetractRequest={handleRetractRequest}
                            friendRequestStatus="pending"
                            friendRequestId={request.id}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {pendingRequests.filter((r) => r.status === 'pending').length === 0 && (
                <div className="rounded-lg bg-[#181818] p-6 text-center">
                  <p className="text-sm text-[#B3B3B3]">No pending requests</p>
                </div>
              )}
            </div>
          )}

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {friends.length === 0 ? (
                <div className="rounded-lg bg-[#181818] p-6 text-center">
                  <p className="text-sm text-[#B3B3B3]">No friends yet. Search for users to add friends!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <UserCard
                      key={friend.user_id}
                      user={friend}
                      currentUserId={currentUserId!}
                      onRemoveFriend={handleRemoveFriend}
                      friendRequestStatus="accepted"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

