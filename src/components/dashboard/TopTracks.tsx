'use client';

import { useState } from 'react';
import { useTopTracks } from '@/hooks/useSpotifyData';
import { formatDuration } from '@/lib/utils/date';
import type { SpotifyTrack } from '@/types';

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export function TopTracks() {
  const [timeRange, setTimeRange] = useState<TimeRange>('medium_term');
  const [isChanging, setIsChanging] = useState(false);
  const { tracks, isLoading, error } = useTopTracks(timeRange);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    if (newRange !== timeRange) {
      setIsChanging(true);
      setTimeRange(newRange);
      // Reset changing state after a short delay to allow loading state to show
      setTimeout(() => setIsChanging(false), 100);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white sm:text-lg">
            Top Tracks
          </h3>
        </div>
        <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded bg-[#2A2A2A] sm:h-12 sm:w-12" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#2A2A2A]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[#2A2A2A]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
        <h3 className="text-base font-bold text-white sm:text-lg">
          Top Tracks
        </h3>
        <p className="mt-2 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
        <h3 className="text-base font-bold text-white sm:text-lg">
          Top Tracks
        </h3>
        <p className="mt-2 text-sm text-[#B3B3B3]">
          No top tracks found.
        </p>
      </div>
    );
  }

  // Show loading state if loading or changing time range
  const showLoading = isLoading || isChanging;

  return (
    <div className="w-full max-w-full overflow-hidden rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold text-white sm:text-lg">
          Top Tracks
        </h3>
        <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
      </div>
      {showLoading ? (
        <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded bg-[#2A2A2A] sm:h-12 sm:w-12" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#2A2A2A]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[#2A2A2A]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 w-full max-w-full space-y-1 sm:mt-4 sm:space-y-2">
          {tracks.slice(0, 10).map((track, index) => (
            <TrackItem key={track.id} track={track} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackItem({ track, rank }: { track: SpotifyTrack; rank: number }) {
  const imageUrl = track.album.images?.[0]?.url || '';
  const artistNames = track.artists.map((a) => a.name).join(', ');

  return (
    <a
      href={track.external_urls.spotify}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full max-w-full items-center gap-2 overflow-hidden rounded-md p-2 transition-colors hover:bg-[#2A2A2A] active:bg-[#333333] sm:gap-3"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] text-xs font-semibold text-[#B3B3B3] sm:h-10 sm:w-10 sm:text-sm">
        {rank}
      </div>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={track.album.name}
          className="h-10 w-10 flex-shrink-0 rounded object-cover sm:h-12 sm:w-12"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <p className="truncate text-sm font-medium text-white group-hover:text-white sm:text-base">
          {track.name}
        </p>
        <p className="truncate text-xs text-[#B3B3B3] sm:text-sm">
          {artistNames}
        </p>
      </div>
      <div className="ml-2 flex-shrink-0 text-xs text-[#B3B3B3] sm:ml-3 sm:text-sm">
        {formatDuration(track.duration_ms)}
      </div>
    </a>
  );
}

function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}) {
  return (
    <div className="flex w-fit gap-0.5 rounded-full bg-[#2A2A2A] p-0.5 sm:gap-1 sm:p-1">
      <button
        onClick={() => onChange('short_term')}
        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-tight transition-all active:scale-95 sm:px-2.5 sm:py-1 sm:text-[11px] md:px-3 md:text-xs ${
          value === 'short_term'
            ? 'bg-white text-black'
            : 'text-[#B3B3B3] hover:text-white'
        }`}
      >
        4W
      </button>
      <button
        onClick={() => onChange('medium_term')}
        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-tight transition-all active:scale-95 sm:px-2.5 sm:py-1 sm:text-[11px] md:px-3 md:text-xs ${
          value === 'medium_term'
            ? 'bg-white text-black'
            : 'text-[#B3B3B3] hover:text-white'
        }`}
      >
        6M
      </button>
      <button
        onClick={() => onChange('long_term')}
        className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-tight transition-all active:scale-95 sm:px-2.5 sm:py-1 sm:text-[11px] md:px-3 md:text-xs ${
          value === 'long_term'
            ? 'bg-white text-black'
            : 'text-[#B3B3B3] hover:text-white'
        }`}
      >
        All
      </button>
    </div>
  );
}

