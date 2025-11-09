# Recent Tracks Table Setup

This table stores the most recent tracks (last 100) with full metadata for fast dashboard display.

## SQL Schema

Run this in your Supabase SQL Editor:

```sql
-- Create recent_tracks table
CREATE TABLE IF NOT EXISTS recent_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  track_data JSONB NOT NULL, -- Full SpotifyTrack object with playedAt timestamp
  played_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_recent_tracks_user_id ON recent_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_tracks_played_at ON recent_tracks(user_id, played_at DESC);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_recent_tracks_updated_at
  BEFORE UPDATE ON recent_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to keep only the most recent 100 tracks per user
CREATE OR REPLACE FUNCTION keep_recent_tracks_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete tracks beyond the 100 most recent for this user
  DELETE FROM recent_tracks
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM recent_tracks
      WHERE user_id = NEW.user_id
      ORDER BY played_at DESC
      LIMIT 100
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up old tracks
CREATE TRIGGER cleanup_old_recent_tracks
  AFTER INSERT ON recent_tracks
  FOR EACH ROW
  EXECUTE FUNCTION keep_recent_tracks_limit();
```

## How It Works

1. **Sync Job**: When the cron job runs, it fetches recently played tracks from Spotify and stores them in this table
2. **Dashboard**: The dashboard fetches from this table instead of calling Spotify API directly
3. **Auto-Cleanup**: The trigger automatically keeps only the 100 most recent tracks per user
4. **Fast Queries**: Indexed by user_id and played_at for fast retrieval

