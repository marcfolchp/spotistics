# Port Configuration Guide

## Issue: Redirect URI Mismatch

If you're getting "ERR_CONNECTION_REFUSED" after Spotify OAuth login, it means:
- Your redirect URI in Spotify points to a port that's not running
- The callback path doesn't match your Next.js route

## Solution Options

### Option 1: Use Default Port 3000 (Recommended)

1. **Update your `.env.local` file:**
   ```env
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
   ```

2. **Update Spotify Developer Dashboard:**
   - Go to https://developer.spotify.com/dashboard
   - Click on your app → "Edit Settings"
   - Update Redirect URI to: `http://localhost:3000/api/auth/spotify/callback`
   - Click "Save"

3. **Start your dev server:**
   ```bash
   npm run dev
   ```
   This will run on port 3000 by default.

### Option 2: Use Port 8080

If you prefer to use port 8080:

1. **Update your `.env.local` file:**
   ```env
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/api/auth/spotify/callback
   ```

2. **Update Spotify Developer Dashboard:**
   - Go to https://developer.spotify.com/dashboard
   - Click on your app → "Edit Settings"
   - Update Redirect URI to: `http://127.0.0.1:8080/api/auth/spotify/callback`
   - Click "Save"

3. **Start your dev server on port 8080:**
   ```bash
   npm run dev -- -p 8080
   ```
   Or update `package.json`:
   ```json
   "scripts": {
     "dev": "next dev -p 8080"
   }
   ```

## Important Notes

- The callback path must be: `/api/auth/spotify/callback` (not just `/callback`)
- The redirect URI in Spotify Dashboard must match EXACTLY what's in your `.env.local` file
- After making changes, restart your dev server
- Clear browser cache or use incognito mode

## Current Issue

Your redirect URI is set to: `http://127.0.0.1:8080/callback`

But it should be:
- `http://localhost:3000/api/auth/spotify/callback` (if using port 3000)
- OR `http://127.0.0.1:8080/api/auth/spotify/callback` (if using port 8080)

The path `/callback` is wrong - it needs to be `/api/auth/spotify/callback`

