import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedToken, handleSpotifyError } from '@/lib/api/middleware';
import { getRecentlyPlayed } from '@/lib/spotify/api';

/**
 * GET /api/spotify/recent-tracks
 * Get user's recently played tracks
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedToken();
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const tracks = await getRecentlyPlayed(authResult.token, limit);
    return NextResponse.json(tracks);
  } catch (error: any) {
    return handleSpotifyError(error);
  }
}

