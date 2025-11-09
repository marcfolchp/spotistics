import { createSpotifyClient } from './client';
import type { SpotifyUser, SpotifyTrack, SpotifyArtist, SpotifyPlaylist } from '@/types';

/**
 * Get user profile
 */
export async function getUserProfile(accessToken: string): Promise<SpotifyUser> {
  const spotifyApi = createSpotifyClient(accessToken);
  const data = await spotifyApi.getMe();
  return data.body;
}

/**
 * Get user's recently played tracks
 */
export async function getRecentlyPlayed(
  accessToken: string,
  limit: number = 50
): Promise<SpotifyTrack[]> {
  const spotifyApi = createSpotifyClient(accessToken);
  const data = await spotifyApi.getMyRecentlyPlayedTracks({ limit });
  return data.body.items.map((item: any) => item.track);
}

/**
 * Get user's recently played tracks with timestamps
 * Spotify API returns up to 50 tracks per request, but we can paginate to get more
 */
export async function getRecentlyPlayedWithTimestamps(
  accessToken: string,
  limit: number = 50
): Promise<Array<{ track: SpotifyTrack; playedAt: Date }>> {
  const spotifyApi = createSpotifyClient(accessToken);
  
  // Spotify API has a max of 50 per request, so we need to paginate if limit > 50
  // Use 'before' parameter to paginate backwards (get older tracks)
  const maxPerRequest = 50;
  const allTracks: Array<{ track: SpotifyTrack; playedAt: Date }> = [];
  let before: number | undefined = undefined;
  let hasMore = true;
  let totalFetched = 0;
  
  console.log(`Fetching recently played tracks (requested limit: ${limit})...`);
  
  while (hasMore && totalFetched < limit) {
    const requestLimit = Math.min(maxPerRequest, limit - totalFetched);
    const options: any = { limit: requestLimit };
    
    // Use 'before' to get older tracks (pagination backwards in time)
    if (before) {
      options.before = before;
    }
    
    try {
      const data = await spotifyApi.getMyRecentlyPlayedTracks(options);
      
      if (!data.body.items || data.body.items.length === 0) {
        hasMore = false;
        break;
      }
      
      const tracks = data.body.items.map((item: any) => ({
        track: item.track,
        playedAt: new Date(item.played_at),
      }));
      
      allTracks.push(...tracks);
      totalFetched += tracks.length;
      
      console.log(`Fetched ${tracks.length} tracks (total: ${totalFetched})`);
      
      // If we got fewer than requested, we've reached the end
      if (tracks.length < requestLimit) {
        hasMore = false;
        break;
      }
      
      // Set 'before' to the oldest track's timestamp for next request (to get older tracks)
      const oldestTrack = tracks[tracks.length - 1];
      before = oldestTrack.playedAt.getTime();
      
      // Small delay to avoid rate limiting
      if (hasMore && totalFetched < limit) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
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
  
  console.log(`Total tracks fetched: ${allTracks.length}`);
  if (allTracks.length > 0) {
    const newest = allTracks[0].playedAt;
    const oldest = allTracks[allTracks.length - 1].playedAt;
    console.log(`Time range: ${newest.toISOString()} to ${oldest.toISOString()}`);
  }
  
  return allTracks;
}

/**
 * Get user's top artists
 */
export async function getTopArtists(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit: number = 50
): Promise<SpotifyArtist[]> {
  const spotifyApi = createSpotifyClient(accessToken);
  const data = await spotifyApi.getMyTopArtists({ time_range: timeRange, limit });
  return data.body.items;
}

/**
 * Get user's top tracks
 */
export async function getTopTracks(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit: number = 50
): Promise<SpotifyTrack[]> {
  const spotifyApi = createSpotifyClient(accessToken);
  const data = await spotifyApi.getMyTopTracks({ time_range: timeRange, limit });
  return data.body.items;
}

/**
 * Get user's playlists
 */
export async function getUserPlaylists(
  accessToken: string,
  limit: number = 50
): Promise<SpotifyPlaylist[]> {
  const spotifyApi = createSpotifyClient(accessToken);
  const data = await spotifyApi.getUserPlaylists({ limit });
  return data.body.items as SpotifyPlaylist[];
}

