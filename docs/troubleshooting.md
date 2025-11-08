# Troubleshooting Guide

## "INVALID_CLIENT: Invalid redirect URI" Error

This error occurs when the redirect URI in your `.env.local` file doesn't match what's registered in your Spotify Developer Dashboard.

### Solution:

1. **Go to Spotify Developer Dashboard**
   - Visit: https://developer.spotify.com/dashboard
   - Log in with your Spotify account

2. **Open Your App**
   - Click on your app (the one with Client ID: `5eb76ad03c9d4f8bbfad7a7d594485d2`)

3. **Add Redirect URI**
   - Click on "Edit Settings" button
   - Scroll down to "Redirect URIs" section
   - Click "Add URI"
   - Enter exactly: `http://localhost:3000/api/auth/spotify/callback`
   - **Important**: The URI must match EXACTLY (including http, no https, no trailing slash)
   - Click "Add"
   - Click "Save" at the bottom

4. **Verify Your .env.local File**
   Make sure your `.env.local` has:
   ```env
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
   ```

5. **Restart Your Dev Server**
   - Stop your dev server (Ctrl+C)
   - Start it again: `npm run dev`

### Common Mistakes:

- ❌ Using `https://` instead of `http://` (for localhost)
- ❌ Adding a trailing slash: `http://localhost:3000/api/auth/spotify/callback/`
- ❌ Using a different port
- ❌ Missing `/api/auth/spotify/callback` path
- ❌ Not saving the changes in Spotify Dashboard

### Correct Format:
```
http://localhost:3000/api/auth/spotify/callback
```

### After Fixing:
1. Clear your browser cache or use incognito mode
2. Try logging in again
3. The error should be resolved

