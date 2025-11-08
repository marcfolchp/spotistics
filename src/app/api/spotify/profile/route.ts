import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedToken, handleSpotifyError } from '@/lib/api/middleware';
import { getUserProfile } from '@/lib/spotify/api';

/**
 * GET /api/spotify/profile
 * Get user's Spotify profile
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedToken();
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const profile = await getUserProfile(authResult.token);
    return NextResponse.json(profile);
  } catch (error: any) {
    return handleSpotifyError(error);
  }
}

