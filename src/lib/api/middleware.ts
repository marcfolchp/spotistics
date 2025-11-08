import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { refreshTokenIfNeeded } from '@/lib/spotify/token-refresh';

/**
 * Middleware to get access token, refreshing if needed
 */
export async function getAuthenticatedToken(): Promise<{ token: string } | NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Try to refresh token if needed
  const refreshedToken = await refreshTokenIfNeeded();
  const token = refreshedToken || accessToken;

  return { token };
}

/**
 * Handle Spotify API errors
 */
export function handleSpotifyError(error: any): NextResponse {
  console.error('Spotify API error:', error);

  if (error.statusCode === 401) {
    return NextResponse.json(
      { error: 'Token expired or invalid' },
      { status: 401 }
    );
  }

  if (error.statusCode === 429) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  return NextResponse.json(
    { error: 'Failed to fetch data from Spotify' },
    { status: 500 }
  );
}

