import { createSpotifyClient } from './client';
import type { SpotifyTrack } from '@/types';

/**
 * Get user's recently played tracks with timestamps
 * Returns tracks with their played_at timestamp
 */
export async function getRecentlyPlayedWithTimestamps(
  accessToken: string,
  limit: number = 50,
  after?: number // Unix timestamp in milliseconds
): Promise<Array<{ track: SpotifyTrack; playedAt: Date }>> {
  const spotifyApi = createSpotifyClient(accessToken);
  
  const options: any = { limit };
  if (after) {
    // Spotify API expects timestamp in milliseconds
    options.after = after;
  }
  
  const data = await spotifyApi.getMyRecentlyPlayedTracks(options);
  
  return data.body.items.map((item: any) => ({
    track: item.track,
    playedAt: new Date(item.played_at),
  }));
}

/**
 * Get all recently played tracks (paginated)
 * Fetches up to the maximum allowed by Spotify API
 */
export async function getAllRecentlyPlayed(
  accessToken: string,
  maxTracks: number = 1000,
  afterTimestamp?: number // Only fetch tracks after this timestamp
): Promise<Array<{ track: SpotifyTrack; playedAt: Date }>> {
  const allTracks: Array<{ track: SpotifyTrack; playedAt: Date }> = [];
  const limit = 50; // Spotify API max per request
  let after: number | undefined = afterTimestamp;
  let hasMore = true;
  let totalFetched = 0;

  while (hasMore && totalFetched < maxTracks) {
    try {
      const tracks = await getRecentlyPlayedWithTimestamps(
        accessToken,
        limit,
        after
      );

      if (tracks.length === 0) {
        hasMore = false;
        break;
      }

      // Filter by afterTimestamp if provided
      let filteredTracks = tracks;
      if (afterTimestamp) {
        filteredTracks = tracks.filter(t => t.playedAt.getTime() > afterTimestamp);
        if (filteredTracks.length === 0) {
          hasMore = false;
          break;
        }
      }

      allTracks.push(...filteredTracks);
      totalFetched += filteredTracks.length;

      // Set 'after' to the oldest track's timestamp for next request
      const oldestTrack = tracks[tracks.length - 1];
      after = oldestTrack.playedAt.getTime();

      // If we got fewer than the limit, we've reached the end
      if (tracks.length < limit) {
        hasMore = false;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error('Error fetching recently played tracks:', error);
      // If it's a rate limit error, wait a bit and retry
      if (error.statusCode === 429) {
        const retryAfter = error.headers?.['retry-after'] || 1;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      // For other errors, break
      hasMore = false;
    }
  }

  return allTracks;
}

