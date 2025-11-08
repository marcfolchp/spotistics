import type { SpotifyTrack, ProcessedListeningData } from '@/types';

/**
 * Convert Spotify recently played track to ProcessedListeningData
 */
export function convertSpotifyTrackToProcessed(
  track: SpotifyTrack,
  playedAt: Date
): ProcessedListeningData {
  return {
    trackName: track.name,
    artistName: track.artists.map(a => a.name).join(', '),
    playedAt: playedAt,
    durationMs: track.duration_ms || 0,
    source: 'api',
    trackId: track.id,
    artistId: track.artists[0]?.id,
  };
}

/**
 * Filter out tracks that already exist in the database
 * Compares by user_id, track_name, artist_name, and played_at
 */
export function filterNewTracks(
  newTracks: ProcessedListeningData[],
  existingTracks: ProcessedListeningData[]
): ProcessedListeningData[] {
  // Create a Set of existing track keys for fast lookup
  const existingKeys = new Set(
    existingTracks.map(t => 
      `${t.trackName}|${t.artistName}|${t.playedAt.toISOString()}`
    )
  );

  // Filter out tracks that already exist
  return newTracks.filter(t => {
    const key = `${t.trackName}|${t.artistName}|${t.playedAt.toISOString()}`;
    return !existingKeys.has(key);
  });
}

/**
 * Get the most recent played_at timestamp for a user
 * Used to only fetch tracks newer than what we already have
 */
export function getMostRecentPlayedAt(
  existingTracks: ProcessedListeningData[]
): Date | null {
  if (existingTracks.length === 0) {
    return null;
  }

  // Find the most recent track
  const mostRecent = existingTracks.reduce((latest, track) => {
    return track.playedAt > latest.playedAt ? track : latest;
  });

  return mostRecent.playedAt;
}

