# Supabase Social Tables Setup

This document describes the tables needed for the social features (user search, friend requests, and rankings).

## SQL Schema

Run this in your Supabase SQL Editor:

```sql
-- Create users table for public user profiles
-- This stores public information that can be viewed by other users
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL, -- Spotify user ID
  display_name TEXT,
  profile_image_url TEXT,
  spotify_profile_url TEXT,
  is_public BOOLEAN DEFAULT true, -- Whether profile is public
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- Create friends table (for accepted friendships)
CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id) -- Prevent self-friending
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_public ON users(is_public);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically create friend relationship when request is accepted
CREATE OR REPLACE FUNCTION create_friendship_on_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create bidirectional friendship
    INSERT INTO friends (user_id, friend_id)
    VALUES (NEW.from_user_id, NEW.to_user_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    INSERT INTO friends (user_id, friend_id)
    VALUES (NEW.to_user_id, NEW.from_user_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_friendship_trigger
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_friendship_on_accept();

-- Create trigger to remove friendship when request is rejected or deleted
CREATE OR REPLACE FUNCTION remove_friendship_on_reject()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' OR NEW.status IS NULL THEN
    -- Remove bidirectional friendship
    DELETE FROM friends
    WHERE (user_id = NEW.from_user_id AND friend_id = NEW.to_user_id)
       OR (user_id = NEW.to_user_id AND friend_id = NEW.from_user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER remove_friendship_trigger
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION remove_friendship_on_reject();
```

## Table Descriptions

### `users` Table
Stores public user profile information that can be viewed by other users.

**Fields:**
- `user_id`: Spotify user ID (unique)
- `display_name`: User's display name from Spotify
- `profile_image_url`: User's profile image URL
- `spotify_profile_url`: Link to user's Spotify profile
- `is_public`: Whether the profile is public (default: true)

### `friend_requests` Table
Stores friend requests between users.

**Fields:**
- `from_user_id`: User who sent the request
- `to_user_id`: User who received the request
- `status`: 'pending', 'accepted', or 'rejected'

**Triggers:**
- Automatically creates friendship when request is accepted
- Automatically removes friendship when request is rejected

### `friends` Table
Stores accepted friendships (bidirectional).

**Fields:**
- `user_id`: First user in the friendship
- `friend_id`: Second user in the friendship

**Note:** Friendships are stored bidirectionally (both directions) for easier querying.

## How It Works

1. **User Registration**: When a user logs in, their profile is created/updated in the `users` table
2. **Friend Requests**: Users can send friend requests, which are stored in `friend_requests` with status 'pending'
3. **Accepting Requests**: When a request is accepted, the trigger automatically creates bidirectional friendships
4. **Rankings**: Rankings are calculated by querying friends' listening data for the selected time range

