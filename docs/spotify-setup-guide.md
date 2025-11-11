# Spotify Developer Dashboard Setup Guide

## Step-by-Step Instructions

### 1. Create a Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click **"Create an app"** button
4. Fill in the form:
   - **App name**: Wrappedify (or any name you prefer)
   - **App description**: Spotify Data Analytics App
   - **Website**: (optional) Leave blank or add your website
   - **Redirect URI**: `http://localhost:3000/api/auth/spotify/callback`
   - **Commercial or non-commercial**: Select based on your use case
5. Check the terms and conditions checkbox
6. Click **"Save"**

### 2. Get Your Credentials

After creating the app, you'll see:
- **Client ID**: Copy this (e.g., `5eb76ad03c9d4f8bbfad7a7d594485d2`)
- **Client Secret**: Click "View client secret" to reveal it (e.g., `ddd4fc28148f4202b4e335127da617a5`)

### 3. Add Redirect URI (IMPORTANT!)

1. In your app settings, click **"Edit Settings"**
2. Scroll down to **"Redirect URIs"** section
3. Click **"Add URI"**
4. Enter: `http://localhost:3000/api/auth/spotify/callback`
5. Click **"Add"**
6. Click **"Save"** at the bottom of the page

**⚠️ CRITICAL**: The redirect URI must match EXACTLY:
- ✅ `http://localhost:3000/api/auth/spotify/callback` (correct)
- ❌ `https://localhost:3000/api/auth/spotify/callback` (wrong - no https)
- ❌ `http://localhost:3000/api/auth/spotify/callback/` (wrong - no trailing slash)
- ❌ `http://127.0.0.1:3000/api/auth/spotify/callback` (wrong - must be localhost)

### 4. Update Your .env.local File

Add these values to your `.env.local` file:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
```

### 5. Restart Your Dev Server

After updating `.env.local`:
1. Stop your dev server (Ctrl+C in terminal)
2. Start it again: `npm run dev`
3. Try logging in again

## Troubleshooting

### Error: "INVALID_CLIENT: Invalid redirect URI"

**Solution**: 
1. Go to Spotify Developer Dashboard
2. Click on your app → "Edit Settings"
3. Check the "Redirect URIs" section
4. Make sure `http://localhost:3000/api/auth/spotify/callback` is listed
5. If not, add it and click "Save"
6. Restart your dev server

### Error: "Invalid client secret"

**Solution**:
1. Make sure you copied the Client Secret correctly
2. Check for any extra spaces in your `.env.local` file
3. The Client Secret should be on one line without quotes

### Still Having Issues?

1. **Clear browser cache** or use incognito mode
2. **Check your .env.local file** - make sure there are no extra spaces or quotes
3. **Verify the redirect URI** matches exactly in both places:
   - Spotify Dashboard
   - Your .env.local file
4. **Restart your dev server** after making changes

