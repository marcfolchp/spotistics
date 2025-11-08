import { NextResponse } from 'next/server';

/**
 * GET /api/auth/debug
 * Debug endpoint to check redirect URI configuration
 * Remove this after fixing the issue
 */
export async function GET() {
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ? '***SET***' : '***NOT SET***';
  
  return NextResponse.json({
    redirectUri: redirectUri || '***NOT SET***',
    clientId: clientId ? '***SET***' : '***NOT SET***',
    clientSecret: clientSecret,
    environment: process.env.NODE_ENV,
    expectedUri: 'https://spotistics-five.vercel.app/api/auth/spotify/callback',
    matches: redirectUri === 'https://spotistics-five.vercel.app/api/auth/spotify/callback',
    note: 'Make sure SPOTIFY_REDIRECT_URI in Vercel matches exactly: https://spotistics-five.vercel.app/api/auth/spotify/callback'
  });
}

