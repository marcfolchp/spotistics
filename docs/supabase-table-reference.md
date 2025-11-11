# Supabase Table Reference

This document provides a complete reference of all tables used in Wrappedify.

## Table Overview

| Table Name | Purpose | Required | Data Source |
|------------|---------|----------|-------------|
| `listening_data` | Core listening history | ✅ Yes | User uploads + API sync |
| `user_data_summary` | Aggregated user stats | ✅ Yes | Computed from listening_data |
| `listening_aggregations` | Pre-computed analytics | ✅ Yes | Computed from listening_data |
| `recent_tracks` | Cached recent tracks | ✅ Yes | API sync (cron job) |
| `user_tokens` | Spotify refresh tokens | ✅ Yes | OAuth login |
| `users` | Public user profiles | ✅ Yes (Social) | OAuth login |
| `friend_requests` | Friend requests | ✅ Yes (Social) | User actions |
| `friends` | Accepted friendships | ✅ Yes (Social) | User actions |

## Detailed Table Descriptions

### 1. `listening_data`
**Purpose:** Stores all individual listening events (tracks played)

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - Spotify user ID
- `track_name` (TEXT) - Track name
- `artist_name` (TEXT) - Artist name
- `played_at` (TIMESTAMPTZ) - When the track was played
- `duration_ms` (INTEGER) - Track duration in milliseconds
- `source` (TEXT) - 'api' or 'export'
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Used by:**
- Analytics page (all charts)
- Data processing and aggregation
- Rankings (social features)

**Can be deleted?** ❌ No - This is the core data table

---

### 2. `user_data_summary`
**Purpose:** Stores aggregated statistics per user

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - Spotify user ID (unique)
- `total_tracks` (INTEGER) - Total number of tracks played
- `total_artists` (INTEGER) - Number of unique artists
- `total_listening_time_ms` (BIGINT) - Total listening time
- `date_range_start`, `date_range_end` (TIMESTAMPTZ) - Data range
- `uploaded_at`, `created_at`, `updated_at` (TIMESTAMPTZ)

**Used by:**
- Analytics page (summary stats)
- Dashboard stats cards

**Can be deleted?** ❌ No - Used for fast summary display

---

### 3. `listening_aggregations`
**Purpose:** Pre-computed analytics data for fast chart rendering

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - Spotify user ID
- `aggregation_type` (TEXT) - 'time_pattern', 'day_pattern', 'top_tracks', 'top_artists'
- `group_by` (TEXT) - Optional grouping (for date_frequency)
- `data` (JSONB) - Aggregated data points
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Used by:**
- Analytics page (all charts)
- Significantly speeds up page load

**Can be deleted?** ❌ No - Critical for performance

---

### 4. `recent_tracks`
**Purpose:** Cached recent tracks (last 100) for dashboard display

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - Spotify user ID
- `track_data` (JSONB) - Full SpotifyTrack object
- `played_at` (TIMESTAMPTZ) - When track was played
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Used by:**
- Dashboard (Recent Tracks component)
- Updated by cron job every 15 minutes

**Can be deleted?** ❌ No - Used for dashboard

---

### 5. `user_tokens`
**Purpose:** Stores Spotify refresh tokens for background sync

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - Spotify user ID (unique)
- `refresh_token` (TEXT) - Spotify refresh token
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Used by:**
- Background sync (cron job)
- Token refresh for API calls

**Can be deleted?** ❌ No - Required for background sync

---

### 6. `users` (Social Feature)
**Purpose:** Public user profiles for social features

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - Spotify user ID (unique)
- `display_name` (TEXT) - User's display name
- `profile_image_url` (TEXT) - Profile image URL
- `spotify_profile_url` (TEXT) - Link to Spotify profile
- `is_public` (BOOLEAN) - Whether profile is public
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Used by:**
- Social page (user search)
- User cards
- Rankings

**Can be deleted?** ❌ No - Required for social features

---

### 7. `friend_requests` (Social Feature)
**Purpose:** Manages friend requests between users

**Columns:**
- `id` (UUID) - Primary key
- `from_user_id` (TEXT) - User who sent request
- `to_user_id` (TEXT) - User who received request
- `status` (TEXT) - 'pending', 'accepted', 'rejected'
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Used by:**
- Social page (friend requests)
- Friend request management

**Can be deleted?** ❌ No - Required for social features

---

### 8. `friends` (Social Feature)
**Purpose:** Stores accepted friendships (bidirectional)

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (TEXT) - First user in friendship
- `friend_id` (TEXT) - Second user in friendship
- `created_at` (TIMESTAMPTZ)

**Used by:**
- Social page (friends list)
- Rankings (friend comparisons)

**Can be deleted?** ❌ No - Required for social features

---

## Table Relationships

```
users (user_id)
  ├── user_tokens (user_id)
  ├── user_data_summary (user_id)
  ├── listening_data (user_id)
  ├── listening_aggregations (user_id)
  ├── recent_tracks (user_id)
  ├── friend_requests (from_user_id, to_user_id)
  └── friends (user_id, friend_id)
```

## Maintenance Notes

- **All tables are actively used** - Do not delete any tables
- **`listening_data`** can grow very large - Consider archiving old data if needed
- **`recent_tracks`** is auto-cleaned (keeps only last 100 per user)
- **`listening_aggregations`** should be refreshed when new data is uploaded
- **`users`** table is populated automatically on login, but you can run the migration script to backfill existing users

