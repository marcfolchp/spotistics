'use client';

import { useRecentlyPlayed } from '@/hooks/useSpotifyData';
import { formatExactTimestamp } from '@/lib/utils/date';
import type { SpotifyTrackWithTimestamp } from '@/types';

export function RecentTracks() {
  const { tracks, isLoading, error } = useRecentlyPlayed();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
        <h3 className="text-base font-bold text-white sm:text-lg">
          Recent Tracks
        </h3>
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
          Recent Tracks
        </h3>
        <p className="mt-2 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-lg bg-[#181818] p-4 sm:p-6">
        <h3 className="text-base font-bold text-white sm:text-lg">
          Recent Tracks
        </h3>
        <p className="mt-2 text-sm text-[#B3B3B3]">
          No recent tracks found.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden rounded-lg bg-[#181818] p-4 transition-colors hover:bg-[#282828] sm:p-6">
      <h3 className="text-base font-bold text-white sm:text-lg">
        Recent Tracks
      </h3>
      <div className="mt-3 w-full max-w-full space-y-1 sm:mt-4 sm:space-y-2">
        {tracks.slice(0, 10).map((track, index) => (
          <TrackItem key={`${track.id}-${index}`} track={track} />
        ))}
      </div>
    </div>
  );
}

function TrackItem({ track }: { track: SpotifyTrackWithTimestamp }) {
  const imageUrl = track.album.images?.[0]?.url || '';
  const artistNames = track.artists.map((a) => a.name).join(', ');

  return (
    <a
      href={track.external_urls.spotify}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full max-w-full items-center gap-2 overflow-hidden rounded-md p-2 transition-colors hover:bg-[#2A2A2A] active:bg-[#333333] sm:gap-3"
    >
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
        {formatExactTimestamp(track.playedAt)}
      </div>
    </a>
  );
}

