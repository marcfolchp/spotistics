// Spotify API Types

export interface SpotifyUser {
  id: string;
  display_name?: string;
  email?: string;
  images?: Array<{ url: string; height?: number; width?: number }>;
  country?: string;
  product?: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; height?: number; width?: number }>;
    release_date?: string;
  };
  duration_ms: number;
  popularity?: number;
  preview_url?: string | null;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images?: Array<{ url: string; height?: number; width?: number }>;
  genres?: string[];
  popularity?: number;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string | null;
  images?: Array<{ url: string; height?: number; width?: number }>;
  owner: {
    display_name: string;
    id: string;
  };
  tracks: {
    total: number;
  };
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyPlaybackHistory {
  track: SpotifyTrack;
  played_at: string;
  context?: {
    type: string;
    uri: string;
  };
}

// User Data Export Types (from Spotify data download)
export interface SpotifyExportTrack {
  endTime: string;
  artistName: string;
  trackName: string;
  msPlayed: number;
}

export interface ProcessedListeningData {
  trackId?: string;
  trackName: string;
  artistName: string;
  artistId?: string;
  playedAt: Date;
  durationMs: number;
  source: 'api' | 'export';
}

export interface ListeningStats {
  totalTracks: number;
  totalArtists: number;
  totalListeningTime: number; // in milliseconds
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface TopTrack {
  track: SpotifyTrack;
  playCount: number;
  totalDuration: number;
}

// Simplified format for aggregated data (from user exports)
export interface AggregatedTopTrack {
  trackName: string;
  artistName: string;
  playCount: number;
  totalDuration: number;
}

export interface TopArtist {
  artist: SpotifyArtist;
  playCount: number;
  totalDuration: number;
}

// Simplified format for aggregated data (from user exports)
export interface AggregatedTopArtist {
  artistName: string;
  playCount: number;
  totalDuration: number;
}

export interface TimePattern {
  hour: number;
  playCount: number;
}

export interface DayPattern {
  day: number; // 0-6 (Sunday-Saturday)
  playCount: number;
}

export interface ListeningFrequency {
  date: Date;
  playCount: number;
  totalDuration: number;
}

