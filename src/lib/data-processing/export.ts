import Papa from 'papaparse';
import { SpotifyExportTrack, ProcessedListeningData } from '@/types';
import { parseISO } from 'date-fns';

/**
 * Parse Spotify export JSON file
 * Handles both old format (endTime, artistName, trackName, msPlayed)
 * and new Extended Streaming History format (ts, master_metadata_track_name, master_metadata_album_artist_name, ms_played)
 */
export function parseSpotifyExport(jsonData: any): SpotifyExportTrack[] {
  // Spotify export format: Array of objects
  if (Array.isArray(jsonData)) {
    return jsonData
      .filter((item) => {
        // Only include items with valid track data (skip episodes, audiobooks, etc.)
        const hasTrack = item.master_metadata_track_name || item.trackName;
        const hasPlayTime = (item.ms_played || item.msPlayed) > 0;
        return hasTrack && hasPlayTime;
      })
      .map((item) => ({
        endTime: item.endTime || item.ts || item.played_at,
        artistName: item.artistName || item.master_metadata_album_artist_name || '',
        trackName: item.trackName || item.master_metadata_track_name || '',
        msPlayed: item.msPlayed || item.ms_played || 0,
      }));
  }

  // If it's an object with a data array
  if (jsonData.data && Array.isArray(jsonData.data)) {
    return parseSpotifyExport(jsonData.data);
  }

  throw new Error('Invalid Spotify export format');
}

/**
 * Convert Spotify export tracks to processed listening data
 */
export function convertExportToProcessed(
  exportTracks: SpotifyExportTrack[]
): ProcessedListeningData[] {
  return exportTracks
    .filter((track) => track.msPlayed > 0) // Only include tracks that were actually played
    .map((track) => ({
      trackName: track.trackName,
      artistName: track.artistName,
      playedAt: parseISO(track.endTime),
      durationMs: track.msPlayed,
      source: 'export',
    }));
}

/**
 * Parse CSV file (if user uploads CSV instead of JSON)
 */
export function parseCSV(csvContent: string): Promise<SpotifyExportTrack[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const tracks = parseSpotifyExport(results.data);
          resolve(tracks);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

