'use client';

import { useState } from 'react';
import { useTopGenres } from '@/hooks/useSpotifyData';

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export function TopGenres() {
  const [timeRange, setTimeRange] = useState<TimeRange>('medium_term');
  const [isChanging, setIsChanging] = useState(false);
  const { genres, isLoading, error } = useTopGenres(timeRange);

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
            Top Genres
          </h3>
        </div>
        <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-full bg-[#2A2A2A] sm:h-10 sm:w-10" />
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
          Top Genres
        </h3>
        <p className="mt-2 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (genres.length === 0) {
    return (
      <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
        <h3 className="text-base font-bold text-white sm:text-lg">
          Top Genres
        </h3>
        <p className="mt-2 text-sm text-[#B3B3B3]">
          No genres found. Listen to more music to see your top genres!
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
          Top Genres
        </h3>
        <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
      </div>
      {showLoading ? (
        <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-full bg-[#2A2A2A] sm:h-10 sm:w-10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#2A2A2A]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[#2A2A2A]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 w-full max-w-full space-y-1 sm:mt-4 sm:space-y-2">
          {genres.slice(0, 10).map((genre, index) => (
            <GenreItem key={genre.name} genre={genre} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function GenreItem({ genre, rank }: { genre: { name: string; count: number; imageUrl?: string; artistName?: string }; rank: number }) {
  // Capitalize first letter of each word
  const formattedName = genre.name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="group flex w-full max-w-full items-center gap-2 overflow-hidden rounded-md p-2 transition-colors hover:bg-[#2A2A2A] active:bg-[#333333] sm:gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] text-xs font-semibold text-[#B3B3B3] sm:h-10 sm:w-10 sm:text-sm">
        {rank}
      </div>
      {genre.imageUrl ? (
        <img
          src={genre.imageUrl}
          alt={genre.artistName || formattedName}
          className="h-12 w-12 flex-shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
        />
      ) : (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1DB954] to-[#1ed760] sm:h-16 sm:w-16">
          <span className="text-lg font-bold text-white sm:text-xl">
            {genre.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <p className="truncate text-sm font-medium text-white group-hover:text-white sm:text-base">
          {formattedName}
        </p>
        <p className="truncate text-xs text-[#B3B3B3] sm:text-sm">
          {genre.count} {genre.count === 1 ? 'artist' : 'artists'}
          {genre.artistName && ` • ${genre.artistName}`}
        </p>
      </div>
    </div>
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
    <div className="flex w-fit gap-1 rounded-full bg-[#2A2A2A] p-1 sm:gap-1.5 sm:p-1.5 md:gap-1.5 md:p-1.5 lg:gap-2 lg:p-2">
      <button
        onClick={() => onChange('short_term')}
        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold leading-tight transition-all active:scale-95 sm:px-3 sm:py-1.5 sm:text-[12px] md:px-3.5 md:py-1.5 md:text-xs lg:px-4 lg:py-2 lg:text-sm ${
          value === 'short_term'
            ? 'bg-white text-black'
            : 'text-[#B3B3B3] hover:text-white'
        }`}
      >
        4 Weeks
      </button>
      <button
        onClick={() => onChange('medium_term')}
        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold leading-tight transition-all active:scale-95 sm:px-3 sm:py-1.5 sm:text-[12px] md:px-3.5 md:py-1.5 md:text-xs lg:px-4 lg:py-2 lg:text-sm ${
          value === 'medium_term'
            ? 'bg-white text-black'
            : 'text-[#B3B3B3] hover:text-white'
        }`}
      >
        6 Months
      </button>
      <button
        onClick={() => onChange('long_term')}
        className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold leading-tight transition-all active:scale-95 sm:px-3 sm:py-1.5 sm:text-[12px] md:px-3.5 md:py-1.5 md:text-xs lg:px-4 lg:py-2 lg:text-sm ${
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

