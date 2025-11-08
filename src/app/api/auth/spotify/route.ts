import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/spotify/auth';

/**
 * GET /api/auth/spotify
 * Initiate Spotify OAuth2 flow
 * Returns authorization URL as JSON for client-side redirect
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback';

  if (!clientId) {
    return NextResponse.json(
      { 
        error: 'Spotify client ID not configured. Please check your .env.local file.',
        url: null 
      },
      { status: 500 }
    );
  }

  // Log the redirect URI being used (for debugging)
  console.log('Using redirect URI:', redirectUri);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Request URL:', request.url);

  try {
    const authUrl = getAuthorizationUrl(redirectUri, clientId);
    console.log('Generated auth URL:', authUrl);
    return NextResponse.json({ 
      url: authUrl,
      redirectUri: redirectUri // Include in response for debugging
    });
  } catch (error) {
    console.error('Error generating authorization URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate authorization URL. Make sure your redirect URI matches your Spotify app settings.',
        url: null,
        redirectUri: redirectUri // Include in response for debugging
      },
      { status: 500 }
    );
  }
}

