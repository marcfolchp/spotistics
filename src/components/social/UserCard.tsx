'use client';

import { useState } from 'react';
import type { User } from '@/lib/supabase/types';

interface UserCardProps {
  user: User;
  currentUserId: string;
  onSendRequest?: (userId: string) => void;
  onAcceptRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
  friendRequestStatus?: 'none' | 'pending' | 'accepted' | 'received';
  friendRequestId?: string;
  isLoading?: boolean;
}

export function UserCard({
  user,
  currentUserId,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  friendRequestStatus = 'none',
  friendRequestId,
  isLoading = false,
}: UserCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleSendRequest = async () => {
    if (!onSendRequest || isRequesting) return;
    setIsRequesting(true);
    try {
      await onSendRequest(user.user_id);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleAccept = async () => {
    if (!onAcceptRequest || !friendRequestId || isRequesting) return;
    setIsRequesting(true);
    try {
      await onAcceptRequest(friendRequestId);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleReject = async () => {
    if (!onRejectRequest || !friendRequestId || isRequesting) return;
    setIsRequesting(true);
    try {
      await onRejectRequest(friendRequestId);
    } finally {
      setIsRequesting(false);
    }
  };

  if (user.user_id === currentUserId) {
    return null; // Don't show current user
  }

  return (
    <div className="rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
      <div className="flex items-center gap-4">
        {user.profile_image_url ? (
          <img
            src={user.profile_image_url}
            alt={user.display_name || 'User'}
            className="h-12 w-12 flex-shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1DB954] to-[#1ed760] sm:h-16 sm:w-16">
            <span className="text-lg font-bold text-white sm:text-xl">
              {user.display_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate text-base font-bold text-white sm:text-lg">
            {user.display_name || 'Unknown User'}
          </h3>
        </div>
        <div className="flex-shrink-0">
          {friendRequestStatus === 'none' && (
            <button
              onClick={handleSendRequest}
              disabled={isRequesting || isLoading}
              className="rounded-full bg-[#1DB954] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#1ed760] active:scale-95 disabled:opacity-50 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              {isRequesting ? 'Sending...' : 'Add Friend'}
            </button>
          )}
          {friendRequestStatus === 'pending' && (
            <button
              disabled
              className="rounded-full border border-[#1DB954] bg-[#1DB954]/20 px-4 py-2 text-xs font-semibold text-[#1DB954] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Request Sent
            </button>
          )}
          {friendRequestStatus === 'accepted' && (
            <button
              disabled
              className="rounded-full border border-[#1DB954] bg-transparent px-4 py-2 text-xs font-semibold text-[#1DB954] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Friends
            </button>
          )}
          {friendRequestStatus === 'received' && (
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                disabled={isRequesting || isLoading}
                className="rounded-full bg-[#1DB954] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#1ed760] active:scale-95 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
              >
                {isRequesting ? '...' : 'Accept'}
              </button>
              <button
                onClick={handleReject}
                disabled={isRequesting || isLoading}
                className="rounded-full border border-[#2A2A2A] bg-transparent px-3 py-1.5 text-xs font-semibold text-[#B3B3B3] transition-all hover:border-white hover:text-white active:scale-95 disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
              >
                {isRequesting ? '...' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

