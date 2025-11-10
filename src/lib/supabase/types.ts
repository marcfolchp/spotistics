/**
 * Supabase database types
 * These match the database schema
 */

export interface ListeningDataRow {
  id: string;
  user_id: string;
  track_name: string;
  artist_name: string;
  played_at: string; // ISO date string
  duration_ms: number;
  source: 'api' | 'export';
  created_at: string;
  updated_at: string;
}

export interface UserDataSummary {
  id: string;
  user_id: string;
  total_tracks: number;
  total_artists: number;
  total_listening_time_ms: number;
  date_range_start: string;
  date_range_end: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  user_id: string;
  display_name: string | null;
  profile_image_url: string | null;
  spotify_profile_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

