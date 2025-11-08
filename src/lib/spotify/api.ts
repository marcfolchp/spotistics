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

