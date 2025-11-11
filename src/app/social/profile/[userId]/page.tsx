'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useSession } from '@/contexts/SessionContext';
import { MobileNav } from '@/components/navigation/MobileNav';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/supabase/types';

interface UserProfileStats {
  favoriteArtist: string;
  favoriteTrack: string;
  favoriteGenre: string;
  minutesThisMonth: number;
  relatabilityScore: number;
  favoriteArtistImage?: string | null;
  favoriteTrackImage?: string | null;
}

interface LastTrack {
  trackName: string;
  artistName: string;
  playedAt: string;
  imageUrl: string | null;
}

export default function UserProfilePage() {
  return (
    <ProtectedRoute>
      <UserProfileContent />
    </ProtectedRoute>
  );
}

function UserProfileContent() {
  const router = useRouter();
  const params = useParams();
  const { logout } = useSession();
  const userId = params.userId as string;
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserProfileStats | null>(null);
  const [lastTrack, setLastTrack] = useState<LastTrack | null>(null);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted' | 'received'>('none');
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!userId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch current user ID
        const profileResponse = await fetch('/api/spotify/profile', {
          credentials: 'include',
        });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setCurrentUserId(profileData.id);
        }

        const response = await fetch(`/api/social/profile/${userId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setStats(data.stats);
          setLastTrack(data.lastTrack || null);
          setFriendStatus(data.friendStatus || 'none');
          setFriendRequestId(data.friendRequestId || null);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load profile' }));
          setError(errorData.error || 'Failed to load profile');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  const handleSendRequest = async () => {
    if (!userId || isRequesting) return;
    setIsRequesting(true);
    try {
      const response = await fetch('/api/social/friend-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toUserId: userId }),
      });
      if (response.ok) {
        const data = await response.json();
        setFriendStatus('pending');
        setFriendRequestId(data.friendRequest?.id || null);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendRequestId || isRequesting) return;
    setIsRequesting(true);
    try {
      const response = await fetch('/api/social/friend-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId: friendRequestId, action: 'accept' }),
      });
      if (response.ok) {
        setFriendStatus('accepted');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!friendRequestId || isRequesting) return;
    setIsRequesting(true);
    try {
      const response = await fetch('/api/social/friend-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId: friendRequestId, action: 'reject' }),
      });
      if (response.ok) {
        setFriendStatus('none');
        setFriendRequestId(null);
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRetractRequest = async () => {
    if (!friendRequestId || isRequesting) return;
    setIsRequesting(true);
    try {
      const response = await fetch('/api/social/friend-request', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId: friendRequestId }),
      });
      if (response.ok) {
        setFriendStatus('none');
        setFriendRequestId(null);
      }
    } catch (error) {
      console.error('Error retracting friend request:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRemoveFriendClick = () => {
    setShowRemoveConfirm(true);
  };

  const handleRemoveFriendConfirm = async () => {
    if (!userId || isRequesting) return;
    
    setShowRemoveConfirm(false);
    setIsRequesting(true);
    try {
      const response = await fetch('/api/social/friends', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ friendId: userId }),
      });
      if (response.ok) {
        setFriendStatus('none');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRemoveFriendCancel = () => {
    setShowRemoveConfirm(false);
  };

  if (isLoading) {
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1DB954] sm:h-8 sm:w-8">
                    <svg className="h-4 w-4 text-white sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <h1 className="text-base font-bold text-white sm:text-xl">Wrappedify</h1>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <MobileNav currentPage="social" />
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

  if (error || !user) {
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1DB954] sm:h-8 sm:w-8">
                    <svg className="h-4 w-4 text-white sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <h1 className="text-base font-bold text-white sm:text-xl">Wrappedify</h1>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <MobileNav currentPage="social" />
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
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
            <p className="text-sm text-red-400">{error || 'User not found'}</p>
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
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1DB954] sm:h-8 sm:w-8">
                  <svg className="h-4 w-4 text-white sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
                <h1 className="text-base font-bold text-white sm:text-xl">Wrappedify</h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <MobileNav currentPage="social" />
              <div className="hidden items-center gap-1.5 sm:flex sm:gap-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-xs font-semibold text-white transition-all hover:border-white hover:bg-[#2A2A2A] active:scale-95 sm:px-4 sm:py-2 sm:text-xs lg:px-5 lg:text-sm"
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
        <div className="flex flex-col gap-6 sm:gap-8">
          {/* User Header */}
          <div className="flex items-center gap-3 sm:gap-4">
            {user.profile_image_url ? (
              <img
                src={user.profile_image_url}
                alt={user.display_name || 'User'}
                className="h-12 w-12 flex-shrink-0 rounded-full object-cover sm:h-14 sm:w-14"
              />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1DB954] to-[#1ed760] sm:h-14 sm:w-14">
                <span className="text-lg font-bold text-white sm:text-xl">
                  {user.display_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="text-lg font-bold text-white sm:text-xl">
                {user.display_name || 'Unknown User'}
              </h1>
            </div>
            {currentUserId && currentUserId !== userId && (
              <div className="flex-shrink-0">
                {friendStatus === 'none' && (
                  <button
                    onClick={handleSendRequest}
                    disabled={isRequesting}
                    className="rounded-full bg-[#1DB954] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#1ed760] active:scale-95 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    {isRequesting ? 'Sending...' : 'Add Friend'}
                  </button>
                )}
                {friendStatus === 'pending' && (
                  <button
                    onClick={handleRetractRequest}
                    disabled={isRequesting}
                    className="rounded-full border border-[#2A2A2A] bg-transparent px-3 py-1.5 text-xs font-semibold text-[#B3B3B3] transition-all hover:border-red-500 hover:text-red-500 active:scale-95 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    {isRequesting ? 'Retracting...' : 'Retract'}
                  </button>
                )}
                {friendStatus === 'accepted' && (
                  <button
                    onClick={handleRemoveFriendClick}
                    disabled={isRequesting}
                    className="rounded-full border border-[#2A2A2A] bg-transparent px-3 py-1.5 text-xs font-semibold text-[#B3B3B3] transition-all hover:border-red-500 hover:text-red-500 active:scale-95 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    {isRequesting ? 'Removing...' : 'Remove Friend'}
                  </button>
                )}
                {friendStatus === 'received' && (
                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      onClick={handleAcceptRequest}
                      disabled={isRequesting}
                      className="rounded-full bg-[#1DB954] px-2.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#1ed760] active:scale-95 disabled:opacity-50 sm:px-3 sm:py-2 sm:text-sm"
                    >
                      {isRequesting ? '...' : 'Accept'}
                    </button>
                    <button
                      onClick={handleRejectRequest}
                      disabled={isRequesting}
                      className="rounded-full border border-[#2A2A2A] bg-transparent px-2.5 py-1.5 text-xs font-semibold text-[#B3B3B3] transition-all hover:border-white hover:text-white active:scale-95 disabled:opacity-50 sm:px-3 sm:py-2 sm:text-sm"
                    >
                      {isRequesting ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Relatability Score */}
          {stats && stats.relatabilityScore !== undefined && (
            <div className="rounded-lg bg-gradient-to-br from-[#1DB954] to-[#1ed760] p-6 sm:p-8">
              <div className="mb-2 text-sm font-medium text-white/90 sm:text-base">Relatability Score</div>
              <div className="flex items-baseline gap-2">
                <div className="text-4xl font-bold text-white sm:text-5xl">{stats.relatabilityScore}</div>
                <div className="text-lg font-medium text-white/80 sm:text-xl">/ 100</div>
              </div>
            </div>
          )}

          {/* Last Track */}
          {lastTrack && (
            <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
              <div className="mb-2 text-xs font-medium text-[#B3B3B3] sm:text-sm">Last Listened To</div>
              <div className="flex items-center gap-3">
                {lastTrack.imageUrl && (
                  <img
                    src={lastTrack.imageUrl}
                    alt={`${lastTrack.trackName} by ${lastTrack.artistName}`}
                    className="h-12 w-12 flex-shrink-0 rounded object-cover sm:h-16 sm:w-16"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold text-white sm:text-lg">
                    {lastTrack.trackName}
                  </div>
                  <div className="text-sm text-[#B3B3B3] sm:text-base">
                    {lastTrack.artistName}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
                <div className="mb-2 text-xs font-medium text-[#B3B3B3] sm:text-sm">Favorite Artist</div>
                <div className="flex items-center gap-3">
                  {stats.favoriteArtistImage && (
                    <img
                      src={stats.favoriteArtistImage}
                      alt={stats.favoriteArtist}
                      className="h-12 w-12 flex-shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-bold text-white sm:text-xl">{stats.favoriteArtist}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
                <div className="mb-2 text-xs font-medium text-[#B3B3B3] sm:text-sm">Favorite Song</div>
                <div className="flex items-center gap-3">
                  {stats.favoriteTrackImage && (
                    <img
                      src={stats.favoriteTrackImage}
                      alt={stats.favoriteTrack}
                      className="h-12 w-12 flex-shrink-0 rounded object-cover sm:h-16 sm:w-16"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-base font-semibold text-white sm:text-lg">{stats.favoriteTrack}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
                <div className="mb-2 text-xs font-medium text-[#B3B3B3] sm:text-sm">Favorite Genre</div>
                <div className="text-lg font-bold text-white sm:text-xl">{stats.favoriteGenre}</div>
              </div>
              <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
                <div className="mb-2 text-xs font-medium text-[#B3B3B3] sm:text-sm">This Month</div>
                <div className="text-lg font-bold text-white sm:text-xl">
                  {stats.minutesThisMonth.toLocaleString()} <span className="text-sm font-normal text-[#B3B3B3]">minutes</span>
                </div>
              </div>
            </div>
          )}

          {!stats && (
            <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
              <p className="text-sm text-[#B3B3B3]">
                No listening data available for this user yet.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Remove Friend Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-[#181818] p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-white sm:text-xl">
              Remove Friend
            </h3>
            <p className="mb-6 text-sm text-[#B3B3B3] sm:text-base">
              Are you sure you want to remove this friend?
            </p>
            <div className="flex gap-3 sm:justify-end">
              <button
                onClick={handleRemoveFriendCancel}
                disabled={isRequesting}
                className="flex-1 rounded-full border border-[#2A2A2A] bg-transparent px-4 py-2 text-sm font-semibold text-[#B3B3B3] transition-all hover:border-white hover:text-white active:scale-95 disabled:opacity-50 sm:flex-none"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveFriendConfirm}
                disabled={isRequesting}
                className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50 sm:flex-none"
              >
                {isRequesting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

