# Background Sync Setup

This guide explains how to set up automatic hourly syncing of recently played tracks from Spotify.

## Overview

The app automatically syncs recently played tracks from Spotify every hour and adds them to the user's listening history in Supabase. This keeps the data up-to-date without requiring users to manually upload their data.

## How It Works

1. **Token Storage**: When users log in, their refresh token is stored in Supabase (`user_tokens` table)
2. **Background Sync**: A cron job calls `/api/sync/recently-played` every hour
3. **Token Refresh**: The sync job refreshes access tokens using stored refresh tokens
4. **Fetch New Tracks**: Fetches recently played tracks from Spotify API
5. **Deduplication**: Compares with existing data to avoid duplicates
6. **Store New Tracks**: Inserts only new tracks into Supabase
7. **Update Aggregations**: Recomputes analytics aggregations with new data

## Setup Instructions

### 1. Create the User Tokens Table

Run the SQL from `docs/supabase-tokens-table.md` in your Supabase SQL Editor.

### 2. Set Environment Variable

Add to your `.env.local`:

```env
SYNC_SECRET_KEY=your-secret-key-here
```

Generate a secure random string for `SYNC_SECRET_KEY` (e.g., using `openssl rand -hex 32`).

### 3. Set Up Cron Job

#### Option A: Vercel Cron (Recommended for Vercel deployments)

**✅ Already configured!** The `vercel.json` file has been created and the sync route has been updated.

**See `docs/vercel-cron-setup.md` for detailed setup instructions.**

Quick setup:
1. The `vercel.json` file is already in your project root
2. Add environment variables in Vercel Dashboard:
   - `CRON_SECRET` (optional, for extra security)
   - `SYNC_SECRET_KEY` (optional, for manual triggers)
3. Deploy to Vercel - the cron job will be automatically set up
4. The sync will run every hour automatically

#### Option B: External Cron Service

Use a service like:
- **cron-job.org** (free)
- **EasyCron** (free tier)
- **GitHub Actions** (free for public repos)

Set up a cron job to call:
```
GET https://your-domain.com/api/sync/recently-played
Authorization: Bearer YOUR_SYNC_SECRET_KEY
```

Schedule: Every hour (`0 * * * *`)

#### Option C: Self-hosted Cron

If you're self-hosting, set up a cron job on your server:

```bash
0 * * * * curl -H "Authorization: Bearer YOUR_SYNC_SECRET_KEY" https://your-domain.com/api/sync/recently-played
```

## Testing

### Manual Sync (Single User)

Call the POST endpoint while authenticated:

```bash
curl -X POST https://your-domain.com/api/sync/recently-played \
  -H "Cookie: spotify_access_token=YOUR_TOKEN"
```

### Manual Sync (All Users)

Call the GET endpoint with the secret key:

```bash
curl -X GET https://your-domain.com/api/sync/recently-played \
  -H "Authorization: Bearer YOUR_SYNC_SECRET_KEY"
```

## Monitoring

The sync endpoint returns:
- Number of users synced
- Number of new tracks added per user
- Any errors encountered

Check your server logs or set up monitoring to track sync success/failures.

## Rate Limiting

Spotify API has rate limits:
- **Recently Played**: 50 tracks per request
- **Rate Limit**: 10,000 requests per hour per user

The sync:
- Fetches up to 1000 tracks per user per sync
- Only fetches tracks newer than the most recent in database
- Includes delays between requests to avoid rate limiting
- Handles 429 (rate limit) errors gracefully

## Troubleshooting

### Sync not running
- Check cron job is configured correctly
- Verify `SYNC_SECRET_KEY` matches in both places
- Check server logs for errors

### No new tracks being added
- Verify refresh tokens are stored in `user_tokens` table
- Check if user has played new tracks since last sync
- Verify Spotify API is returning data

### Token refresh failures
- Refresh tokens expire if user revokes app access
- User needs to log in again to get a new refresh token
- Check Supabase logs for token errors

