# Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Spotify OAuth2 Configuration
# Get these from https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### Getting Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an app"
3. Fill in the app details:
   - App name: Spotistics (or your preferred name)
   - App description: Spotify Data Analytics App
   - Redirect URI: `http://localhost:3000/api/auth/spotify/callback`
4. Click "Save"
5. Copy the Client ID and Client Secret to your `.env.local` file

### Generating NEXTAUTH_SECRET

Run this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the output to your `.env.local` file as the `NEXTAUTH_SECRET` value.

### Production Setup

For production, update:
- `SPOTIFY_REDIRECT_URI` to your production callback URL
- `NEXTAUTH_URL` to your production domain
- Add the production redirect URI in your Spotify app settings

