'use client';

import { useState, useEffect } from 'react';
import { formatDurationMinutes } from '@/lib/utils/date';
import type { FriendRanking } from '@/app/api/social/rankings/route';
import { TimeRangeSelector } from '@/components/analytics/TimeRangeSelector';
import type { TimeRange } from '@/lib/utils/date-ranges';

interface RankingsProps {
  currentUserId: string;
}

export function Rankings({ currentUserId }: RankingsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [rankingType, setRankingType] = useState<'listeningTime' | 'tracks' | 'artists'>('listeningTime');
  const [rankings, setRankings] = useState<FriendRanking[]>([]);
  const [userRanking, setUserRanking] = useState<FriendRanking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRankings() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/social/rankings?timeRange=${timeRange}&type=${rankingType}`,
          {
            credentials: 'include',
          }
        );

        if (response.ok) {
          const data = await response.json();
          setRankings(data.rankings || []);
          setUserRanking(data.userRanking || null);
          // Clear error if we got successful response
          if (data.message && data.rankings.length === 0) {
            setError('No friends found. Add friends from the Search Users tab to see rankings!');
          } else {
            setError(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch rankings' }));
          // Check if it's a relationship error
          if (errorData.error && errorData.error.includes('Could not find a relationship')) {
            setError('No friends found. Add friends from the Search Users tab to see rankings!');
          } else {
            setError(errorData.error || 'Failed to fetch rankings');
          }
        }
      } catch (err) {
        setError('An error occurred while fetching rankings');
        console.error('Error fetching rankings:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRankings();
  }, [timeRange, rankingType]);

  if (isLoading) {
    return (
      <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
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
      </div>
    );
  }

  if (error) {
    // Check if it's the "no friends" error or a real error
    if (error.includes('No friends found') || error.includes('Could not find a relationship')) {
      return (
        <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
          <h3 className="text-base font-bold text-white sm:text-lg">Rankings</h3>
          <p className="mt-2 text-sm text-[#B3B3B3]">
            No friends yet. Add friends from the Search Users tab to see rankings!
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
        <h3 className="text-base font-bold text-white sm:text-lg">Rankings</h3>
        <p className="mt-2 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
        <h3 className="text-base font-bold text-white sm:text-lg">Rankings</h3>
        <p className="mt-2 text-sm text-[#B3B3B3]">
          No friends yet. Add friends from the Search Users tab to see rankings!
        </p>
      </div>
    );
  }

  const getRankingLabel = () => {
    switch (rankingType) {
      case 'tracks':
        return 'Most Tracks';
      case 'artists':
        return 'Most Artists';
      case 'listeningTime':
      default:
        return 'Most Listening Time';
    }
  };

  const getRankingValue = (ranking: FriendRanking) => {
    switch (rankingType) {
      case 'tracks':
        return `${ranking.totalTracks.toLocaleString()} tracks`;
      case 'artists':
        return `${ranking.totalArtists.toLocaleString()} artists`;
      case 'listeningTime':
      default:
        return `${formatDurationMinutes(ranking.totalListeningTime)} minutes`;
    }
  };

  return (
    <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold text-white sm:text-lg">Rankings</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <div className="flex flex-nowrap gap-0.5 rounded-full bg-[#2A2A2A] p-0.5 sm:gap-1 sm:p-1 md:gap-1 md:p-1 lg:gap-1.5 lg:p-1.5">
            <button
              onClick={() => setRankingType('listeningTime')}
              className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold leading-tight transition-all active:scale-95 sm:px-2 sm:py-1 sm:text-[10px] md:px-2.5 md:py-1 md:text-[11px] lg:px-3 lg:py-1.5 lg:text-xs ${
                rankingType === 'listeningTime'
                  ? 'bg-white text-black'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              Time
            </button>
            <button
              onClick={() => setRankingType('tracks')}
              className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold leading-tight transition-all active:scale-95 sm:px-2 sm:py-1 sm:text-[10px] md:px-2.5 md:py-1 md:text-[11px] lg:px-3 lg:py-1.5 lg:text-xs ${
                rankingType === 'tracks'
                  ? 'bg-white text-black'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              Tracks
            </button>
            <button
              onClick={() => setRankingType('artists')}
              className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold leading-tight transition-all active:scale-95 sm:px-2 sm:py-1 sm:text-[10px] md:px-2.5 md:py-1 md:text-[11px] lg:px-3 lg:py-1.5 lg:text-xs ${
                rankingType === 'artists'
                  ? 'bg-white text-black'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              Artists
            </button>
          </div>
        </div>
      </div>

      {userRanking && (
        <div className="mt-4 rounded-lg border-2 border-[#1DB954] bg-[#1DB954]/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1DB954] text-lg font-bold text-white sm:h-12 sm:w-12 sm:text-xl">
              {userRanking.rank}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-sm font-semibold text-white sm:text-base">You</p>
              <p className="text-xs text-[#B3B3B3] sm:text-sm">{getRankingValue(userRanking)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {rankings.map((ranking) => (
          <RankingItem
            key={ranking.userId}
            ranking={ranking}
            isCurrentUser={ranking.userId === currentUserId}
            rankingValue={getRankingValue(ranking)}
          />
        ))}
      </div>
    </div>
  );
}

function RankingItem({
  ranking,
  isCurrentUser,
  rankingValue,
}: {
  ranking: FriendRanking;
  isCurrentUser: boolean;
  rankingValue: string;
}) {
  if (isCurrentUser) {
    return null; // Already shown above
  }

  return (
    <div className="flex items-center gap-3 rounded-md bg-[#2A2A2A] p-3 transition-colors hover:bg-[#333333]">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] text-sm font-semibold text-[#B3B3B3] sm:h-10 sm:w-10 sm:text-base">
        {ranking.rank}
      </div>
      {ranking.profileImageUrl ? (
        <img
          src={ranking.profileImageUrl}
          alt={ranking.displayName || 'User'}
          className="h-10 w-10 flex-shrink-0 rounded-full object-cover sm:h-12 sm:w-12"
        />
      ) : (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1DB954] to-[#1ed760] sm:h-12 sm:w-12">
          <span className="text-base font-bold text-white sm:text-lg">
            {ranking.displayName?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium text-white sm:text-base">
          {ranking.displayName || 'Unknown User'}
        </p>
        <p className="text-xs text-[#B3B3B3] sm:text-sm">{rankingValue}</p>
      </div>
    </div>
  );
}

