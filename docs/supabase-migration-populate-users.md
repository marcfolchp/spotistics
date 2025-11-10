# Migration: Populate Users Table

This migration script populates the `users` table with user profiles for all existing users in your database.

## Why This Is Needed

The `users` table was created after users had already logged in, so it's empty. This script creates user profiles for all users who have data in other tables.

## How to Run

1. Go to your Supabase dashboard → **SQL Editor**
2. Click "New query"
3. Copy and paste the SQL below
4. Click "Run"

## Migration SQL

```sql
-- Migration: Populate users table from existing user data
-- This creates user profiles for all users who have data in other tables

-- Step 1: Insert users from user_tokens (they have refresh tokens, so they've logged in)
INSERT INTO users (user_id, display_name, is_public, created_at, updated_at)
SELECT DISTINCT
  ut.user_id,
  ut.user_id as display_name, -- Temporary: will be updated on next login
  true as is_public,
  ut.created_at,
  NOW() as updated_at
FROM user_tokens ut
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.user_id = ut.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Insert users from user_data_summary (they have uploaded data)
INSERT INTO users (user_id, display_name, is_public, created_at, updated_at)
SELECT DISTINCT
  uds.user_id,
  uds.user_id as display_name, -- Temporary: will be updated on next login
  true as is_public,
  uds.created_at,
  NOW() as updated_at
FROM user_data_summary uds
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.user_id = uds.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Insert users from listening_data (they have listening history)
INSERT INTO users (user_id, display_name, is_public, created_at, updated_at)
SELECT DISTINCT
  ld.user_id,
  ld.user_id as display_name, -- Temporary: will be updated on next login
  true as is_public,
  MIN(ld.created_at) as created_at,
  NOW() as updated_at
FROM listening_data ld
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.user_id = ld.user_id
)
GROUP BY ld.user_id
ON CONFLICT (user_id) DO NOTHING;

-- Verify the migration
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN display_name = user_id THEN 1 END) as users_needing_update
FROM users;
```

## After Migration

After running this migration:

1. **User profiles will be created** for all existing users
2. **Display names will be set to user_id** temporarily (e.g., "mònicapomares")
3. **On next login**, the user's actual display name and profile image will be updated automatically via the OAuth callback

## What Each Table Does

Here's a summary of what each table is used for:

### Core Data Tables (Required)
- **`listening_data`** - Stores all listening history (tracks, artists, timestamps)
- **`user_data_summary`** - Stores aggregated stats (total tracks, artists, listening time)
- **`listening_aggregations`** - Pre-computed analytics for fast chart rendering
- **`recent_tracks`** - Cached recent tracks (last 100) for dashboard

### Authentication & Sync (Required)
- **`user_tokens`** - Stores Spotify refresh tokens for background sync

### Social Features (Required if using social features)
- **`users`** - Public user profiles for social features
- **`friend_requests`** - Friend request management
- **`friends`** - Accepted friendships

## All Tables Are Needed

All 8 tables are actively used by the application. Do not delete any of them.

